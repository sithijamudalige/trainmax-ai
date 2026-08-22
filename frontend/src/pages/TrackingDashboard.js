import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_BASE = "http://127.0.0.1:5000";

export default function TrackingDashboard() {
  const nav = useNavigate();

  const [user, setUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [primaryPlanId, setPrimaryPlanId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tracking State
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [trackModal, setTrackModal] = useState({ isOpen: false, planId: null, dayIndex: null });
  const [trackStatus, setTrackStatus] = useState("pending");
  const [trackReason, setTrackReason] = useState("");
  const [trackSaving, setTrackSaving] = useState(false);

  const openTrackModal = (e, planId, dayIndex, dayData) => {
    e.stopPropagation();
    setTrackModal({ isOpen: true, planId, dayIndex });
    setTrackStatus(dayData.tracking_status || "pending");
    setTrackReason(dayData.tracking_reason || "");
  };

  const handleTrackSave = async () => {
    if (!trackModal.planId || trackModal.dayIndex === null) return;
    setTrackSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/training-plan/track-day/${trackModal.planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          day_index: trackModal.dayIndex, 
          status: trackStatus, 
          reason: trackReason 
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(prev => prev.map(p => p.id === trackModal.planId ? data.plan : p));
        setTrackModal({ isOpen: false, planId: null, dayIndex: null });
      }
    } catch(e) {}
    setTrackSaving(false);
  };

  const loadPlans = useCallback(async (uid) => {
    if (!uid) return;
    try {
      const [tRes, pRes] = await Promise.all([
        fetch(`${API_BASE}/api/training-plan/list/${uid}`),
        fetch(`${API_BASE}/api/training-plan/primary/${uid}`)
      ]);
      const tData = await tRes.json().catch(() => ({}));
      const pData = await pRes.json().catch(() => ({}));
      if (tRes.ok) setPlans(tData.plans || []);
      if (pRes.ok) setPrimaryPlanId(pData.primary_plan_id || null);
    } catch (_) {}
  }, []);

  const setPrimaryPlan = async (e, planId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/training-plan/primary/${user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId })
      });
      if (res.ok) setPrimaryPlanId(planId);
    } catch(_) {}
  };

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session?.user) { nav("/login"); return; }
      
      setUser(session.user);
      await loadPlans(session.user.id);
      setLoading(false);
    }
    load();
  }, [nav, loadPlans]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f0c29", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Loading tracking...
      </div>
    );
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css" />
      <style>{`
        * { box-sizing:border-box; }
        .dash-page { min-height:100vh; background:linear-gradient(135deg,#0f0c29,#302b63,#24243e); font-family:system-ui; padding-bottom:60px; }
        .glass-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:20px; backdrop-filter:blur(10px); }
        .plan-card { display:flex; align-items:center; gap:16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:16px; cursor:pointer; transition:all 0.2s; }
        .plan-card:hover { background:rgba(255,255,255,0.06); transform:translateY(-2px); }
        .plan-icon { width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:24px; flex-shrink:0; }
        .plan-info { flex:1; }
        .plan-title { color:#fff; font-size:15px; font-weight:700; margin-bottom:4px; display:flex; align-items:center; }
        .plan-meta { color:rgba(255,255,255,0.5); font-size:13px; }
        .diff-badge { padding:4px 10px; border-radius:8px; font-size:11px; font-weight:700; color:#fff; text-transform:uppercase; letter-spacing:0.5px; }
        .btn-hero { padding:10px 20px; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; border:none; transition:all 0.2s; font-family:system-ui; display:inline-flex; align-items:center; gap:6px; text-decoration:none; }
        .btn-hero-primary { background:linear-gradient(135deg,#6a11cb,#2575fc); color:#fff; box-shadow:0 4px 14px rgba(106,17,203,0.4); }
        .btn-hero-primary:hover { transform:translateY(-2px); color:#fff; }
        .btn-hero-ghost { background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.7); }
        .btn-hero-ghost:hover { background:rgba(255,255,255,0.15); color:#fff; }
        .section-heading { color:#fff; font-size:16px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px; }
        .chat-input { padding:12px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:8px; outline:none; }
        .chat-input:focus { border-color:#6a11cb; }
        .empty-state { text-align:center; padding:48px 20px; }
        .e-icon { font-size:48px; margin-bottom:16px; }
        .e-text { color:rgba(255,255,255,0.5); font-size:14px; }
      `}</style>
      <div className="dash-page">
        <Navbar />

        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
          <h1 style={{ margin: 0, fontSize: 28, background: "linear-gradient(to right, #4facfe, #00f2fe)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            📈 Day-by-Day Tracking
          </h1>
          <button className="btn-hero btn-hero-primary" onClick={() => nav("/chatbot")}>+ Create New</button>
        </div>

        {plans.length === 0 ? (
          <div className="glass-card">
            <div className="empty-state" style={{ padding: "48px 20px", textAlign: "center" }}>
              <div className="e-icon" style={{ fontSize: 48, marginBottom: 10 }}>📋</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, fontWeight: 700, marginBottom: 8 }}>No plans yet</div>
              <div className="e-text" style={{ marginBottom: 20 }}>Chat with Max and click "Extract Plan"</div>
              <button className="btn-hero btn-hero-primary" onClick={() => nav("/chatbot")}>⚽ Start Coaching</button>
            </div>
          </div>
        ) : (
          [...plans].sort((a,b) => a.id === primaryPlanId ? -1 : b.id === primaryPlanId ? 1 : 0).map(plan => {
            const isExpanded = expandedPlanId === plan.id;
            const isPrimary = primaryPlanId === plan.id;
            const days = Array.isArray(plan.days) ? plan.days : [];
            const completedDays = days.filter(d => d.tracking_status === "done").length;
            const progressPct = days.length > 0 ? (completedDays / days.length) * 100 : 0;

            return (
              <div key={plan.id} style={{ marginBottom: 12 }}>
                <div className="plan-card" style={{ marginBottom: 0, border: isPrimary ? "1px solid rgba(16,185,129,0.5)" : "1px solid rgba(255,255,255,0.07)" }} onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}>
                  <div className="plan-icon" style={{ background: isPrimary ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#6a11cb,#2575fc)" }}>📋</div>
                  <div className="plan-info">
                    <div className="plan-title">
                      {plan.title}
                      {isPrimary && <span style={{ marginLeft: 8, fontSize: 10, background: "#10b981", color: "#fff", padding: "2px 6px", borderRadius: 4 }}>⭐ PRIMARY</span>}
                    </div>
                    <div className="plan-meta">{plan.summary?.slice(0, 80)}{plan.summary?.length > 80 ? "..." : ""}</div>
                    <div className="plan-meta" style={{ marginTop:4, display: "flex", alignItems: "center", gap: 10 }}>
                      <span>⏱ {plan.duration} · 📅 {days.length} days</span>
                      {isPrimary && days.length > 0 && (
                        <div style={{ flex: 1, maxWidth: 100, height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden" }}>
                          <div style={{ width: `${progressPct}%`, height: "100%", background: "#10b981" }} />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!isPrimary && (
                    <button 
                      className="btn-hero btn-hero-ghost" 
                      style={{ padding: "4px 10px", fontSize: 11, marginRight: 10 }}
                      onClick={(e) => setPrimaryPlan(e, plan.id)}
                    >
                      Set as Primary
                    </button>
                  )}

                  <div className="diff-badge" style={{
                    background: plan.difficulty?.toLowerCase().includes("adv") ? "#ef4444"
                      : plan.difficulty?.toLowerCase().includes("int") ? "#f59e0b" : "#10b981",
                    marginRight: 8
                  }}>{plan.difficulty}</div>
                  
                  <div style={{ color: "rgba(255,255,255,0.4)" }}>
                    {isExpanded ? "▲" : "▼"}
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="glass-card" style={{ marginTop: 8, borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: 12 }}>
                    {!isPrimary ? (
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textAlign: "center", padding: 10 }}>
                        You must set this plan as ⭐ Primary to track your daily progress!
                      </div>
                    ) : days.length > 0 ? (
                      <>
                        <div className="section-heading" style={{ fontSize: 10, marginBottom: 10 }}>Day by Day Tracking</div>
                        {days.map((day, idx) => (
                          <div key={idx} style={{ 
                            display: "flex", alignItems: "center", justifyContent: "space-between", 
                            padding: "10px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 8, marginBottom: 6
                          }}>
                            <div>
                              <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{day.day} - {day.theme}</div>
                              {day.tracking_status === "missed" && day.tracking_reason && (
                                <div style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>Reason: {day.tracking_reason}</div>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div className="diff-badge" style={{
                                background: day.tracking_status === "done" ? "#10b981" :
                                            day.tracking_status === "in_progress" ? "#3b82f6" :
                                            day.tracking_status === "missed" ? "#ef4444" : "#6b7280"
                              }}>
                                {day.tracking_status === "in_progress" ? "In Progress" : 
                                 day.tracking_status === "done" ? "Done" : 
                                 day.tracking_status === "missed" ? "Missed" : "Will Do"}
                              </div>
                              <button 
                                className="btn-hero btn-hero-ghost" 
                                style={{ padding: "4px 10px", fontSize: 11 }}
                                onClick={(e) => openTrackModal(e, plan.id, idx, day)}
                              >
                                ✏️ Update
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>No days generated for this plan.</div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* TRACKING MODAL */}
      {trackModal.isOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, backdropFilter: "blur(5px)"
        }}>
          <div className="glass-card" style={{ width: 400, background: "rgba(30,27,75,0.95)" }}>
            <div className="section-heading">Update Day Status</div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 8 }}>Status</label>
              <select 
                className="chat-input" 
                style={{ width: "100%" }}
                value={trackStatus}
                onChange={e => setTrackStatus(e.target.value)}
              >
                <option value="pending">Will Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="missed">Missed</option>
              </select>
            </div>

            {trackStatus === "missed" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 8 }}>Reason (optional)</label>
                <input 
                  type="text" 
                  className="chat-input" 
                  style={{ width: "100%" }}
                  placeholder="e.g. Injured, Busy with work..."
                  value={trackReason}
                  onChange={e => setTrackReason(e.target.value)}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button 
                className="btn-hero btn-hero-ghost" 
                onClick={() => setTrackModal({ isOpen: false, planId: null, dayIndex: null })}
              >
                Cancel
              </button>
              <button 
                className="btn-hero btn-hero-primary" 
                onClick={handleTrackSave}
                disabled={trackSaving}
              >
                {trackSaving ? "Saving..." : "Save Progress"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
