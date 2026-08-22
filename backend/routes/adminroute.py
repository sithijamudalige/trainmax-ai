import os
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv

load_dotenv()

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")


@admin_bp.post("/login")
def admin_login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({"success": False, "error": "missing_username_or_password"}), 400

    if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
        return jsonify({"success": False, "error": "invalid_credentials"}), 401

    return jsonify({"success": True, "message": "admin_login_success"}), 200