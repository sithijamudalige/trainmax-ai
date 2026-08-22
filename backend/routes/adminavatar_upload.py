import os
import requests
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

admin_avatar_upload_bp = Blueprint(
    "admin_avatar_upload", __name__, url_prefix="/api/admin/avatar"
)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

AVATAR_BUCKET = "avatars"

supabase_admin = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _require_admin():
    return request.headers.get("X-Admin") == "true"


@admin_avatar_upload_bp.post("/upload/<user_id>")
def upload_avatar(user_id):
    """
    Multipart form-data:
      file=<image>
    Uploads to: avatars/<user_id>/avatar.<ext>
    Updates user_profiles.photo_path
    """
    if not _require_admin():
        return jsonify({"error": "unauthorized"}), 401

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY or not supabase_admin:
        return jsonify({"error": "supabase_admin_not_configured"}), 500

    if "file" not in request.files:
        return jsonify({"error": "missing_file"}), 400

    f = request.files["file"]
    if not f or not f.filename:
        return jsonify({"error": "missing_filename"}), 400

    filename = f.filename.lower()
    ext = "jpg"
    if filename.endswith(".png"):
        ext = "png"
    elif filename.endswith(".jpeg"):
        ext = "jpeg"
    elif filename.endswith(".webp"):
        ext = "webp"
    elif filename.endswith(".jpg"):
        ext = "jpg"

    # Storage path
    path = f"{user_id}/avatar.{ext}"

    # Upload to Supabase Storage via HTTP (service role)
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{AVATAR_BUCKET}/{path}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "x-upsert": "true",
        "Content-Type": f.mimetype or "application/octet-stream",
    }

    file_bytes = f.read()

    r = requests.post(upload_url, headers=headers, data=file_bytes, timeout=30)
    if r.status_code >= 400:
        return jsonify({"error": "upload_failed", "detail": r.text}), 500

    # Update DB photo_path
    try:
        supabase_admin.table("user_profiles").update({"photo_path": path}).eq("id", user_id).execute()
    except Exception as e:
        return jsonify({"error": "db_update_failed", "detail": str(e)}), 500

    return jsonify({"success": True, "photo_path": path}), 200