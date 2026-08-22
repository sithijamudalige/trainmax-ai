"""
coachchatbot.py  —  Train Max AI
Coach AI chatbot backend.

Blueprint prefix: /api/coach-chatbot

Features:
  - Coach-personalized MAX persona (knows coach's teams, players)
  - Coach can add/remove teams to the active chat context
  - Per-player coaching: coach picks a player, gets personalized advice
    using that player's real stats + profile from the DB
  - Same RAG + Groq LLM stack as player chatbot
  - Session memory per coach (local JSON)
  - All routes require Coach JWT

Routes:
  POST /ask                     — Ask MAX as a coach
  POST /ask-player              — Ask about a specific player (personalized)
  GET  /context-teams/<coach_id>  — Get teams added to coach's chat context
  POST /context-teams           — Add a team to chat context
  DELETE /context-teams/<team_id> — Remove a team from chat context
  GET  /memory/<coach_id>       — Get coach memory
  DELETE /memory/<coach_id>     — Clear coach memory
  GET  /status                  — Health check
"""

import os
import json
import datetime
import re

from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from supabase import create_client
from .chatbot import (
    NUMERIC_STAT_KEYS,
    _empty_stats,
    _sanitize_stats,
    _extract_match_stats,
    _normalize_typos
)

load_dotenv(override=True)

coach_chatbot_bp = Blueprint("coach_chatbot", __name__, url_prefix="/api/coach-chatbot")

# ── Supabase ─────────────────────────────────────────────────────────────────
SUPABASE_URL              = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase_admin = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# ── Shared RAG/LLM (reuse from main chatbot module) ──────────────────────────
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR    = os.path.join(BASE_DIR, "data")
PERSIST_DIR = os.path.join(BASE_DIR, "chroma_db")
MEMORY_DIR  = os.path.join(BASE_DIR, "coach_memory")   # separate from player memory

db           = None
llm          = None
_setup_done  = False
_setup_error = None


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH HELPER
# ═══════════════════════════════════════════════════════════════════════════════

def _auth(req) -> tuple:
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
# SETUP (RAG + LLM)
# ═══════════════════════════════════════════════════════════════════════════════

def _setup():
    global db, llm, _setup_done, _setup_error
    if _setup_done:
        return
    try:
        import glob
        from langchain_huggingface import HuggingFaceEmbeddings
        from langchain_chroma import Chroma
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        from langchain_groq import ChatGroq

        emb         = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        sqlite_path = os.path.join(PERSIST_DIR, "chroma.sqlite3")

        if os.path.exists(sqlite_path):
            db = Chroma(persist_directory=PERSIST_DIR, embedding_function=emb)
            print("✅ Coach chatbot: loaded existing Chroma DB")
        else:
            from langchain_community.document_loaders import PyPDFDirectoryLoader, TextLoader, DirectoryLoader
            docs = []
            if glob.glob(os.path.join(DATA_DIR, "**", "*.pdf"), recursive=True):
                docs.extend(PyPDFDirectoryLoader(DATA_DIR).load())
            if glob.glob(os.path.join(DATA_DIR, "**", "*.txt"), recursive=True):
                docs.extend(DirectoryLoader(DATA_DIR, glob="**/*.txt", loader_cls=TextLoader,
                                            loader_kwargs={"encoding": "utf-8"}).load())
            if not docs:
                raise RuntimeError(f"No docs in {DATA_DIR}")
            chunks = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=150).split_documents(docs)
            os.makedirs(PERSIST_DIR, exist_ok=True)
            db = Chroma.from_documents(chunks, emb, persist_directory=PERSIST_DIR)
            print(f"✅ Coach chatbot: built Chroma DB with {len(chunks)} chunks")

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY not set")
        llm = ChatGroq(
            groq_api_key=api_key,
            model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
            temperature=0.3
        )
        print("✅ Coach chatbot: Groq LLM ready")
        _setup_done  = True
        _setup_error = None
    except Exception as e:
        _setup_error = str(e)
        _setup_done  = False
        raise


def _stats_file_path(user_id: str) -> str:
    os.makedirs(MEMORY_DIR, exist_ok=True)
    return os.path.join(MEMORY_DIR, f"stats_{user_id}.json")


def _load_coach_stats(user_id: str) -> dict:
    local_stats = None
    fp = _stats_file_path(user_id)
    if os.path.exists(fp):
        try:
            with open(fp, "r", encoding="utf-8") as f:
                local_stats = _sanitize_stats(json.load(f))
        except Exception:
            pass

    if not supabase_admin:
        return local_stats or _empty_stats()
    try:
        res = supabase_admin.table("coach_stats").select("*").eq("user_id", user_id).maybe_single().execute()
        if res.data:
            row = dict(res.data)
            for f in ("id", "user_id", "updated_at", "created_at"):
                row.pop(f, None)
            s = _sanitize_stats(row)
            try:
                with open(fp, "w", encoding="utf-8") as f:
                    json.dump(s, f, indent=2)
            except Exception:
                pass
            return s
        empty = local_stats or _empty_stats()
        try:
            supabase_admin.table("coach_stats").insert({
                "user_id": user_id,
                **{k: v for k, v in empty.items() if k not in ("achievements", "match_log")},
                "achievements": [],
                "match_log": []
            }).execute()
        except Exception:
            pass
        return empty
    except Exception:
        return local_stats or _empty_stats()


def _save_coach_stats(user_id: str, stats: dict):
    stats = _sanitize_stats(stats)
    try:
        fp = _stats_file_path(user_id)
        with open(fp, "w", encoding="utf-8") as f:
            json.dump(stats, f, indent=2)
    except Exception as e:
        print("⚠️ Failed to save local coach stats backup:", e)

    if not supabase_admin: return
    try:
        payload = {
            "user_id": user_id,
            "wins": stats["wins"],
            "losses": stats["losses"],
            "draws": stats["draws"],
            "matches_played": stats["matches_played"],
            "win_streak": stats["win_streak"],
            "current_streak": stats["current_streak"],
            "sessions": stats["sessions"],
            "achievements": stats["achievements"],
            "match_log": stats["match_log"],
            "updated_at": datetime.datetime.utcnow().isoformat()
        }
        supabase_admin.table("coach_stats").upsert(payload, on_conflict="user_id").execute()
    except Exception as e:
        print("⚠️ Note: Supabase coach_stats table may not exist yet, using local backup:", e)


# ═══════════════════════════════════════════════════════════════════════════════
# MEMORY (per coach, JSON file)
# ═══════════════════════════════════════════════════════════════════════════════

def _memory_path(coach_id: str) -> str:
    os.makedirs(MEMORY_DIR, exist_ok=True)
    return os.path.join(MEMORY_DIR, f"coach_{coach_id}.json")


def _load_memory(coach_id: str) -> dict:
    local_data = {}
    path = _memory_path(coach_id)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                local_data = json.load(f)
        except Exception:
            pass

    data = None
    if supabase_admin:
        try:
            res = supabase_admin.table("chat_memory_coaches").select("*").eq("coach_id", coach_id).maybe_single().execute()
            if res.data:
                data = res.data
        except Exception as e:
            print(f"⚠️ Failed to load coach memory from DB: {e}")

    if not data:
        data = local_data

    data.setdefault("coach_id",       coach_id)
    data.setdefault("history",        [])          # [{q, a, player_context?}]
    data.setdefault("key_insights",   [])          # coach notes MAX picks up
    data.setdefault("focus_areas",    [])          # team/player topics discussed
    data.setdefault("context_teams",  [])          # [{team_id, name, added_at}]
    return data


def _save_memory(coach_id: str, memory: dict):
    path = _memory_path(coach_id)
    keep = ("coach_id","history","key_insights","focus_areas","context_teams")
    save_data = {k: memory[k] for k in keep if k in memory}
    
    # Save local backup
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(save_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"⚠️ _save_memory (coach local) error: {e}")

    # Save to Supabase
    if supabase_admin:
        try:
            save_data["updated_at"] = datetime.datetime.utcnow().isoformat()
            supabase_admin.table("chat_memory_coaches").upsert(save_data, on_conflict="coach_id").execute()
        except Exception as e:
            print(f"⚠️ _save_memory (coach DB) error: {e}")


def _add_to_history(memory: dict, question: str, answer: str, player_name: str = None):
    entry = {"q": question, "a": answer}
    if player_name:
        entry["player"] = player_name
    memory["history"].append(entry)
    memory["history"] = memory["history"][-12:]


# ═══════════════════════════════════════════════════════════════════════════════
# DATA FETCHERS
# ═══════════════════════════════════════════════════════════════════════════════

def _get_coach_profile(coach_id: str) -> dict:
    try:
        r = supabase_admin.table("coach_profiles").select("*").eq("id", coach_id).single().execute()
        return r.data or {}
    except Exception:
        return {}


def _get_coach_teams(coach_id: str) -> list:
    """All teams owned by this coach, with member count."""
    try:
        res = supabase_admin.table("teams").select("*").eq("coach_id", coach_id).execute()
        teams = res.data or []
        for t in teams:
            try:
                mc = supabase_admin.table("team_members").select("id", count="exact").eq("team_id", t["id"]).execute()
                t["member_count"] = mc.count or 0
            except Exception:
                t["member_count"] = 0
        return teams
    except Exception:
        return []


def _get_team_with_players(team_id: str) -> dict:
    """Full team + enriched members."""
    try:
        t = supabase_admin.table("teams").select("*").eq("id", team_id).single().execute().data
        if not t:
            return {}
        members_res = supabase_admin.table("team_members").select("*").eq("team_id", team_id).execute()
        members = members_res.data or []
        enriched = []
        for m in members:
            try:
                p = supabase_admin.table("user_profiles").select(
                    "user_name,email,position,club,country,age,focused_area,height_ft,weight_kg,bmi"
                ).eq("id", m["player_id"]).single().execute()
                m["profile"] = p.data or {}
            except Exception:
                m["profile"] = {}
            # Load player stats
            try:
                s = supabase_admin.table("player_stats").select("*").eq("user_id", m["player_id"]).single().execute()
                m["stats"] = s.data or {}
            except Exception:
                m["stats"] = {}
            enriched.append(m)
        t["members"] = enriched
        return t
    except Exception:
        return {}


def _get_player_full(player_id: str) -> tuple:
    """Returns (profile, stats) for a player."""
    profile, stats = {}, {}
    try:
        p = supabase_admin.table("user_profiles").select("*").eq("id", player_id).single().execute()
        profile = p.data or {}
    except Exception:
        pass
    try:
        s = supabase_admin.table("player_stats").select("*").eq("user_id", player_id).single().execute()
        stats = s.data or {}
    except Exception:
        pass
    return profile, stats


def _get_context_teams_data(context_team_ids: list) -> list:
    """Fetch full data for teams in context."""
    result = []
    for tid in context_team_ids:
        t = _get_team_with_players(tid)
        if t:
            result.append(t)
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# PERSONA BUILDERS
# ═══════════════════════════════════════════════════════════════════════════════

def _build_coach_persona(coach: dict, memory: dict, teams_data: list, question: str, coach_stats: dict = None) -> str:
    name       = coach.get("full_name", "Coach")
    club       = coach.get("club", "")
    country    = coach.get("country", "")
    exp        = coach.get("experience_level", "mid")
    specs      = coach.get("specializations", [])
    bio        = coach.get("bio", "")

    exp_labels = {"beginner": "Developing Coach", "junior": "Junior Coach (1-3 yrs)",
                  "mid": "Experienced Coach (3-7 yrs)", "senior": "Elite Senior Coach (7+ yrs)"}
    exp_label = exp_labels.get(exp, exp)

    # Team context summary
    team_summaries = []
    for t in teams_data:
        members = t.get("members", [])
        player_lines = []
        for m in members:
            pr = m.get("profile", {})
            st = m.get("stats", {})
            pname = pr.get("user_name", "Unknown")
            pos   = m.get("position") or pr.get("position", "?")
            role  = m.get("role", "player")
            goals = int(st.get("goals_scored") or 0)
            wins  = int(st.get("wins") or 0)
            mp    = int(st.get("matches_played") or 0)
            w_rate = round(wins / mp * 100) if mp > 0 else 0
            player_lines.append(
                f"    • {pname} [{role}] | {pos} | ⚽{goals}G | 🏆{wins}W ({w_rate}%)"
            )
        team_summaries.append(
            f"  Team: {t.get('name','?')} ({len(members)} players)\n" + "\n".join(player_lines[:20])
        )

    teams_block = "\n\n".join(team_summaries) if team_summaries else "  No teams added to context yet."

    # Coach match record
    stats_block = "No match record recorded yet."
    if coach_stats:
        w = int(coach_stats.get("wins") or 0)
        l = int(coach_stats.get("losses") or 0)
        d = int(coach_stats.get("draws") or 0)
        m = int(coach_stats.get("matches_played") or 0)
        strk = int(coach_stats.get("win_streak") or 0)
        w_rate = round(w / m * 100) if m > 0 else 0
        stats_block = f"🏆 Wins: {w} | 🤝 Draws: {d} | 😞 Defeats/Losses: {l} | ⚽ Total Matches: {m} ({w_rate}% Win Rate) | 🔥 Best Win Streak: {strk}"

    # Memory context
    mem_lines = []
    if memory.get("key_insights"):
        mem_lines.append(f"💡 Insights: {'; '.join(memory['key_insights'][-4:])}")
    if memory.get("focus_areas"):
        mem_lines.append(f"📚 Topics: {', '.join(memory['focus_areas'])}")
    if memory.get("history"):
        last = memory["history"][-3:]
        hist = "\n".join([
            f"  Coach: {h['q'][:80]}\n  MAX: {h['a'][:180]}..."
            + (f"\n  [About: {h['player']}]" if h.get("player") else "")
            for h in last
        ])
        mem_lines.append(f"💬 Recent:\n{hist}")
    memory_block = "\n".join(mem_lines) if mem_lines else "No prior sessions."

    return f"""You are MAX, an elite AI football coaching assistant with 20 years of professional experience.
You are now working with a COACH, not a player. Respond like a professional coaching partner.

COACH: {name}
Club/Academy: {club or 'Independent'} | Country: {country}
Experience: {exp_label}
Specializations: {', '.join(specs) if specs else 'General coaching'}
Bio: {bio or 'Not provided'}

COACH'S PERSONAL MATCH RECORD (Wins, Defeats/Losses, Draws):
{stats_block}

COACH'S ACTIVE TEAMS (with player stats from database):
{teams_block}

COACHING MEMORY:
{memory_block}

YOUR ROLE AS MAX FOR THIS COACH:
1. Give TACTICAL and TEAM-LEVEL advice (formations, pressing systems, set pieces, training drills for groups).
2. When asked about match results or records, reference the COACH'S PERSONAL MATCH RECORD and team stats above.
3. Suggest position-specific drills for the players you can see.
4. Identify weak spots by looking at team stats (low win rates, few goals, etc.) and recommend fixes.
5. Use professional coaching language appropriate for {exp_label}.
6. Be specific: name players, name drills, give durations and intensities.
7. If no team is in context, guide the coach to add a team first.

RULES:
- Always reference real match record and player data when available. Never forget wins, defeats, or draws shown above.
- Never make up player names — only use names from the teams above.
- End each response with ONE sharp tactical insight for {name}.
"""


def _build_player_persona(coach: dict, player_profile: dict, player_stats: dict, question: str) -> str:
    """Persona for when coach asks about a specific player."""
    coach_name = coach.get("full_name", "Coach")
    pname    = player_profile.get("user_name", "Player")
    position = player_profile.get("position", "player")
    age      = player_profile.get("age", "unknown")
    club     = player_profile.get("club", "unknown")
    focused  = player_profile.get("focused_area", "general skills")
    height   = player_profile.get("height_ft", "?")
    weight   = player_profile.get("weight_kg", "?")

    goals   = int(player_stats.get("goals_scored") or 0)
    assists = int(player_stats.get("assists")      or 0)
    wins    = int(player_stats.get("wins")         or 0)
    losses  = int(player_stats.get("losses")       or 0)
    draws   = int(player_stats.get("draws")        or 0)
    matches = int(player_stats.get("matches_played") or 0)
    motm    = int(player_stats.get("motm")         or 0)
    cs      = int(player_stats.get("clean_sheets") or 0)
    streak  = int(player_stats.get("win_streak")   or 0)
    sessions = int(player_stats.get("sessions")    or 0)
    win_rate = round(wins / matches * 100) if matches > 0 else 0

    return f"""You are MAX, an elite AI football coaching assistant.
Coach {coach_name} is asking you for personalized coaching advice about one of their players.

PLAYER PROFILE:
Name: {pname} | Position: {position} | Age: {age}
Club: {club} | Focused Area: {focused}
Height: {height}ft | Weight: {weight}kg

PLAYER CAREER STATS (real database data):
⚽ Goals: {goals} | 🤝 Assists: {assists} | ⭐ MoTM: {motm}
🏆 Wins: {wins} | 🤝 Draws: {draws} | 😞 Defeats/Losses: {losses} ({matches} matches, {win_rate}% win rate)
🧱 Clean Sheets: {cs} | 🔥 Best Streak: {streak} | 💬 Sessions with MAX: {sessions}

YOUR JOB:
- Give Coach {coach_name} specific, actionable advice to develop {pname}.
- Reference the REAL stats above — celebrate strengths, identify weaknesses. Remember the player's wins, defeats, and draws.
- Suggest 2-3 specific drills tailored to {position} at this player's level.
- Include: drill name, duration, sets/reps, 2 coaching cues per drill.
- Give the coach tips on HOW to deliver feedback to this player effectively.
- End with ONE insight Coach {coach_name} should act on this week for {pname}.
"""


# ═══════════════════════════════════════════════════════════════════════════════
# LLM CALLER
# ═══════════════════════════════════════════════════════════════════════════════

def _ask_llm(question: str, persona: str, k: int = 4) -> str:
    results = db.similarity_search(question, k=k)
    context = "\n\n".join(r.page_content for r in results).strip()
    prompt  = f"""{persona}

KNOWLEDGE BASE:
{context if context else "No specific material found."}

QUESTION:
{question}

Respond as MAX:"""
    return llm.invoke(prompt).content


# ═══════════════════════════════════════════════════════════════════════════════
# MEMORY UPDATER
# ═══════════════════════════════════════════════════════════════════════════════

def _update_coach_memory(memory: dict, question: str, answer: str):
    q = question.lower()
    a = answer.lower()

    topic_map = {
        "pressing": "pressing", "formation": "formations", "4-3-3": "formations",
        "4-4-2": "formations", "3-5-2": "formations", "drill": "drills",
        "set piece": "set pieces", "free kick": "free kicks", "corner": "corners",
        "fitness": "fitness", "stamina": "stamina", "speed": "speed training",
        "passing": "passing", "shooting": "shooting", "dribbling": "dribbling",
        "defending": "defending", "tactics": "tactics", "motivation": "motivation",
        "injury": "injury management", "recovery": "recovery",
        "warm up": "warm-up", "cool down": "cool-down",
    }
    for kw, topic in topic_map.items():
        if kw in q and topic not in memory["focus_areas"]:
            memory["focus_areas"].append(topic)
            memory["focus_areas"] = memory["focus_areas"][-10:]

    for kw in ["i noticed", "coach noticed", "the team", "players are", "we need to", "key issue"]:
        if kw in a:
            idx  = a.find(kw)
            fact = answer[idx:idx+120].split(".")[0].strip()
            if fact and fact not in memory["key_insights"]:
                memory["key_insights"].append(fact)
                memory["key_insights"] = memory["key_insights"][-6:]


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

# ── POST /api/coach-chatbot/ask ───────────────────────────────────────────────
@coach_chatbot_bp.post("/ask")
def coach_ask():
    """General coach question — uses all context teams."""
    user, err = _auth(request)
    if err: return err
    if not _is_coach(user.id):
        return jsonify({"error": "Coach account required"}), 403

    body     = request.get_json(silent=True) or {}
    question = body.get("question", "").strip()
    if not question:
        return jsonify({"error": "question is required"}), 400

    try:
        _setup()
        coach   = _get_coach_profile(user.id)
        memory  = _load_memory(user.id)

        # Load context teams
        context_team_ids = [t["team_id"] for t in memory.get("context_teams", [])]
        teams_data = _get_context_teams_data(context_team_ids)

        if supabase_admin:
            try:
                supabase_admin.table("chat_messages").insert({
                    "user_id": user.id,
                    "role": "user",
                    "text": question,
                    "mode": "general"
                }).execute()
            except Exception as e:
                print("⚠️ Failed to save user message:", e)

        # ── STATS UPDATE ──
        coach_stats = _load_coach_stats(user.id)
        coach_stats["sessions"] += 1
        stat_changes = _extract_match_stats(question, coach_stats)
        if stat_changes or coach_stats.get("sessions"): # save when stats changed or sessions incremented
            _save_coach_stats(user.id, coach_stats)

        persona = _build_coach_persona(coach, memory, teams_data, question, coach_stats=coach_stats)
        answer  = _ask_llm(question, persona)

        if supabase_admin:
            try:
                supabase_admin.table("chat_messages").insert({
                    "user_id": user.id,
                    "role": "bot",
                    "text": answer,
                    "mode": "general"
                }).execute()
            except Exception as e:
                print("⚠️ Failed to save bot message:", e)

        _add_to_history(memory, question, answer)
        _update_coach_memory(memory, question, answer)
        _save_memory(user.id, memory)

        return jsonify({
            "answer":       answer,
            "coach_name":   coach.get("full_name", "Coach"),
            "teams_loaded": len(teams_data),
            "memory_stats": {
                "history_count": len(memory["history"]),
                "topics":        memory["focus_areas"],
            },
        }), 200

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ── POST /api/coach-chatbot/ask-player ───────────────────────────────────────
@coach_chatbot_bp.post("/ask-player")
def coach_ask_player():
    """
    Personalized coaching advice for a specific player.
    Body: { question, player_id }
    """
    user, err = _auth(request)
    if err: return err
    if not _is_coach(user.id):
        return jsonify({"error": "Coach account required"}), 403

    body      = request.get_json(silent=True) or {}
    question  = body.get("question", "").strip()
    player_id = body.get("player_id", "").strip()

    if not question:
        return jsonify({"error": "question is required"}), 400
    if not player_id:
        return jsonify({"error": "player_id is required"}), 400

    try:
        _setup()
        coach          = _get_coach_profile(user.id)
        memory         = _load_memory(user.id)
        player_profile, player_stats = _get_player_full(player_id)

        if not player_profile:
            return jsonify({"error": "Player not found"}), 404

        if supabase_admin:
            try:
                supabase_admin.table("chat_messages").insert({
                    "user_id": user.id,
                    "role": "user",
                    "text": question,
                    "mode": "player"
                }).execute()
            except Exception as e:
                print("⚠️ Failed to save user message:", e)

        # ── STATS UPDATE IN PLAYER MODE ──
        coach_stats = _load_coach_stats(user.id)
        coach_stats["sessions"] += 1
        c_changes = _extract_match_stats(question, coach_stats)
        if c_changes or True:
            _save_coach_stats(user.id, coach_stats)

        p_changes = _extract_match_stats(question, player_stats)
        if p_changes and supabase_admin:
            try:
                supabase_admin.table("player_stats").update({
                    "wins": player_stats.get("wins", 0),
                    "losses": player_stats.get("losses", 0),
                    "draws": player_stats.get("draws", 0),
                    "matches_played": player_stats.get("matches_played", 0),
                    "win_streak": player_stats.get("win_streak", 0),
                    "current_streak": player_stats.get("current_streak", 0)
                }).eq("user_id", player_id).execute()
            except Exception as e:
                print("⚠️ Failed to update player match stats:", e)

        persona = _build_player_persona(coach, player_profile, player_stats, question)
        answer  = _ask_llm(question, persona)

        if supabase_admin:
            try:
                supabase_admin.table("chat_messages").insert({
                    "user_id": user.id,
                    "role": "bot",
                    "text": answer,
                    "mode": "player"
                }).execute()
            except Exception as e:
                print("⚠️ Failed to save bot message:", e)

        player_name = player_profile.get("user_name", "Player")
        _add_to_history(memory, question, answer, player_name=player_name)
        _update_coach_memory(memory, question, answer)
        _save_memory(user.id, memory)

        return jsonify({
            "answer":      answer,
            "player_name": player_name,
            "player_stats": {
                "goals_scored":   int(player_stats.get("goals_scored") or 0),
                "assists":        int(player_stats.get("assists") or 0),
                "wins":           int(player_stats.get("wins") or 0),
                "losses":         int(player_stats.get("losses") or 0),
                "matches_played": int(player_stats.get("matches_played") or 0),
                "win_rate":       round(int(player_stats.get("wins") or 0) / int(player_stats.get("matches_played") or 0) * 100)
                                  if int(player_stats.get("matches_played") or 0) > 0 else 0,
            },
        }), 200

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ── GET /api/coach-chatbot/context-teams/<coach_id> ──────────────────────────
@coach_chatbot_bp.get("/context-teams/<coach_id>")
def get_context_teams(coach_id):
    """Return teams currently added to this coach's chat context."""
    user, err = _auth(request)
    if err: return err

    memory = _load_memory(coach_id)
    context = memory.get("context_teams", [])

    # Enrich with current team data
    enriched = []
    for ct in context:
        try:
            t = supabase_admin.table("teams").select("id,name,color").eq("id", ct["team_id"]).single().execute()
            mc = supabase_admin.table("team_members").select("id", count="exact").eq("team_id", ct["team_id"]).execute()
            enriched.append({
                **ct,
                "name":         t.data.get("name", ct.get("name", "?")),
                "color":        t.data.get("color", "#10b981"),
                "member_count": mc.count or 0,
            })
        except Exception:
            enriched.append(ct)

    return jsonify({"context_teams": enriched}), 200


# ── POST /api/coach-chatbot/context-teams ────────────────────────────────────
@coach_chatbot_bp.post("/context-teams")
def add_context_team():
    """
    Add a team to the coach's chat context.
    Body: { team_id }
    """
    user, err = _auth(request)
    if err: return err
    if not _is_coach(user.id):
        return jsonify({"error": "Coach account required"}), 403

    data    = request.get_json(silent=True) or {}
    team_id = data.get("team_id", "").strip()
    if not team_id:
        return jsonify({"error": "team_id is required"}), 400

    # Verify team belongs to this coach
    try:
        t = supabase_admin.table("teams").select("id,name,color").eq("id", team_id).eq("coach_id", user.id).single().execute()
        if not t.data:
            return jsonify({"error": "Team not found or not yours"}), 404
        team_name  = t.data["name"]
        team_color = t.data.get("color", "#10b981")
    except Exception:
        return jsonify({"error": "Team not found"}), 404

    memory = _load_memory(user.id)
    if any(ct["team_id"] == team_id for ct in memory.get("context_teams", [])):
        return jsonify({"message": "Team already in context", "already_added": True}), 200

    memory.setdefault("context_teams", []).append({
        "team_id":  team_id,
        "name":     team_name,
        "color":    team_color,
        "added_at": datetime.datetime.utcnow().isoformat(),
    })
    _save_memory(user.id, memory)

    return jsonify({
        "message":       f"Team '{team_name}' added to chat context",
        "context_teams": memory["context_teams"],
    }), 200


# ── DELETE /api/coach-chatbot/context-teams/<team_id> ────────────────────────
@coach_chatbot_bp.delete("/context-teams/<team_id>")
def remove_context_team(team_id):
    """Remove a team from the coach's chat context."""
    user, err = _auth(request)
    if err: return err

    memory = _load_memory(user.id)
    before = len(memory.get("context_teams", []))
    memory["context_teams"] = [ct for ct in memory.get("context_teams", []) if ct["team_id"] != team_id]

    if len(memory["context_teams"]) == before:
        return jsonify({"error": "Team not in context"}), 404

    _save_memory(user.id, memory)
    return jsonify({"message": "Team removed from context", "context_teams": memory["context_teams"]}), 200


# ── GET /api/coach-chatbot/teams ──────────────────────────────────────────────
@coach_chatbot_bp.get("/teams")
def get_all_teams():
    """Return all teams owned by the coach (for the picker UI)."""
    user, err = _auth(request)
    if err: return err
    if not _is_coach(user.id):
        return jsonify({"error": "Coach account required"}), 403

    teams = _get_coach_teams(user.id)
    return jsonify({"teams": teams}), 200


# ── GET /api/coach-chatbot/team-players/<team_id> ────────────────────────────
@coach_chatbot_bp.get("/team-players/<team_id>")
def get_team_players(team_id):
    """Return full player list for a team (for player picker in chat)."""
    user, err = _auth(request)
    if err: return err

    team = _get_team_with_players(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404
    return jsonify({"team": team}), 200


# ── GET /api/coach-chatbot/memory/<coach_id> ─────────────────────────────────
@coach_chatbot_bp.get("/memory/<coach_id>")
def get_memory(coach_id):
    user, err = _auth(request)
    if err: return err
    memory = _load_memory(coach_id)
    return jsonify(memory), 200


# ── DELETE /api/coach-chatbot/memory/<coach_id> ──────────────────────────────
@coach_chatbot_bp.delete("/memory/<coach_id>")
def clear_memory(coach_id):
    user, err = _auth(request)
    if err: return err
    path = _memory_path(coach_id)
    if os.path.exists(path):
        os.remove(path)
    return jsonify({"message": "Coach memory cleared. Teams and context preserved in new session."}), 200

@coach_chatbot_bp.delete("/chat/<coach_id>")
def clear_chat(coach_id):
    user, err = _auth(request)
    if err: return err
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500
    try:
        supabase_admin.table("chat_history").delete().eq("user_id", coach_id).execute()
        return jsonify({"message": "Coach chat history cleared."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── POST /api/coach-chatbot/extract-plan ─────────────────────────────────────
@coach_chatbot_bp.post("/extract-plan")
def extract_plan():
    """
    Extract a structured training plan from the coach chat history.
    Mirrors /api/training-plan/extract but uses coach context.

    Body:
      messages      list  — full chat message array [{role, text}]
      coach_id      str
      player_id     str   (optional) — if extracting for a specific player
      team_id       str   (optional) — if extracting for a whole team
    """
    user, err = _auth(request)
    if err: return err
    if not _is_coach(user.id):
        return jsonify({"error": "Coach account required"}), 403

    body      = request.get_json(silent=True) or {}
    messages  = body.get("messages", [])
    player_id = body.get("player_id", "").strip()
    team_id   = body.get("team_id",   "").strip()

    if not messages:
        return jsonify({"error": "messages are required"}), 400

    # ── Groq only — no ChromaDB needed ───────────────────────────────────────
    try:
        from langchain_groq import ChatGroq
        import concurrent.futures

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return jsonify({"error": "GROQ_API_KEY not set in .env"}), 500

        # Only last 10 messages, truncated, to keep prompt small and fast
        relevant = messages[-10:]
        transcript_lines = []
        for m in relevant:
            role = "Coach" if m.get("role") == "user" else "MAX"
            text = m.get("text", "").replace('"', "'")[:300]
            transcript_lines.append(f"{role}: {text}")
        transcript = "\n".join(transcript_lines)

        # Build target context
        target_context = ""
        if player_id:
            profile, stats = _get_player_full(player_id)
            pname    = profile.get("user_name", "Player")
            position = profile.get("position",  "player")
            goals    = stats.get("goals_scored", 0)
            wins     = stats.get("wins", 0)
            target_context = f"TARGET PLAYER: {pname} | {position} | ⚽{goals}G 🏆{wins}W"
        elif team_id:
            team = _get_team_with_players(team_id)
            if team:
                target_context = f"TARGET TEAM: {team.get('name','?')} ({len(team.get('members',[]))} players)"

        coach      = _get_coach_profile(user.id)
        coach_name = coach.get("full_name", "Coach")

        # Short focused prompt — less tokens = faster response
        extract_prompt = f"""Extract a football training plan from this coaching conversation as JSON.
Coach: {coach_name}. {target_context}

CONVERSATION:
{transcript}

Return ONLY this JSON, nothing else, no markdown:
{{"title":"Plan Title","summary":"Brief summary","duration":"4 weeks","difficulty":"Intermediate","sessions_per_week":3,"key_focus_areas":["passing","fitness"],"days":[{{"day":"Day 1","theme":"Technical Skills","duration_minutes":60,"intensity":"Medium","exercises":[{{"name":"Passing Drill","duration":"15 mins","sets":3,"reps":"10","description":"Pass with a partner","coaching_cues":["Lock ankle","Move after passing"],"equipment":"cones, ball"}}]}},{{"day":"Day 2","theme":"Fitness","duration_minutes":60,"intensity":"High","exercises":[{{"name":"Interval Runs","duration":"20 mins","sets":6,"reps":"90s on/30s off","description":"Sprint at 80% effort","coaching_cues":["Maintain posture","Drive arms"],"equipment":"none"}}]}}],"nutrition_tips":["Stay hydrated","Protein after training"],"coach_notes":"Based on session"}}"""

        groq_llm = ChatGroq(
            groq_api_key=api_key,
            model="llama-3.1-8b-instant",
            temperature=0.0,
            max_tokens=1200,
        )

        # Hard 45-second timeout using thread
        result_box = {}
        error_box  = {}

        def _call():
            try:
                result_box["r"] = groq_llm.invoke(extract_prompt).content.strip()
            except Exception as ex:
                error_box["e"]  = str(ex)

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(_call)
            try:
                future.result(timeout=45)
            except concurrent.futures.TimeoutError:
                return jsonify({"error": "Groq timed out (45s). Try again in a moment."}), 504

        if error_box:
            return jsonify({"error": f"Groq error: {error_box['e']}"}), 500

        raw = result_box.get("r", "")
        print(f"✅ Extract raw ({len(raw)} chars): {raw[:100]}")

        # Parse JSON
        clean = re.sub(r"```json\s*", "", raw)
        clean = re.sub(r"```\s*",     "", clean).strip()
        start = clean.find("{")
        end   = clean.rfind("}") + 1

        if start >= 0 and end > start:
            clean = clean[start:end]
            clean = re.sub(r",\s*}", "}", clean)
            clean = re.sub(r",\s*]", "]", clean)
            try:
                plan = json.loads(clean)
            except json.JSONDecodeError:
                plan = None
        else:
            plan = None

        # Fallback plan if JSON parsing fails
        if not plan:
            plan = {
                "title":             f"Training Plan — {coach_name}",
                "summary":           "Custom plan based on your coaching session.",
                "duration":          "4 weeks",
                "difficulty":        "Intermediate",
                "sessions_per_week": 3,
                "key_focus_areas":   ["Technical Skills", "Fitness", "Tactics"],
                "days": [
                    {"day": "Day 1", "theme": "Technical Skills", "duration_minutes": 60, "intensity": "Medium",
                     "exercises": [{"name": "Passing & Movement", "duration": "15 mins", "sets": 3, "reps": "10",
                                    "description": "Pair passing with movement after each pass",
                                    "coaching_cues": ["Lock ankle on contact", "Move after passing"], "equipment": "cones, ball"}]},
                    {"day": "Day 2", "theme": "Fitness", "duration_minutes": 60, "intensity": "High",
                     "exercises": [{"name": "Interval Runs", "duration": "20 mins", "sets": 6, "reps": "90s on/30s off",
                                    "description": "Sprint at 80%, jog recovery",
                                    "coaching_cues": ["Maintain posture", "Drive arms"], "equipment": "none"}]},
                    {"day": "Day 3", "theme": "Game Application", "duration_minutes": 60, "intensity": "Medium",
                     "exercises": [{"name": "Small-sided Game", "duration": "20 mins", "sets": 4, "reps": "5 min games",
                                    "description": "4v4 with tactical coaching focus",
                                    "coaching_cues": ["Quick decisions", "Maintain shape"], "equipment": "bibs, ball, cones"}]},
                ],
                "nutrition_tips": ["Stay hydrated during training", "Protein within 1hr of session"],
                "coach_notes":    raw[:200] if raw else "Plan generated from coaching session.",
            }

        plan["extracted_at"] = datetime.datetime.utcnow().isoformat()
        return jsonify({"plan": plan}), 200

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ── POST /api/coach-chatbot/save-plan ────────────────────────────────────────
@coach_chatbot_bp.post("/save-plan")
def save_plan():
    """
    Save an extracted coach training plan to Supabase training_plans table.
    Saves against the coach's user_id (or player_id if provided).

    Body:
      plan        dict  — the extracted plan object
      player_id   str   (optional) — save against player instead of coach
    """
    user, err = _auth(request)
    if err: return err
    if not _is_coach(user.id):
        return jsonify({"error": "Coach account required"}), 403

    body      = request.get_json(silent=True) or {}
    plan      = body.get("plan", {})
    player_id = body.get("player_id", "").strip() or None
    team_id   = body.get("team_id",   "").strip() or None

    if not plan:
        return jsonify({"error": "plan is required"}), 400

    # ── Normalise days — handle both frontend-scan format and AI format ────────
    # Frontend scan:  day.exercises = [{name, duration, sets, reps, description, coaching_cues, equipment}]
    # AI extract:     day.exercises = same OR day.drills = [{name, duration, sets, reps, instructions, tips}]
    raw_days = plan.get("days", [])
    normalised_days = []
    for day in raw_days:
        # Unify drills/exercises key
        exercises = day.get("exercises") or day.get("drills") or []
        norm_exs = []
        for ex in exercises:
            norm_exs.append({
                "name":          ex.get("name", "Drill"),
                "duration":      ex.get("duration", "15 mins"),
                "sets":          str(ex.get("sets", "3")),
                "reps":          str(ex.get("reps", "10")),
                "description":   ex.get("description") or ex.get("instructions", ""),
                "coaching_cues": ex.get("coaching_cues") or ex.get("tips") or [],
                "equipment":     ex.get("equipment", "ball, cones"),
            })
        normalised_days.append({
            "day":              day.get("day", f"Day {len(normalised_days)+1}"),
            "focus":            day.get("focus") or day.get("theme", "Training"),
            "theme":            day.get("theme") or day.get("focus", "Training"),
            "duration_minutes": day.get("duration_minutes", 60),
            "intensity":        day.get("intensity", "Medium"),
            "warmup":           day.get("warmup", ""),
            "cooldown":         day.get("cooldown", ""),
            "drills":           norm_exs,   # TrainingPlan.js uses drills
            "exercises":        norm_exs,   # CoachChatbot modal uses exercises
        })

    # Detect source — frontend scan or AI
    source        = plan.get("_source", "ai_extract")
    plan_title    = plan.get("title", "Coach Training Plan")
    target_name   = plan.get("target") or plan.get("target_name", "")

    # Save against player if given, otherwise against coach
    save_uid = player_id if player_id else user.id

    try:
        row = {
            # Core fields (match existing training_plans table schema)
            "user_id":          save_uid,
            "title":            plan_title,
            "summary":          plan.get("summary",          ""),
            "duration":         plan.get("duration",         ""),
            "difficulty":       plan.get("difficulty",       "Intermediate"),
            "key_focus_areas":  plan.get("key_focus_areas",  []),
            "days":             normalised_days,
            "nutrition_tips":   plan.get("nutrition_tips",   []),
            "notes":            plan.get("coach_notes") or plan.get("notes", ""),
            "extracted_at":     plan.get("extracted_at",     datetime.datetime.utcnow().isoformat()),
            "saved_at":         datetime.datetime.utcnow().isoformat(),
            # Coach-specific extra columns
            "saved_by_coach":   True,
            "coach_id":         user.id,
            "assigned_to":      player_id,
            "team_id":          team_id,
            "target_name":      target_name,
        }

        res = supabase_admin.table("training_plans").insert(row).execute()
        if not res.data:
            return jsonify({"error": "Insert returned no data. Check Supabase table columns."}), 500

        saved = res.data[0]
        print(f"✅ Plan saved: '{plan_title}' → user={save_uid[:8]}... source={source}")

        return jsonify({
            "message":    "Plan saved successfully",
            "plan_id":    saved.get("id"),
            "saved_for":  "player" if player_id else "coach",
            "source":     source,
            "plan":       saved,
        }), 201

    except Exception as e:
        err = str(e)
        print(f"❌ save-plan error: {err}")
        # If columns don't exist yet, try without coach-specific columns
        if "column" in err.lower() and ("saved_by_coach" in err or "coach_id" in err or "assigned_to" in err):
            try:
                fallback_row = {
                    "user_id":         save_uid,
                    "title":           plan_title,
                    "summary":         plan.get("summary", ""),
                    "duration":        plan.get("duration", ""),
                    "difficulty":      plan.get("difficulty", "Intermediate"),
                    "key_focus_areas": plan.get("key_focus_areas", []),
                    "days":            normalised_days,
                    "nutrition_tips":  plan.get("nutrition_tips", []),
                    "notes":           plan.get("coach_notes") or plan.get("notes", ""),
                    "extracted_at":    plan.get("extracted_at", datetime.datetime.utcnow().isoformat()),
                    "saved_at":        datetime.datetime.utcnow().isoformat(),
                }
                res2 = supabase_admin.table("training_plans").insert(fallback_row).execute()
                saved2 = res2.data[0] if res2.data else {}
                return jsonify({
                    "message":   "Plan saved (basic mode — run ALTER TABLE to add coach columns)",
                    "plan_id":   saved2.get("id"),
                    "saved_for": "player" if player_id else "coach",
                    "plan":      saved2,
                }), 201
            except Exception as e2:
                return jsonify({"error": str(e2)}), 500
        return jsonify({"error": err}), 500


# ── GET /api/coach-chatbot/test-extract ──────────────────────────────────────
@coach_chatbot_bp.get("/test-extract")
def test_extract():
    """
    Quick test — checks GROQ_API_KEY is set and Groq responds.
    Call this first if extract-plan hangs: GET /api/coach-chatbot/test-extract
    """
    try:
        from langchain_groq import ChatGroq
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return jsonify({"ok": False, "error": "GROQ_API_KEY not set in .env"}), 500
        llm_test = ChatGroq(
            groq_api_key=api_key,
            model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
            temperature=0.0,
            request_timeout=20,
        )
        resp = llm_test.invoke("Reply with only the word: READY")
        return jsonify({"ok": True, "groq_response": resp.content.strip()}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/coach-chatbot/history/<user_id> ─────────────────────────────────
@coach_chatbot_bp.get("/history/<user_id>")
def get_chat_history(user_id):
    if not supabase_admin:
        return jsonify({"history": []}), 200
    try:
        res = (
            supabase_admin.table("chat_messages")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
        )
        return jsonify({"history": res.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/coach-chatbot/status ────────────────────────────────────────────
@coach_chatbot_bp.get("/status")
def status():
    return jsonify({
        "db_ready":    db          is not None,
        "llm_ready":   llm         is not None,
        "setup_done":  _setup_done,
        "setup_error": _setup_error,
        "supabase_ok": supabase_admin is not None,
    }), 200

@coach_chatbot_bp.get("/stats/<user_id>")
def get_stats(user_id):
    if not supabase_admin:
        return jsonify({"stats": _empty_stats(), "achievements": [], "match_log": []}), 200
    try:
        s = _load_coach_stats(user_id)
        return jsonify({
            "stats": {
                "wins": s["wins"],
                "losses": s["losses"],
                "draws": s["draws"],
                "matches_played": s["matches_played"],
                "win_streak": s["win_streak"]
            },
            "achievements": s["achievements"],
            "match_log": s["match_log"]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
