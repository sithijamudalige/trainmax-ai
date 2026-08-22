import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../pages/supabaseClient";
import NotificationBell from "./NotificationBell";

// eslint-disable-next-line no-unused-vars
const API_BASE = "http://127.0.0.1:5000";

export default function CoachNavbar() {
  const nav = useNavigate();
  const boxRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [coach, setCoach] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      const u = session?.user || null;
      setUser(u);

      if (!u) { setCoach(null); return; }

      const { data, error } = await supabase
        .from("coach_profiles")
        .select("*")
        .eq("id", u.id)
        .single();

      setCoach(error ? null : data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    const { data: sub } = supabase.auth.onAuthStateChange(() => loadAll());
    return () => sub?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      if (!open) return;
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function logout() {
    await supabase.auth.signOut();
    setOpen(false);
    nav("/coach-login");
  }

  const NAV_LINKS = [
    {
      label: "Dashboard",
      icon: "🏠",
      path: "/coach-dashboard",
      style: {
        padding: "8px 16px",
        border: "1px solid #ddd",
        borderRadius: 6,
        background: "#fff",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 14,
        color: "#374151",
        display: "flex",
        alignItems: "center",
        gap: 7,
        transition: "background 0.2s",
      },
      hoverBg: "#f9fafb",
      defaultBg: "#fff",
      gradient: false,
    },
    {
      label: "Train Max AI",
      icon: "⚽",
      path: "/coach-chatbot",
      style: {
        padding: "8px 18px",
        border: "none",
        borderRadius: 6,
        background: "linear-gradient(135deg, #6a11cb, #2575fc)",
        color: "#fff",
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 7,
        boxShadow: "0 2px 8px rgba(101,16,203,0.3)",
        transition: "opacity 0.2s",
      },
      gradient: true,
    },
    {
      label: "Team Creation",
      icon: "👥",
      path: "/coach-team",
      style: {
        padding: "8px 18px",
        border: "none",
        borderRadius: 6,
        background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
        color: "#fff",
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 7,
        boxShadow: "0 2px 8px rgba(14,165,233,0.3)",
        transition: "opacity 0.2s",
      },
      gradient: true,
    },
    {
      label: "Training Plans",
      icon: "📋",
      path: "/coach-training-plans",
      style: {
        padding: "8px 18px",
        border: "none",
        borderRadius: 6,
        background: "linear-gradient(135deg, #059669, #10b981)",
        color: "#fff",
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 7,
        boxShadow: "0 2px 8px rgba(5,150,105,0.3)",
        transition: "opacity 0.2s",
      },
      gradient: true,
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderBottom: "1px solid #e5e5e5",
        fontFamily: "system-ui",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* ── Left: nav links ── */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {/* Brand Logo */}
        <div
          onClick={() => nav("/coach-dashboard")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            marginRight: 6,
            fontWeight: 800,
            fontSize: 18,
            color: "#10b981",
          }}
        >
          <img src="/logo.png" alt="TrainMax" style={{ height: 32, width: 32, objectFit: "contain", borderRadius: 6 }} />
          <span>TrainMax</span>
        </div>

        {/* Coach badge */}
        <div
          style={{
            padding: "6px 12px",
            background: "linear-gradient(135deg, #059669, #10b981)",
            borderRadius: 8,
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginRight: 4,
            boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
            flexShrink: 0,
          }}
        >
          🧑‍💼 <span>Coach Portal</span>
        </div>

        {NAV_LINKS.map((link) => (
          <button
            key={link.path}
            onClick={() => nav(link.path)}
            style={link.style}
            onMouseEnter={(e) => {
              if (link.gradient) e.currentTarget.style.opacity = "0.85";
              else e.currentTarget.style.background = link.hoverBg;
            }}
            onMouseLeave={(e) => {
              if (link.gradient) e.currentTarget.style.opacity = "1";
              else e.currentTarget.style.background = link.defaultBg;
            }}
          >
            <span style={{ fontSize: 16 }}>{link.icon}</span>
            {link.label}
          </button>
        ))}
      </div>

      {/* ── Right: coach profile dropdown ── */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 15 }} ref={boxRef}>
        <NotificationBell />
        <button
          onClick={() => setOpen((p) => !p)}
          disabled={loading}
          style={{
            padding: "8px 16px",
            border: "1px solid #ddd",
            borderRadius: 6,
            background: "#fff",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#374151",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          {loading ? (
            "Loading..."
          ) : (
            <>
              <span style={{ fontSize: 16 }}>🧑‍💼</span>
              {coach?.full_name?.split(" ")[0] || "Coach"}
            </>
          )}
        </button>

        {open && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "110%",
              width: 340,
              background: "white",
              color: "#1f2937",
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 14,
              boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
              zIndex: 1000,
            }}
          >
            {!user ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ color: "#666" }}>Not logged in</div>
                <button
                  onClick={() => nav("/coach-login")}
                  style={{
                    padding: "7px 14px",
                    background: "#059669",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Go to Coach Login
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {/* Email + ID */}
                <div>
                  <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: 1 }}>
                    Email
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{user.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: 1 }}>
                    Coach ID
                  </div>
                  <div style={{ fontSize: 11, wordBreak: "break-all", color: "#888" }}>{user.id}</div>
                </div>

                <hr style={{ margin: "4px 0", borderColor: "#f0f0f0" }} />

                <div style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>
                  Coach Profile
                </div>

                {!coach ? (
                  <div style={{ color: "#666", fontSize: 13 }}>
                    No coach profile found.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                    <div><b>Name:</b> {coach.full_name || "-"}</div>
                    <div><b>Club:</b> {coach.club || "-"}</div>
                    <div><b>Country:</b> {coach.country || "-"}</div>
                    <div><b>Experience:</b> {coach.experience_level || "-"}</div>
                    <div><b>Mobile:</b> {coach.mobile_number || "-"}</div>
                    <div>
                      <b>Verified:</b>{" "}
                      {coach.is_verified
                        ? <span style={{ color: "#059669" }}>✅ Yes</span>
                        : <span style={{ color: "#d97706" }}>⏳ Pending</span>
                      }
                    </div>
                    {coach.specializations?.length > 0 && (
                      <div>
                        <b>Specializations:</b>{" "}
                        <span style={{ color: "#6a11cb" }}>
                          {coach.specializations.join(", ")}
                        </span>
                      </div>
                    )}

                    {/* Quick links */}
                    <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      <button
                        onClick={() => { setOpen(false); nav("/coach-dashboard"); }}
                        style={{
                          padding: "6px 12px",
                          background: "linear-gradient(135deg, #059669, #10b981)",
                          color: "white", border: "none", borderRadius: 4,
                          cursor: "pointer", fontSize: 12, fontWeight: 600,
                        }}
                      >
                        🏠 Dashboard
                      </button>
                      <button
                        onClick={() => { setOpen(false); nav("/coach-team"); }}
                        style={{
                          padding: "6px 12px",
                          background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                          color: "white", border: "none", borderRadius: 4,
                          cursor: "pointer", fontSize: 12, fontWeight: 600,
                        }}
                      >
                        👥 My Team
                      </button>
                      <button
                        onClick={() => { setOpen(false); nav("/coach-dashboard"); }}
                        style={{
                          padding: "6px 12px",
                          background: "linear-gradient(135deg, #f59e0b, #d97706)",
                          color: "white", border: "none", borderRadius: 4,
                          cursor: "pointer", fontSize: 12, fontWeight: 600,
                        }}
                      >
                        ✏️ Edit Profile
                      </button>
                      <button
                        onClick={() => { setOpen(false); nav("/coach-training-plans"); }}
                        style={{
                          padding: "6px 12px",
                          background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                          color: "white", border: "none", borderRadius: 4,
                          cursor: "pointer", fontSize: 12, fontWeight: 600,
                        }}
                      >
                        📋 Plans
                      </button>
                    </div>
                  </div>
                )}

                <hr style={{ margin: "4px 0", borderColor: "#f0f0f0" }} />

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={logout}
                    style={{
                      padding: "7px 14px",
                      background: "#fee2e2", color: "#991b1b",
                      border: "none", borderRadius: 4,
                      cursor: "pointer", fontWeight: 600, fontSize: 13,
                    }}
                  >
                    🚪 Logout
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    style={{
                      padding: "7px 14px",
                      background: "#f1f5f9", color: "#64748b",
                      border: "none", borderRadius: 4,
                      cursor: "pointer", fontSize: 13,
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}