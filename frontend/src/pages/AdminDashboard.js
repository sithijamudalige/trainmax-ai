import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const TABLES = [
  { key: "user_profiles",  label: "User profiles",   sub: "Players, positions, physical data",         icon: "👤", color: "#eef2ff", iconColor: "#4338ca" },
  { key: "player_stats",   label: "Player stats",    sub: "Goals, assists, wins, achievements",        icon: "🏆", color: "#ecfdf5", iconColor: "#059669" },
  { key: "coach_profiles", label: "Coach profiles",  sub: "Experience, club, verification status",     icon: "🎖️", color: "#f5f3ff", iconColor: "#7c3aed" },
  { key: "teams",          label: "Teams",            sub: "Coach-created groups and members",          icon: "🛡️", color: "#fffbeb", iconColor: "#d97706" },
  { key: "team_members",   label: "Team members",    sub: "Player-team assignments and roles",         icon: "👥", color: "#fff1f2", iconColor: "#e11d48" },
  { key: "training_plans", label: "Training plans",  sub: "AI-extracted plans, difficulty, days",      icon: "📋", color: "#eff6ff", iconColor: "#2563eb" },
  { key: "notebooks",      label: "Notebooks",       sub: "Player private notes, categories, tags",    icon: "📓", color: "#fef2f2", iconColor: "#dc2626" },
];

const NAV = [
  { label: "Dashboard",       icon: "📊", path: "/admin/dashboard" },
  { label: "User management", icon: "👥", path: "/admin/users"     },
  { label: "Analytics",       icon: "📈", path: null               },
];

const styles = `
  *{box-sizing:border-box;margin:0;padding:0}
  .adm-root{min-height:100vh;background:#f8fafc;font-family:system-ui,sans-serif;display:flex}

  .adm-sidebar{width:240px;flex-shrink:0;background:#fff;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh;z-index:10}
  .adm-logo{padding:20px 20px 16px;border-bottom:1px solid #e2e8f0}
  .adm-logo-title{font-size:16px;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:8px}
  .adm-logo-sub{font-size:11px;color:#94a3b8;margin-top:2px;text-transform:uppercase;letter-spacing:.6px}

  .adm-nav-section{font-size:10px;color:#94a3b8;padding:14px 20px 4px;text-transform:uppercase;letter-spacing:.8px;font-weight:600}
  .adm-nav-item{display:flex;align-items:center;gap:10px;padding:9px 20px;font-size:13px;color:#475569;cursor:pointer;transition:all .15s;border:none;background:none;width:100%;text-align:left}
  .adm-nav-item:hover{background:#f1f5f9;color:#1e293b}
  .adm-nav-item.active{background:#eff6ff;color:#2563eb;font-weight:600}
  .adm-nav-icon{font-size:16px;width:20px;text-align:center}

  .adm-sidebar-footer{margin-top:auto;padding:16px 20px;border-top:1px solid #e2e8f0}
  .adm-logout{display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;background:none;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#64748b;cursor:pointer;transition:all .15s;font-family:system-ui}
  .adm-logout:hover{background:#fef2f2;border-color:#fecaca;color:#dc2626}

  .adm-main{margin-left:240px;flex:1;padding:28px 32px}
  .adm-topbar{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px}
  .adm-title{font-size:22px;font-weight:800;color:#0f172a}
  .adm-subtitle{font-size:13px;color:#64748b;margin-top:3px}
  .adm-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6a11cb,#2575fc);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff}
  .adm-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;background:#ecfdf5;color:#059669}
  .adm-badge::before{content:"";width:6px;height:6px;border-radius:50%;background:#10b981;display:inline-block}

  .adm-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
  .adm-metric{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px}
  .adm-metric-icon{font-size:22px;margin-bottom:10px}
  .adm-metric-label{font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px}
  .adm-metric-value{font-size:24px;font-weight:800;color:#0f172a}
  .adm-metric-sub{font-size:11px;color:#94a3b8;margin-top:4px}

  .adm-section-title{font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:8px}

  .adm-tables{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:28px}
  .adm-table-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all .2s;text-align:left;width:100%;font-family:system-ui}
  .adm-table-card:hover{border-color:#93c5fd;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,0.06)}
  .adm-table-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
  .adm-table-name{font-size:13px;font-weight:700;color:#0f172a}
  .adm-table-sub{font-size:11px;color:#64748b;margin-top:2px}
  .adm-table-arrow{margin-left:auto;color:#94a3b8;font-size:18px;flex-shrink:0}

  .adm-quick{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}
  .adm-quick-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:13px}
  .adm-quick-row:last-child{border-bottom:none}
  .adm-quick-icon{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
  .adm-quick-label{font-size:13px;font-weight:600;color:#0f172a}
  .adm-quick-sub{font-size:11px;color:#64748b;margin-top:1px}
  .adm-quick-btn{margin-left:auto;padding:4px 14px;font-size:11px;font-weight:600;border:1px solid #e2e8f0;border-radius:7px;background:#f8fafc;color:#475569;cursor:pointer;transition:all .15s;white-space:nowrap;font-family:system-ui}
  .adm-quick-btn:hover{background:#eff6ff;border-color:#93c5fd;color:#2563eb}

  @media(max-width:900px){
    .adm-metrics{grid-template-columns:repeat(2,1fr)}
    .adm-tables{grid-template-columns:1fr}
    .adm-sidebar{display:none}
    .adm-main{margin-left:0}
  }
`;

export default function AdminDashboard() {
  const nav = useNavigate();

  useEffect(() => {
    const isAdmin = localStorage.getItem("is_admin") === "true";
    if (!isAdmin) nav("/admin");
  }, [nav]);

  function logout() {
    localStorage.removeItem("is_admin");
    nav("/admin");
  }

  const METRICS = [
    { icon: "👥", label: "Total users",    value: "—", sub: "Registered players" },
    { icon: "🎖️", label: "Coaches",        value: "—", sub: "Active accounts"    },
    { icon: "📋", label: "Training plans", value: "—", sub: "Saved by users"     },
    { icon: "🛡️", label: "Teams",          value: "—", sub: "Created by coaches" },
  ];

  const QUICK = [
    { icon: "👥", bg: "#eff6ff", label: "User management",    sub: "View, edit, and remove accounts",          path: "/admin/users" },
    { icon: "✅", bg: "#ecfdf5", label: "Verify coaches",      sub: "Set is_verified flag on coach profiles",   path: "/admin/crud/coach_profiles" },
    { icon: "🔄", bg: "#fffbeb", label: "Reset player stats",  sub: "Clear statistics for a specific user",     path: "/admin/crud/player_stats" },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="adm-root">

        {/* Sidebar */}
        <div className="adm-sidebar">
          <div className="adm-logo">
            <div className="adm-logo-title">
              <img src="/logo.png" alt="Logo" style={{ width: 24, height: 24, borderRadius: 4 }} />
              Train Max AI
            </div>
            <div className="adm-logo-sub">Admin portal</div>
          </div>

          <div className="adm-nav-section">General</div>
          {NAV.map(n => (
            <button
              key={n.label}
              className={`adm-nav-item${n.label === "Dashboard" ? " active" : ""}`}
              onClick={() => n.path && nav(n.path)}
            >
              <span className="adm-nav-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}

          <div className="adm-nav-section">Database tables</div>
          {TABLES.map(t => (
            <button
              key={t.key}
              className="adm-nav-item"
              onClick={() => nav(`/admin/crud/${t.key}`)}
            >
              <span className="adm-nav-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}

          <div className="adm-sidebar-footer">
            <button className="adm-logout" onClick={logout}>
              🚪 Log out
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="adm-main">
          <div className="adm-topbar">
            <div>
              <div className="adm-title">Dashboard</div>
              <div className="adm-subtitle">Train Max AI platform overview</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="adm-badge">Flask online</span>
              <div className="adm-avatar">AD</div>
            </div>
          </div>

          {/* Metrics */}
          <div className="adm-metrics">
            {METRICS.map(m => (
              <div key={m.label} className="adm-metric">
                <div className="adm-metric-icon">{m.icon}</div>
                <div className="adm-metric-label">{m.label}</div>
                <div className="adm-metric-value">{m.value}</div>
                <div className="adm-metric-sub">{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Table cards */}
          <div className="adm-section-title">📦 Manage tables</div>
          <div className="adm-tables">
            {TABLES.map(t => (
              <button
                key={t.key}
                className="adm-table-card"
                onClick={() => nav(`/admin/crud/${t.key}`)}
              >
                <div
                  className="adm-table-icon"
                  style={{ backgroundColor: t.color }}
                >
                  {t.icon}
                </div>
                <div>
                  <div className="adm-table-name">{t.label}</div>
                  <div className="adm-table-sub">{t.sub}</div>
                </div>
                <span className="adm-table-arrow">›</span>
              </button>
            ))}
          </div>

          {/* Quick actions */}
          <div className="adm-section-title">⚡ Quick actions</div>
          <div className="adm-quick">
            {QUICK.map(q => (
              <div key={q.label} className="adm-quick-row">
                <div
                  className="adm-quick-icon"
                  style={{ backgroundColor: q.bg }}
                >
                  {q.icon}
                </div>
                <div>
                  <div className="adm-quick-label">{q.label}</div>
                  <div className="adm-quick-sub">{q.sub}</div>
                </div>
                <button
                  className="adm-quick-btn"
                  onClick={() => nav(q.path)}
                >
                  Open →
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}