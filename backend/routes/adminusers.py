import os
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

admin_users_bp = Blueprint("admin_users", __name__, url_prefix="/api/admin/users")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase_admin = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _require_admin():
    # SIMPLE DEV protection (NOT secure for production)
    return request.headers.get("X-Admin") == "true"


@admin_users_bp.get("")
def list_users():
    if not _require_admin():
        return jsonify({"error": "unauthorized"}), 401

    if not supabase_admin:
        return jsonify({"error": "supabase_admin_not_configured"}), 500

    try:
        res = supabase_admin.table("user_profiles").select("*").execute()
        return jsonify({"users": res.data}), 200
    except Exception as e:
        return jsonify({"error": "list_users_failed", "detail": str(e)}), 500


@admin_users_bp.get("/<user_id>")
def get_user(user_id):
    if not _require_admin():
        return jsonify({"error": "unauthorized"}), 401

    if not supabase_admin:
        return jsonify({"error": "supabase_admin_not_configured"}), 500

    try:
        res = (
            supabase_admin.table("user_profiles")
            .select("*")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        return jsonify({"user": res.data}), 200
    except Exception as e:
        return jsonify({"error": "get_user_failed", "detail": str(e)}), 500


@admin_users_bp.put("/<user_id>")
def update_user(user_id):
    if not _require_admin():
        return jsonify({"error": "unauthorized"}), 401

    if not supabase_admin:
        return jsonify({"error": "supabase_admin_not_configured"}), 500

    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({"error": "missing_body"}), 400

    # do not allow changing primary key
    payload.pop("id", None)

    try:
        res = (
            supabase_admin.table("user_profiles")
            .update(payload)
            .eq("id", user_id)
            .execute()
        )
        return jsonify({"success": True, "updated": res.data}), 200
    except Exception as e:
        return jsonify({"error": "update_user_failed", "detail": str(e)}), 500


@admin_users_bp.delete("/<user_id>")
def delete_user(user_id):
    if not _require_admin():
        return jsonify({"error": "unauthorized"}), 401

    if not supabase_admin:
        return jsonify({"error": "supabase_admin_not_configured"}), 500

    try:
        res = supabase_admin.table("user_profiles").delete().eq("id", user_id).execute()
        return jsonify({"success": True, "deleted": res.data}), 200
    except Exception as e:
        return jsonify({"error": "delete_user_failed", "detail": str(e)}), 500