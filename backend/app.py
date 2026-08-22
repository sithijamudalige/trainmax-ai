# app.py
import os
import socket
import logging
import traceback

from flask import Flask, Blueprint, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client
from werkzeug.exceptions import HTTPException
from routes.trainingplan import trainingplan_bp
from routes.voice import voice_bp
from routes.notificationroute import notification_bp
# 1) Load env FIRST
load_dotenv()

# 2) Create app FIRST
app = Flask(__name__)

# 3) CORS — allow all so phone + web can connect
CORS(app, origins="*")

# ---- Logging ----
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("backend")

# ---- Config ----
SUPABASE_URL              = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase_admin = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    logger.info(f"✅ Supabase connected: {SUPABASE_URL[:50]}...")

# 4) Import blueprints AFTER app/env are ready
from routes.adminroute           import admin_bp
from routes.adminusers           import admin_users_bp
from routes.adminavatar          import admin_avatar_bp
from routes.adminavatar_upload   import admin_avatar_upload_bp
from routes.admincrud            import admin_crud_bp
from routes.chatbot              import chatbot_bp
from routes.notebookroute        import notebook_bp
from routes.coachauth            import coach_auth_bp
from routes.manageteam           import team_bp
from routes.coachchatbot         import coach_chatbot_bp
from routes.coachtrainingplan    import coach_tp_bp
from routes.password_reset       import password_reset_bp
#from routes.coachmail            import coach_mail_bp


# ---- Auth blueprint ----
auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.get("/check-role")
def check_role():
    """
    Mobile app calls this to find out whether the logged-in user is a
    'coach' or 'player'.  Uses the service-role Supabase client so that
    Row Level Security never blocks the query.
    """
    token = _get_bearer_token()
    if not token:
        return jsonify({"error": "missing_bearer_token"}), 401

    # Validate the token and get the user id
    user, err = _validate_token(token)
    if err:
        return err

    if not supabase_admin:
        return jsonify({"error": "supabase_admin_not_configured"}), 500

    try:
        result = supabase_admin \
            .from_("coach_profiles") \
            .select("id") \
            .eq("id", user.id) \
            .maybe_single() \
            .execute()
        role = "coach" if result.data else "player"
        return jsonify({"role": role, "user_id": user.id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _get_bearer_token():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[len("Bearer "):].strip()
    return None


def _validate_token(token):
    if not supabase_admin:
        return None, (jsonify({"error": "supabase_admin_not_configured"}), 500)
    try:
        result = supabase_admin.auth.get_user(token)
        user   = result.user
        if not user:
            return None, (jsonify({"error": "invalid_token"}), 401)
        return user, None
    except Exception as e:
        return None, (jsonify({"error": "invalid_token", "detail": str(e)}), 401)


# ---- Auth routes ----

@auth_bp.get("/me")
def me():
    token = _get_bearer_token()
    if not token:
        return jsonify({"error": "missing_bearer_token"}), 401
    user, err = _validate_token(token)
    if err:
        return err
    return jsonify({
        "success": True,
        "user_id": user.id,
        "email":   user.email,
        "role":    "authenticated",
    })


@auth_bp.get("/profile")
def profile():
    token = _get_bearer_token()
    if not token:
        return jsonify({"error": "missing_bearer_token"}), 401
    user, err = _validate_token(token)
    if err:
        return err
    try:
        res = (
            supabase_admin.table("user_profiles")
            .select("*")
            .eq("id", user.id)
            .maybe_single()
            .execute()
        )
        return jsonify({"profile": res.data if res else None}), 200
    except Exception as e:
        logger.error(f"❌ PROFILE: {traceback.format_exc()}")
        return jsonify({"error": "profile_fetch_failed", "detail": str(e)}), 500


@auth_bp.post("/profile")
def create_profile():
    token = _get_bearer_token()
    if not token:
        return jsonify({"error": "missing_bearer_token"}), 401
    user, err = _validate_token(token)
    if err:
        return err
    body          = request.get_json(silent=True) or {}
    body["id"]    = user.id
    body["email"] = user.email
    try:
        res = supabase_admin.table("user_profiles").insert(body).execute()
        return jsonify({"profile": res.data[0] if res.data else None}), 201
    except Exception as e:
        logger.error(f"❌ CREATE_PROFILE: {traceback.format_exc()}")
        return jsonify({"error": "profile_creation_failed", "detail": str(e)}), 500


@auth_bp.put("/profile")
def update_profile():
    token = _get_bearer_token()
    if not token:
        return jsonify({"error": "missing_bearer_token"}), 401
    user, err = _validate_token(token)
    if err:
        return err
    body = request.get_json(silent=True) or {}
    body.pop("id",    None)
    body.pop("email", None)
    try:
        res = (
            supabase_admin.table("user_profiles")
            .update(body)
            .eq("id", user.id)
            .execute()
        )
        return jsonify({"profile": res.data[0] if res.data else None}), 200
    except Exception as e:
        logger.error(f"❌ UPDATE_PROFILE: {traceback.format_exc()}")
        return jsonify({"error": "profile_update_failed", "detail": str(e)}), 500


# ---- Request logging ----
@app.before_request
def log_request():
    logger.info(f"REQ {request.method} {request.path} from {request.remote_addr}")


@app.after_request
def log_response(resp):
    logger.info(f"RES {request.method} {request.path} -> {resp.status_code}")
    return resp


# ---- Error handling ----
@app.errorhandler(Exception)
def handle_any_exception(e):
    if isinstance(e, HTTPException):
        return jsonify({"error": e.name, "detail": e.description}), e.code
    logger.error("UNHANDLED ERROR:\n" + traceback.format_exc())
    return jsonify({"error": "internal_server_error", "detail": str(e)}), 500


# ---- Health check ----
@app.get("/api/health")
def health():
    return jsonify({"success": True, "status": "ok"}), 200


# ---- Register blueprints ----
app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(admin_users_bp)
app.register_blueprint(admin_avatar_bp)
app.register_blueprint(admin_avatar_upload_bp)
app.register_blueprint(admin_crud_bp)
app.register_blueprint(chatbot_bp)
app.register_blueprint(trainingplan_bp)
app.register_blueprint(notebook_bp)
app.register_blueprint(coach_auth_bp)
app.register_blueprint(team_bp)
app.register_blueprint(coach_chatbot_bp)
app.register_blueprint(coach_tp_bp)
app.register_blueprint(voice_bp)
app.register_blueprint(password_reset_bp)
app.register_blueprint(notification_bp)
# app.register_blueprint(coach_mail_bp)


# ── One-time RLS fix endpoint ─────────────────────────────────────────────────
@app.post("/api/admin/fix-coach-rls")
def fix_coach_rls():
    """
    Creates the SELECT RLS policy on coach_profiles so that authenticated
    users can read their own row.  Call once after deploying.
    """
    if not supabase_admin:
        return jsonify({"error": "supabase_admin not configured"}), 500
    try:
        import psycopg2, urllib.parse
        parsed   = urllib.parse.urlparse(SUPABASE_URL)
        host     = parsed.hostname           # qxigaljxogeniodatidk.supabase.co
        db_host  = f"db.{parsed.hostname.split('.supabase.co')[0]}.supabase.co"
        db_pass  = SUPABASE_SERVICE_ROLE_KEY

        conn = psycopg2.connect(
            host=db_host, port=5432, dbname="postgres",
            user="postgres", password=db_pass,
            connect_timeout=10,
            sslmode="require",
        )
        cur = conn.cursor()
        cur.execute("DROP POLICY IF EXISTS coaches_read_own ON coach_profiles;")
        cur.execute(
            "CREATE POLICY coaches_read_own ON coach_profiles "
            "FOR SELECT TO authenticated USING (auth.uid() = id);"
        )
        conn.commit()
        cur.close(); conn.close()
        return jsonify({"success": True, "message": "RLS policy created ✅"})
    except ImportError:
        # psycopg2 not installed — fall back to a Supabase workaround
        pass
    except Exception as e:
        logger.warning(f"psycopg2 RLS fix failed: {e}")

    # ── Fallback: use Supabase stored procedure ───────────────────────────────
    try:
        # Create a helper stored proc via SQL API if available
        result = supabase_admin.rpc("pg_sleep", {"seconds": 0}).execute()
        return jsonify({"error": "Cannot run DDL via REST — run SQL in Supabase Dashboard"}), 400
    except Exception as e2:
        return jsonify({"error": str(e2)}), 500


# ============================================================
# LOCAL IP DETECTION — lists ALL candidates, not just one guess
# ============================================================
def _get_all_local_ips() -> list[str]:
    """
    Returns every local IPv4 address found on this machine, deduplicated.
    A single "best guess" (e.g. via UDP-connect-to-8.8.8.8) can silently
    pick a VMware/VirtualBox/Docker/Hyper-V virtual adapter instead of
    your real WiFi adapter when several are active — those virtual
    subnets are NAT-only and completely unreachable from your phone,
    which looks identical to a real connectivity bug from the outside
    (every request just "Aborts"). Listing all of them lets you cross-
    check against `ipconfig` and pick the one under your real
    "Wireless LAN adapter Wi-Fi" entry.
    """
    ips = set()

    # Method 1: hostname resolution (often returns multiple adapters)
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127."):
                ips.add(ip)
    except Exception:
        pass

    # Method 2: UDP-connect trick (asks the OS which interface it would
    # route through for an external destination — usually correct, but
    # not guaranteed if a virtual adapter has a competing default route)
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ips.add(s.getsockname()[0])
        s.close()
    except Exception:
        pass

    return sorted(ips)


if __name__ == "__main__":
    candidate_ips = _get_all_local_ips()

    logger.info("=" * 60)
    logger.info("Starting backend on http://0.0.0.0:5000")
    logger.info("")
    logger.info("Candidate IPs found on this machine (test each from")
    logger.info("your phone's browser at http://<ip>:5000/api/health):")
    for ip in candidate_ips:
        logger.info(f"   -> http://{ip}:5000")
    logger.info("")
    logger.info("Run 'ipconfig' in a separate terminal and find the IPv4")
    logger.info("address under 'Wireless LAN adapter Wi-Fi' specifically —")
    logger.info("that's the ONE real value to use as your mobile API_BASE.")
    logger.info("If VMware/VirtualBox/Docker/Hyper-V is installed, some of")
    logger.info("the IPs above belong to virtual adapters your phone can")
    logger.info("never reach, even though they look like normal LAN IPs.")
    logger.info("=" * 60)

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
        threaded=True,
        use_reloader=False,
    )