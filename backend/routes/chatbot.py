# routes/chatbot.py
import os
import glob
import json
import re
import datetime

from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(override=True)

chatbot_bp = Blueprint("chatbot", __name__, url_prefix="/api/chatbot")

BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR    = os.path.join(BASE_DIR, "data")
PERSIST_DIR = os.path.join(BASE_DIR, "chroma_db")
MEMORY_DIR  = os.path.join(BASE_DIR, "user_memory")

db           = None
llm          = None
_setup_done  = False
_setup_error = None

SUPABASE_URL              = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase_admin = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    print(f"[OK] Supabase connected: {SUPABASE_URL[:40]}...")
else:
    print("⚠️ Supabase NOT configured — check .env")


# ============================================================
# ACHIEVEMENTS
# ============================================================

ACHIEVEMENTS = [
    {"id":"first_goal",    "title":"First Blood",        "desc":"Scored your first goal",           "icon":"⚽","trigger":"goals_scored",  "threshold":1 },
    {"id":"hat_trick_ach", "title":"Hat Trick Hero",     "desc":"Scored a hat trick",               "icon":"🎩","trigger":"hat_trick",      "threshold":1 },
    {"id":"goals_5",       "title":"Goal Machine",       "desc":"Scored 5 goals total",             "icon":"🔥","trigger":"goals_scored",  "threshold":5 },
    {"id":"goals_10",      "title":"Sharp Shooter",      "desc":"Scored 10 goals total",            "icon":"🎯","trigger":"goals_scored",  "threshold":10},
    {"id":"goals_25",      "title":"Golden Boot",        "desc":"Scored 25 goals total",            "icon":"🥇","trigger":"goals_scored",  "threshold":25},
    {"id":"first_assist",  "title":"Team Player",        "desc":"Got your first assist",            "icon":"🤝","trigger":"assists",        "threshold":1 },
    {"id":"assists_5",     "title":"Playmaker",          "desc":"Got 5 assists",                    "icon":"🎪","trigger":"assists",        "threshold":5 },
    {"id":"assists_10",    "title":"Assist King",        "desc":"Got 10 assists",                   "icon":"👑","trigger":"assists",        "threshold":10},
    {"id":"first_clean",   "title":"Stone Wall",         "desc":"First clean sheet",                "icon":"🧱","trigger":"clean_sheets",  "threshold":1 },
    {"id":"clean_5",       "title":"Fort Knox",          "desc":"5 clean sheets",                   "icon":"🛡️","trigger":"clean_sheets", "threshold":5 },
    {"id":"first_win",     "title":"Winner",             "desc":"Won your first match",             "icon":"🏆","trigger":"wins",          "threshold":1 },
    {"id":"wins_10",       "title":"Consistent Winner",  "desc":"Won 10 matches",                   "icon":"🥈","trigger":"wins",          "threshold":10},
    {"id":"wins_25",       "title":"Champion",           "desc":"Won 25 matches",                   "icon":"🏅","trigger":"wins",          "threshold":25},
    {"id":"first_session", "title":"First Step",         "desc":"First coaching session with Max",  "icon":"👟","trigger":"sessions",      "threshold":1 },
    {"id":"sessions_10",   "title":"Dedicated",          "desc":"10 coaching sessions",             "icon":"💪","trigger":"sessions",      "threshold":10},
    {"id":"sessions_25",   "title":"Committed",          "desc":"25 coaching sessions",             "icon":"🔑","trigger":"sessions",      "threshold":25},
    {"id":"sessions_50",   "title":"Elite Mindset",      "desc":"50 coaching sessions",             "icon":"🧠","trigger":"sessions",      "threshold":50},
    {"id":"first_motm",    "title":"Star of the Show",   "desc":"Man of the Match first time",      "icon":"⭐","trigger":"motm",          "threshold":1 },
    {"id":"motm_5",        "title":"Crowd Favourite",    "desc":"Man of the Match 5 times",         "icon":"🌟","trigger":"motm",          "threshold":5 },
    {"id":"all_rounder",   "title":"All Rounder",        "desc":"Trained 5 different skill areas",  "icon":"🎨","trigger":"topics_count",  "threshold":5 },
    {"id":"streak_3",      "title":"On Fire",            "desc":"3-match winning streak",           "icon":"🔥","trigger":"win_streak",    "threshold":3 },
    {"id":"streak_5",      "title":"Unstoppable",        "desc":"5-match winning streak",           "icon":"⚡","trigger":"win_streak",    "threshold":5 },
]


# ============================================================
# SUPABASE STATS
# ============================================================

NUMERIC_STAT_KEYS = (
    "goals_scored", "assists", "clean_sheets", "wins", "losses", "draws",
    "matches_played", "motm", "hat_trick", "win_streak", "current_streak",
    "sessions", "topics_count",
)


def _empty_stats() -> dict:
    return {
        "goals_scored":   0,
        "assists":        0,
        "clean_sheets":   0,
        "wins":           0,
        "losses":         0,
        "draws":          0,
        "matches_played": 0,
        "motm":           0,
        "hat_trick":      0,
        "win_streak":     0,
        "current_streak": 0,
        "sessions":       0,
        "topics_count":   0,
        "achievements":   [],
        "match_log":      [],
    }


def _sanitize_stats(stats: dict) -> dict:
    """
    Guarantees every numeric stat field is a real int — never None or missing.
    Supabase returns NULL as None for columns added after a row was created,
    which causes TypeError on stats["field"] += 1 and silently crashes /ask.
    """
    for key in NUMERIC_STAT_KEYS:
        val = stats.get(key)
        try:
            stats[key] = int(val) if val is not None else 0
        except (TypeError, ValueError):
            stats[key] = 0
    stats["achievements"] = stats.get("achievements") or []
    stats["match_log"]    = stats.get("match_log")    or []
    return stats


def _load_db_stats(user_id: str) -> dict:
    if not supabase_admin:
        print("⚠️ Supabase not configured — using empty stats")
        return _empty_stats()
    try:
        res = (
            supabase_admin.table("player_stats")
            .select("*")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if res.data:
            row = dict(res.data)
            for f in ("id", "user_id", "updated_at", "created_at"):
                row.pop(f, None)
            row = _sanitize_stats(row)
            print(f"✅ Loaded stats from DB: goals={row['goals_scored']}, wins={row['wins']}, "
                  f"losses={row['losses']}, draws={row['draws']}, hat_trick={row['hat_trick']}")
            return row

        # Create empty row for new user
        print(f"📝 Creating new stats row for user {user_id[:8]}...")
        empty = _empty_stats()
        supabase_admin.table("player_stats").insert({
            "user_id": user_id,
            **{k: v for k, v in empty.items() if k not in ("achievements", "match_log")},
            "achievements": [],
            "match_log":    [],
        }).execute()
        return empty

    except Exception as e:
        print(f"❌ _load_db_stats error: {e}")
        import traceback; traceback.print_exc()
        return _empty_stats()


def _save_db_stats(user_id: str, stats: dict):
    if not supabase_admin:
        print("⚠️ Cannot save — Supabase not configured")
        return
    try:
        stats = _sanitize_stats(stats)
        payload = {
            "user_id":        user_id,
            "goals_scored":   stats["goals_scored"],
            "assists":        stats["assists"],
            "clean_sheets":   stats["clean_sheets"],
            "wins":           stats["wins"],
            "losses":         stats["losses"],
            "draws":          stats["draws"],
            "matches_played": stats["matches_played"],
            "motm":           stats["motm"],
            "hat_trick":      stats["hat_trick"],
            "win_streak":     stats["win_streak"],
            "current_streak": stats["current_streak"],
            "sessions":       stats["sessions"],
            "topics_count":   stats["topics_count"],
            "achievements":   stats["achievements"],
            "match_log":      stats["match_log"],
            "updated_at":     datetime.datetime.utcnow().isoformat(),
        }
        result = (
            supabase_admin.table("player_stats")
            .upsert(payload, on_conflict="user_id")
            .execute()
        )
        print(f"✅ Saved to DB: goals={payload['goals_scored']}, wins={payload['wins']}, "
              f"losses={payload['losses']}, draws={payload['draws']}, hat_trick={payload['hat_trick']}")
        if hasattr(result, "data"):
            print(f"   Upsert returned: {result.data}")
    except Exception as e:
        print(f"❌ _save_db_stats error: {e}")
        import traceback; traceback.print_exc()


# ============================================================
# LOCAL MEMORY
# ============================================================

def _memory_path(user_id: str) -> str:
    os.makedirs(MEMORY_DIR, exist_ok=True)
    return os.path.join(MEMORY_DIR, f"{user_id}.json")


def _load_memory(user_id: str) -> dict:
    local_data = {}
    path = _memory_path(user_id)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                local_data = json.load(f)
        except Exception:
            pass

    data = None
    if supabase_admin:
        try:
            res = supabase_admin.table("chat_memory_players").select("*").eq("user_id", user_id).maybe_single().execute()
            if res.data:
                data = res.data
        except Exception as e:
            print(f"⚠️ Failed to load memory from DB: {e}")

    if not data:
        data = local_data

    data.setdefault("user_id",     user_id)
    data.setdefault("history",     [])
    data.setdefault("key_facts",   [])
    data.setdefault("goals",       [])
    data.setdefault("injuries",    [])
    data.setdefault("strengths",   [])
    data.setdefault("weaknesses",  [])
    data.setdefault("last_topics", [])
    return data


def _save_memory(user_id: str, memory: dict):
    path      = _memory_path(user_id)
    save_keys = ("user_id","history","key_facts","goals","injuries","strengths","weaknesses","last_topics")
    save_data = {k: memory[k] for k in save_keys if k in memory}
    
    # Save local backup
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(save_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"⚠️ _save_memory (local) error: {e}")

    # Save to Supabase
    if supabase_admin:
        try:
            save_data["updated_at"] = datetime.datetime.utcnow().isoformat()
            supabase_admin.table("chat_memory_players").upsert(save_data, on_conflict="user_id").execute()
        except Exception as e:
            print(f"⚠️ _save_memory (DB) error: {e}")


# ============================================================
# ACHIEVEMENT ENGINE
# ============================================================

def _check_achievements(stats: dict) -> list:
    unlocked = {a["id"] for a in stats.get("achievements", [])}
    newly    = []
    for ach in ACHIEVEMENTS:
        if ach["id"] in unlocked:
            continue
        val = stats.get(ach["trigger"], 0) or 0
        if val >= ach["threshold"]:
            entry = {**ach, "unlocked_at": datetime.datetime.utcnow().isoformat()}
            stats["achievements"].append(entry)
            newly.append(entry)
            print(f"🏆 Achievement unlocked: {ach['title']}")
    return newly


# ============================================================
# TYPO NORMALIZER — runs before regex parsing
# ============================================================

# Keys are regex patterns, values are the corrected replacement.
# Duplicates and no-ops (e.g. 'today' → 'today') removed — Python dicts
# silently keep only the last value for a duplicate key, so they were
# wasted work at runtime.
_TYPO_MAP = {
    # Loss variants
    r'\blosse\b':        'lost',
    r'\blosst\b':        'lost',
    r'\blosing\b':       'lost',
    r'\bloosed\b':       'lost',
    r'\bwe lose\b':      'we lost',
    r'\bi lose\b':       'we lost',
    r'\bwe lossed\b':    'we lost',
    r'\bwe losst\b':     'we lost',
    r'\bwe losse\b':     'we lost',
    r'\blost it\b':      'we lost',
    r'\bdefeated\b':     'we lost',
    r'\bgot defeated\b': 'we lost',
    # Win variants
    r'\bwinned\b':       'won',
    r'\bwon it\b':       'we won',
    r'\bwe winn\b':      'we won',
    r'\bwinn\b':         'won',
    # Draw variants
    r'\bdrawed\b':       'drew',
    r'\bdraw\b':         'drew',
    # Goal variants
    r'\bscord\b':        'scored',
    r'\bscroe\b':        'scored',
    r'\bscoerd\b':       'scored',
    r'\bgol\b':          'goal',
    r'\bgols\b':         'goals',
    r'\bgolas\b':        'goals',
    # Number variants
    r'\bone\b':          '1',
    r'\btwo\b':          '2',
    r'\btow\b':          '2',
    r'\bthree\b':        '3',
    r'\bfour\b':         '4',
    r'\bfive\b':         '5',
    r'\bsix\b':          '6',
    r'\bseven\b':        '7',
    r'\beight\b':        '8',
    r'\bnine\b':         '9',
    r'\bten\b':          '10',
    # Assist variants
    r'\basist\b':        'assist',
    r'\bassit\b':        'assist',
    r'\basset\b':        'assist',
    r'\bassets\b':       'assists',
    # Today variants
    r'\btoady\b':        'today',
    r'\btodya\b':        'today',
    r'\btonday\b':       'today',
    r'\btdy\b':          'today',
    # Clean sheet variants
    r'\bclen sheet\b':   'clean sheet',
    r'\bclean shhet\b':  'clean sheet',
    r'\bclean shet\b':   'clean sheet',
    # Hat trick variants
    r'\bhat trik\b':     'hat trick',
    r'\bhattrik\b':      'hattrick',
    r'\bhat tirck\b':    'hat trick',
    # Match variants
    r'\bmacth\b':        'match',
    r'\bmatcch\b':       'match',
    r'\bmatsh\b':        'match',
    r'\bgame\b':         'match',
}


def _normalize_typos(text: str) -> str:
    """Fix common player typos before regex parsing runs."""
    t = text.lower()
    for pattern, replacement in _TYPO_MAP.items():
        t = re.sub(pattern, replacement, t)
    return t


# ============================================================
# STAT EXTRACTOR — comprehensive natural language parsing
# ============================================================

def _extract_match_stats(text: str, stats: dict) -> dict:
    """
    Parses ALL these patterns (after typo normalization):
      "I scored 2 goals"  "scored a goal"  "scored today"  "I scored"
      "we won 3-1"  "won today"  "we won"  "won the match"
      "hat trick"  "got a hat trick"
      "I got an assist"  "2 assists"  "assisted"
      "clean sheet"  "kept a clean sheet"
      "man of the match"  "motm"  "best player"
      "we lost"  "we drew"
      + all typo variants via _normalize_typos()
    """
    t       = _normalize_typos(text.lower().strip())   # ← normalise FIRST
    changes = {}

    print(f"\n🔍 Parsing (normalized): '{t[:80]}'")
    print(f"   Incoming -> goals={stats.get('goals_scored')}, hat_trick={stats.get('hat_trick')}, "
          f"losses={stats.get('losses')}, draws={stats.get('draws')}")

    # ================================================================
    # GOALS
    # ================================================================

    # "scored N goals" / "scored N goal"
    m = re.search(r'scored\s+(\d+)\s+goals?', t)
    if m:
        n = int(m.group(1))
        stats["goals_scored"] += n
        changes["goals_scored"] = n
        print(f"  ⚽ +{n} goals (scored N goals pattern)")
        if n >= 3:
            stats["hat_trick"] += 1
            changes["hat_trick"] = 1

    # "N goals" standalone e.g. "got 2 goals"
    if "goals_scored" not in changes:
        m2 = re.search(r'(\d+)\s+goals?', t)
        if m2 and any(kw in t for kw in ["scored","got","bagged","netted","grabbed","hit","provide","provided","made"]):
            n = int(m2.group(1))
            stats["goals_scored"] += n
            changes["goals_scored"] = n
            print(f"  ⚽ +{n} goals (N goals pattern)")
            if n >= 3:
                stats["hat_trick"] += 1
                changes["hat_trick"] = 1

    # Single goal phrases
    if "goals_scored" not in changes:
        single_goal_patterns = [
            r'\bi scored\b',
            r'\bscored a goal\b',
            r'\bscored today\b',
            r'\bscored one\b',
            r'\bgot a goal\b',
            r'\bnetted\b',
            r'\bbagged a goal\b',
            r'\bput one in\b',
            r'\bfound the net\b',
            r'\bscored the goal\b',
            r'\bscored in the match\b',
            r'\bi got a goal\b',
            r'\bi provide goal\b',
            r'\bprovide a goal\b',
            r'\bprovided a goal\b',
            r'\bi provided goal\b',
            r'\bmade a goal\b',
        ]
        for pat in single_goal_patterns:
            if re.search(pat, t):
                stats["goals_scored"] += 1
                changes["goals_scored"] = 1
                print(f"  ⚽ +1 goal (pattern: {pat})")
                break

    # ================================================================
    # HAT TRICK
    # ================================================================
    hat_patterns = [
        r'\bhat\s*trick\b',
        r'\bhattrick\b',
        r'\bgot a hat\b',
        r'\bscored three\b',
        r'\bthree goals\b',
    ]
    for pat in hat_patterns:
        if re.search(pat, t):
            if "hat_trick" not in changes:
                stats["hat_trick"] += 1
                changes["hat_trick"] = 1
                print(f"  🎩 hat trick")
            if "goals_scored" not in changes:
                stats["goals_scored"] += 3
                changes["goals_scored"] = 3
                print(f"  ⚽ +3 goals (hat trick)")
            break

    # ================================================================
    # ASSISTS
    # ================================================================
    assist_patterns = [
        r'(\d+)\s+assists?',
        r'\bgot\s+(\d+)\s+assists?\b',
    ]
    for pat in assist_patterns:
        m3 = re.search(pat, t)
        if m3:
            n = int(m3.group(1))
            stats["assists"] += n
            changes["assists"] = n
            print(f"  🤝 +{n} assists")
            break

    if "assists" not in changes:
        single_assist_patterns = [
            r'\bgot an?\s+assist\b',
            r'\bhad an?\s+assist\b',
            r'\bi assisted\b',
            r'\bassisted\b',
            r'\bprovided an?\s+assist\b',
            r'\bgot the assist\b',
            r'\bmade an?\s+assist\b',
            r'\bgot 1 assist\b',
            r'\bi provide assist\b',
            r'\bprovide an?\s+assist\b',
        ]
        for pat in single_assist_patterns:
            if re.search(pat, t):
                stats["assists"] += 1
                changes["assists"] = 1
                print(f"  🤝 +1 assist (pattern: {pat})")
                break

    # ================================================================
    # CLEAN SHEET
    # ================================================================
    clean_patterns = [
        r'\bclean\s*sheet\b',
        r'\bkept a clean\b',
        r'\bno goals conceded\b',
        r'\bkept cleansheet\b',
        r'\bdidn.t concede\b',
        r'\bdidnt concede\b',
    ]
    for pat in clean_patterns:
        if re.search(pat, t):
            stats["clean_sheets"] += 1
            changes["clean_sheets"] = 1
            print(f"  🧱 clean sheet")
            break

    # ================================================================
    # MATCH RESULT — score pattern FIRST (most reliable)
    # ================================================================
    score_match = re.search(r'\b(\d+)\s*[-:]\s*(\d+)\b', t)
    if score_match:
        a, b = int(score_match.group(1)), int(score_match.group(2))
        stats["matches_played"] += 1
        if a > b:
            stats["wins"]           += 1
            stats["current_streak"] += 1
            stats["win_streak"]      = max(stats["win_streak"], stats["current_streak"])
            changes["wins"] = 1
            print(f"  🏆 Win ({a}-{b})")
        elif a < b:
            stats["losses"]         += 1
            stats["current_streak"]  = 0
            changes["losses"] = 1
            print(f"  😞 Loss ({a}-{b})")
        else:
            stats["draws"]          += 1
            stats["current_streak"]  = 0
            changes["draws"] = 1
            print(f"  🤝 Draw ({a}-{b})")

    else:
        # ---- WIN phrases ----
        win_patterns = [
            r'\bwon\b',
            r'\bwin\b',
            r'\bwins\b',
            r'\bwinning\b',
            r'\bwe won\b',
            r'\bwe win\b',
            r'\bwon today\b',
            r'\bwin today\b',
            r'\bwon the match\b',
            r'\bwon the game\b',
            r'\bwon it\b',
            r'\bwon a match\b',
            r'\bgot a win\b',
            r'\bwe beat\b',
            r'\bbeat them\b',
            r'\bvictory\b',
            r'\bvictorious\b',
            r'\bwe got the win\b',
            r'\bwe claimed victory\b',
            r'\bour team won\b',
            r'\bmy team won\b',
        ]
        for pat in win_patterns:
            if re.search(pat, t):
                stats["wins"]           += 1
                stats["matches_played"] += 1
                stats["current_streak"] += 1
                stats["win_streak"]      = max(stats["win_streak"], stats["current_streak"])
                changes["wins"] = 1
                print(f"  🏆 Win (phrase: {pat})")
                break

        # ---- LOSS phrases ----
        if "losses" not in changes:
            loss_patterns = [
                r'\bwe lost\b',
                r'\blost today\b',
                r'\blost the match\b',
                r'\blost the game\b',
                r'\bgot beaten\b',
                r'\bwe were beaten\b',
                r'\bwe lost it\b',
                r'\bour team lost\b',
                r'\bmy team lost\b',
                r'\bdefeat\b',
                r'\bdefeated\b',
                r'\blost\b',
                r'\bloss\b',
                r'\blose\b',
                r'\blosing\b',
                r'\bloose\b',
                r'\bsuffered a defeat\b',
                r'\bsuffered a loss\b',
            ]
            for pat in loss_patterns:
                if re.search(pat, t):
                    stats["losses"]         += 1
                    stats["matches_played"] += 1
                    stats["current_streak"]  = 0
                    changes["losses"] = 1
                    print(f"  😞 Loss (phrase: {pat})")
                    break

        # ---- DRAW phrases ----
        if "draws" not in changes and "wins" not in changes and "losses" not in changes:
            draw_patterns = [
                r'\bdraw\b',
                r'\bdrew\b',
                r'\btie\b',
                r'\btied\b',
                r'\bdrawn\b',
                r'\bwe drew\b',
                r'\bdrew today\b',
                r'\bit was a draw\b',
                r'\bended in a draw\b',
                r'\bdraw today\b',
                r'\bfinished a draw\b',
                r'\bthe game was a draw\b',
                r'\bmatched ended draw\b',
                r'\ball square\b',
            ]
            for pat in draw_patterns:
                if re.search(pat, t):
                    stats["draws"]          += 1
                    stats["matches_played"] += 1
                    stats["current_streak"]  = 0
                    changes["draws"] = 1
                    print(f"  🤝 Draw (phrase: {pat})")
                    break

    # ================================================================
    # MAN OF THE MATCH
    # ================================================================
    motm_patterns = [
        r'\bman of the match\b',
        r'\bmotm\b',
        r'\bplayer of the match\b',
        r'\bbest player\b',
        r'\bgot motm\b',
        r'\bwas motm\b',
        r'\bi was the best player\b',
        r'\bnamed motm\b',
        r'\bawarded motm\b',
        r'\bman of match\b',
    ]
    for pat in motm_patterns:
        if re.search(pat, t):
            stats["motm"] += 1
            changes["motm"] = 1
            print(f"  ⭐ MoTM")
            break

    # ================================================================
    # LOG ENTRY
    # ================================================================
    if changes:
        stats.setdefault("match_log", [])
        stats["match_log"].append({
            "date":    datetime.datetime.utcnow().isoformat(),
            "message": text[:200],
            "changes": changes,
        })
        stats["match_log"] = stats["match_log"][-50:]
        print(f"  📝 Logged changes: {changes}")
    else:
        print(f"  ℹ️ No stat changes detected")

    return changes


# ============================================================
# MEMORY UPDATES
# ============================================================

def _add_to_history(memory: dict, question: str, answer: str):
    memory["history"].append({"q": question, "a": answer})
    if len(memory["history"]) > 10:
        memory["history"] = memory["history"][-10:]


def _extract_and_update_memory(memory: dict, stats: dict, question: str, answer: str):
    q = question.lower()
    a = answer.lower()

    for kw in ["want to","goal is","i want","my goal","trying to","improve my","work on","i need to"]:
        if kw in q:
            fact = question.strip()
            if fact not in memory["goals"]:
                memory["goals"].append(fact)
                memory["goals"] = memory["goals"][-5:]

    for kw in ["injured","injury","pain","sore","hurt","knee","ankle","hamstring","can't run","pulled"]:
        if kw in q:
            fact = question.strip()
            if fact not in memory["injuries"]:
                memory["injuries"].append(fact)
                memory["injuries"] = memory["injuries"][-5:]

    for kw in ["i notice","you mentioned","based on your","as a","since you"]:
        if kw in a:
            idx  = a.find(kw)
            fact = answer[idx:idx+120].split(".")[0].strip()
            if fact and fact not in memory["key_facts"]:
                memory["key_facts"].append(fact)
                memory["key_facts"] = memory["key_facts"][-8:]

    topic_map = {
        "passing":"passing","dribbling":"dribbling","shooting":"shooting",
        "fitness":"fitness","stamina":"stamina","speed":"speed",
        "positioning":"positioning","defending":"defending","heading":"heading",
        "tactics":"tactics","first touch":"first touch","crossing":"crossing",
        "goalkeeping":"goalkeeping","set piece":"set pieces","free kick":"free kicks",
    }
    for kw, topic in topic_map.items():
        if kw in q and topic not in memory["last_topics"]:
            memory["last_topics"].append(topic)
            memory["last_topics"] = memory["last_topics"][-8:]

    stats["topics_count"] = len(memory["last_topics"])


# ============================================================
# PERSONA
# ============================================================

def _get_skill_level(profile: dict) -> str:
    club = (profile.get("club") or "").lower()
    pros = ["barcelona","fcb","real madrid","manchester","chelsea","juventus","liverpool"]
    if any(c in club for c in pros): return "advanced"
    if not club or club in ["none","-",""]: return "beginner"
    return "intermediate"


def _build_persona(profile: dict, memory: dict, stats: dict) -> str:
    position = (profile.get("position") or "player").lower()
    age      = profile.get("age")          or "unknown"
    club     = profile.get("club")         or "unknown"
    focused  = profile.get("focused_area") or "general skills"
    name     = profile.get("name") or profile.get("user_name") or "Player"
    height   = profile.get("height_ft")   or "unknown"
    weight   = profile.get("weight_kg")   or "unknown"
    bmi      = profile.get("bmi")         or "unknown"
    skill    = _get_skill_level(profile)

    pos_tips = {
        "goalkeeper":           "shot-stopping, positioning, distribution, commanding the box, reflexes",
        "defender":             "tackling, positioning, aerial duels, marking, reading the game",
        "centre-back":          "aerial duels, positioning, tackling, organizing the defense",
        "fullback":             "overlapping runs, crossing, tracking wingers, 1v1 defending",
        "midfielder":           "passing range, pressing, ball retention, vision, box-to-box movement",
        "central midfielder":   "passing, positioning, pressing, linking play",
        "attacking midfielder": "creativity, through balls, pressing, final third decisions",
        "defensive midfielder": "interceptions, positioning, shielding defense, simple passing",
        "winger":               "dribbling, crossing, cutting inside, pace, 1v1 ability",
        "forward":              "movement, finishing, pressing, link-up play, attacking runs",
        "striker":              "finishing, movement off the ball, hold-up play, clinical decisions",
        "left_wing":            "dribbling, pace, cutting inside, crossing, 1v1",
        "right_wing":           "dribbling, pace, cutting inside, crossing, 1v1",
    }
    pos_focus = pos_tips.get(position, "overall football development")

    style_map = {
        "beginner":     "Simple language. Step-by-step. Very encouraging.",
        "intermediate": "Standard coaching language. Mix of drills. Tactical.",
        "advanced":     "Professional. High-intensity. Deep tactics.",
    }
    coaching_style = style_map[skill]

    mem_lines = []
    if memory.get("goals"):
        mem_lines.append(f"🎯 Goals: {'; '.join(memory['goals'][-3:])}")
    if memory.get("injuries"):
        mem_lines.append(f"🩹 Injuries: {'; '.join(memory['injuries'][-3:])}")
    if memory.get("key_facts"):
        mem_lines.append(f"💡 Facts: {'; '.join(memory['key_facts'][-5:])}")
    if memory.get("last_topics"):
        mem_lines.append(f"📚 Trained: {', '.join(memory['last_topics'])}")
    if memory.get("history"):
        last = memory["history"][-3:]
        hist = "\n".join([f"  Player: {h['q']}\n  Max: {h['a'][:200]}..." for h in last])
        mem_lines.append(f"💬 Recent:\n{hist}")

    memory_context = "\n".join(mem_lines) if mem_lines else "No prior sessions."

    goals    = stats.get("goals_scored",   0)
    assists  = stats.get("assists",         0)
    wins     = stats.get("wins",            0)
    losses   = stats.get("losses",          0)
    draws    = stats.get("draws",           0)
    matches  = stats.get("matches_played",  0)
    motm     = stats.get("motm",            0)
    cs       = stats.get("clean_sheets",    0)
    ht       = stats.get("hat_trick",       0)
    streak   = stats.get("win_streak",      0)
    sessions = stats.get("sessions",        0)
    win_rate = round((wins / matches) * 100) if matches > 0 else 0

    return f"""You are MAX, an elite AI football coach with 20 years of professional experience.

PLAYER: {name} | Age: {age} | Position: {position} | Club: {club}
Focused area: {focused} | Height: {height}ft | Weight: {weight}kg | BMI: {bmi}
Skill: {skill.upper()}

CAREER STATS (from database — these are REAL numbers):
⚽ Goals: {goals} | 🤝 Assists: {assists} | ⭐ MoTM: {motm} | 🎩 Hat Tricks: {ht}
🏆 W:{wins} D:{draws} L:{losses} ({matches} matches, {win_rate}% win rate)
🧱 Clean sheets: {cs} | 🔥 Best streak: {streak} | 💬 Sessions: {sessions}

COACHING: {pos_focus} | Style: {coaching_style}

MEMORY:
{memory_context}

RULES:
1. When player reports goals/wins → CELEBRATE first with real numbers ("That's {goals} goals now!").
2. Give specific drills: name, duration, sets/reps, 2 coaching cues.
3. Never generic — always tied to {position} at {skill} level.
4. Avoid exercises that worsen known injuries.
5. End with ONE powerful motivating sentence for a {position}."""


# ============================================================
# SETUP
# ============================================================

def _load_documents():
    from langchain_community.document_loaders import PyPDFDirectoryLoader, TextLoader, DirectoryLoader
    docs = []
    if glob.glob(os.path.join(DATA_DIR, "**", "*.pdf"), recursive=True):
        docs.extend(PyPDFDirectoryLoader(DATA_DIR).load())
    if glob.glob(os.path.join(DATA_DIR, "**", "*.txt"), recursive=True):
        docs.extend(DirectoryLoader(
            DATA_DIR, glob="**/*.txt",
            loader_cls=TextLoader,
            loader_kwargs={"encoding": "utf-8"},
        ).load())
    return docs


def _data_files_newer_than_db() -> bool:
    sqlite_path = os.path.join(PERSIST_DIR, "chroma.sqlite3")
    if not os.path.exists(sqlite_path):
        return True
    db_mtime = os.path.getmtime(sqlite_path)
    for pat in [os.path.join(DATA_DIR,"**","*.pdf"), os.path.join(DATA_DIR,"**","*.txt")]:
        for f in glob.glob(pat, recursive=True):
            if os.path.getmtime(f) > db_mtime:
                return True
    return False


def _setup():
    global db, llm, _setup_done, _setup_error
    if _setup_done:
        return
    try:
        from langchain_huggingface import HuggingFaceEmbeddings
        from langchain_chroma import Chroma
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        from langchain_groq import ChatGroq

        print("🔨 Chatbot setup starting...")
        emb         = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        sqlite_path = os.path.join(PERSIST_DIR, "chroma.sqlite3")

        if os.path.exists(sqlite_path) and not _data_files_newer_than_db():
            db = Chroma(persist_directory=PERSIST_DIR, embedding_function=emb)
            print("✅ Loaded existing Chroma DB")
        else:
            docs = _load_documents()
            if not docs:
                raise RuntimeError(f"No docs in {DATA_DIR}")
            chunks = RecursiveCharacterTextSplitter(
                chunk_size=800, chunk_overlap=150
            ).split_documents(docs)
            if not chunks:
                raise RuntimeError("0 chunks after splitting")
            os.makedirs(PERSIST_DIR, exist_ok=True)
            db = Chroma.from_documents(chunks, emb, persist_directory=PERSIST_DIR)
            print(f"✅ Built Chroma DB with {len(chunks)} chunks")

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY not set")
        llm = ChatGroq(
            groq_api_key=api_key,
            model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
            temperature=0.3,
        )
        print("✅ Groq LLM ready")
        _setup_done  = True
        _setup_error = None

    except Exception as e:
        _setup_error = str(e)
        _setup_done  = False
        print(f"❌ Setup error: {e}")
        raise


# ============================================================
# ASK
# ============================================================

def _ask(question: str, profile: dict, memory: dict, stats: dict, k: int = 4) -> str:
    results = db.similarity_search(question, k=k)
    context = "\n\n".join(r.page_content for r in results).strip()
    persona = _build_persona(profile, memory, stats)
    prompt  = f"""{persona}

KNOWLEDGE BASE:
{context if context else "No specific material found."}

PLAYER'S MESSAGE:
{question}

Respond as MAX:"""
    return llm.invoke(prompt).content


# ============================================================
# ROUTES
# ============================================================

@chatbot_bp.post("/ask")
def ask_endpoint():
    body     = request.get_json(silent=True) or {}
    question = body.get("question", "").strip()
    profile  = body.get("profile",  {})
    user_id  = body.get("user_id",  "anonymous")

    if not question:
        return jsonify({"error": "question is required"}), 400

    try:
        _setup()

        memory = _load_memory(user_id)
        stats  = _sanitize_stats(_load_db_stats(user_id))  # sanitize on load

        print(f"\n{'='*50}")
        print(f"User: {user_id[:8]}... | Q: {question[:60]}")
        print(f"Stats BEFORE: goals={stats['goals_scored']}, wins={stats['wins']}, "
              f"losses={stats['losses']}, draws={stats['draws']}, hat_trick={stats['hat_trick']}")

        # Save user message to database
        if supabase_admin and user_id != "anonymous":
            try:
                supabase_admin.table("chat_messages").insert({
                    "user_id": user_id,
                    "role": "user",
                    "text": question,
                    "mode": "general"
                }).execute()
            except Exception as e:
                print("⚠️ Failed to save user message to chat_messages:", e)

        stats["sessions"] += 1
        stat_changes     = _extract_match_stats(question, stats)
        new_achievements = _check_achievements(stats)
        answer           = _ask(question, profile=profile, memory=memory, stats=stats)

        # Save bot message to database
        if supabase_admin and user_id != "anonymous":
            try:
                supabase_admin.table("chat_messages").insert({
                    "user_id": user_id,
                    "role": "bot",
                    "text": answer,
                    "mode": "general"
                }).execute()
            except Exception as e:
                print("⚠️ Failed to save bot message to chat_messages:", e)

        _add_to_history(memory, question, answer)
        _extract_and_update_memory(memory, stats, question, answer)
        _save_memory(user_id, memory)
        _save_db_stats(user_id, stats)

        print(f"Stats AFTER:  goals={stats['goals_scored']}, wins={stats['wins']}, "
              f"losses={stats['losses']}, draws={stats['draws']}, hat_trick={stats['hat_trick']}")
        print(f"Changes: {stat_changes}")
        print(f"{'='*50}\n")

        return jsonify({
            "answer":           answer,
            "memory_stats": {
                "history_count":  len(memory["history"]),
                "goals_noted":    len(memory["goals"]),
                "injuries_noted": len(memory["injuries"]),
                "topics_covered": memory["last_topics"],
            },
            "stat_changes":     stat_changes,
            "new_achievements": new_achievements,
            "stats":            stats,
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@chatbot_bp.get("/history/<user_id>")
def get_chat_history(user_id):
    if not supabase_admin:
        return jsonify({"history": []}), 200
    try:
        res = (
            supabase_admin.table("chat_messages")
            .select("*")
            .eq("user_id", user_id)
            .eq("mode", "general")
            .order("created_at", desc=False)
            .execute()
        )
        return jsonify({"history": res.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@chatbot_bp.get("/memory/<user_id>")
def get_memory(user_id):
    memory = _load_memory(user_id)
    return jsonify(memory), 200


@chatbot_bp.get("/stats/<user_id>")
def get_stats(user_id):
    stats = _sanitize_stats(_load_db_stats(user_id))
    return jsonify({
        "stats": {
            k: v for k, v in stats.items()
            if k not in ("achievements", "match_log")
        },
        "achievements": stats.get("achievements", []),
        "match_log":    stats.get("match_log",    []),
    }), 200


@chatbot_bp.delete("/memory/<user_id>")
def clear_memory(user_id):
    path = _memory_path(user_id)
    if os.path.exists(path):
        os.remove(path)
    return jsonify({"message": "Memory cleared. Stats preserved in database."}), 200

@chatbot_bp.delete("/chat/<user_id>")
def clear_chat(user_id):
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500
    try:
        supabase_admin.table("chat_history").delete().eq("user_id", user_id).execute()
        return jsonify({"message": "Chat history cleared."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@chatbot_bp.delete("/stats/<user_id>")
def clear_stats(user_id):
    if not supabase_admin:
        return jsonify({"error": "Supabase not configured"}), 500
    try:
        supabase_admin.table("player_stats").delete().eq("user_id", user_id).execute()
        return jsonify({"message": "Stats reset."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@chatbot_bp.get("/status")
def status():
    return jsonify({
        "db_ready":    db   is not None,
        "llm_ready":   llm  is not None,
        "setup_done":  _setup_done,
        "setup_error": _setup_error,
        "supabase_ok": supabase_admin is not None,
    }), 200