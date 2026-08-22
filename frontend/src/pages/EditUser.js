import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE = "http://127.0.0.1:5000";

const POSITIONS = [
  { value: "striker",    label: "⚡ Striker"    },
  { value: "left_wing",  label: "🏃 Left Wing"  },
  { value: "right_wing", label: "🏃 Right Wing" },
  { value: "midfielder", label: "🎯 Midfielder"  },
  { value: "defender",   label: "🛡️ Defender"   },
  { value: "goalkeeper", label: "🧤 Goalkeeper"  },
];

export default function EditUser() {
  const nav = useNavigate();
  const { id } = useParams();

  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg,  setErrorMsg]  = useState("");
  const [successMsg,setSuccessMsg]= useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [activeTab, setActiveTab] = useState("personal");
  const [bmiPreview,setBmiPreview]= useState("");

  const [form, setForm] = useState({
    user_name: "", email: "", country: "", club: "",
    position: "", focused_area: "", age: "",
    mobile_number: "", address: "", birth_day: "",
    height_ft: "", weight_kg: "", photo_path: "",
  });

  useEffect(() => {
    const isAdmin = localStorage.getItem("is_admin") === "true";
    if (!isAdmin) nav("/admin");
  }, [nav]);

  useEffect(() => {
    const h = parseFloat(form.height_ft);
    const w = parseFloat(form.weight_kg);
    if (!h || !w || h <= 0 || w <= 0) { setBmiPreview(""); return; }
    const meters = h * 0.3048;
    setBmiPreview((w / (meters * meters)).toFixed(2));
  }, [form.height_ft, form.weight_kg]);

  async function getSignedPhotoUrl(photoPath) {
    if (!photoPath) return "";
    const res  = await fetch(`${API_BASE}/api/admin/avatar/signed-url?path=${encodeURIComponent(photoPath)}`, { headers: { "X-Admin": "true" } });
    const data = await res.json().catch(() => ({}));
    return res.ok ? (data?.signed_url || "") : "";
  }

  useEffect(() => {
    async function loadUser() {
      setLoading(true);
      setErrorMsg("");
      try {
        const res  = await fetch(`${API_BASE}/api/admin/users/${id}`, { headers: { "X-Admin": "true" } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.detail || data?.error || "Failed to load user");
        const u = data?.user || {};
        setForm({
          user_name:     u.user_name     || "",
          email:         u.email         || "",
          country:       u.country       || "",
          club:          u.club          || "",
          position:      u.position      || "",
          focused_area:  u.focused_area  || "",
          age:           u.age           ?? "",
          mobile_number: u.mobile_number || "",
          address:       u.address       || "",
          birth_day:     u.birth_day     || "",
          height_ft:     u.height_ft     ?? "",
          weight_kg:     u.weight_kg     ?? "",
          photo_path:    u.photo_path    || "",
        });
        if (u.photo_path) {
          const signed = await getSignedPhotoUrl(u.photo_path);
          setAvatarUrl(signed);
        }
      } catch (e) {
        setErrorMsg(e?.message || "Failed to load user");
      } finally {
        setLoading(false);
      }
    }
    if (id) loadUser();
  }, [id]);

  function setField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function uploadPhoto(file) {
    if (!file) return;
    setUploading(true);
    setErrorMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch(`${API_BASE}/api/admin/avatar/upload/${id}`, {
        method: "POST",
        headers: { "X-Admin": "true" },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.error || "Upload failed");
      const newPath = data?.photo_path || "";
      setField("photo_path", newPath);
      const signed = await getSignedPhotoUrl(newPath);
      setAvatarUrl(signed);
      showToast("✅ Photo uploaded!");
    } catch (e) {
      setErrorMsg(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function showToast(msg, type = "success") {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    const body = {
      user_name:     form.user_name     || null,
      email:         form.email         || null,
      country:       form.country       || null,
      club:          form.club          || null,
      position:      form.position      || null,
      focused_area:  form.focused_area  || null,
      mobile_number: form.mobile_number || null,
      address:       form.address       || null,
      birth_day:     form.birth_day     || null,
      photo_path:    form.photo_path    || null,
      age:           form.age      === "" ? null : Number(form.age),
      height_ft:     form.height_ft === "" ? null : Number(form.height_ft),
      weight_kg:     form.weight_kg === "" ? null : Number(form.weight_kg),
    };
    try {
      const res  = await fetch(`${API_BASE}/api/admin/users/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", "X-Admin": "true" },
        body:    JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.error || "Update failed");
      showToast("✅ User updated successfully!");
      setTimeout(() => nav(-1), 1200);
    } catch (e) {
      setErrorMsg(e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  function getBmiCategory() {
    const b = parseFloat(bmiPreview);
    if (!b) return null;
    if (b < 18.5) return { label: "Underweight", color: "#60a5fa" };
    if (b < 25)   return { label: "Normal ✓",    color: "#34d399" };
    if (b < 30)   return { label: "Overweight",  color: "#fbbf24" };
    return              { label: "Obese",         color: "#f87171" };
  }

  const bmiCat = getBmiCategory();

  const TABS = [
    { id: "personal",  label: "👤 Personal"  },
    { id: "football",  label: "⚽ Football"  },
    { id: "physical",  label: "📏 Physical"  },
    { id: "photo",     label: "📸 Photo"     },
  ];

  if (loading) return (
    <>
      <style>{`.eu-load{min-height:100vh;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);display:flex;align-items:center;justify-content:center;font-family:system-ui;}.eu-spin{width:44px;height:44px;border:4px solid rgba(255,255,255,0.1);border-top-color:#6a11cb;border-radius:50%;animation:spin 0.8s linear infinite;}@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      <div className="eu-load">
        <div style={{ textAlign: "center" }}>
          <div className="eu-spin" style={{ margin: "0 auto 14px" }} />
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Loading user...</div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css" />

      <style>{`
        * { box-sizing: border-box; }

        .eu-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
          font-family: system-ui;
          padding: 0 0 60px;
        }

        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{left:-100%} 100%{left:100%} }

        /* Header */
        .eu-header {
          background: linear-gradient(135deg, rgba(106,17,203,0.5), rgba(37,117,252,0.3));
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding: 28px 40px;
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          position: relative;
          overflow: hidden;
        }

        .eu-header::before {
          content: "⚽";
          position: absolute;
          right: -20px; top: -20px;
          font-size: 120px;
          opacity: 0.05;
          pointer-events: none;
        }

        .eu-avatar-wrap {
          position: relative;
          flex-shrink: 0;
        }

        .eu-avatar {
          width: 80px; height: 80px;
          border-radius: 20px;
          object-fit: cover;
          border: 3px solid rgba(106,17,203,0.5);
          box-shadow: 0 8px 24px rgba(106,17,203,0.4);
        }

        .eu-avatar-placeholder {
          width: 80px; height: 80px;
          border-radius: 20px;
          background: linear-gradient(135deg, #6a11cb, #2575fc);
          display: flex; align-items: center; justify-content: center;
          font-size: 32px;
          box-shadow: 0 8px 24px rgba(106,17,203,0.4);
        }

        .eu-header-info h2 {
          color: #fff;
          font-size: 22px;
          font-weight: 800;
          margin: 0 0 4px;
        }

        .eu-header-info p {
          color: rgba(255,255,255,0.45);
          font-size: 13px;
          margin: 0;
        }

        .eu-header-actions {
          margin-left: auto;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn-eu {
          padding: 9px 18px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          font-family: system-ui;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .btn-eu-primary {
          background: linear-gradient(135deg, #6a11cb, #2575fc);
          color: #fff;
          position: relative; overflow: hidden;
          box-shadow: 0 4px 14px rgba(106,17,203,0.4);
        }

        .btn-eu-primary::before {
          content: "";
          position: absolute; top:0; left:-100%;
          width:100%; height:100%;
          background: linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);
          animation: shimmer 2.5s infinite;
        }

        .btn-eu-primary:hover:not(:disabled) { transform:translateY(-2px); color:#fff; }
        .btn-eu-primary:disabled { opacity:0.6; cursor:not-allowed; }

        .btn-eu-ghost {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.7);
        }

        .btn-eu-ghost:hover { background:rgba(255,255,255,0.14); color:#fff; }

        .btn-eu-save {
          background: linear-gradient(135deg, #059669, #10b981);
          color: #fff;
          padding: 12px 32px;
          font-size: 15px;
          border-radius: 12px;
          box-shadow: 0 4px 14px rgba(5,150,105,0.4);
          position: relative; overflow: hidden;
        }

        .btn-eu-save::before {
          content: "";
          position: absolute; top:0; left:-100%;
          width:100%; height:100%;
          background: linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);
          animation: shimmer 2.5s infinite;
        }

        .btn-eu-save:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(5,150,105,0.5); }
        .btn-eu-save:disabled { opacity:0.6; cursor:not-allowed; }

        /* Tabs */
        .eu-tabs {
          background: rgba(0,0,0,0.2);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 0 40px;
          display: flex;
          gap: 0;
          overflow-x: auto;
        }

        .eu-tab {
          padding: 13px 22px;
          border: none;
          border-bottom: 3px solid transparent;
          background: none;
          color: rgba(255,255,255,0.4);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          font-family: system-ui;
        }

        .eu-tab:hover { color: rgba(255,255,255,0.7); }
        .eu-tab.active { color: #a78bfa; border-bottom-color: #6a11cb; }

        /* Content */
        .eu-content {
          max-width: 760px;
          margin: 32px auto;
          padding: 0 24px;
          animation: fadeInUp 0.4s ease forwards;
        }

        /* Form card */
        .eu-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
          backdrop-filter: blur(10px);
        }

        .eu-card-title {
          color: rgba(255,255,255,0.5);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .eu-card-title::after {
          content: "";
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.07);
        }

        /* Field */
        .f-label {
          color: rgba(255,255,255,0.55);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 6px;
        }

        .f-group { margin-bottom: 16px; }

        .f-input, .f-select {
          width: 100%;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 11px 14px;
          color: #fff;
          font-size: 14px;
          font-family: system-ui;
          outline: none;
          transition: all 0.3s;
        }

        .f-input::placeholder { color: rgba(255,255,255,0.2); }
        .f-input:focus, .f-select:focus { border-color: #6a11cb; background: rgba(106,17,203,0.1); box-shadow: 0 0 0 3px rgba(106,17,203,0.2); }
        .f-select option { background: #302b63; color: #fff; }

        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width:600px) { .two-col { grid-template-columns:1fr; } }

        /* Position grid */
        .pos-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
        @media (max-width:500px) { .pos-grid { grid-template-columns: repeat(2,1fr); } }

        .pos-btn {
          padding: 10px 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: rgba(255,255,255,0.6);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          text-align: center;
          transition: all 0.25s;
          font-family: system-ui;
        }

        .pos-btn:hover { background:rgba(106,17,203,0.15); border-color:rgba(106,17,203,0.4); color:#fff; }
        .pos-btn.selected { background:linear-gradient(135deg,#6a11cb,#2575fc); border-color:transparent; color:#fff; box-shadow:0 4px 12px rgba(106,17,203,0.4); }

        /* BMI card */
        .bmi-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 12px;
        }

        .bmi-val { font-size: 28px; font-weight: 900; color: #fff; }
        .bmi-cat { font-size: 12px; font-weight: 700; padding: 3px 12px; border-radius: 20px; background: rgba(255,255,255,0.1); }

        /* Photo upload */
        .photo-drop {
          border: 2px dashed rgba(255,255,255,0.15);
          border-radius: 14px;
          padding: 32px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
        }

        .photo-drop:hover { border-color:rgba(106,17,203,0.5); background:rgba(106,17,203,0.08); }

        .photo-drop input[type="file"] {
          position: absolute; inset: 0;
          opacity: 0; cursor: pointer;
          width: 100%; height: 100%;
        }

        .photo-preview-large {
          width: 120px; height: 120px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #6a11cb;
          margin: 0 auto 12px;
          display: block;
          box-shadow: 0 0 20px rgba(106,17,203,0.4);
        }

        /* Alerts */
        .eu-alert {
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: fadeInUp 0.3s ease;
        }

        .eu-alert-err { background:rgba(220,38,38,0.15); border:1px solid rgba(220,38,38,0.3); color:#fca5a5; }
        .eu-alert-ok  { background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:#6ee7b7; }

        /* Toast */
        .eu-toast {
          position: fixed; top:20px; right:20px;
          padding: 12px 20px;
          background: #dcfce7; color: #166534;
          border-radius: 10px; font-weight: 600; font-size: 13px;
          z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          animation: fadeInUp 0.3s ease;
        }

        /* Footer */
        .eu-footer {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 20px 0 0;
        }

        .eu-spinner {
          display: inline-block;
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin-right: 6px;
          vertical-align: middle;
        }

        @media (max-width:600px) {
          .eu-header { padding:20px; }
          .eu-header-actions { margin-left:0; }
          .eu-tabs { padding: 0 16px; }
          .eu-content { padding: 0 16px; }
        }
      `}</style>

      <div className="eu-page">

        {/* Toast */}
        {successMsg && <div className="eu-toast">✅ {successMsg}</div>}

        {/* Header */}
        <div className="eu-header">
          <div className="eu-avatar-wrap">
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="eu-avatar" />
              : <div className="eu-avatar-placeholder">👤</div>
            }
          </div>
          <div className="eu-header-info">
            <h2>{form.user_name || "Edit User"}</h2>
            <p>
              {form.email || ""}
              {form.position ? ` · ${form.position.charAt(0).toUpperCase() + form.position.slice(1)}` : ""}
              {form.club ? ` · ${form.club}` : ""}
            </p>
            <p style={{ marginTop: 4 }}>
              <span style={{ background:"rgba(106,17,203,0.2)", border:"1px solid rgba(106,17,203,0.3)", borderRadius:20, padding:"2px 10px", fontSize:11, color:"#c4b5fd", fontWeight:700 }}>
                ID: {id?.slice(0, 8)}...
              </span>
            </p>
          </div>
          <div className="eu-header-actions">
            <button className="btn-eu btn-eu-ghost" onClick={() => nav(-1)}>
              ← Back
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="eu-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`eu-tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="eu-content">

          {errorMsg && <div className="eu-alert eu-alert-err"><span>❌</span>{errorMsg}</div>}

          <form onSubmit={onSave}>

            {/* ---- PERSONAL TAB ---- */}
            {activeTab === "personal" && (
              <div>
                <div className="eu-card">
                  <div className="eu-card-title">👤 Basic Information</div>

                  <div className="f-group">
                    <label className="f-label">Username</label>
                    <input className="f-input" placeholder="Display name" value={form.user_name} onChange={(e) => setField("user_name", e.target.value)} />
                  </div>

                  <div className="f-group">
                    <label className="f-label">Email Address</label>
                    <input className="f-input" type="email" placeholder="user@example.com" value={form.email} onChange={(e) => setField("email", e.target.value)} />
                  </div>

                  <div className="two-col">
                    <div className="f-group">
                      <label className="f-label">Age</label>
                      <input className="f-input" type="number" min="0" placeholder="e.g. 22" value={form.age} onChange={(e) => setField("age", e.target.value)} />
                    </div>
                    <div className="f-group">
                      <label className="f-label">Birthday</label>
                      <input className="f-input" type="date" value={form.birth_day} onChange={(e) => setField("birth_day", e.target.value)} />
                    </div>
                  </div>

                  <div className="f-group">
                    <label className="f-label">Mobile Number</label>
                    <input className="f-input" type="tel" placeholder="+94 77 xxx xxxx" value={form.mobile_number} onChange={(e) => setField("mobile_number", e.target.value)} />
                  </div>

                  <div className="f-group">
                    <label className="f-label">Country</label>
                    <input className="f-input" placeholder="e.g. Sri Lanka" value={form.country} onChange={(e) => setField("country", e.target.value)} />
                  </div>

                  <div className="f-group">
                    <label className="f-label">Address</label>
                    <input className="f-input" placeholder="City or full address" value={form.address} onChange={(e) => setField("address", e.target.value)} />
                  </div>
                </div>

                <div className="eu-footer">
                  <button type="button" className="btn-eu btn-eu-primary" onClick={() => setActiveTab("football")}>
                    Next: Football Profile →
                  </button>
                </div>
              </div>
            )}

            {/* ---- FOOTBALL TAB ---- */}
            {activeTab === "football" && (
              <div>
                <div className="eu-card">
                  <div className="eu-card-title">⚽ Football Profile</div>

                  <div className="f-group">
                    <label className="f-label">Club</label>
                    <input className="f-input" placeholder="e.g. FC Barcelona" value={form.club} onChange={(e) => setField("club", e.target.value)} />
                  </div>

                  <div className="f-group">
                    <label className="f-label">Position</label>
                    <div className="pos-grid">
                      {POSITIONS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          className={`pos-btn ${form.position === p.value ? "selected" : ""}`}
                          onClick={() => setField("position", p.value)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="f-group" style={{ marginTop: 16 }}>
                    <label className="f-label">Focused Area</label>
                    <input className="f-input" placeholder="e.g. Dribbling, Passing, Shooting" value={form.focused_area} onChange={(e) => setField("focused_area", e.target.value)} />
                  </div>
                </div>

                <div className="eu-footer">
                  <button type="button" className="btn-eu btn-eu-ghost" onClick={() => setActiveTab("personal")}>← Back</button>
                  <button type="button" className="btn-eu btn-eu-primary" onClick={() => setActiveTab("physical")}>Next: Physical →</button>
                </div>
              </div>
            )}

            {/* ---- PHYSICAL TAB ---- */}
            {activeTab === "physical" && (
              <div>
                <div className="eu-card">
                  <div className="eu-card-title">📏 Physical Stats</div>

                  <div className="two-col">
                    <div className="f-group">
                      <label className="f-label">Height (ft)</label>
                      <input className="f-input" type="number" step="0.01" min="0" placeholder="e.g. 5.9" value={form.height_ft} onChange={(e) => setField("height_ft", e.target.value)} />
                    </div>
                    <div className="f-group">
                      <label className="f-label">Weight (kg)</label>
                      <input className="f-input" type="number" step="0.01" min="0" placeholder="e.g. 72" value={form.weight_kg} onChange={(e) => setField("weight_kg", e.target.value)} />
                    </div>
                  </div>

                  {bmiPreview && (
                    <div className="bmi-card">
                      <div>
                        <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>BMI Score</div>
                        <div className="bmi-val">{bmiPreview}</div>
                      </div>
                      {bmiCat && (
                        <div className="bmi-cat" style={{ color: bmiCat.color }}>
                          {bmiCat.label}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="eu-footer">
                  <button type="button" className="btn-eu btn-eu-ghost" onClick={() => setActiveTab("football")}>← Back</button>
                  <button type="button" className="btn-eu btn-eu-primary" onClick={() => setActiveTab("photo")}>Next: Photo →</button>
                </div>
              </div>
            )}

            {/* ---- PHOTO TAB ---- */}
            {activeTab === "photo" && (
              <div>
                <div className="eu-card">
                  <div className="eu-card-title">📸 Profile Photo</div>

                  <div className="photo-drop">
                    <input type="file" accept="image/*" disabled={uploading} onChange={(e) => uploadPhoto(e.target.files?.[0])} />
                    {avatarUrl ? (
                      <>
                        <img src={avatarUrl} alt="preview" className="photo-preview-large" />
                        <div style={{ color:"rgba(255,255,255,0.5)", fontSize:13 }}>✅ Photo uploaded — click to change</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize:40, marginBottom:10 }}>📸</div>
                        <div style={{ color:"rgba(255,255,255,0.5)", fontSize:14, fontWeight:600, marginBottom:4 }}>
                          {uploading ? "⏳ Uploading..." : "Click to upload profile photo"}
                        </div>
                        <div style={{ color:"rgba(255,255,255,0.25)", fontSize:12 }}>JPG, PNG or WebP</div>
                      </>
                    )}
                  </div>

                  {form.photo_path && (
                    <div style={{ marginTop:12, padding:"8px 12px", background:"rgba(255,255,255,0.04)", borderRadius:8, fontSize:11, color:"rgba(255,255,255,0.3)", wordBreak:"break-all" }}>
                      Path: {form.photo_path}
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="eu-card">
                  <div className="eu-card-title">📋 Summary</div>
                  <div style={{ display:"grid", gap:8, fontSize:13, color:"rgba(255,255,255,0.65)" }}>
                    <div>✉️ <b>Email:</b> {form.email || "—"}</div>
                    <div>👤 <b>Name:</b> {form.user_name || "—"}</div>
                    <div>⚽ <b>Position:</b> {POSITIONS.find(p => p.value === form.position)?.label || form.position || "—"}</div>
                    {form.club && <div>🏟️ <b>Club:</b> {form.club}</div>}
                    {form.country && <div>🌍 <b>Country:</b> {form.country}</div>}
                    {bmiPreview && <div>📊 <b>BMI:</b> {bmiPreview} {bmiCat ? `(${bmiCat.label})` : ""}</div>}
                  </div>
                </div>

                <div className="eu-footer">
                  <button type="button" className="btn-eu btn-eu-ghost" onClick={() => setActiveTab("physical")}>← Back</button>
                  <button type="submit" className="btn-eu btn-eu-save" disabled={saving}>
                    {saving ? <><span className="eu-spinner" />Saving...</> : "💾 Save Changes"}
                  </button>
                </div>
              </div>
            )}

          </form>
        </div>
      </div>
    </>
  );
}