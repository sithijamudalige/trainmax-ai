import os
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase_admin = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _get_bearer_token():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[len("Bearer "):].strip()
    return None


def require_auth():
    token = _get_bearer_token()
    if not token:
        return None, (jsonify({"error": "missing_bearer_token"}), 401)

    if not supabase_admin:
        return None, (jsonify({"error": "supabase_admin_not_configured"}), 500)

    try:
        result = supabase_admin.auth.get_user(token)
        user = result.user
        if not user:
            return None, (jsonify({"error": "invalid_token"}), 401)
        return {"sub": user.id, "email": user.email}, None
    except Exception as e:
        return None, (jsonify({"error": "invalid_token", "detail": str(e)}), 401)


@auth_bp.get("/profile")
def get_profile():
    """Get current user's profile"""
    payload, err = require_auth()
    if err:
        return err

    if not supabase_admin:
        return jsonify({"error": "supabase_admin_not_configured"}), 500

    user_id = payload.get("sub")
    if not user_id:
        return jsonify({"error": "missing_user_id"}), 401

    try:
        res = (
            supabase_admin.table("user_profiles")
            .select("*")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        return jsonify({"profile": res.data}), 200
    except Exception as e:
        return jsonify({"error": "profile_fetch_failed", "detail": str(e)}), 500


@auth_bp.post("/profile")
def create_profile():
    """Create profile for current user"""
    payload, err = require_auth()
    if err:
        return err

    if not supabase_admin:
        return jsonify({"error": "supabase_admin_not_configured"}), 500

    user_id = payload.get("sub")
    email = payload.get("email")
    if not user_id:
        return jsonify({"error": "missing_user_id"}), 401

    body = request.get_json(silent=True) or {}
    body["id"] = user_id
    body["email"] = email

    try:
        res = supabase_admin.table("user_profiles").insert(body).execute()
        return jsonify({"profile": res.data[0] if res.data else None}), 201
    except Exception as e:
        return jsonify({"error": "profile_creation_failed", "detail": str(e)}), 500


@auth_bp.put("/profile")
def update_profile():
    """Update current user's profile"""
    payload, err = require_auth()
    if err:
        return err

    if not supabase_admin:
        return jsonify({"error": "supabase_admin_not_configured"}), 500

    user_id = payload.get("sub")
    if not user_id:
        return jsonify({"error": "missing_user_id"}), 401

    body = request.get_json(silent=True) or {}
    body.pop("id", None)
    body.pop("email", None)

    try:
        res = (
            supabase_admin.table("user_profiles")
            .update(body)
            .eq("id", user_id)
            .execute()
        )
        return jsonify({"profile": res.data[0] if res.data else None}), 200
    except Exception as e:
        return jsonify({"error": "profile_update_failed", "detail": str(e)}), 500