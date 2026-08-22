import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import CoachNavbar from "../components/CoachNavbar";

const API = "http://127.0.0.1:5000";

function diffColor(d) {
  if (!d) return "#888";
  const l = d.toLowerCase();
  if (l.includes("adv")) return "#e53e3e";
  if (l.includes("int")) return "#d69e2e";
  return "#38a169";
}

// ─── normalise a day object so drills always render ──────────────────────────
// Handles: day.drills, day.exercises, drill.instructions vs drill.description,
//          drill.tips vs drill.coaching_cues, day.focus vs day.theme
function normaliseDrills(day) {
  const raw = day.drills || day.exercises || [];
  return raw.map(d => ({
    name:          d.name          || "Drill",
    duration:      d.duration      || "",
    sets:          d.sets          || "",
    reps:          d.reps          || "",
    instructions:  d.instructions  || d.description  || "",
    tips:          Array.isArray(d.tips)          ? d.tips
                 : Array.isArray(d.coaching_cues) ? d.coaching_cues
                 : [],
    equipment:     d.equipment     || "",
  }));
}

function dayFocus(day) {
  return day.focus || day.theme || "";
}

// ─── styles ──────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}

  .ctp-root{min-height:100vh;background:#f7f8fc;font-family:'Inter',sans-serif;}

  .ctp-header{background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:20px 32px;display:flex;align-items:center;gap:16px;}
  .ctp-header-icon{font-size:32px;}
  .ctp-header-title{font-family:'Rajdhani',sans-serif;font-size:22px;font-weight:700;}
  .ctp-header-sub{font-size:13px;opacity:.85;margin-top:2px;}
  .ctp-header-right{margin-left:auto;display:flex;gap:10px;}

  .ctp-tabs{background:#fff;border-bottom:1px solid #e2e8f0;padding:0 32px;display:flex;}
  .ctp-tab{padding:14px 22px;border:none;border-bottom:3px solid transparent;background:none;font-size:14px;font-weight:500;color:#64748b;cursor:pointer;transition:all .2s;font-family:'Inter',sans-serif;}
  .ctp-tab.on{border-bottom-color:#10b981;color:#059669;font-weight:700;}

  .ctp-body{max-width:920px;margin:0 auto;padding:28px 24px;}

  .ctp-toast{position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:10px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.15);font-size:14px;animation:ctpSlide .3s ease both;}
  .ctp-toast.ok{background:#dcfce7;color:#166534;}
  .ctp-toast.err{background:#fee2e2;color:#991b1b;}
  @keyframes ctpSlide{from{opacity:0;transform:translateX(30px);}to{opacity:1;transform:translateX(0);}}

  /* plan list cards */
  .ctp-plan-card{background:#fff;border-radius:12px;padding:18px 22px;box-shadow:0 2px 8px rgba(0,0,0,.07);display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px;transition:box-shadow .2s;border-left:4px solid #10b981;}
  .ctp-plan-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);}
  .ctp-plan-card.assigned{border-left-color:#6a11cb;}
  .ctp-plan-title{font-weight:700;font-size:16px;color:#1e293b;margin-bottom:4px;}
  .ctp-plan-summary{font-size:13px;color:#64748b;margin-bottom:10px;line-height:1.5;}
  .ctp-tags{display:flex;gap:7px;flex-wrap:wrap;}
  .ctp-tag{padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;}
  .ctp-tag.blue{background:#eef2ff;color:#4338ca;}
  .ctp-tag.grey{background:#f1f5f9;color:#64748b;}
  .ctp-tag.green{background:#dcfce7;color:#166534;}
  .ctp-tag.amber{background:#fef9c3;color:#92400e;}
  .ctp-tag.scan{background:#fef3c7;color:#d97706;}
  .ctp-plan-actions{display:flex;gap:8px;flex-shrink:0;}

  .ctp-btn-view{padding:7px 16px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:7px;font-weight:600;cursor:pointer;font-size:13px;transition:opacity .2s;}
  .ctp-btn-view:hover{opacity:.88;}
  .ctp-btn-del{padding:7px 14px;background:#fee2e2;color:#991b1b;border:none;border-radius:7px;font-weight:600;cursor:pointer;font-size:13px;}
  .ctp-btn-del:hover{background:#fecaca;}
  .ctp-btn-chatbot{padding:8px 18px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);border-radius:8px;color:#fff;font-weight:600;cursor:pointer;font-size:13px;}

  /* empty */
  .ctp-empty{text-align:center;padding:60px 20px;color:#94a3b8;}
  .ctp-empty-icon{font-size:48px;margin-bottom:12px;}
  .ctp-empty h3{font-size:18px;font-weight:700;color:#64748b;margin-bottom:8px;}
  .ctp-empty p{font-size:14px;line-height:1.6;margin-bottom:20px;}
  .ctp-empty-btn{padding:10px 24px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px;}

  /* preview banner */
  .ctp-preview-banner{border-radius:10px;padding:12px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px;font-size:13px;flex-wrap:wrap;}
  .ctp-preview-banner.new{background:#d1fae5;border:1px solid #6ee7b7;color:#065f46;}
  .ctp-preview-banner.saved{background:#dcfce7;border:1px solid #bbf7d0;color:#166534;}
  .ctp-save-controls{display:flex;align-items:center;gap:10px;flex:1;min-width:200px;}
  .ctp-save-label{font-size:12px;color:#065f46;white-space:nowrap;font-weight:600;}
  .ctp-save-select{background:#fff;border:1px solid #6ee7b7;border-radius:8px;padding:7px 12px;color:#065f46;font-size:13px;font-family:'Inter',sans-serif;outline:none;cursor:pointer;flex:1;max-width:260px;}
  .ctp-save-btn{padding:8px 22px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px;white-space:nowrap;}
  .ctp-save-btn:disabled{background:#ccc;cursor:not-allowed;}

  /* plan preview */
  .ctp-plan-hdr{background:linear-gradient(135deg,#059669,#10b981);border-radius:12px;padding:20px 24px;color:#fff;margin-bottom:16px;}
  .ctp-plan-hdr-title{font-family:'Rajdhani',sans-serif;font-size:22px;font-weight:700;margin-bottom:6px;}
  .ctp-plan-hdr-summary{font-size:14px;opacity:.9;line-height:1.5;margin-bottom:12px;}
  .ctp-plan-hdr-tags{display:flex;gap:8px;flex-wrap:wrap;}
  .ctp-plan-hdr-tag{background:rgba(255,255,255,.2);padding:3px 12px;border-radius:20px;font-size:12px;}

  .ctp-day-card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);margin-bottom:12px;}
  .ctp-day-hdr{padding:14px 20px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;border-bottom:1px solid transparent;transition:background .2s;}
  .ctp-day-hdr:hover{background:#f8fafc;}
  .ctp-day-hdr.open{background:#ecfdf5;border-bottom-color:#6ee7b7;}
  .ctp-day-name{font-weight:700;color:#065f46;font-family:'Rajdhani',sans-serif;font-size:16px;}
  .ctp-day-focus{color:#64748b;font-size:13px;margin-left:8px;}
  .ctp-day-meta{display:flex;align-items:center;gap:8px;}
  .ctp-intensity{border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;}
  .ctp-intensity.High{background:#fee2e2;color:#dc2626;}
  .ctp-intensity.Medium{background:#fef9c3;color:#d97706;}
  .ctp-intensity.Low{background:#dcfce7;color:#16a34a;}
  .ctp-day-body{padding:16px 20px;display:flex;flex-direction:column;gap:12px;}

  .ctp-warmup{background:#fef9c3;border-radius:8px;padding:10px 14px;}
  .ctp-warmup-lbl{font-weight:700;font-size:11px;color:#92400e;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;}
  .ctp-warmup-txt{font-size:13px;color:#78350f;}

  .ctp-drill{border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;background:#fafbff;}
  .ctp-drill-name{font-weight:700;font-size:15px;color:#1e293b;margin-bottom:8px;}
  .ctp-drill-tags{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;}
  .ctp-drill-tag{padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;}
  .ctp-drill-tag.time{background:#dbeafe;color:#1d4ed8;}
  .ctp-drill-tag.sets{background:#dcfce7;color:#166534;}
  .ctp-drill-tag.reps{background:#fce7f3;color:#9d174d;}
  .ctp-drill-tag.eq{background:#f3f4f6;color:#374151;}
  .ctp-drill-instr{font-size:13px;color:#475569;line-height:1.6;margin-bottom:8px;}
  .ctp-drill-tips{background:#f0fdf4;border-radius:6px;padding:8px 12px;}
  .ctp-drill-tips-lbl{font-weight:700;font-size:11px;color:#166534;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;}
  .ctp-drill-tip{font-size:12px;color:#15803d;margin-bottom:2px;}

  .ctp-cooldown{background:#ede9fe;border-radius:8px;padding:10px 14px;}
  .ctp-cooldown-lbl{font-weight:700;font-size:11px;color:#5b21b6;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;}
  .ctp-cooldown-txt{font-size:13px;color:#6d28d9;}

  .ctp-nutrition{background:#fff7ed;border-radius:12px;padding:16px 20px;margin-bottom:12px;}
  .ctp-nutrition-lbl{font-weight:700;color:#c2410c;margin-bottom:8px;font-size:14px;}
  .ctp-nutrition-tip{font-size:13px;color:#9a3412;margin-bottom:4px;}

  .ctp-notes{background:#f8fafc;border-radius:12px;padding:16px 20px;border:1px solid #e2e8f0;margin-bottom:12px;}
  .ctp-notes-lbl{font-weight:700;color:#475569;margin-bottom:6px;font-size:14px;}
  .ctp-notes-txt{font-size:13px;color:#64748b;line-height:1.6;}

  .ctp-no-drills{font-size:13px;color:#94a3b8;font-style:italic;padding:8px 0;}

  /* filter */
  .ctp-filter-bar{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;align-items:center;}
  .ctp-filter-btn{padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;border:1px solid #e2e8f0;background:#fff;color:#64748b;}
  .ctp-filter-btn.on{background:linear-gradient(135deg,#059669,#10b981);color:#fff;border-color:transparent;}

  .ctp-spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:ctpSpin .7s linear infinite;display:inline-block;margin-right:6px;}
  @keyframes ctpSpin{to{transform:rotate(360deg);}}
  .ctp-loading{text-align:center;padding:60px 20px;color:#94a3b8;}
  .ctp-refresh-btn{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);color:#059669;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;margin-left:auto;transition:all .2s;}
  .ctp-refresh-btn:hover{background:rgba(16,185,129,.2);}
`;

// ─── PlanPreview ──────────────────────────────────────────────────────────────
function PlanPreview({ plan, expandedDay, setExpandedDay }) {
  if (!plan) return null;

  const days          = Array.isArray(plan.days)            ? plan.days            : [];
  const focusAreas    = Array.isArray(plan.key_focus_areas) ? plan.key_focus_areas : [];
  const nutritionTips = Array.isArray(plan.nutrition_tips)  ? plan.nutrition_tips  : [];
  // notes can be in plan.notes OR plan.coach_notes (chatbot saves as notes)
  const notes         = plan.notes || plan.coach_notes || "";

  return (
    <div>
      {/* Header */}
      <div className="ctp-plan-hdr">
        <div className="ctp-plan-hdr-title">📋 {plan.title}</div>
        {plan.summary && <div className="ctp-plan-hdr-summary">{plan.summary}</div>}
        <div className="ctp-plan-hdr-tags">
          {plan.duration          && <span className="ctp-plan-hdr-tag">⏱ {plan.duration}</span>}
          {plan.difficulty        && <span className="ctp-plan-hdr-tag" style={{ background: diffColor(plan.difficulty) }}>📊 {plan.difficulty}</span>}
          {plan.sessions_per_week && <span className="ctp-plan-hdr-tag">🗓 {plan.sessions_per_week}x/week</span>}
          {focusAreas.map((a, i) => <span key={i} className="ctp-plan-hdr-tag">🎯 {a}</span>)}
        </div>
      </div>

      {/* Days */}
      {days.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}>
          No sessions found in this plan.
        </div>
      )}

      {days.map((day, di) => {
        const drills = normaliseDrills(day);
        const focus  = dayFocus(day);
        return (
          <div key={di} className="ctp-day-card">
            <div
              className={`ctp-day-hdr${expandedDay === di ? " open" : ""}`}
              onClick={() => setExpandedDay(expandedDay === di ? -1 : di)}
            >
              <div>
                <span className="ctp-day-name">{day.day}</span>
                {focus && <span className="ctp-day-focus">— {focus}</span>}
              </div>
              <div className="ctp-day-meta">
                {day.intensity && (
                  <span className={`ctp-intensity ${day.intensity}`}>{day.intensity}</span>
                )}
                {day.duration_minutes && (
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>⏱ {day.duration_minutes}m</span>
                )}
                <span style={{ color: "#059669", fontWeight: 700 }}>
                  {expandedDay === di ? "▲" : "▼"}
                </span>
              </div>
            </div>

            {expandedDay === di && (
              <div className="ctp-day-body">
                {/* Warmup */}
                {day.warmup && (
                  <div className="ctp-warmup">
                    <div className="ctp-warmup-lbl">🔥 Warmup</div>
                    <div className="ctp-warmup-txt">{day.warmup}</div>
                  </div>
                )}

                {/* Drills / Exercises — normalised to handle all formats */}
                {drills.length === 0 ? (
                  <div className="ctp-no-drills">No drills recorded for this session.</div>
                ) : (
                  drills.map((drill, dri) => (
                    <div key={dri} className="ctp-drill">
                      <div className="ctp-drill-name">{dri + 1}. {drill.name}</div>
                      <div className="ctp-drill-tags">
                        {drill.duration  && <span className="ctp-drill-tag time">⏱ {drill.duration}</span>}
                        {drill.sets      && <span className="ctp-drill-tag sets">Sets: {drill.sets}</span>}
                        {drill.reps      && <span className="ctp-drill-tag reps">Reps: {drill.reps}</span>}
                        {drill.equipment && <span className="ctp-drill-tag eq">🎽 {drill.equipment}</span>}
                      </div>
                      {drill.instructions && (
                        <div className="ctp-drill-instr">{drill.instructions}</div>
                      )}
                      {drill.tips.length > 0 && (
                        <div className="ctp-drill-tips">
                          <div className="ctp-drill-tips-lbl">💡 Coach Tips</div>
                          {drill.tips.map((t, ti) => (
                            <div key={ti} className="ctp-drill-tip">• {t}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Cooldown */}
                {day.cooldown && (
                  <div className="ctp-cooldown">
                    <div className="ctp-cooldown-lbl">❄️ Cooldown</div>
                    <div className="ctp-cooldown-txt">{day.cooldown}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Nutrition */}
      {nutritionTips.length > 0 && (
        <div className="ctp-nutrition">
          <div className="ctp-nutrition-lbl">🥗 Nutrition Tips</div>
          {nutritionTips.map((tip, i) => (
            <div key={i} className="ctp-nutrition-tip">• {tip}</div>
          ))}
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div className="ctp-notes">
          <div className="ctp-notes-lbl">📝 Coach Notes</div>
          <div className="ctp-notes-txt">{notes}</div>
        </div>
      )}
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function CoachTrainingPlan() {
  const nav      = useNavigate();
  const location = useLocation();

  const [user, setUser]                 = useState(null);
  const [savedPlans, setSavedPlans]     = useState([]);
  const [activePlan, setActivePlan]     = useState(null);
  const [saving, setSaving]             = useState(false);
  const [activeTab, setActiveTab]       = useState("saved");
  const [expandedDay, setExpandedDay]   = useState(0);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [toast, setToast]               = useState(null);
  const [filter, setFilter]             = useState("all");
  const [saveTarget, setSaveTarget]     = useState("coach");
  const [teamPlayers, setTeamPlayers]   = useState([]);

  /* styles */
  useEffect(() => {
    const t = document.createElement("style");
    t.textContent = STYLES;
    document.head.appendChild(t);
    return () => document.head.removeChild(t);
  }, []);

  /* init */
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { nav("/coach-login"); return; }
      setUser(session.user);

      const { data: cp } = await supabase
        .from("coach_profiles").select("id").eq("id", session.user.id).single();
      if (!cp) { nav("/coach-login"); return; }

      // Load team players for save-target dropdown
      const { data: teams } = await supabase
        .from("teams").select("id").eq("coach_id", session.user.id);
      if (teams?.length) {
        const ids = teams.map(t => t.id);
        const { data: members } = await supabase
          .from("team_members")
          .select("player_id, user_profiles(user_name, position)")
          .in("team_id", ids);
        if (members) {
          const seen = new Set();
          setTeamPlayers(members.filter(m => {
            if (seen.has(m.player_id)) return false;
            seen.add(m.player_id); return true;
          }));
        }
      }

      await loadSavedPlans(session.user.id);

      // If passed a plan from CoachChatbot via navigation state
      if (location.state?.extractedPlan) {
        setActivePlan(location.state.extractedPlan);
        setSaveTarget(location.state.saveTarget || "coach");
        setActiveTab("preview");
        setExpandedDay(0);
      }
    }
    load();
  }, [nav, location.state]);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  };

  const authHdr = async () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${await getToken()}`,
  });

  /* load plans — tries coach-training-plan endpoint */
  const loadSavedPlans = async (uid) => {
    setLoadingPlans(true);
    try {
      const h   = await authHdr();
      const res = await fetch(`${API}/api/coach-training-plan/list`, { headers: h });
      const d   = await res.json().catch(() => ({}));
      if (res.ok) {
        setSavedPlans(d.plans || []);
      } else {
        console.error("Load plans error:", d.error);
        setSavedPlans([]);
      }
    } catch (e) {
      console.error("Load plans failed:", e);
      setSavedPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  /* save plan */
  const savePlan = async () => {
    if (!activePlan || !user) return;
    if (activePlan.id && activePlan.saved_at && activePlan.created_at) {
      showToast("This plan is already saved!", "err"); return;
    }
    setSaving(true);
    try {
      const h = await authHdr();
      const res = await fetch(`${API}/api/coach-training-plan/save`, {
        method: "POST", headers: h,
        body: JSON.stringify({
          plan:        activePlan,
          player_id:   saveTarget !== "coach" ? saveTarget : "",
          target_name: activePlan.target_name || "",
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(d.error || "Save failed", "err"); return; }
      showToast(saveTarget !== "coach" ? "✅ Plan assigned to player!" : "✅ Plan saved!");
      setActivePlan(d.plan);
      await loadSavedPlans(user.id);
      setActiveTab("saved");
    } catch {
      showToast("Server error while saving", "err");
    } finally {
      setSaving(false);
    }
  };

  /* delete plan */
  const deletePlan = async planId => {
    if (!window.confirm("Delete this plan? Cannot be undone.")) return;
    try {
      const h   = await authHdr();
      const res = await fetch(`${API}/api/coach-training-plan/delete/${planId}`, {
        method: "DELETE", headers: h,
      });
      if (res.ok) { showToast("Plan deleted"); await loadSavedPlans(user.id); }
      else { const d = await res.json().catch(() => {}); showToast(d?.error || "Delete failed", "err"); }
    } catch { showToast("Server error", "err"); }
  };

  /* open a plan from the list */
  const openPlan = async planId => {
    try {
      const h   = await authHdr();
      const res = await fetch(`${API}/api/coach-training-plan/get/${planId}`, { headers: h });
      const d   = await res.json().catch(() => ({}));
      if (res.ok && d.plan) {
        setActivePlan(d.plan);
        setExpandedDay(0);
        setActiveTab("preview");
      }
    } catch {}
  };

  const filteredPlans = savedPlans.filter(p => {
    if (filter === "mine")     return !p.assigned_to;
    if (filter === "assigned") return !!p.assigned_to;
    return true;
  });

  /* ── render ── */
  return (
    <div className="ctp-root">
      <CoachNavbar />

      {toast && <div className={`ctp-toast ${toast.type}`}>{toast.msg}</div>}

      {/* Header */}
      <div className="ctp-header">
        <div className="ctp-header-icon">📋</div>
        <div>
          <div className="ctp-header-title">Coach Training Plans</div>
          <div className="ctp-header-sub">
            Plans saved from Quick Scan — view, assign to players, or delete
          </div>
        </div>
        <div className="ctp-header-right">
          <button className="ctp-btn-chatbot" onClick={() => nav("/coach-chatbot")}>
            ⚽ Coach AI
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="ctp-tabs">
        {[
          { id: "saved",   label: `📁 Saved Plans (${savedPlans.length})` },
          { id: "preview", label: "👁 View Plan" },
        ].map(t => (
          <button key={t.id}
            className={`ctp-tab${activeTab === t.id ? " on" : ""}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="ctp-body">

        {/* ── SAVED PLANS ── */}
        {activeTab === "saved" && (
          <>
            <div className="ctp-filter-bar">
              {savedPlans.length > 0 && (
                <>
                  <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Show:</span>
                  {[
                    { id: "all",      label: "All Plans" },
                    { id: "mine",     label: "🧑‍💼 My Plans" },
                    { id: "assigned", label: "👤 Assigned" },
                  ].map(f => (
                    <button key={f.id}
                      className={`ctp-filter-btn${filter === f.id ? " on" : ""}`}
                      onClick={() => setFilter(f.id)}>
                      {f.label}
                    </button>
                  ))}
                </>
              )}
              <button
                className="ctp-refresh-btn"
                onClick={() => user && loadSavedPlans(user.id)}
              >
                🔄 Refresh
              </button>
            </div>

            {loadingPlans ? (
              <div className="ctp-loading">
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <div>Loading your plans…</div>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="ctp-empty">
                <div className="ctp-empty-icon">📋</div>
                <h3>{filter !== "all" ? "No plans here" : "No saved plans yet"}</h3>
                <p>
                  {filter !== "all"
                    ? "Try a different filter."
                    : "Go to Coach AI, chat with MAX, click ⚡ Quick Scan, then save the plan."}
                </p>
                {filter === "all" && (
                  <button className="ctp-empty-btn" onClick={() => nav("/coach-chatbot")}>
                    ⚽ Open Coach AI
                  </button>
                )}
              </div>
            ) : (
              filteredPlans.map(plan => (
                <div
                  key={plan.id}
                  className={`ctp-plan-card${plan.assigned_to ? " assigned" : ""}`}
                >
                  <div style={{ flex: 1 }}>
                    <div className="ctp-plan-title">📋 {plan.title}</div>
                    {plan.summary && (
                      <div className="ctp-plan-summary">{plan.summary}</div>
                    )}
                    <div className="ctp-tags">
                      {plan.duration && (
                        <span className="ctp-tag blue">⏱ {plan.duration}</span>
                      )}
                      {plan.difficulty && (
                        <span className="ctp-tag"
                          style={{ background: diffColor(plan.difficulty), color: "#fff" }}>
                          {plan.difficulty}
                        </span>
                      )}
                      {plan.assigned_to_name ? (
                        <span className="ctp-tag green">👤 {plan.assigned_to_name}</span>
                      ) : (
                        <span className="ctp-tag amber">🧑‍💼 My Plan</span>
                      )}
                      {plan.target_name && !plan.assigned_to_name && (
                        <span className="ctp-tag grey">🎯 {plan.target_name}</span>
                      )}
                      <span className="ctp-tag scan">⚡ Quick Scan</span>
                      <span className="ctp-tag grey">
                        🗓 {new Date(plan.saved_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="ctp-plan-actions">
                    <button
                      className="ctp-btn-view"
                      onClick={() => openPlan(plan.id)}
                    >
                      View
                    </button>
                    <button
                      className="ctp-btn-del"
                      onClick={() => deletePlan(plan.id)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* ── PREVIEW ── */}
        {activeTab === "preview" && (
          activePlan ? (
            <div>
              {/* Save bar if not yet saved */}
              {!activePlan.created_at && !activePlan.saved_at ? (
                <div className="ctp-preview-banner new">
                  <div className="ctp-save-controls">
                    <span className="ctp-save-label">✨ Save for:</span>
                    <select
                      className="ctp-save-select"
                      value={saveTarget}
                      onChange={e => setSaveTarget(e.target.value)}
                    >
                      <option value="coach">🧑‍💼 My Coach Account</option>
                      {teamPlayers.map(m => (
                        <option key={m.player_id} value={m.player_id}>
                          👤 {m.user_profiles?.user_name || m.player_id}
                          {m.user_profiles?.position ? ` — ${m.user_profiles.position}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="ctp-save-btn"
                    onClick={savePlan}
                    disabled={saving}
                  >
                    {saving
                      ? <><span className="ctp-spinner" />Saving…</>
                      : "💾 Save Plan"}
                  </button>
                </div>
              ) : (
                <div className="ctp-preview-banner saved">
                  ✅ Saved
                  {activePlan.saved_at && ` · ${new Date(activePlan.saved_at).toLocaleDateString()}`}
                  {activePlan.assigned_to_name && ` · Assigned to ${activePlan.assigned_to_name}`}
                </div>
              )}

              <PlanPreview
                plan={activePlan}
                expandedDay={expandedDay}
                setExpandedDay={setExpandedDay}
              />
            </div>
          ) : (
            <div className="ctp-empty">
              <div className="ctp-empty-icon">💬</div>
              <h3>No plan selected</h3>
              <p>Pick a plan from the Saved Plans tab, or go to Coach AI and use Quick Scan.</p>
              <button className="ctp-empty-btn" onClick={() => nav("/coach-chatbot")}>
                ⚽ Open Coach AI
              </button>
            </div>
          )
        )}

      </div>
    </div>
  );
}