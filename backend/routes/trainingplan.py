import os
import json
import re
import datetime
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(override=True)

trainingplan_bp = Blueprint("trainingplan", __name__, url_prefix="/api/training-plan")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase_admin = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


# ============================================================
# AI EXTRACTION
# ============================================================

def _default_fallback_plan(profile: dict) -> dict:
    name = profile.get("name") or profile.get("user_name") or "Player"
    pos = profile.get("position") or "Midfielder"
    return {
        "title": f"Custom {pos.capitalize()} Training Plan",
        "summary": f"A comprehensive training plan tailored for {name} to enhance position-specific skills, agility, and tactical awareness.",
        "duration": "45 mins",
        "difficulty": "Intermediate",
        "key_focus_areas": [f"{pos} positioning", "Ball mastery", "Match stamina"],
        "days": [
            {
                "day": "Day 1",
                "focus": "Core Skills & Agility",
                "warmup": "10 min dynamic stretching and light jogging with ball control.",
                "drills": [
                    {
                        "name": "Quick Passing & Receiving",
                        "duration": "15 mins",
                        "sets": "3",
                        "reps": "12",
                        "instructions": "Practice 1-touch and 2-touch passing against a wall or with a partner. Focus on opening your body when receiving.",
                        "tips": ["Keep on your toes", "Check your shoulder before receiving"]
                    },
                    {
                        "name": f"{pos.capitalize()} Specific Drills",
                        "duration": "15 mins",
                        "sets": "4",
                        "reps": "8",
                        "instructions": "High intensity sprint and technical execution tailored for your position on the field.",
                        "tips": ["Maintain high intensity", "Focus on clean technique under fatigue"]
                    }
                ],
                "cooldown": "5 min light jogging and static stretching."
            }
        ],
        "nutrition_tips": [
            "Drink at least 500ml of water 2 hours before training.",
            "Consume a high-protein snack within 30 minutes after session completion."
        ],
        "notes": f"Generated specifically for {name}. Adjust reps based on fatigue."
    }

def _extract_training_with_ai(messages: list, profile: dict) -> dict:
    from langchain_groq import ChatGroq

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY not set")

    llm = ChatGroq(
        groq_api_key=api_key,
        model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
        temperature=0.0,
    )

    # Build transcript — sanitize quotes to avoid JSON breakage
    transcript = ""
    for msg in messages:
        role = "Player" if msg.get("role") == "user" else "Coach Max"
        text = msg.get("text", "").replace('"', "'")
        transcript += f"{role}: {text}\n\n"

    name = profile.get("name") or profile.get("user_name") or "Player"
    position = profile.get("position") or "player"

    prompt = f"""You are a JSON generator. Extract a comprehensive football training plan from this conversation.

PLAYER: {name} | POSITION: {position}

CONVERSATION:
{transcript[:8000]}

CRITICAL INSTRUCTION 1: You MUST extract EVERY SINGLE drill mentioned in the conversation!
CRITICAL INSTRUCTION 2: You MUST STRICTLY respect the user's constraints regarding the number of days and total duration. If the user explicitly asks for a 1-day plan, your output MUST contain EXACTLY ONE day. If the user asks for a 2-hour plan, the total duration MUST NOT exceed 2 hours. Do NOT hallucinate extra days or extend durations beyond what the user requested.

Return ONLY a valid JSON object. No explanation. No markdown. No code fences. Just raw JSON.

Use this exact structure:
{{
  "title": "Training Plan Title",
  "summary": "Brief summary",
  "duration": "45 mins",
  "difficulty": "Beginner",
  "key_focus_areas": ["area1", "area2"],
  "days": [
    {{
      "day": "Day 1",
      "focus": "Focus area",
      "warmup": "Warmup description",
      "drills": [
        {{
          "name": "Drill name",
          "duration": "10 mins",
          "sets": "3",
          "reps": "10",
          "instructions": "How to do it",
          "tips": ["Tip 1", "Tip 2"]
        }}
      ],
      "cooldown": "Cooldown description"
    }}
  ],
  "nutrition_tips": ["tip1", "tip2"],
  "notes": "Extra notes"
}}"""

    resp = llm.invoke(prompt)
    content = resp.content.strip()

    # ---- Aggressive JSON cleaning ----
    content = re.sub(r"```json\s*", "", content)
    content = re.sub(r"```\s*", "", content)
    content = content.strip()

    # Extract just the JSON object
    match = re.search(r'\{.*\}', content, re.DOTALL)
    if match:
        content = match.group(0)

    # Fix trailing commas
    content = re.sub(r',\s*}', '}', content)
    content = re.sub(r',\s*]', ']', content)

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Fallback: ask for ultra-simple plan
        simple_prompt = f"""Create a simple football training plan for a {position} named {name}.
Return ONLY valid JSON, no other text:
{{"title":"Training Plan","summary":"Custom plan for {position}","duration":"45 mins","difficulty":"Intermediate","key_focus_areas":["passing","fitness"],"days":[{{"day":"Day 1","focus":"Core Skills","warmup":"5 min jog","drills":[{{"name":"Passing drill","duration":"10 mins","sets":"3","reps":"10","instructions":"Pass the ball with a partner focusing on accuracy","tips":["Keep your eye on the ball","Use inside of foot"]}}],"cooldown":"5 min stretch"}}],"nutrition_tips":["Stay hydrated","Eat protein after training"],"notes":"Plan based on coaching session"}}"""

        resp2 = llm.invoke(simple_prompt)
        content2 = resp2.content.strip()
        content2 = re.sub(r"```json\s*", "", content2)
        content2 = re.sub(r"```\s*", "", content2)
        match2 = re.search(r'\{.*\}', content2, re.DOTALL)
        if match2:
            content2 = match2.group(0)
        content2 = re.sub(r',\s*}', '}', content2)
        try:
            return json.loads(content2)
        except Exception:
            return _default_fallback_plan(profile)
    except Exception:
        return _default_fallback_plan(profile)


# ============================================================
# ROUTES
# ============================================================

@trainingplan_bp.post("/extract")
def extract_plan():
    """Extract training plan from chat messages using AI."""
    body = request.get_json(silent=True) or {}
    user_id = body.get("user_id", "anonymous")
    messages = body.get("messages", [])
    profile = body.get("profile", {})

    try:
        extracted = _extract_training_with_ai(messages, profile) if messages else _default_fallback_plan(profile)
    except Exception:
        extracted = _default_fallback_plan(profile)

    extracted["extracted_at"] = datetime.datetime.utcnow().isoformat()
    extracted["user_id"] = user_id
    return jsonify({"plan": extracted}), 200


@trainingplan_bp.post("/save")
def save_plan():
    """Save extracted plan to Supabase training_plans table."""
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500

    body = request.get_json(silent=True) or {}
    user_id = body.get("user_id")
    plan = body.get("plan")

    if not plan:
        return jsonify({"error": "No plan provided"}), 400
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    try:
        row = {
            "user_id": user_id,
            "title": plan.get("title", "Untitled Plan"),
            "summary": plan.get("summary", ""),
            "duration": plan.get("duration", ""),
            "difficulty": plan.get("difficulty", "Intermediate"),
            "key_focus_areas": plan.get("key_focus_areas", []),
            "days": plan.get("days", []),
            "nutrition_tips": plan.get("nutrition_tips", []),
            "notes": plan.get("notes", ""),
            "extracted_at": plan.get("extracted_at"),
            "saved_at": datetime.datetime.utcnow().isoformat(),
        }

        res = supabase_admin.table("training_plans").insert(row).execute()

        if not res.data:
            return jsonify({"error": "Insert failed"}), 500

        return jsonify({"message": "Plan saved!", "plan": res.data[0]}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@trainingplan_bp.get("/list/<user_id>")
def list_plans(user_id):
    """Get all saved plans for a user from Supabase."""
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500

    try:
        res = (
            supabase_admin.table("training_plans")
            .select("*")
            .or_(f"user_id.eq.{user_id},assigned_to.eq.{user_id}")
            .order("saved_at", desc=True)
            .execute()
        )
        return jsonify({"plans": res.data or []}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@trainingplan_bp.delete("/delete/<user_id>/<plan_id>")
def delete_plan(user_id, plan_id):
    """Delete a specific plan from Supabase."""
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500

    try:
        supabase_admin.table("training_plans").delete().eq("id", plan_id).eq("user_id", user_id).execute()
        return jsonify({"message": "Plan deleted"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@trainingplan_bp.get("/get/<plan_id>")
def get_plan(plan_id):
    """Get a single plan by ID."""
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500

    try:
        res = (
            supabase_admin.table("training_plans")
            .select("*")
            .eq("id", plan_id)
            .maybe_single()
            .execute()
        )
        return jsonify({"plan": res.data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@trainingplan_bp.route("/track-day/<plan_id>", methods=["PUT", "OPTIONS"])
def track_day(plan_id):
    """Update tracking status and reason of a specific day in a plan."""
    if request.method == "OPTIONS":
        return jsonify({}), 200
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500

    body = request.get_json(silent=True) or {}
    day_index = body.get("day_index")
    status = body.get("status")
    reason = body.get("reason", "")
    
    if day_index is None or not status:
        return jsonify({"error": "day_index and status required"}), 400

    try:
        res = supabase_admin.table("training_plans").select("days").eq("id", plan_id).maybe_single().execute()
        if not res.data:
            return jsonify({"error": "Plan not found"}), 404
            
        days = res.data.get("days", [])
        
        try:
            day_idx = int(day_index)
            if day_idx < 0 or day_idx >= len(days):
                return jsonify({"error": "Invalid day_index"}), 400
        except ValueError:
            return jsonify({"error": "day_index must be an integer"}), 400
            
        days[day_idx]["tracking_status"] = status
        days[day_idx]["tracking_reason"] = reason
        
        update_res = (
            supabase_admin.table("training_plans")
            .update({"days": days})
            .eq("id", plan_id)
            .execute()
        )
        
        if not update_res.data:
            return jsonify({"error": "Failed to update plan"}), 500
            
        return jsonify({"message": "Day tracking updated", "plan": update_res.data[0]}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@trainingplan_bp.route("/primary/<user_id>", methods=["GET", "OPTIONS"])
def get_primary_plan(user_id):
    if request.method == "OPTIONS":
        return jsonify({}), 200
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500
        
    try:
        res = supabase_admin.table("player_primary_plan").select("plan_id").eq("user_id", user_id).maybe_single().execute()
        return jsonify({"primary_plan_id": res.data.get("plan_id") if res.data else None}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@trainingplan_bp.route("/primary/<user_id>", methods=["PUT", "OPTIONS"])
def set_primary_plan(user_id):
    if request.method == "OPTIONS":
        return jsonify({}), 200
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500
        
    body = request.get_json(silent=True) or {}
    plan_id = body.get("plan_id")
    
    if not plan_id:
        return jsonify({"error": "plan_id required"}), 400
        
    try:
        res = supabase_admin.table("player_primary_plan").upsert({"user_id": user_id, "plan_id": plan_id}).execute()
        return jsonify({"message": "Primary plan updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500