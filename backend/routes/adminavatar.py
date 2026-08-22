import os
import requests
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv

load_dotenv()

admin_avatar_bp = Blueprint("admin_avatar", __name__, url_prefix="/api/admin/avatar")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

AVATAR_BUCKET = "avatars"


def _require_admin():
    # Simple DEV protection (NOT secure for production)
    return request.headers.get("X-Admin") == "true"


@admin_avatar_bp.get("/signed-url")
def admin_avatar_signed_url():
    """
    Admin-only signed DOWNLOAD URL.
    Example:
      GET /api/admin/avatar/signed-url?path=<user_id>/avatar.jpg
    """
    if not _require_admin():
        return jsonify({"error": "unauthorized"}), 401

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return jsonify({"error": "supabase_admin_not_configured"}), 500

    path = (request.args.get("path") or "").strip()
    if not path:
        return jsonify({"error": "missing_path"}), 400

    endpoint = f"{SUPABASE_URL}/storage/v1/object/sign/{AVATAR_BUCKET}/{path}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    body = {"expiresIn": 60 * 10}  # 10 minutes

    r = requests.post(endpoint, headers=headers, json=body, timeout=20)
    if r.status_code >= 400:
        return jsonify({"error": "signed_url_failed", "detail": r.text}), 500

    data = r.json()
    signed_path = data.get("signedURL") or data.get("signedUrl")
    if not signed_path:
        return jsonify({"error": "signed_url_missing"}), 500

    return jsonify({"signed_url": f"{SUPABASE_URL}{signed_path}"}), 200