import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../pages/supabaseClient";
import NotificationBell from "./NotificationBell";

const API_BASE = "http://127.0.0.1:5000";

export default function Navbar() {
  const nav = useNavigate();
  const boxRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      const u = session?.user || null;
      setUser(u);

      if (!u || !session?.access_token) {
        setProfile(null);
        return;
      }

      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfile(null);
        return;
      }

      setProfile(data?.profile || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadAll();
    });

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
    nav("/login");
  }

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
      {/* ---- Left: nav links ---- */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {/* Brand Logo */}
        <div
          onClick={() => nav("/dashboard")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            marginRight: 10,
            fontWeight: 800,
            fontSize: 18,
            color: "#10b981",
          }}
        >
          <img src="/logo.png" alt="TrainMax" style={{ height: 32, width: 32, objectFit: "contain", borderRadius: 6 }} />
          <span>TrainMax</span>
        </div>

        {/* Dashboard */}
        <button
          onClick={() => nav("/dashboard")}
          style={{
            padding: "8px 16px",
            border: "1px solid #ddd",
            borderRadius: 6,
            background: "#fff",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
            color: "#374151",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          🏠 Dashboard
        </button>

        {/* Train Max AI */}
        <button
          onClick={() => nav("/chatbot")}
          style={{
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
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <span style={{ fontSize: 16 }}>⚽</span>
          Train Max AI
        </button>

        {/* Training Plans */}
        <button
          onClick={() => nav("/training-plan")}
          style={{
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
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <span style={{ fontSize: 16 }}>📋</span>
          Training Plans
        </button>

        {/* Tracking */}
        <button
          onClick={() => nav("/tracking")}
          style={{
            padding: "8px 18px",
            border: "none",
            borderRadius: 6,
            background: "linear-gradient(135deg, #10b981, #047857)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 7,
            boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <span style={{ fontSize: 16 }}>📈</span>
          Tracking
        </button>

        {/* Notebook */}
        <button
          onClick={() => nav("/notebook")}
          style={{
            padding: "8px 18px",
            border: "none",
            borderRadius: 6,
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 7,
            boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <span style={{ fontSize: 16 }}>📓</span>
          Notebook
        </button>
      </div>

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
              <span style={{ fontSize: 16 }}>👤</span>
              {profile?.user_name || "My Profile"}
            </>
          )}
        </button>

        {open && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "110%",
              width: 380,
              background: "white",
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
                  onClick={() => nav("/login")}
                  style={{
                    padding: "7px 14px",
                    background: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Go to login
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#999",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    Email
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {user.email}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#999",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    User ID
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      wordBreak: "break-all",
                      color: "#888",
                    }}
                  >
                    {user.id}
                  </div>
                </div>

                <hr style={{ margin: "4px 0", borderColor: "#f0f0f0" }} />

                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: "#374151",
                  }}
                >
                  Profile Details
                </div>

                {!profile ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ color: "#666", fontSize: 13 }}>
                      No profile found. Create one to get started!
                    </div>
                    <button
                      onClick={() => {
                        setOpen(false);
                        nav(`/${user?.id}/edit-profile`);
                      }}
                      style={{
                        padding: 8,
                        background: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Create Profile
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                    <div>
                      <b>Name:</b> {profile.user_name || "-"}
                    </div>
                    <div>
                      <b>Country:</b> {profile.country || "-"}
                    </div>
                    <div>
                      <b>Club:</b> {profile.club || "-"}
                    </div>
                    <div>
                      <b>Position:</b> {profile.position || "-"}
                    </div>
                    <div>
                      <b>Focused area:</b> {profile.focused_area || "-"}
                    </div>
                    <div>
                      <b>Age:</b> {profile.age || "-"}
                    </div>
                    <div>
                      <b>Mobile:</b> {profile.mobile_number || "-"}
                    </div>
                    <div>
                      <b>Height:</b>{" "}
                      {profile.height_ft ? `${profile.height_ft} ft` : "-"}
                    </div>
                    <div>
                      <b>Weight:</b>{" "}
                      {profile.weight_kg ? `${profile.weight_kg} kg` : "-"}
                    </div>
                    <div style={{ fontSize: 12, wordBreak: "break-all" }}>
                      <b>Address:</b> {profile.address || "-"}
                    </div>

                    <details style={{ marginTop: 4 }}>
                      <summary
                        style={{
                          cursor: "pointer",
                          color: "#6a11cb",
                          fontSize: 12,
                        }}
                      >
                        Show all profile JSON
                      </summary>
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          fontSize: 11,
                          margin: "6px 0 0",
                          background: "#f8f9fa",
                          padding: 8,
                          borderRadius: 6,
                        }}
                      >
                        {JSON.stringify(profile, null, 2)}
                      </pre>
                    </details>

                    {/* Quick links inside dropdown */}
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        marginTop: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={() => {
                          setOpen(false);
                          nav(`/${profile.id}/edit-profile`);
                        }}
                        style={{
                          padding: "6px 12px",
                          background: "#28a745",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        ✏️ Edit Profile
                      </button>
                      <button
                        onClick={() => {
                          setOpen(false);
                          nav("/chatbot");
                        }}
                        style={{
                          padding: "6px 12px",
                          background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        ⚽ Coach Max
                      </button>
                      <button
                        onClick={() => {
                          setOpen(false);
                          nav("/training-plan");
                        }}
                        style={{
                          padding: "6px 12px",
                          background: "linear-gradient(135deg, #059669, #10b981)",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        📋 My Plans
                      </button>
                      <button
                        onClick={() => {
                          setOpen(false);
                          nav("/tracking");
                        }}
                        style={{
                          padding: "6px 12px",
                          background: "linear-gradient(135deg, #10b981, #047857)",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        📈 Tracking
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
                      background: "#fee2e2",
                      color: "#991b1b",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    🚪 Logout
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    style={{
                      padding: "7px 14px",
                      background: "#f1f5f9",
                      color: "#64748b",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 13,
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