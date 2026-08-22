import os
import datetime
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(override=True)

notebook_bp = Blueprint("notebook", __name__, url_prefix="/api/notebook")

SUPABASE_URL             = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase_admin = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

CATEGORIES = ["general", "training", "match", "tactics", "nutrition", "injury", "goals", "other"]


def _require_user_id(body):
    uid = body.get("user_id")
    if not uid:
        return None, (jsonify({"error": "user_id required"}), 400)
    return uid, None


# ---- List all notes for a user ----
@notebook_bp.get("/list/<user_id>")
def list_notes(user_id):
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500
    try:
        res = (
            supabase_admin.table("notebooks")
            .select("*")
            .eq("user_id", user_id)
            .order("is_pinned", desc=True)
            .order("updated_at", desc=True)
            .execute()
        )
        return jsonify({"notes": res.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---- Get single note ----
@notebook_bp.get("/get/<note_id>")
def get_note(note_id):
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500
    try:
        res = (
            supabase_admin.table("notebooks")
            .select("*")
            .eq("id", note_id)
            .maybe_single()
            .execute()
        )
        return jsonify({"note": res.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---- Create note ----
@notebook_bp.post("/create")
def create_note():
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500

    body    = request.get_json(silent=True) or {}
    uid, err = _require_user_id(body)
    if err:
        return err

    try:
        row = {
            "user_id":  uid,
            "title":    body.get("title",    "Untitled Note"),
            "content":  body.get("content",  ""),
            "category": body.get("category", "general"),
            "tags":     body.get("tags",     []),
            "is_pinned":body.get("is_pinned", False),
            "color":    body.get("color",    "#6a11cb"),
        }
        res = supabase_admin.table("notebooks").insert(row).execute()
        return jsonify({"note": res.data[0] if res.data else None}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---- Update note ----
@notebook_bp.put("/update/<note_id>")
def update_note(note_id):
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500

    body = request.get_json(silent=True) or {}

    try:
        allowed = ["title", "content", "category", "tags", "is_pinned", "color"]
        updates = {k: body[k] for k in allowed if k in body}
        updates["updated_at"] = datetime.datetime.utcnow().isoformat()

        res = (
            supabase_admin.table("notebooks")
            .update(updates)
            .eq("id", note_id)
            .execute()
        )
        return jsonify({"note": res.data[0] if res.data else None}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---- Delete note ----
@notebook_bp.delete("/delete/<user_id>/<note_id>")
def delete_note(user_id, note_id):
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500
    try:
        supabase_admin.table("notebooks").delete().eq("id", note_id).eq("user_id", user_id).execute()
        return jsonify({"message": "Note deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---- Toggle pin ----
@notebook_bp.patch("/pin/<note_id>")
def toggle_pin(note_id):
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500
    try:
        curr = supabase_admin.table("notebooks").select("is_pinned").eq("id", note_id).maybe_single().execute()
        new_val = not (curr.data or {}).get("is_pinned", False)
        res = supabase_admin.table("notebooks").update({"is_pinned": new_val, "updated_at": datetime.datetime.utcnow().isoformat()}).eq("id", note_id).execute()
        return jsonify({"note": res.data[0] if res.data else None}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---- Search notes ----
@notebook_bp.get("/search/<user_id>")
def search_notes(user_id):
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500

    q = request.args.get("q", "").strip().lower()
    if not q:
        return jsonify({"notes": []}), 200

    try:
        res = (
            supabase_admin.table("notebooks")
            .select("*")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .execute()
        )
        notes    = res.data or []
        filtered = [
            n for n in notes
            if q in (n.get("title") or "").lower()
            or q in (n.get("content") or "").lower()
            or any(q in tag.lower() for tag in (n.get("tags") or []))
            or q in (n.get("category") or "").lower()
        ]
        return jsonify({"notes": filtered}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    