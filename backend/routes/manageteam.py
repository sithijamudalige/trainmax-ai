"""
manageteam.py  —  Train Max AI
Team management routes for coaches.

Blueprint prefix : /api/teams
All routes require: Authorization: Bearer <supabase_jwt>

Tables needed:
  - coach_profiles   (already exists)
  - user_profiles    (already exists — player pool)
  - teams            (create below)
  - team_members     (create below)

SQL to run in Supabase:
─────────────────────────────────────────────────────────────────────────────
create table teams (
  id           uuid default gen_random_uuid() primary key,
  coach_id     uuid references auth.users(id) on delete cascade,
  name         text not null,
  description  text default '',
  github_url   text default '',
  color        text default '#10b981',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table teams enable row level security;
create policy "Coaches manage own teams"
  on teams for all using (auth.uid() = coach_id);

create table team_members (
  id              uuid default gen_random_uuid() primary key,
  team_id         uuid references teams(id) on delete cascade,
  player_id       uuid references auth.users(id) on delete cascade,
  role            text default 'player',
  collaborator    boolean default false,
  position        text default '',
  jersey_number   integer,
  added_at        timestamptz default now(),
  unique(team_id, player_id)
);
alter table team_members enable row level security;
create policy "Coaches manage team members"
  on team_members for all
  using (
    exists (
      select 1 from teams
      where teams.id = team_members.team_id
        and teams.coach_id = auth.uid()
    )
  );
─────────────────────────────────────────────────────────────────────────────
"""

from flask import Blueprint, request, jsonify
from supabase import create_client, Client
import os
from datetime import datetime, timezone

SUPABASE_URL              = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase_admin: Client    = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

team_bp = Blueprint("manageteam", __name__, url_prefix="/api/teams")

MIN_PLAYERS = 2
MAX_PLAYERS = 20


# ── helpers ──────────────────────────────────────────────────────────────────

def _auth(request):
    """Verify JWT, return (user, None) or (None, error_response)."""
    header = request.headers.get("Authorization", "")
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


def _owns_team(coach_id: str, team_id: str) -> bool:
    try:
        r = supabase_admin.table("teams").select("id") \
            .eq("id", team_id).eq("coach_id", coach_id).single().execute()
        return r.data is not None
    except Exception:
        return False


def _now():
    return datetime.now(timezone.utc).isoformat()


# ── GET /api/teams/players ────────────────────────────────────────────────────
@team_bp.route("/players", methods=["GET"])
def list_all_players():
    """
    Return all registered players from user_profiles.
    Coaches use this list to pick team members.
    Query param: ?search=<name_or_email>
    """
    user, err = _auth(request)
    if err: return err
    if not _is_coach(user.id):
        return jsonify({"error": "Coach account required"}), 403

    search = request.args.get("search", "").strip()

    try:
        q = supabase_admin.table("user_profiles").select(
            "id, user_name, email, position, club, country, age, photo_path"
        )
        if search:
            q = q.ilike("user_name", f"%{search}%")

        result = q.order("user_name").execute()
        return jsonify({"players": result.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/teams ─────────────────────────────────────────────────────────────
@team_bp.route("", methods=["GET"])
def list_teams():
    """List all teams belonging to the authenticated coach."""
    user, err = _auth(request)
    if err: return err
    if not _is_coach(user.id):
        return jsonify({"error": "Coach account required"}), 403

    try:
        teams_res = supabase_admin.table("teams").select("*") \
            .eq("coach_id", user.id).order("created_at", desc=True).execute()
        teams = teams_res.data or []

        # Attach member count to each team
        for t in teams:
            try:
                mc = supabase_admin.table("team_members").select("id", count="exact") \
                    .eq("team_id", t["id"]).execute()
                t["member_count"] = mc.count or 0
            except Exception:
                t["member_count"] = 0

        return jsonify({"teams": teams}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── POST /api/teams ────────────────────────────────────────────────────────────
@team_bp.route("", methods=["POST"])
def create_team():
    """
    Create a new team.
    Body:
      name         str  (required)
      description  str
      github_url   str
      color        str  hex color
      player_ids   list of user UUIDs  (2–20 required)
      members      list of {player_id, role, collaborator, position, jersey_number}
    """
    user, err = _auth(request)
    if err: return err
    if not _is_coach(user.id):
        return jsonify({"error": "Coach account required"}), 403

    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Team name is required"}), 400

    members_raw = data.get("members", [])
    if len(members_raw) < MIN_PLAYERS:
        return jsonify({"error": f"A team needs at least {MIN_PLAYERS} players"}), 400
    if len(members_raw) > MAX_PLAYERS:
        return jsonify({"error": f"A team can have at most {MAX_PLAYERS} players"}), 400

    try:
        # 1. Insert team row
        team_payload = {
            "coach_id":    user.id,
            "name":        name,
            "description": data.get("description", ""),
            "github_url":  data.get("github_url", ""),
            "color":       data.get("color", "#10b981"),
            "created_at":  _now(),
            "updated_at":  _now(),
        }
        team_res = supabase_admin.table("teams").insert(team_payload).execute()
        if not team_res.data:
            return jsonify({"error": "Failed to create team"}), 500
        team     = team_res.data[0]
        team_id  = team["id"]

        # 2. Insert team_members rows
        member_rows = []
        seen = set()
        for m in members_raw:
            pid = m.get("player_id", "")
            if not pid or pid in seen:
                continue
            seen.add(pid)
            member_rows.append({
                "team_id":       team_id,
                "player_id":     pid,
                "role":          m.get("role", "player"),
                "collaborator":  bool(m.get("collaborator", False)),
                "position":      m.get("position", ""),
                "jersey_number": m.get("jersey_number"),
                "added_at":      _now(),
            })

        if member_rows:
            supabase_admin.table("team_members").insert(member_rows).execute()

        team["member_count"] = len(member_rows)
        return jsonify({"message": "Team created", "team": team}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /api/teams/<team_id> ───────────────────────────────────────────────────
@team_bp.route("/<team_id>", methods=["GET"])
def get_team(team_id):
    """Get a single team with full member list + player profile data."""
    user, err = _auth(request)
    if err: return err
    if not _owns_team(user.id, team_id):
        return jsonify({"error": "Team not found or access denied"}), 404

    try:
        team_res = supabase_admin.table("teams").select("*").eq("id", team_id).single().execute()
        team = team_res.data

        # Fetch members
        members_res = supabase_admin.table("team_members").select("*") \
            .eq("team_id", team_id).execute()
        members = members_res.data or []

        # Enrich each member with player profile
        enriched = []
        for m in members:
            try:
                p = supabase_admin.table("user_profiles").select(
                    "user_name, email, position, club, country, age, photo_path"
                ).eq("id", m["player_id"]).single().execute()
                m["profile"] = p.data or {}
            except Exception:
                m["profile"] = {}
            enriched.append(m)

        team["members"] = enriched
        return jsonify({"team": team}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── PUT /api/teams/<team_id> ───────────────────────────────────────────────────
@team_bp.route("/<team_id>", methods=["PUT"])
def update_team(team_id):
    """
    Update team metadata (name, description, github_url, color).
    Does NOT change members — use /members endpoints for that.
    """
    user, err = _auth(request)
    if err: return err
    if not _owns_team(user.id, team_id):
        return jsonify({"error": "Team not found or access denied"}), 404

    data    = request.get_json(silent=True) or {}
    allowed = {"name", "description", "github_url", "color"}
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    updates["updated_at"] = _now()
    try:
        res = supabase_admin.table("teams").update(updates).eq("id", team_id).execute()
        return jsonify({"message": "Team updated", "team": res.data[0] if res.data else {}}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── DELETE /api/teams/<team_id> ────────────────────────────────────────────────
@team_bp.route("/<team_id>", methods=["DELETE"])
def delete_team(team_id):
    """Delete a team and all its members."""
    user, err = _auth(request)
    if err: return err
    if not _owns_team(user.id, team_id):
        return jsonify({"error": "Team not found or access denied"}), 404

    try:
        supabase_admin.table("team_members").delete().eq("team_id", team_id).execute()
        supabase_admin.table("teams").delete().eq("id", team_id).execute()
        return jsonify({"message": "Team deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── POST /api/teams/<team_id>/members ─────────────────────────────────────────
@team_bp.route("/<team_id>/members", methods=["POST"])
def add_member(team_id):
    """
    Add a player to the team.
    Body: { player_id, role, collaborator, position, jersey_number }
    """
    user, err = _auth(request)
    if err: return err
    if not _owns_team(user.id, team_id):
        return jsonify({"error": "Team not found or access denied"}), 404

    # Check max size
    try:
        count_res = supabase_admin.table("team_members").select("id", count="exact") \
            .eq("team_id", team_id).execute()
        if (count_res.count or 0) >= MAX_PLAYERS:
            return jsonify({"error": f"Team already has the maximum of {MAX_PLAYERS} players"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    data      = request.get_json(silent=True) or {}
    player_id = data.get("player_id", "").strip()
    if not player_id:
        return jsonify({"error": "player_id is required"}), 400

    try:
        row = {
            "team_id":       team_id,
            "player_id":     player_id,
            "role":          data.get("role", "player"),
            "collaborator":  bool(data.get("collaborator", False)),
            "position":      data.get("position", ""),
            "jersey_number": data.get("jersey_number"),
            "added_at":      _now(),
        }
        res = supabase_admin.table("team_members").insert(row).execute()
        return jsonify({"message": "Player added", "member": res.data[0] if res.data else {}}), 201
    except Exception as e:
        err_msg = str(e)
        if "unique" in err_msg.lower() or "duplicate" in err_msg.lower():
            return jsonify({"error": "Player is already in this team"}), 409
        return jsonify({"error": err_msg}), 500


# ── PUT /api/teams/<team_id>/members/<player_id> ───────────────────────────────
@team_bp.route("/<team_id>/members/<player_id>", methods=["PUT"])
def update_member(team_id, player_id):
    """Update a member's role, position, jersey_number, collaborator flag."""
    user, err = _auth(request)
    if err: return err
    if not _owns_team(user.id, team_id):
        return jsonify({"error": "Team not found or access denied"}), 404

    data    = request.get_json(silent=True) or {}
    allowed = {"role", "collaborator", "position", "jersey_number"}
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    try:
        res = supabase_admin.table("team_members").update(updates) \
            .eq("team_id", team_id).eq("player_id", player_id).execute()
        return jsonify({"message": "Member updated", "member": res.data[0] if res.data else {}}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── DELETE /api/teams/<team_id>/members/<player_id> ───────────────────────────
@team_bp.route("/<team_id>/members/<player_id>", methods=["DELETE"])
def remove_member(team_id, player_id):
    """Remove a player from the team. Enforces minimum 2 players."""
    user, err = _auth(request)
    if err: return err
    if not _owns_team(user.id, team_id):
        return jsonify({"error": "Team not found or access denied"}), 404

    try:
        count_res = supabase_admin.table("team_members").select("id", count="exact") \
            .eq("team_id", team_id).execute()
        if (count_res.count or 0) <= MIN_PLAYERS:
            return jsonify({"error": f"Team must have at least {MIN_PLAYERS} players"}), 400

        supabase_admin.table("team_members").delete() \
            .eq("team_id", team_id).eq("player_id", player_id).execute()
        return jsonify({"message": "Player removed"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
