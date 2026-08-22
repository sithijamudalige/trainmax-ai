import os
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(override=True)

notification_bp = Blueprint("notification", __name__, url_prefix="/api/notifications")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase_admin = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _auth(req):
    header = req.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None, (jsonify({"error": "Missing Authorization header"}), 401)
    token = header.split(" ", 1)[1].strip()
    try:
        res = supabase_admin.auth.get_user(token)
        user = res.user
        if not user:
            return None, (jsonify({"error": "Invalid token"}), 401)
        return user, None
    except Exception as e:
        return None, (jsonify({"error": str(e)}), 401)


@notification_bp.get("/list")
def list_notifications():
    """Get all notifications for the authenticated user."""
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500

    user, err = _auth(request)
    if err:
        return err

    try:
        res = (
            supabase_admin.table("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", desc=True)
            .execute()
        )
        return jsonify({"notifications": res.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@notification_bp.post("/read/<notification_id>")
def mark_as_read(notification_id):
    """Mark a notification as read."""
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500

    user, err = _auth(request)
    if err:
        return err

    try:
        # Update is_read
        res = (
            supabase_admin.table("notifications")
            .update({"is_read": True})
            .eq("id", notification_id)
            .eq("user_id", user.id)
            .execute()
        )
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@notification_bp.post("/read-all")
def mark_all_as_read():
    """Mark all notifications as read for the user."""
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500

    user, err = _auth(request)
    if err:
        return err

    try:
        # Update all unread for user
        res = (
            supabase_admin.table("notifications")
            .update({"is_read": True})
            .eq("user_id", user.id)
            .eq("is_read", False)
            .execute()
        )
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
