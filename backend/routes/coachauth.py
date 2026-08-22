"""
coachauth.py  —  Train Max AI
Coach authentication & profile routes.

Blueprint prefix : /api/coach
All routes (except /register and /login) require:
    Authorization: Bearer <supabase_jwt>

JWT is verified via supabase_admin.auth.get_user(token)  ← RS256-safe
"""

from flask import Blueprint, request, jsonify
from supabase import create_client, Client
import os
from datetime import datetime, timezone

# ─── Supabase admin client (service-role key, bypasses RLS) ─────────────────
SUPABASE_URL             = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# ─── Blueprint ───────────────────────────────────────────────────────────────
coach_auth_bp = Blueprint("coach_auth", __name__, url_prefix="/api/coach")


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_coach_user(request) -> tuple:
    """
    Extract and verify the Supabase JWT from the Authorization header.
    Returns (user, None) on success or (None, error_response) on failure.
    Uses supabase_admin.auth.get_user() — RS256 compatible.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, (jsonify({"error": "Missing or invalid Authorization header"}), 401)

    token = auth_header.split(" ", 1)[1].strip()
    try:
        result = supabase_admin.auth.get_user(token)
        user   = result.user
        if not user:
            return None, (jsonify({"error": "Invalid or expired token"}), 401)
        return user, None
    except Exception as e:
        return None, (jsonify({"error": f"Auth error: {str(e)}"}), 401)


def _ensure_coach_role(user_id: str) -> bool:
    """
    Verify the user has a coach_profiles row (acts as role check).
    Returns True if coach profile exists.
    """
    try:
        res = supabase_admin.table("coach_profiles") \
            .select("id") \
            .eq("id", user_id) \
            .single() \
            .execute()
        return res.data is not None
    except Exception:
        return False


# ─── POST /api/coach/register ─────────────────────────────────────────────────
@coach_auth_bp.route("/register", methods=["POST"])
def coach_register():
    """
    Register a new coach.
    Called after Supabase Auth sign-up on the frontend (CoachSignup.js).
    Body (JSON):
        user_id          str   — Supabase auth UID
        email            str
        full_name        str
        club             str   (optional)
        country          str
        mobile_number    str   (optional)
        experience_level str   — beginner | junior | mid | senior
        specializations  list  — e.g. ["Goalkeeper", "Fitness & Conditioning"]
        bio              str   (optional)
    """
    data = request.get_json(silent=True) or {}

    user_id   = data.get("user_id", "").strip()
    email     = data.get("email", "").strip()
    full_name = data.get("full_name", "").strip()
    country   = data.get("country", "").strip()

    if not all([user_id, email, full_name, country]):
        return jsonify({"error": "user_id, email, full_name and country are required"}), 400

    experience = data.get("experience_level", "beginner")
    if experience not in ("beginner", "junior", "mid", "senior"):
        experience = "beginner"

    payload = {
        "id":               user_id,
        "email":            email,
        "full_name":        full_name,
        "club":             data.get("club", ""),
        "country":          country,
        "mobile_number":    data.get("mobile_number", ""),
        "experience_level": experience,
        "specializations":  data.get("specializations", []),
        "bio":              data.get("bio", ""),
        "is_verified":      False,
        "created_at":       datetime.now(timezone.utc).isoformat(),
        "updated_at":       datetime.now(timezone.utc).isoformat(),
    }

    try:
        result = supabase_admin.table("coach_profiles").insert(payload).execute()
        return jsonify({
            "message": "Coach profile created successfully",
            "coach":   result.data[0] if result.data else payload
        }), 201
    except Exception as e:
        err = str(e)
        # Duplicate — coach already registered
        if "duplicate" in err.lower() or "unique" in err.lower():
            return jsonify({"error": "A coach with this email already exists"}), 409
        return jsonify({"error": f"Failed to create coach profile: {err}"}), 500


# ─── POST /api/coach/login ────────────────────────────────────────────────────
@coach_auth_bp.route("/login", methods=["POST"])
def coach_login():
    """
    Coach login via Supabase Auth (email + password).
    Returns the session access_token the frontend should store.
    Body (JSON):
        email    str
        password str
    """
    data     = request.get_json(silent=True) or {}
    email    = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    try:
        result  = supabase_admin.auth.sign_in_with_password({"email": email, "password": password})
        session = result.session
        user    = result.user

        if not session:
            return jsonify({"error": "Invalid email or password"}), 401

        # Confirm this user has a coach profile
        if not _ensure_coach_role(user.id):
            return jsonify({"error": "No coach account found for this email. Please register first."}), 403

        # Fetch coach profile
        profile_res = supabase_admin.table("coach_profiles") \
            .select("*") \
            .eq("id", user.id) \
            .single() \
            .execute()

        return jsonify({
            "message":      "Login successful",
            "access_token": session.access_token,
            "token_type":   "bearer",
            "coach":        profile_res.data or {}
        }), 200

    except Exception as e:
        err = str(e)
        if "invalid" in err.lower() or "credentials" in err.lower():
            return jsonify({"error": "Invalid email or password"}), 401
        return jsonify({"error": f"Login failed: {err}"}), 500


# ─── GET /api/coach/profile ───────────────────────────────────────────────────
@coach_auth_bp.route("/profile", methods=["GET"])
def get_coach_profile():
    """
    Fetch the authenticated coach's profile.
    Requires:  Authorization: Bearer <token>
    """
    user, err = _get_coach_user(request)
    if err:
        return err

    try:
        result = supabase_admin.table("coach_profiles") \
            .select("*") \
            .eq("id", user.id) \
            .single() \
            .execute()

        if not result.data:
            return jsonify({"error": "Coach profile not found"}), 404

        return jsonify({"coach": result.data}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch coach profile: {str(e)}"}), 500


# ─── PUT /api/coach/profile ───────────────────────────────────────────────────
@coach_auth_bp.route("/profile", methods=["PUT"])
def update_coach_profile():
    """
    Update the authenticated coach's profile.
    Requires:  Authorization: Bearer <token>
    Body (JSON) — all fields optional:
        full_name, club, country, mobile_number,
        experience_level, specializations, bio
    """
    user, err = _get_coach_user(request)
    if err:
        return err

    data = request.get_json(silent=True) or {}

    allowed = {
        "full_name", "club", "country", "mobile_number",
        "experience_level", "specializations", "bio"
    }
    updates = {k: v for k, v in data.items() if k in allowed}

    if not updates:
        return jsonify({"error": "No valid fields provided for update"}), 400

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    try:
        result = supabase_admin.table("coach_profiles") \
            .update(updates) \
            .eq("id", user.id) \
            .execute()

        return jsonify({
            "message": "Coach profile updated",
            "coach":   result.data[0] if result.data else {}
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to update coach profile: {str(e)}"}), 500


# ─── DELETE /api/coach/account ────────────────────────────────────────────────
@coach_auth_bp.route("/account", methods=["DELETE"])
def delete_coach_account():
    """
    Delete the authenticated coach's account.
    Removes the coach_profiles row AND the Supabase Auth user.
    Requires:  Authorization: Bearer <token>
    """
    user, err = _get_coach_user(request)
    if err:
        return err

    try:
        # Remove coach profile first
        supabase_admin.table("coach_profiles").delete().eq("id", user.id).execute()

        # Remove auth user (service-role required)
        supabase_admin.auth.admin.delete_user(user.id)

        return jsonify({"message": "Coach account deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to delete account: {str(e)}"}), 500


# ─── GET /api/coach/status ────────────────────────────────────────────────────
@coach_auth_bp.route("/status", methods=["GET"])
def coach_status():
    """
    Health check + auth check.
    Returns coach verification status if token provided.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"status": "ok", "authenticated": False}), 200

    user, err = _get_coach_user(request)
    if err:
        return jsonify({"status": "ok", "authenticated": False}), 200

    is_coach = _ensure_coach_role(user.id)
    return jsonify({
        "status":        "ok",
        "authenticated": True,
        "is_coach":      is_coach,
        "user_id":       user.id,
    }), 200
