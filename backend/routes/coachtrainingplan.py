"""
coachtrainingplan.py  —  Train Max AI
Coach training plan backend routes.

Blueprint prefix: /api/coach-training-plan

Uses the SAME training_plans table as players but with:
  - saved_by_coach = true
  - coach_id = coach's user UUID
  - assigned_to = player UUID (optional — if saved for a specific player)

SQL to add columns if not present:
─────────────────────────────────────────────────────────────────────
alter table training_plans
  add column if not exists saved_by_coach boolean default false,
  add column if not exists coach_id       uuid references auth.users(id),
  add column if not exists assigned_to    uuid references auth.users(id),
  add column if not exists team_id        uuid references teams(id),
  add column if not exists target_name    text default '';
─────────────────────────────────────────────────────────────────────

Routes:
  POST   /extract              — AI extract plan from coach chat messages
  POST   /save                 — Save plan (coach account or assign to player)
  GET    /list                 — All plans saved by this coach
  GET    /list/player/<pid>    — Plans assigned to a specific player by this coach
  GET    /get/<plan_id>        — Single plan
  DELETE /delete/<plan_id>     — Delete a plan
"""

import os
import json
import re
import datetime

from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(override=True)

coach_tp_bp = Blueprint("coach_trainingplan", __name__, url_prefix="/api/coach-training-plan")

SUPABASE_URL              = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase_admin = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH HELPER
# ═══════════════════════════════════════════════════════════════════════════════

def _auth(req):
    header = req.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None, (jsonify({"error": "Missing Authorization header"}), 401)
    token = header.split(" ", 1)[1].strip()
    try:
        res  = supabase_admin.auth.get_user(token)
        user = res.user
        if not user:
            return None, (jsonify({"error": "Invalid token"}), 401)
        return user, None
    except Exception as e:
        return None, (jsonify({"error": str(e)}), 401)


def _is_coach(user_id: str) -> bool:
    try:
        r = supabase_admin.table("coach_profiles").select("id").eq("id", user_id).single().execute()
        return r.data is not None
    except Exception:
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# AI EXTRACTION  (mirrors player trainingplan.py logic)
# ═══════════════════════════════════════════════════════════════════════════════

def _extract_with_ai(messages: list, coach_name: str, target_name: str, target_context: str) -> dict:
    from langchain_groq import ChatGroq

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY not set")

    llm = ChatGroq(
        groq_api_key=api_key,
        model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
        temperature=0.0,
    )

    # Build transcript
    transcript = ""
    for msg in messages:
        role = "Coach" if msg.get("role") == "user" else "MAX"
        text = msg.get("text", "").replace('"', "'")
        transcript += f"{role}: {text}\n\n"

    prompt = f"""You are a JSON generator. Extract a comprehensive football training plan from this coaching conversation.

COACH: {coach_name}
TARGET: {target_name}
{target_context}

CONVERSATION:
{transcript[:8000]}

CRITICAL INSTRUCTION 1: You MUST extract EVERY SINGLE drill mentioned in the conversation!
CRITICAL INSTRUCTION 2: You MUST STRICTLY respect the coach's constraints regarding the number of days and total duration. If the coach explicitly asks for a 1-day plan, your output MUST contain EXACTLY ONE day. If the coach asks for a 2-hour plan, the total duration MUST NOT exceed 2 hours. Do NOT hallucinate extra days or extend durations beyond what was requested.

Return ONLY a valid JSON object. No explanation. No markdown. No code fences. Just raw JSON.

Use this exact structure:
{{
  "title": "Training Plan Title",
  "summary": "Brief summary of what this plan achieves",
  "duration": "e.g. 4 weeks",
  "difficulty": "Beginner | Intermediate | Advanced",
  "sessions_per_week": 3,
  "key_focus_areas": ["area1", "area2", "area3"],
  "days": [
    {{
      "day": "Day 1",
      "focus": "Session theme",
      "warmup": "Warmup description",
      "drills": [
        {{
          "name": "Drill name",
          "duration": "10 mins",
          "sets": "3",
          "reps": "10",
          "instructions": "How to perform this drill",
          "tips": ["Coaching cue 1", "Coaching cue 2"]
        }}
      ],
      "cooldown": "Cooldown description"
    }}
  ],
  "nutrition_tips": ["tip1", "tip2"],
  "notes": "Coach notes and tactical observations"
}}"""

    resp    = llm.invoke(prompt)
    content = resp.content.strip()

    # Clean fences
    content = re.sub(r"```json\s*", "", content)
    content = re.sub(r"```\s*",     "", content)
    content = content.strip()

    # Extract JSON object
    match = re.search(r'\{.*\}', content, re.DOTALL)
    if match:
        content = match.group(0)

    # Fix trailing commas
    content = re.sub(r',\s*}', '}', content)
    content = re.sub(r',\s*]', ']', content)

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Fallback simple plan
        fallback = f"""{{"title":"Training Plan for {target_name}","summary":"Custom coaching plan","duration":"4 weeks","difficulty":"Intermediate","sessions_per_week":3,"key_focus_areas":["passing","fitness","positioning"],"days":[{{"day":"Day 1","focus":"Technical Skills","warmup":"5 min light jog","drills":[{{"name":"Passing & Movement","duration":"15 mins","sets":"4","reps":"10","instructions":"Pair passing with movement after each pass — focus on weight and accuracy","tips":["Lock ankle on contact","Move after every pass"]}}],"cooldown":"5 min stretch"}},{{"day":"Day 2","focus":"Fitness & Stamina","warmup":"Dynamic stretching 5 mins","drills":[{{"name":"Interval Runs","duration":"20 mins","sets":"6","reps":"90 sec on / 30 sec off","instructions":"Sprint at 80% effort then jog recovery","tips":["Maintain posture","Drive arms"]}}],"cooldown":"Cool down walk 5 mins"}},{{"day":"Day 3","focus":"Game Application","warmup":"Rondo 5 mins","drills":[{{"name":"Small-sided Game","duration":"20 mins","sets":"4","reps":"5 min games","instructions":"Play 4v4 with coaching focus on today's theme","tips":["Encourage quick decisions","Reinforce positional shape"]}}],"cooldown":"Team stretch 5 mins"}}],"nutrition_tips":["Stay hydrated during training","Protein meal within 1 hour of session"],"notes":"Plan based on coach-MAX session"}}"""
        return json.loads(fallback)


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

# ── POST /api/coach-training-plan/extract ─────────────────────────────────────
@coach_tp_bp.post("/extract")
def extract_plan():
    """
    Extract a training plan from coach chat messages using AI.
    Body:
      messages      list   — chat messages [{role, text}]
      player_id     str    (optional) — extract for a specific player
      player_name   str    (optional)
      team_name     str    (optional)
    """
    user, err = _auth(request)
    if err: return err
    if not _is_coach(user.id):
        return jsonify({"error": "Coach account required"}), 403

    body        = request.get_json(silent=True) or {}
    messages    = body.get("messages", [])
    player_id   = body.get("player_id",   "").strip()
    player_name = body.get("player_name", "").strip()
    team_name   = body.get("team_name",   "").strip()

    if not messages:
        return jsonify({"error": "messages are required"}), 400

    # Filter out only initial greetings if present
    relevant = [m for m in messages if m.get("text") and not str(m.get("text")).startswith("👋 Welcome back")]
    if not relevant:
        relevant = messages

    # Build target context
    target_name    = player_name or team_name or "Team"
    target_context = ""
    if player_id:
        try:
            pr = supabase_admin.table("user_profiles").select(
                "user_name,position,focused_area,age,club"
            ).eq("id", player_id).single().execute()
            if pr.data:
                p = pr.data
                target_context = f"Position: {p.get('position','?')} | Age: {p.get('age','?')} | Club: {p.get('club','?')} | Focus: {p.get('focused_area','?')}"
                target_name    = player_name or p.get("user_name", "Player")
        except Exception:
            pass

    # Get coach name
    try:
        cp = supabase_admin.table("coach_profiles").select("full_name").eq("id", user.id).single().execute()
        coach_name = cp.data.get("full_name", "Coach") if cp.data else "Coach"
    except Exception:
        coach_name = "Coach"

    try:
        plan = _extract_with_ai(relevant, coach_name, target_name, target_context)
        plan["extracted_at"] = datetime.datetime.utcnow().isoformat()
        plan["target_name"]  = target_name
        return jsonify({"plan": plan}), 200

    except json.JSONDecodeError as e:
        return jsonify({"error": f"AI returned invalid JSON: {str(e)}"}), 500
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ── POST /api/coach-training-plan/save ────────────────────────────────────────
@coach_tp_bp.post("/save")
def save_plan():
    """
    Save a plan to training_plans table.
    Body:
      plan          dict   — the plan object
      player_id     str    (optional) — assign to player
      team_id       str    (optional) — tag with team
      target_name   str    (optional)
    """
    user, err = _auth(request)
    if err: return err
    if not _is_coach(user.id):
        return jsonify({"error": "Coach account required"}), 403

    body        = request.get_json(silent=True) or {}
    plan        = body.get("plan", {})
    player_id   = body.get("player_id",   "").strip() or None
    team_id     = body.get("team_id",     "").strip() or None
    target_name = body.get("target_name", plan.get("target_name", "")).strip()

    if not plan:
        return jsonify({"error": "plan is required"}), 400

    # Save against player if assigned, otherwise against coach
    save_uid = player_id if player_id else user.id

    try:
        row = {
            "user_id":          save_uid,
            "title":            plan.get("title",            "Coach Training Plan"),
            "summary":          plan.get("summary",          ""),
            "duration":         plan.get("duration",         ""),
            "difficulty":       plan.get("difficulty",       "Intermediate"),
            "key_focus_areas":  plan.get("key_focus_areas",  []),
            "days":             plan.get("days",             []),
            "nutrition_tips":   plan.get("nutrition_tips",   []),
            "notes":            plan.get("notes",            ""),
            "extracted_at":     plan.get("extracted_at",     datetime.datetime.utcnow().isoformat()),
            "saved_at":         datetime.datetime.utcnow().isoformat(),
            # Coach-specific extra columns
            "saved_by_coach":   True,
            "coach_id":         user.id,
            "assigned_to":      player_id,
            "team_id":          team_id,
            "target_name":      target_name,
        }
        try:
            res = supabase_admin.table("training_plans").insert(row).execute()
        except Exception:
            # Fallback: DB may lack coach-specific columns
            for key in ("saved_by_coach", "coach_id", "assigned_to", "team_id", "target_name"):
                row.pop(key, None)
            res = supabase_admin.table("training_plans").insert(row).execute()

        if not res.data:
            return jsonify({"error": "Insert failed"}), 500

        # Send notifications
        try:
            coach_name = "Your Coach"
            c_res = supabase_admin.table("coach_profiles").select("user_name").eq("id", user.id).single().execute()
            if c_res.data and c_res.data.get("user_name"):
                coach_name = c_res.data["user_name"]

            if player_id:
                # Notify the player
                supabase_admin.table("notifications").insert({
                    "user_id": player_id,
                    "title": "New Training Plan",
                    "message": f"Coach {coach_name} assigned you a new training plan: {row['title']}"
                }).execute()

                # Notify the coach
                supabase_admin.table("notifications").insert({
                    "user_id": user.id,
                    "title": "Plan Assigned",
                    "message": f"Successfully sent plan '{row['title']}' to {target_name}"
                }).execute()
        except Exception as e:
            # Notifications table might not exist or other error, but don't fail the save
            pass

        return jsonify({
            "message":  "Plan saved!",
            "plan_id":  res.data[0]["id"],
            "saved_for": "player" if player_id else "coach",
            "plan":     res.data[0],
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/coach-training-plan/list ─────────────────────────────────────────
@coach_tp_bp.get("/list")
def list_coach_plans():
    """All plans created by this coach (saved for themselves or for players)."""
    user, err = _auth(request)
    if err: return err
    if not _is_coach(user.id):
        return jsonify({"error": "Coach account required"}), 403

    try:
        res = supabase_admin.table("training_plans").select(
            "id,title,summary,duration,difficulty,key_focus_areas,saved_at,"
            "assigned_to,target_name,team_id,saved_by_coach,coach_id"
        ).eq("coach_id", user.id).order("saved_at", desc=True).execute()

        plans = res.data or []

        # Enrich with player name if assigned_to is set
        for p in plans:
            if p.get("assigned_to"):
                try:
                    pr = supabase_admin.table("user_profiles").select("user_name").eq(
                        "id", p["assigned_to"]).single().execute()
                    p["assigned_to_name"] = pr.data.get("user_name", "Player") if pr.data else "Player"
                except Exception:
                    p["assigned_to_name"] = "Player"
            else:
                p["assigned_to_name"] = None

        return jsonify({"plans": plans}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/coach-training-plan/list/player/<player_id> ─────────────────────
@coach_tp_bp.get("/list/player/<player_id>")
def list_player_plans(player_id):
    """Plans this coach assigned to a specific player."""
    user, err = _auth(request)
    if err: return err

    try:
        res = supabase_admin.table("training_plans").select("*") \
            .eq("coach_id", user.id) \
            .eq("assigned_to", player_id) \
            .order("saved_at", desc=True).execute()
        return jsonify({"plans": res.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/coach-training-plan/get/<plan_id> ────────────────────────────────
@coach_tp_bp.get("/get/<plan_id>")
def get_plan(plan_id):
    """Get a single plan by ID."""
    user, err = _auth(request)
    if err: return err

    try:
        res = supabase_admin.table("training_plans").select("*") \
            .eq("id", plan_id).maybe_single().execute()
        if not res.data:
            return jsonify({"error": "Plan not found"}), 404
        return jsonify({"plan": res.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── DELETE /api/coach-training-plan/delete/<plan_id> ─────────────────────────
@coach_tp_bp.delete("/delete/<plan_id>")
def delete_plan(plan_id):
    """Delete a plan. Coach must own it (coach_id check)."""
    user, err = _auth(request)
    if err: return err

    try:
        # Verify ownership
        check = supabase_admin.table("training_plans").select("id,coach_id") \
            .eq("id", plan_id).maybe_single().execute()
        if not check.data:
            return jsonify({"error": "Plan not found"}), 404
        if check.data.get("coach_id") != user.id:
            return jsonify({"error": "Not authorized to delete this plan"}), 403

        supabase_admin.table("training_plans").delete().eq("id", plan_id).execute()
        return jsonify({"message": "Plan deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
