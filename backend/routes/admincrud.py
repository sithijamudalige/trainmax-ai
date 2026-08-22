import os
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

admin_crud_bp = Blueprint("admin_crud", __name__, url_prefix="/api/admin/crud")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase_admin = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# List of tables allowed for generic CRUD operations to prevent abuse
ALLOWED_TABLES = [
    "user_profiles",
    "player_stats",
    "coach_profiles",
    "teams",
    "team_members",
    "training_plans",
    "notebooks"
]

def _require_admin():
    # SIMPLE DEV protection (NOT secure for production)
    return request.headers.get("X-Admin") == "true"


@admin_crud_bp.get("/<table_name>")
def list_records(table_name):
    if not _require_admin():
        return jsonify({"error": "unauthorized"}), 401

    if not supabase_admin:
        return jsonify({"error": "supabase_admin_not_configured"}), 500
        
    if table_name not in ALLOWED_TABLES:
        return jsonify({"error": "table_not_allowed"}), 400

    try:
        res = supabase_admin.table(table_name).select("*").execute()
        return jsonify({"records": res.data}), 200
    except Exception as e:
        return jsonify({"error": "list_records_failed", "detail": str(e)}), 500


@admin_crud_bp.get("/<table_name>/<record_id>")
def get_record(table_name, record_id):
    if not _require_admin():
        return jsonify({"error": "unauthorized"}), 401

    if not supabase_admin:
        return jsonify({"error": "supabase_admin_not_configured"}), 500
        
    if table_name not in ALLOWED_TABLES:
        return jsonify({"error": "table_not_allowed"}), 400

    try:
        res = (
            supabase_admin.table(table_name)
            .select("*")
            .eq("id", record_id)
            .maybe_single()
            .execute()
        )
        return jsonify({"record": res.data}), 200
    except Exception as e:
        return jsonify({"error": "get_record_failed", "detail": str(e)}), 500


@admin_crud_bp.post("/<table_name>")
def create_record(table_name):
    if not _require_admin():
        return jsonify({"error": "unauthorized"}), 401

    if not supabase_admin:
        return jsonify({"error": "supabase_admin_not_configured"}), 500
        
    if table_name not in ALLOWED_TABLES:
        return jsonify({"error": "table_not_allowed"}), 400

    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({"error": "missing_body"}), 400

    try:
        res = (
            supabase_admin.table(table_name)
            .insert(payload)
            .execute()
        )
        return jsonify({"success": True, "created": res.data}), 201
    except Exception as e:
        return jsonify({"error": "create_record_failed", "detail": str(e)}), 500


@admin_crud_bp.put("/<table_name>/<record_id>")
def update_record(table_name, record_id):
    if not _require_admin():
        return jsonify({"error": "unauthorized"}), 401

    if not supabase_admin:
        return jsonify({"error": "supabase_admin_not_configured"}), 500
        
    if table_name not in ALLOWED_TABLES:
        return jsonify({"error": "table_not_allowed"}), 400

    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({"error": "missing_body"}), 400

    # do not allow changing primary key
    payload.pop("id", None)

    try:
        res = (
            supabase_admin.table(table_name)
            .update(payload)
            .eq("id", record_id)
            .execute()
        )
        return jsonify({"success": True, "updated": res.data}), 200
    except Exception as e:
        return jsonify({"error": "update_record_failed", "detail": str(e)}), 500


@admin_crud_bp.delete("/<table_name>/<record_id>")
def delete_record(table_name, record_id):
    if not _require_admin():
        return jsonify({"error": "unauthorized"}), 401

    if not supabase_admin:
        return jsonify({"error": "supabase_admin_not_configured"}), 500
        
    if table_name not in ALLOWED_TABLES:
        return jsonify({"error": "table_not_allowed"}), 400

    try:
        res = supabase_admin.table(table_name).delete().eq("id", record_id).execute()
        return jsonify({"success": True, "deleted": res.data}), 200
    except Exception as e:
        return jsonify({"error": "delete_record_failed", "detail": str(e)}), 500
