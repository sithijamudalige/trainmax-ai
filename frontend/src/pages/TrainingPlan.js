import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Navbar from "../components/Navbar";

const API_BASE = "http://127.0.0.1:5000";

export default function TrainingPlan() {
  const nav = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("saved");
  const [expandedDay, setExpandedDay] = useState(0);
  const [toast, setToast] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(true);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    async function load() {
      // Use getSession to avoid lock conflicts
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session?.user) {
        nav("/login");
        return;
      }

      setUser(session.user);
      const token = session.access_token;

      // Load profile
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.profile) setProfile(data.profile);

      // Load saved plans from Supabase
      await loadSavedPlans(session.user.id);

      // If a pre-extracted plan was passed from Chatbot, show it
      if (location.state?.extractedPlan) {
        setActivePlan(location.state.extractedPlan);
        setActiveTab("preview");
        setExpandedDay(0);
      }
    }
    load();
  }, [nav, location.state]);

  async function loadSavedPlans(uid) {
    setLoadingPlans(true);
    try {
      const res = await fetch(`${API_BASE}/api/training-plan/list/${uid}`);
      const data = await res.json();
      setSavedPlans(data.plans || []);
    } catch (e) {
      console.error("Failed to load plans", e);
    } finally {
      setLoadingPlans(false);
    }
  }

  async function savePlan() {
    if (!activePlan || !user) return;

    // Check if already saved (has a uuid id from Supabase)
    if (activePlan.id && activePlan.saved_at && !activePlan.extracted_at) {
      showToast("This plan is already saved!", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/training-plan/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          plan: activePlan,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Save failed", "error");
        return;
      }
      showToast("✅ Training plan saved to your account!");
      await loadSavedPlans(user.id);
      setActiveTab("saved");
    } catch (e) {
      showToast("Server error while saving", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(planId) {
    if (!window.confirm("Delete this training plan? This cannot be undone.")) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/training-plan/delete/${user.id}/${planId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        showToast("Plan deleted");
        await loadSavedPlans(user.id);
      } else {
        showToast("Failed to delete plan", "error");
      }
    } catch (e) {
      showToast("Server error", "error");
    }
  }

  function difficultyColor(d) {
    if (!d) return "#888";
    const dl = d.toLowerCase();
    if (dl.includes("adv")) return "#e53e3e";
    if (dl.includes("int")) return "#d69e2e";
    return "#38a169";
  }

  // ---- Plan Preview ----
  function PlanPreview({ plan }) {
    if (!plan) return null;

    // Supabase returns jsonb as objects already — handle both cases
    const days = Array.isArray(plan.days) ? plan.days : [];
    const focusAreas = Array.isArray(plan.key_focus_areas) ? plan.key_focus_areas : [];
    const nutritionTips = Array.isArray(plan.nutrition_tips) ? plan.nutrition_tips : [];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Plan header */}
        <div
          style={{
            background: "linear-gradient(135deg, #6a11cb, #2575fc)",
            borderRadius: 12,
            padding: "20px 24px",
            color: "#fff",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800 }}>⚽ {plan.title}</div>
          <div style={{ marginTop: 6, opacity: 0.9, fontSize: 14 }}>{plan.summary}</div>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {plan.duration && (
              <span style={{ background: "rgba(255,255,255,0.2)", padding: "3px 12px", borderRadius: 20, fontSize: 12 }}>
                ⏱ {plan.duration}
              </span>
            )}
            {plan.difficulty && (
              <span
                style={{
                  background: difficultyColor(plan.difficulty),
                  padding: "3px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {plan.difficulty}
              </span>
            )}
            {focusAreas.map((area) => (
              <span
                key={area}
                style={{ background: "rgba(255,255,255,0.15)", padding: "3px 12px", borderRadius: 20, fontSize: 12 }}
              >
                🎯 {area}
              </span>
            ))}
          </div>
        </div>

        {/* Days */}
        {days.map((day, di) => (
          <div
            key={di}
            style={{
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            }}
          >
            <div
              onClick={() => setExpandedDay(expandedDay === di ? -1 : di)}
              style={{
                padding: "14px 20px",
                background: expandedDay === di ? "#eef2ff" : "#fff",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: expandedDay === di ? "1px solid #c7d2fe" : "none",
              }}
            >
              <div>
                <span style={{ fontWeight: 700, color: "#4338ca" }}>{day.day}</span>
                <span style={{ marginLeft: 10, color: "#666", fontSize: 13 }}>{day.focus}</span>
              </div>
              <span style={{ color: "#4338ca", fontWeight: 700 }}>
                {expandedDay === di ? "▲" : "▼"}
              </span>
            </div>

            {expandedDay === di && (
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Warmup */}
                {day.warmup && (
                  <div style={{ background: "#fef9c3", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#92400e", marginBottom: 4 }}>🔥 WARMUP</div>
                    <div style={{ fontSize: 13, color: "#78350f" }}>{day.warmup}</div>
                  </div>
                )}

                {/* Drills */}
                {(Array.isArray(day.drills) ? day.drills : Array.isArray(day.exercises) ? day.exercises : []).map((rawDrill, dri) => {
                  const drill = {
                    name: rawDrill.name || "Drill",
                    duration: rawDrill.duration || "",
                    sets: rawDrill.sets || "",
                    reps: rawDrill.reps || "",
                    instructions: rawDrill.instructions || rawDrill.description || "",
                    tips: Array.isArray(rawDrill.tips) ? rawDrill.tips : Array.isArray(rawDrill.coaching_cues) ? rawDrill.coaching_cues : [],
                  };
                  return (
                  <div
                    key={dri}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: "14px 16px",
                      background: "#fafbff",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", marginBottom: 8 }}>
                      {dri + 1}. {drill.name}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      {drill.duration && (
                        <span style={{ background: "#dbeafe", color: "#1d4ed8", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                          ⏱ {drill.duration}
                        </span>
                      )}
                      {drill.sets && (
                        <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                          Sets: {drill.sets}
                        </span>
                      )}
                      {drill.reps && (
                        <span style={{ background: "#fce7f3", color: "#9d174d", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                          Reps: {drill.reps}
                        </span>
                      )}
                    </div>
                    {drill.instructions ? (
                      <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, marginBottom: 8 }}>
                        {drill.instructions}
                      </div>
                    ) : null}
                    {drill.tips.length > 0 && (
                      <div style={{ background: "#f0fdf4", borderRadius: 6, padding: "8px 12px" }}>
                        <div style={{ fontWeight: 700, fontSize: 11, color: "#166534", marginBottom: 4 }}>💡 COACH TIPS</div>
                        {drill.tips.map((tip, ti) => (
                          <div key={ti} style={{ fontSize: 12, color: "#15803d" }}>• {tip}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )})}

                {/* Cooldown */}
                {day.cooldown && (
                  <div style={{ background: "#ede9fe", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#5b21b6", marginBottom: 4 }}>❄️ COOLDOWN</div>
                    <div style={{ fontSize: 13, color: "#6d28d9" }}>{day.cooldown}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Nutrition tips */}
        {nutritionTips.length > 0 && (
          <div style={{ background: "#fff7ed", borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontWeight: 700, color: "#c2410c", marginBottom: 8 }}>🥗 Nutrition Tips</div>
            {nutritionTips.map((tip, i) => (
              <div key={i} style={{ fontSize: 13, color: "#9a3412", marginBottom: 4 }}>• {tip}</div>
            ))}
          </div>
        )}

        {/* Notes */}
        {plan.notes && (
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 20px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontWeight: 700, color: "#475569", marginBottom: 6 }}>📝 Coach Notes</div>
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{plan.notes}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui", minHeight: "100vh", background: "#f7f8fc" }}>
      <Navbar />

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            background: toast.type === "error" ? "#fee2e2" : "#dcfce7",
            color: toast.type === "error" ? "#991b1b" : "#166534",
            padding: "12px 20px",
            borderRadius: 10,
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            fontSize: 14,
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #6a11cb, #2575fc)",
          color: "#fff",
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span style={{ fontSize: 32 }}>📋</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 22 }}>My Training Plans</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            AI-extracted plans saved to your account
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <button
            onClick={() => nav("/chatbot")}
            style={{
              padding: "8px 18px",
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: 8,
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ⚽ Back to Coach
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 32px",
          display: "flex",
        }}
      >
        {["saved", "preview"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "14px 24px",
              border: "none",
              borderBottom: activeTab === tab ? "3px solid #6a11cb" : "3px solid transparent",
              background: "none",
              fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? "#6a11cb" : "#64748b",
              cursor: "pointer",
              fontSize: 14,
              transition: "all 0.2s",
            }}
          >
            {tab === "saved"
              ? `📁 Saved Plans (${savedPlans.length})`
              : "👁 Preview & Save"}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px" }}>

        {/* ---- SAVED PLANS TAB ---- */}
        {activeTab === "saved" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {loadingPlans ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <div>Loading your plans...</div>
              </div>
            ) : savedPlans.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#64748b" }}>
                  No training plans yet
                </div>
                <div style={{ fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                  Go to your coaching session, have a conversation with Max,<br />
                  then click <b>"Extract Plan"</b> to save it here.
                </div>
                <button
                  onClick={() => nav("/chatbot")}
                  style={{
                    padding: "10px 24px",
                    background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  ⚽ Start Coaching Session
                </button>
              </div>
            ) : (
              savedPlans.map((plan) => (
                <div
                  key={plan.id}
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    padding: "18px 22px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    transition: "box-shadow 0.2s",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b", marginBottom: 4 }}>
                      ⚽ {plan.title}
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10, lineHeight: 1.5 }}>
                      {plan.summary}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {plan.duration && (
                        <span style={{ background: "#eef2ff", color: "#4338ca", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                          ⏱ {plan.duration}
                        </span>
                      )}
                      <span
                        style={{
                          background: difficultyColor(plan.difficulty),
                          color: "#fff",
                          padding: "2px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {plan.difficulty}
                      </span>
                      <span style={{ background: "#f1f5f9", color: "#64748b", padding: "2px 10px", borderRadius: 20, fontSize: 11 }}>
                        📅 {Array.isArray(plan.days) ? plan.days.length : 0} day(s)
                      </span>
                      <span style={{ background: "#f1f5f9", color: "#94a3b8", padding: "2px 10px", borderRadius: 20, fontSize: 11 }}>
                        🗓 {new Date(plan.saved_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        setActivePlan(plan);
                        setActiveTab("preview");
                        setExpandedDay(0);
                      }}
                      style={{
                        padding: "7px 16px",
                        background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 7,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => deletePlan(plan.id)}
                      style={{
                        padding: "7px 14px",
                        background: "#fee2e2",
                        color: "#991b1b",
                        border: "none",
                        borderRadius: 7,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ---- PREVIEW TAB ---- */}
        {activeTab === "preview" && (
          <div>
            {activePlan ? (
              <div>
                {/* Save bar — only show if not already saved (no created_at from Supabase) */}
                {!activePlan.created_at && (
                  <div
                    style={{
                      background: "#eef2ff",
                      border: "1px solid #c7d2fe",
                      borderRadius: 10,
                      padding: "12px 18px",
                      marginBottom: 20,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#4338ca", flex: 1 }}>
                      ✨ Plan extracted! Review it below, then save it to your account.
                    </span>
                    <button
                      onClick={savePlan}
                      disabled={saving}
                      style={{
                        padding: "8px 22px",
                        background: saving
                          ? "#ccc"
                          : "linear-gradient(135deg, #6a11cb, #2575fc)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        fontWeight: 700,
                        cursor: saving ? "not-allowed" : "pointer",
                        fontSize: 14,
                      }}
                    >
                      {saving ? "Saving..." : "💾 Save Plan"}
                    </button>
                  </div>
                )}

                {/* Already saved badge */}
                {activePlan.created_at && (
                  <div
                    style={{
                      background: "#dcfce7",
                      border: "1px solid #bbf7d0",
                      borderRadius: 10,
                      padding: "10px 18px",
                      marginBottom: 20,
                      fontSize: 13,
                      color: "#166534",
                      fontWeight: 600,
                    }}
                  >
                    ✅ This plan is saved to your account · {new Date(activePlan.saved_at).toLocaleDateString()}
                  </div>
                )}

                <PlanPreview plan={activePlan} />
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: "#64748b" }}>
                  No plan to preview
                </div>
                <div style={{ fontSize: 13, marginBottom: 20 }}>
                  Go to your coaching session and click "Extract Plan"
                </div>
                <button
                  onClick={() => nav("/chatbot")}
                  style={{
                    padding: "10px 24px",
                    background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  ⚽ Go to Coach Max
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}