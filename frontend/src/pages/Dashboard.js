// pages/Dashboard.jsx
import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_BASE         = "http://127.0.0.1:5000";
const TOTAL_ACHIEVEMENTS = 22; // must match ACHIEVEMENTS list in chatbot.py

// ── Moved outside Dashboard so React never sees it as a new component type
// on re-render (which would cause unmount/remount flicker every state change).
function LiveDot() {
  return (
    <div style={{
      position: "absolute", top: 10, right: 10,
      width: 8, height: 8, borderRadius: "50%",
      background: "#10b981",
      boxShadow: "0 0 6px #10b981",
      animation: "livePulse 2s ease-in-out infinite",
    }} />
  );
}

export default function Dashboard() {
  const nav = useNavigate();

  const [user,          setUser]          = useState(null);
  const [profile,       setProfile]       = useState(null);
  const [memory,        setMemory]        = useState(null);
  const [plans,         setPlans]         = useState([]);
  const [stats,         setStats]         = useState(null);
  const [achievements,  setAchievements]  = useState([]);
  const [matchLog,      setMatchLog]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState("overview");
  const [refreshing,    setRefreshing]    = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);



  // ── Load stats (reusable) ────────────────────────────────────────────────
  const loadStats = useCallback(async (uid) => {
    if (!uid) return;
    try {
      const sRes  = await fetch(`${API_BASE}/api/chatbot/stats/${uid}`);
      const sData = await sRes.json().catch(() => ({}));
      if (sRes.ok) {
        setStats(sData.stats            || null);
        setAchievements(sData.achievements || []);
        setMatchLog(sData.match_log        || []);
        setLastRefreshed(new Date());
      }
    } catch (_) {}
  }, []);

  const loadPlans = useCallback(async (uid) => {
    if (!uid) return;
    try {
      const tRes = await fetch(`${API_BASE}/api/training-plan/list/${uid}`);
      const tData = await tRes.json().catch(() => ({}));
      if (tRes.ok) setPlans(tData.plans || []);
    } catch (_) {}
  }, []);

  const loadMemory = useCallback(async (uid) => {
    if (!uid) return;
    try {
      const mRes  = await fetch(`${API_BASE}/api/chatbot/memory/${uid}`);
      const mData = await mRes.json().catch(() => ({}));
      if (mRes.ok) setMemory(mData);
    } catch (_) {}
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session?.user) { nav("/login"); return; }

      setUser(session.user);
      const token = session.access_token;
      const uid   = session.user.id;

      const pRes  = await fetch(`${API_BASE}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const pData = await pRes.json().catch(() => ({}));
      if (pRes.ok && pData.profile) setProfile(pData.profile);

      await Promise.all([
        loadStats(uid),
        loadPlans(uid),
        loadMemory(uid),
      ]);

      setLoading(false);
    }
    load();
  }, [nav, loadStats, loadPlans, loadMemory]);

  // ── Auto-refresh every 30 s ───────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => loadStats(user.id), 30000);
    return () => clearInterval(interval);
  }, [user, loadStats]);

  // ── Manual refresh ────────────────────────────────────────────────────────
  async function refreshAll() {
    if (!user?.id || refreshing) return;
    setRefreshing(true);
    await Promise.all([
      loadStats(user.id),
      loadPlans(user.id),
      loadMemory(user.id),
    ]);
    setRefreshing(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    nav("/login");
  }

  function getSkillLevel() {
    const club = (profile?.club || "").toLowerCase();
    const pros  = ["barcelona","fcb","real madrid","manchester","chelsea","juventus","liverpool"];
    if (pros.some(c => club.includes(c))) return { label: "Advanced",     color: "#ef4444", pct: 90 };
    if (club && !["none","-",""].includes(club)) return { label: "Intermediate", color: "#f59e0b", pct: 55 };
    return { label: "Beginner", color: "#10b981", pct: 20 };
  }

  function getBmiStatus() {
    const b = parseFloat(profile?.bmi);
    if (!b) return null;
    if (b < 18.5) return { label: "Underweight", color: "#60a5fa", pct: 20 };
    if (b < 25)   return { label: "Normal ✓",    color: "#10b981", pct: 60 };
    if (b < 30)   return { label: "Overweight",  color: "#f59e0b", pct: 78 };
    return              { label: "Obese",         color: "#ef4444", pct: 95 };
  }

  const skill         = profile ? getSkillLevel() : null;
  const bmi           = profile ? getBmiStatus()  : null;
  const totalSessions = memory?.history?.length    || 0;
  const goalsNoted    = memory?.goals?.length       || 0;
  const injuriesNoted = memory?.injuries?.length    || 0;
  const topicsCovered = memory?.last_topics         || [];
  const keyFacts      = memory?.key_facts           || [];
  const recentHistory = memory?.history?.slice(-5).reverse() || [];

  const winRate = stats && stats.matches_played > 0
    ? Math.round((stats.wins / stats.matches_played) * 100)
    : 0;

  if (loading) return (
    <>
      <style>{`
        .dash-loading { min-height:100vh; background:linear-gradient(135deg,#0f0c29,#302b63,#24243e); display:flex; align-items:center; justify-content:center; font-family:system-ui; }
        .dash-spinner { width:48px; height:48px; border:4px solid rgba(255,255,255,0.1); border-top-color:#6a11cb; border-radius:50%; animation:spin 0.8s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
      <div className="dash-loading">
        <div style={{ textAlign:"center" }}>
          <div className="dash-spinner" style={{ margin:"0 auto 16px" }} />
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:14 }}>Loading your dashboard...</div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css" />
      <style>{`
        * { box-sizing:border-box; }
        .dash-page { min-height:100vh; background:linear-gradient(135deg,#0f0c29,#302b63,#24243e); font-family:system-ui; padding-bottom:60px; }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes shimmer  { 0%{left:-100%} 100%{left:100%} }
        @keyframes pulse    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        @keyframes livePulse{ 0%,100%{opacity:1;box-shadow:0 0 6px #10b981} 50%{opacity:0.5;box-shadow:0 0 12px #10b981} }
        @keyframes spinSm   { to{transform:rotate(360deg)} }

        .dash-hero { background:linear-gradient(135deg,rgba(106,17,203,0.4),rgba(37,117,252,0.3)); border-bottom:1px solid rgba(255,255,255,0.08); padding:32px; position:relative; overflow:hidden; animation:fadeInUp 0.5s ease forwards; }
        .dash-hero::before { content:"⚽"; position:absolute; right:-30px; top:-20px; font-size:160px; opacity:0.05; pointer-events:none; }
        .dash-hero-inner { max-width:1100px; margin:0 auto; display:flex; align-items:center; gap:20px; flex-wrap:wrap; }
        .dash-avatar { width:72px; height:72px; border-radius:20px; background:linear-gradient(135deg,#6a11cb,#2575fc); display:flex; align-items:center; justify-content:center; font-size:32px; flex-shrink:0; box-shadow:0 8px 24px rgba(106,17,203,0.4); overflow:hidden; }
        .dash-avatar img { width:100%; height:100%; object-fit:cover; }
        .dash-hero-text h1 { color:#fff; font-size:24px; font-weight:800; margin:0 0 4px; }
        .dash-hero-text p  { color:rgba(255,255,255,0.5); font-size:14px; margin:0; }
        .dash-hero-actions { margin-left:auto; display:flex; gap:10px; flex-wrap:wrap; }

        .btn-hero { padding:10px 20px; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; border:none; transition:all 0.2s; font-family:system-ui; text-decoration:none; display:inline-flex; align-items:center; gap:6px; }
        .btn-hero-primary { background:linear-gradient(135deg,#6a11cb,#2575fc); color:#fff; box-shadow:0 4px 14px rgba(106,17,203,0.4); position:relative; overflow:hidden; }
        .btn-hero-primary::before { content:""; position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent); animation:shimmer 2.5s infinite; }
        .btn-hero-primary:hover { transform:translateY(-2px); color:#fff; }
        .btn-hero-ghost  { background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.7); }
        .btn-hero-ghost:hover  { background:rgba(255,255,255,0.12); color:#fff; }
        .btn-hero-danger { background:rgba(220,38,38,0.15); border:1px solid rgba(220,38,38,0.25); color:#fca5a5; }
        .btn-hero-danger:hover { background:rgba(220,38,38,0.25); }

        .dash-tabs { background:rgba(0,0,0,0.2); border-bottom:1px solid rgba(255,255,255,0.06); padding:0 32px; display:flex; gap:0; overflow-x:auto; }
        .dash-tab  { padding:14px 22px; border:none; border-bottom:3px solid transparent; background:none; color:rgba(255,255,255,0.4); font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap; transition:all 0.2s; font-family:system-ui; display:flex; align-items:center; gap:6px; }
        .dash-tab:hover  { color:rgba(255,255,255,0.7); }
        .dash-tab.active { color:#a78bfa; border-bottom-color:#6a11cb; }

        .refresh-bar { background:rgba(0,0,0,0.15); border-bottom:1px solid rgba(255,255,255,0.04); padding:7px 32px; display:flex; align-items:center; gap:10px; font-size:11px; color:rgba(255,255,255,0.25); }

        .dash-content { max-width:1100px; margin:28px auto; padding:0 24px; animation:fadeInUp 0.4s ease forwards; }

        .glass-card { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:20px; backdrop-filter:blur(10px); transition:all 0.3s; position:relative; overflow:hidden; }
        .glass-card:hover { border-color:rgba(106,17,203,0.3); transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.3); }
        .card-title { color:rgba(255,255,255,0.4); font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:10px; }
        .card-value { color:#fff; font-size:32px; font-weight:900; line-height:1; background:linear-gradient(135deg,#a78bfa,#60a5fa); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .card-sub   { color:rgba(255,255,255,0.35); font-size:12px; margin-top:4px; }

        .progress-wrap { background:rgba(255,255,255,0.08); border-radius:10px; height:8px; overflow:hidden; margin-top:10px; }
        .progress-fill { height:100%; border-radius:10px; transition:width 1s ease; }

        .section-heading { color:rgba(255,255,255,0.6); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
        .section-heading::after { content:""; flex:1; height:1px; background:rgba(255,255,255,0.07); }

        .tag-pill { display:inline-flex; align-items:center; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600; background:rgba(106,17,203,0.2); border:1px solid rgba(106,17,203,0.3); color:#c4b5fd; margin:3px; }

        .history-item { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:12px 14px; margin-bottom:10px; transition:all 0.2s; }
        .history-item:hover { background:rgba(106,17,203,0.1); border-color:rgba(106,17,203,0.2); }
        .history-q { color:rgba(255,255,255,0.8); font-size:13px; font-weight:600; margin-bottom:6px; display:flex; align-items:flex-start; gap:6px; }
        .history-a { color:rgba(255,255,255,0.4); font-size:12px; line-height:1.5; padding-left:20px; }

        .plan-card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:16px; margin-bottom:12px; display:flex; align-items:center; gap:14px; transition:all 0.2s; cursor:pointer; }
        .plan-card:hover { background:rgba(106,17,203,0.1); border-color:rgba(106,17,203,0.3); transform:translateX(4px); }
        .plan-icon  { width:44px; height:44px; background:linear-gradient(135deg,#6a11cb,#2575fc); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
        .plan-info  { flex:1; }
        .plan-title { color:#fff; font-size:14px; font-weight:700; margin-bottom:3px; }
        .plan-meta  { color:rgba(255,255,255,0.35); font-size:12px; }
        .diff-badge { padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; color:#fff; }

        .mem-item { display:flex; align-items:flex-start; gap:10px; padding:10px 14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; margin-bottom:8px; font-size:13px; color:rgba(255,255,255,0.7); line-height:1.5; }

        .empty-state { text-align:center; padding:32px 20px; color:rgba(255,255,255,0.25); }
        .empty-state .e-icon { font-size:36px; margin-bottom:10px; }
        .empty-state .e-text { font-size:13px; }

        .prof-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:13px; }
        .prof-row:last-child { border-bottom:none; }
        .prof-key   { color:rgba(255,255,255,0.4); font-weight:600; }
        .prof-value { color:#fff; font-weight:600; text-align:right; }

        .ach-card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:14px 16px; display:flex; align-items:center; gap:14px; transition:all 0.2s; }
        .ach-card:hover { background:rgba(106,17,203,0.15); border-color:rgba(106,17,203,0.3); transform:translateY(-2px); }
        .ach-icon-wrap { width:48px; height:48px; border-radius:14px; background:linear-gradient(135deg,#6a11cb,#2575fc); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; animation:pulse 3s ease-in-out infinite; }
        .ach-title { color:#fff; font-size:14px; font-weight:700; margin-bottom:3px; }
        .ach-desc  { color:rgba(255,255,255,0.45); font-size:12px; }
        .ach-date  { color:rgba(255,255,255,0.25); font-size:11px; margin-top:3px; }

        .stat-big { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:16px; text-align:center; transition:all 0.3s; }
        .stat-big:hover { border-color:rgba(106,17,203,0.3); transform:translateY(-2px); }
        .stat-big-val { font-size:36px; font-weight:900; background:linear-gradient(135deg,#a78bfa,#60a5fa); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; line-height:1; }
        .stat-big-lbl { color:rgba(255,255,255,0.4); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-top:4px; }

        .match-item { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:10px 14px; margin-bottom:8px; font-size:12px; color:rgba(255,255,255,0.6); }
        .match-item-date    { color:rgba(255,255,255,0.25); font-size:11px; margin-bottom:4px; }
        .match-item-changes { display:flex; gap:8px; flex-wrap:wrap; margin-top:6px; }
        .match-chip { background:rgba(106,17,203,0.2); border:1px solid rgba(106,17,203,0.3); border-radius:20px; padding:2px 10px; font-size:11px; font-weight:600; color:#c4b5fd; }

        .grid-4   { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        .grid-3   { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
        .grid-2   { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
        .grid-ach { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }

        @media (max-width:900px) { .grid-4{grid-template-columns:repeat(2,1fr);} .grid-ach{grid-template-columns:1fr;} }
        @media (max-width:700px) { .grid-4,.grid-3,.grid-2,.grid-ach{grid-template-columns:1fr;} .dash-hero-actions{margin-left:0;} .refresh-bar{padding:7px 16px;} }
      `}</style>

      <div className="dash-page">
        <Navbar />

        {/* Hero */}
        <div className="dash-hero">
          <div className="dash-hero-inner">
            <div className="dash-avatar">
              {profile?.photo_path
                ? <img src={`${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.photo_path}`} alt="avatar" />
                : "⚽"}
            </div>
            <div className="dash-hero-text">
              <h1>Welcome back, {profile?.user_name || user?.email?.split("@")[0] || "Player"} 👋</h1>
              <p>
                {profile?.position ? profile.position.charAt(0).toUpperCase() + profile.position.slice(1) : "Football Player"}
                {profile?.club    ? ` · ${profile.club}`    : ""}
                {profile?.country ? ` · ${profile.country}` : ""}
                {achievements.length > 0 && ` · 🏆 ${achievements.length} achievement${achievements.length > 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="dash-hero-actions">
              <button className="btn-hero btn-hero-primary" onClick={() => nav("/chatbot")}>⚽ Train with Max</button>
              <button className="btn-hero btn-hero-ghost"   onClick={() => nav("/training-plan")}>📋 My Plans</button>
              <button className="btn-hero btn-hero-ghost"   onClick={() => nav(`/${user?.id}/edit-profile`)}>✏️ Edit Profile</button>
              <button className="btn-hero btn-hero-danger"  onClick={logout}>🚪 Logout</button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="dash-tabs">
          {[
            { id: "overview",     label: "🏠 Overview"                                        },
            { id: "stats",        label: "⚽ Match Stats"                                        },
            { id: "achievements", label: `🏆 Achievements (${achievements.length})`              },
            { id: "memory",       label: `🧠 Max's Memory (${memory?.memory?.length || 0})`   },
          ].map(t => (
            <button
              key={t.id}
              className={`dash-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Refresh bar */}
        <div className="refresh-bar">
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#10b981", boxShadow: "0 0 5px #10b981",
            animation: "livePulse 2s ease-in-out infinite", flexShrink: 0,
          }} />
          <span>
            {lastRefreshed
              ? `Last updated: ${lastRefreshed.toLocaleTimeString()}`
              : "Loading stats..."}
          </span>
          <span style={{ color:"rgba(255,255,255,0.1)" }}>·</span>
          <span>Auto-refreshes every 30s</span>
          <button
            onClick={refreshAll}
            disabled={refreshing}
            style={{
              marginLeft: "auto",
              padding: "3px 12px",
              background:   refreshing ? "rgba(255,255,255,0.04)" : "rgba(106,17,203,0.2)",
              border:       "1px solid rgba(106,17,203,0.25)",
              borderRadius: 7,
              color:        refreshing ? "rgba(255,255,255,0.25)" : "#a78bfa",
              fontSize: 11, fontWeight: 700,
              cursor: refreshing ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 5,
              fontFamily: "system-ui", transition: "all 0.2s",
            }}
          >
            {refreshing ? (
              <>
                <span style={{
                  display:"inline-block", width:9, height:9,
                  border:"2px solid rgba(255,255,255,0.15)", borderTopColor:"#a78bfa",
                  borderRadius:"50%", animation:"spinSm 0.7s linear infinite",
                }} />
                Refreshing...
              </>
            ) : "🔄 Refresh Now"}
          </button>
        </div>

        <div className="dash-content">

          {/* ═══════════════ OVERVIEW ═══════════════ */}
          {activeTab === "overview" && (
            <div>
              <div className="section-heading">📈 Live Stats</div>
              <div className="grid-4" style={{ marginBottom: 28 }}>

                <div className="glass-card">
                  <LiveDot />
                  <div className="card-title">⚽ Goals Scored</div>
                  <div className="card-value">{stats?.goals_scored ?? 0}</div>
                  <div className="card-sub">{stats?.assists ?? 0} assists · {stats?.hat_trick ?? 0} hat tricks</div>
                </div>

                <div className="glass-card">
                  <LiveDot />
                  <div className="card-title">🏆 Match Record</div>
                  <div className="card-value">{stats?.wins ?? 0}W</div>
                  <div className="card-sub">{stats?.draws ?? 0}D · {stats?.losses ?? 0}L · {winRate}% win rate</div>
                </div>

                <div className="glass-card">
                  <div className="card-title">🏅 Achievements</div>
                  <div className="card-value">{achievements.length}</div>
                  <div className="card-sub">Unlocked badges</div>
                </div>

                <div className="glass-card">
                  <div className="card-title">📋 Training Plans</div>
                  <div className="card-value">{plans.length}</div>
                  <div className="card-sub">Saved plans</div>
                </div>
              </div>

              {/* Extended live stats */}
              <div className="grid-4" style={{ marginBottom: 28 }}>
                <div className="glass-card">
                  <LiveDot />
                  <div className="card-title">🤝 Assists</div>
                  <div className="card-value">{stats?.assists ?? 0}</div>
                  <div className="card-sub">Total assists</div>
                </div>
                <div className="glass-card">
                  <LiveDot />
                  <div className="card-title">⭐ Man of Match</div>
                  <div className="card-value">{stats?.motm ?? 0}</div>
                  <div className="card-sub">Times awarded</div>
                </div>
                <div className="glass-card">
                  <LiveDot />
                  <div className="card-title">🧱 Clean Sheets</div>
                  <div className="card-value">{stats?.clean_sheets ?? 0}</div>
                  <div className="card-sub">Total kept</div>
                </div>
                <div className="glass-card">
                  <LiveDot />
                  <div className="card-title">🔥 Best Streak</div>
                  <div className="card-value">{stats?.win_streak ?? 0}</div>
                  <div className="card-sub">Consecutive wins</div>
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: 28 }}>
                {skill && (
                  <div className="glass-card">
                    <div className="card-title">⚡ Skill Level</div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                      <div style={{ color:"#fff", fontSize:22, fontWeight:800 }}>{skill.label}</div>
                      <div style={{ color:skill.color, fontSize:28, fontWeight:900 }}>{skill.pct}%</div>
                    </div>
                    <div className="progress-wrap">
                      <div className="progress-fill" style={{ width:`${skill.pct}%`, background:skill.color }} />
                    </div>
                    <div style={{ color:"rgba(255,255,255,0.3)", fontSize:11, marginTop:8 }}>
                      Club: {profile?.club || "Not set"}
                    </div>
                  </div>
                )}
                {profile?.bmi && bmi && (
                  <div className="glass-card">
                    <div className="card-title">📊 BMI Analysis</div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                      <div style={{ color:"#fff", fontSize:22, fontWeight:800 }}>{profile.bmi}</div>
                      <div style={{ color:bmi.color, fontSize:16, fontWeight:700 }}>{bmi.label}</div>
                    </div>
                    <div className="progress-wrap">
                      <div className="progress-fill" style={{ width:`${bmi.pct}%`, background:bmi.color }} />
                    </div>
                    <div style={{ color:"rgba(255,255,255,0.3)", fontSize:11, marginTop:8 }}>
                      {profile.height_ft}ft · {profile.weight_kg}kg
                    </div>
                  </div>
                )}
              </div>

              {/* Win/Loss bar */}
              {stats?.matches_played > 0 && (
                <>
                  <div className="section-heading">📊 Match Record</div>
                  <div className="glass-card" style={{ marginBottom: 28 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, fontSize:13 }}>
                      <span style={{ color:"#10b981", fontWeight:700 }}>W {stats.wins}</span>
                      <span style={{ color:"#f59e0b", fontWeight:700 }}>D {stats.draws}</span>
                      <span style={{ color:"#ef4444", fontWeight:700 }}>L {stats.losses}</span>
                      <span style={{ color:"rgba(255,255,255,0.4)" }}>
                        {stats.matches_played} matches · {winRate}% win rate
                      </span>
                    </div>
                    <div style={{ display:"flex", height:14, borderRadius:10, overflow:"hidden", background:"rgba(255,255,255,0.05)" }}>
                      <div style={{ width:`${(stats.wins/stats.matches_played)*100}%`, background:"#10b981", transition:"width 1s ease" }} />
                      <div style={{ width:`${(stats.draws/stats.matches_played)*100}%`, background:"#f59e0b" }} />
                      <div style={{ width:`${(stats.losses/stats.matches_played)*100}%`, background:"#ef4444" }} />
                    </div>
                  </div>
                </>
              )}

              {/* Recent achievements */}
              {achievements.length > 0 && (
                <>
                  <div className="section-heading">🏆 Recent Achievements</div>
                  <div className="grid-ach" style={{ marginBottom: 28 }}>
                    {achievements.slice(-4).reverse().map(ach => (
                      <div key={ach.id} className="ach-card">
                        <div className="ach-icon-wrap">{ach.icon}</div>
                        <div>
                          <div className="ach-title">{ach.title}</div>
                          <div className="ach-desc">{ach.desc}</div>
                          <div className="ach-date">{new Date(ach.unlocked_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Recent plans */}
              {plans.length > 0 && (
                <>
                  <div className="section-heading">📋 Recent Plans</div>
                  {plans.slice(0, 3).map(plan => (
                    <div key={plan.id} className="plan-card" onClick={() => nav("/training-plan")}>
                      <div className="plan-icon">📋</div>
                      <div className="plan-info">
                        <div className="plan-title">{plan.title}</div>
                        <div className="plan-meta">
                          ⏱ {plan.duration} · 📅 {Array.isArray(plan.days) ? plan.days.length : 0} days · {new Date(plan.saved_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="diff-badge" style={{
                        background: plan.difficulty?.toLowerCase().includes("adv") ? "#ef4444"
                          : plan.difficulty?.toLowerCase().includes("int") ? "#f59e0b" : "#10b981"
                      }}>{plan.difficulty}</div>
                    </div>
                  ))}
                </>
              )}

              {/* Recent match log */}
              {matchLog.length > 0 && (
                <>
                  <div className="section-heading">⚽ Recent Match Activity</div>
                  {[...matchLog].reverse().slice(0, 3).map((entry, i) => (
                    <div key={i} className="match-item">
                      <div className="match-item-date">
                        {new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString()}
                      </div>
                      <div style={{ color:"rgba(255,255,255,0.7)", fontSize:13 }}>{entry.message}</div>
                      <div className="match-item-changes">
                        {entry.changes?.goals_scored  && <span className="match-chip">⚽ +{entry.changes.goals_scored} goals</span>}
                        {entry.changes?.assists        && <span className="match-chip">🤝 +{entry.changes.assists} assists</span>}
                        {entry.changes?.wins           && <span className="match-chip" style={{ background:"rgba(16,185,129,0.2)", borderColor:"rgba(16,185,129,0.3)", color:"#6ee7b7" }}>🏆 Win</span>}
                        {entry.changes?.losses         && <span className="match-chip" style={{ background:"rgba(239,68,68,0.2)",  borderColor:"rgba(239,68,68,0.3)",  color:"#fca5a5" }}>😞 Loss</span>}
                        {entry.changes?.clean_sheets   && <span className="match-chip">🧱 Clean sheet</span>}
                        {entry.changes?.motm           && <span className="match-chip">⭐ MoTM</span>}
                        {entry.changes?.hat_trick      && <span className="match-chip">🎩 Hat trick</span>}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Prompt when no stats yet */}
              {!stats?.matches_played && (
                <div className="glass-card" style={{ marginTop: 20 }}>
                  <div className="empty-state" style={{ padding:"32px 20px" }}>
                    <div className="e-icon">⚽</div>
                    <div style={{ color:"rgba(255,255,255,0.5)", fontWeight:700, marginBottom:8 }}>No match stats yet</div>
                    <div className="e-text" style={{ marginBottom:16 }}>
                      After your next match, tell Max:<br />
                      <span style={{ color:"#a78bfa", fontWeight:600 }}>"I scored 2 goals today"</span> or{" "}
                      <span style={{ color:"#a78bfa", fontWeight:600 }}>"We won 3-1"</span>
                    </div>
                    <button className="btn-hero btn-hero-primary" onClick={() => nav("/chatbot")}>
                      ⚽ Open Coach Max
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════ MATCH STATS ═══════════════ */}
          {activeTab === "stats" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <div className="section-heading" style={{ margin:0 }}>⚽ Match Statistics</div>
                <button
                  onClick={refreshAll}
                  disabled={refreshing}
                  className="btn-hero btn-hero-ghost"
                  style={{ fontSize:12, padding:"6px 14px" }}
                >
                  {refreshing ? "⏳ Refreshing..." : "🔄 Refresh"}
                </button>
              </div>

              <div className="grid-4" style={{ marginBottom: 24 }}>
                {[
                  { val: stats?.goals_scored ?? 0, lbl: "⚽ Goals"        },
                  { val: stats?.assists      ?? 0, lbl: "🤝 Assists"       },
                  { val: stats?.clean_sheets ?? 0, lbl: "🧱 Clean Sheets"  },
                  { val: stats?.motm         ?? 0, lbl: "⭐ Man of Match"  },
                  { val: stats?.wins         ?? 0, lbl: "🏆 Wins"          },
                  { val: stats?.draws        ?? 0, lbl: "🤝 Draws"         },
                  { val: stats?.losses       ?? 0, lbl: "😞 Losses"        },
                  { val: stats?.hat_trick    ?? 0, lbl: "🎩 Hat Tricks"    },
                ].map(({ val, lbl }) => (
                  <div key={lbl} className="stat-big" style={{ position:"relative", overflow:"hidden" }}>
                    <LiveDot />
                    <div className="stat-big-val">{val}</div>
                    <div className="stat-big-lbl">{lbl}</div>
                  </div>
                ))}
              </div>

              {stats?.matches_played > 0 && (
                <div className="glass-card" style={{ marginBottom: 24 }}>
                  <div className="card-title">📊 Match Record · {stats.matches_played} total matches</div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, fontSize:13 }}>
                    <span style={{ color:"#10b981", fontWeight:700 }}>W {stats.wins}</span>
                    <span style={{ color:"#f59e0b", fontWeight:700 }}>D {stats.draws}</span>
                    <span style={{ color:"#ef4444", fontWeight:700 }}>L {stats.losses}</span>
                    <span style={{ color:"rgba(255,255,255,0.4)" }}>{winRate}% win rate</span>
                  </div>
                  <div style={{ display:"flex", height:14, borderRadius:10, overflow:"hidden", background:"rgba(255,255,255,0.05)" }}>
                    <div style={{ width:`${(stats.wins/stats.matches_played)*100}%`, background:"#10b981", transition:"width 1s ease" }} />
                    <div style={{ width:`${(stats.draws/stats.matches_played)*100}%`, background:"#f59e0b" }} />
                    <div style={{ width:`${(stats.losses/stats.matches_played)*100}%`, background:"#ef4444" }} />
                  </div>
                </div>
              )}

              {(stats?.win_streak ?? 0) > 0 && (
                <div className="glass-card" style={{ marginBottom: 24 }}>
                  <LiveDot />
                  <div className="card-title">🔥 Best Win Streak</div>
                  <div className="card-value">{stats.win_streak}</div>
                  <div className="card-sub">consecutive wins</div>
                </div>
              )}

              <div className="section-heading">📋 Full Match Log</div>
              {matchLog.length > 0 ? (
                [...matchLog].reverse().map((entry, i) => (
                  <div key={i} className="match-item">
                    <div className="match-item-date">
                      {new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString()}
                    </div>
                    <div style={{ color:"rgba(255,255,255,0.7)", fontSize:13 }}>{entry.message}</div>
                    <div className="match-item-changes">
                      {entry.changes?.goals_scored  && <span className="match-chip">⚽ +{entry.changes.goals_scored} goals</span>}
                      {entry.changes?.assists        && <span className="match-chip">🤝 +{entry.changes.assists} assists</span>}
                      {entry.changes?.wins           && <span className="match-chip" style={{ background:"rgba(16,185,129,0.2)", borderColor:"rgba(16,185,129,0.3)", color:"#6ee7b7" }}>🏆 Win</span>}
                      {entry.changes?.losses         && <span className="match-chip" style={{ background:"rgba(239,68,68,0.2)",  borderColor:"rgba(239,68,68,0.3)",  color:"#fca5a5" }}>😞 Loss</span>}
                      {entry.changes?.clean_sheets   && <span className="match-chip">🧱 Clean sheet</span>}
                      {entry.changes?.motm           && <span className="match-chip">⭐ MoTM</span>}
                      {entry.changes?.hat_trick      && <span className="match-chip">🎩 Hat trick</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="glass-card">
                  <div className="empty-state">
                    <div className="e-icon">⚽</div>
                    <div className="e-text">
                      No match data yet.<br />
                      Tell Max <b style={{ color:"#a78bfa" }}>"I scored 2 goals today"</b> or <b style={{ color:"#a78bfa" }}>"We won 3-1"</b> in the chatbot!
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════ ACHIEVEMENTS ═══════════════ */}
          {activeTab === "achievements" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <div className="section-heading" style={{ margin:0 }}>🏆 Achievements</div>
                <div style={{ color:"rgba(255,255,255,0.4)", fontSize:13 }}>
                  {achievements.length} / {TOTAL_ACHIEVEMENTS} unlocked
                </div>
              </div>

              <div className="glass-card" style={{ marginBottom: 24 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}>
                  <span style={{ color:"#a78bfa", fontWeight:700 }}>Overall Progress</span>
                  <span style={{ color:"rgba(255,255,255,0.4)" }}>
                    {Math.round((achievements.length / TOTAL_ACHIEVEMENTS) * 100)}%
                  </span>
                </div>
                <div className="progress-wrap">
                  <div className="progress-fill" style={{
                    width: `${(achievements.length / TOTAL_ACHIEVEMENTS) * 100}%`,
                    background: "linear-gradient(135deg,#6a11cb,#2575fc)",
                  }} />
                </div>
              </div>

              <div className="grid-ach">
                {achievements.map(ach => (
                  <div key={ach.id} className="ach-card">
                    <div className="ach-icon-wrap">{ach.icon}</div>
                    <div>
                      <div className="ach-title">{ach.title}</div>
                      <div className="ach-desc">{ach.desc}</div>
                      <div className="ach-date">Unlocked {new Date(ach.unlocked_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
                {achievements.length === 0 && (
                  <div className="glass-card" style={{ gridColumn:"1/-1" }}>
                    <div className="empty-state">
                      <div className="e-icon">🏆</div>
                      <div className="e-text">No achievements yet. Chat with Max and share match results!</div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 24 }}>
                <div className="section-heading">💡 How to Unlock</div>
                <div className="glass-card">
                  {[
                    'Say "I scored 2 goals today" → unlock goal achievements',
                    'Say "We won 3-1" → unlock win achievements',
                    'Say "I got man of the match" → unlock MoTM achievements',
                    'Say "I got an assist" → unlock assist achievements',
                    'Say "Clean sheet today" → unlock clean sheet badges',
                    'Keep coaching with Max → unlock session achievements',
                  ].map((tip, i) => (
                    <div key={i} style={{ padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:13, color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", gap:10 }}>
                      <span>💡</span>{tip}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ MEMORY ═══════════════ */}
          {activeTab === "memory" && (
            <div>
              <div className="grid-3" style={{ marginBottom: 28 }}>
                <div className="glass-card">
                  <div className="card-title">💬 Exchanges</div>
                  <div className="card-value">{totalSessions}</div>
                  <div className="card-sub">With Coach Max</div>
                </div>
                <div className="glass-card">
                  <div className="card-title">🎯 Goals Noted</div>
                  <div className="card-value">{goalsNoted}</div>
                  <div className="card-sub">By Coach Max</div>
                </div>
                <div className="glass-card">
                  <div className="card-title">🩹 Injuries</div>
                  <div className="card-value">{injuriesNoted}</div>
                  <div className="card-sub">Tracked by Max</div>
                </div>
              </div>

              <div className="section-heading">🎯 Your Goals</div>
              {memory?.goals?.length > 0 ? (
                <div style={{ marginBottom: 24 }}>
                  {memory.goals.map((g, i) => (
                    <div key={i} className="mem-item"><span>🎯</span>{g}</div>
                  ))}
                </div>
              ) : (
                <div className="glass-card" style={{ marginBottom: 24 }}>
                  <div className="empty-state"><div className="e-icon">🎯</div><div className="e-text">Tell Max what you want to improve!</div></div>
                </div>
              )}

              <div className="section-heading">🩹 Injuries / Limitations</div>
              {memory?.injuries?.length > 0 ? (
                <div style={{ marginBottom: 24 }}>
                  {memory.injuries.map((inj, i) => (
                    <div key={i} className="mem-item" style={{ borderColor:"rgba(239,68,68,0.2)", background:"rgba(239,68,68,0.05)" }}>
                      <span>🩹</span>{inj}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card" style={{ marginBottom: 24 }}>
                  <div className="empty-state"><div className="e-icon">🩹</div><div className="e-text">No injuries noted. Stay healthy! 💪</div></div>
                </div>
              )}

              {keyFacts.length > 0 && (
                <>
                  <div className="section-heading">💡 Key Facts Max Noted</div>
                  <div style={{ marginBottom: 24 }}>
                    {keyFacts.map((f, i) => (
                      <div key={i} className="mem-item" style={{ borderColor:"rgba(167,139,250,0.2)", background:"rgba(167,139,250,0.05)" }}>
                        <span>💡</span>{f}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="section-heading">📚 Topics Trained</div>
              <div className="glass-card" style={{ marginBottom: 24 }}>
                {topicsCovered.length > 0
                  ? <div>{topicsCovered.map(t => <span key={t} className="tag-pill">🎯 {t}</span>)}</div>
                  : <div className="empty-state"><div className="e-icon">📚</div><div className="e-text">Ask Max about specific skills!</div></div>
                }
              </div>

              <div className="section-heading">💬 Recent Conversations</div>
              {recentHistory.length > 0 ? (
                recentHistory.map((h, i) => (
                  <div key={i} className="history-item">
                    <div className="history-q"><span>👤</span>{h.q}</div>
                    <div className="history-a">⚽ {h.a?.slice(0, 200)}{h.a?.length > 200 ? "..." : ""}</div>
                  </div>
                ))
              ) : (
                <div className="glass-card">
                  <div className="empty-state"><div className="e-icon">💬</div><div className="e-text">No conversations yet. Start chatting with Max!</div></div>
                </div>
              )}
            </div>
          )}



          {/* ═══════════════ PROFILE ═══════════════ */}
          {activeTab === "profile" && (
            <div className="grid-2">
              <div>
                <div className="section-heading">👤 Personal Info</div>
                <div className="glass-card" style={{ marginBottom: 20 }}>
                  {[
                    { key:"Username", val: profile?.user_name    },
                    { key:"Email",    val: user?.email            },
                    { key:"Age",      val: profile?.age           },
                    { key:"Birthday", val: profile?.birth_day     },
                    { key:"Mobile",   val: profile?.mobile_number },
                    { key:"Address",  val: profile?.address       },
                    { key:"Country",  val: profile?.country       },
                  ].map(({ key, val }) => (
                    <div key={key} className="prof-row">
                      <span className="prof-key">{key}</span>
                      <span className="prof-value">{val || <span style={{ opacity:0.3 }}>—</span>}</span>
                    </div>
                  ))}
                </div>
                <button className="btn-hero btn-hero-ghost" style={{ width:"100%" }} onClick={() => nav(`/${user?.id}/edit-profile`)}>
                  ✏️ Edit Profile
                </button>
              </div>
              <div>
                <div className="section-heading">⚽ Football Profile</div>
                <div className="glass-card" style={{ marginBottom: 20 }}>
                  {[
                    { key:"Position",     val: profile?.position                                        },
                    { key:"Club",         val: profile?.club                                            },
                    { key:"Focused Area", val: profile?.focused_area                                   },
                    { key:"Height",       val: profile?.height_ft ? `${profile.height_ft} ft` : null   },
                    { key:"Weight",       val: profile?.weight_kg ? `${profile.weight_kg} kg` : null   },
                    { key:"BMI",          val: profile?.bmi ? `${profile.bmi} (${bmi?.label || ""})` : null },
                  ].map(({ key, val }) => (
                    <div key={key} className="prof-row">
                      <span className="prof-key">{key}</span>
                      <span className="prof-value" style={{ color: key === "BMI" && bmi ? bmi.color : "#fff" }}>
                        {val || <span style={{ opacity:0.3 }}>—</span>}
                      </span>
                    </div>
                  ))}
                </div>
                {skill && (
                  <div className="glass-card">
                    <div className="card-title">⚡ Skill Level</div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                      <span style={{ color:"#fff", fontWeight:700, fontSize:18 }}>{skill.label}</span>
                      <span style={{ color:skill.color, fontWeight:900 }}>{skill.pct}%</span>
                    </div>
                    <div className="progress-wrap">
                      <div className="progress-fill" style={{ width:`${skill.pct}%`, background:skill.color }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}