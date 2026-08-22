import { COUNTRIES } from "../utils/countries";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

const POSITIONS = [
  { value: "striker",    label: "⚡ Striker" },
  { value: "left_wing",  label: "🏃 Left Wing" },
  { value: "right_wing", label: "🏃 Right Wing" },
  { value: "midfielder", label: "🎯 Midfielder" },
  { value: "defender",   label: "🛡️ Defender" },
  { value: "goalkeeper", label: "🧤 Goalkeeper" },
];

const STEPS = ["Account", "Personal", "Football", "Photo"];

export default function Signup() {
  const nav = useNavigate();

  const [step, setStep] = useState(0);

  // Auth
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Personal
  const [userName,     setUserName]     = useState("");
  const [age,          setAge]          = useState("");
  const [birthDay,     setBirthDay]     = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [address,      setAddress]      = useState("");
  const [country,      setCountry]      = useState("");

  // Football
  const [club,        setClub]        = useState("");
  const [position,    setPosition]    = useState("striker");
  const [focusedArea, setFocusedArea] = useState("");
  const [heightFt,    setHeightFt]    = useState("");
  const [weightKg,    setWeightKg]    = useState("");
  const [bmiPreview,  setBmiPreview]  = useState("");

  // Photo
  const [photoFile,    setPhotoFile]    = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // UX
  const [loading,    setLoading]    = useState(false);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const h = parseFloat(heightFt);
    const w = parseFloat(weightKg);
    if (!h || !w || h <= 0 || w <= 0) { setBmiPreview(""); return; }
    const meters = h * 0.3048;
    setBmiPreview((w / (meters * meters)).toFixed(2));
  }, [heightFt, weightKg]);

  function handlePhotoChange(e) {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  }

  async function uploadPhoto(userId) {
    if (!photoFile) return null;
    const ext  = (photoFile.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, photoFile, { upsert: true, contentType: photoFile.type });
    if (error) throw error;
    return path;
  }

  function getBmiCategory(bmi) {
    const b = parseFloat(bmi);
    if (!b) return null;
    if (b < 18.5) return { label: "Underweight", color: "#60a5fa" };
    if (b < 25)   return { label: "Normal ✓",    color: "#34d399" };
    if (b < 30)   return { label: "Overweight",  color: "#fbbf24" };
    return              { label: "Obese",         color: "#f87171" };
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;

      const userId = signUpData.user?.id;
      if (!userId) {
        setSuccessMsg("Account created! Check your email to confirm, then login.");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setSuccessMsg("Account created! Confirm your email, then login to finish your profile.");
        return;
      }

      const photoPath = await uploadPhoto(userId);

      const { error: insertError } = await supabase.from("user_profiles").insert({
        id: userId, user_name: userName,
        age: age ? Number(age) : null,
        birth_day: birthDay || null,
        mobile_number: mobileNumber || null,
        address: address || null,
        email,
        country: country || null,
        club: club || null,
        position: position || null,
        focused_area: focusedArea || null,
        height_ft: heightFt ? Number(heightFt) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
        photo_path: photoPath,
      });
      if (insertError) throw insertError;

      setSuccessMsg("🎉 Account created! Redirecting to login...");
      setTimeout(() => nav("/login"), 2000);
    } catch (err) {
      setErrorMsg(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  const bmiCat = getBmiCategory(bmiPreview);

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css" />

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .signup-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 40px 20px;
          font-family: system-ui;
          position: relative;
          overflow: hidden;
        }

        .signup-page::before {
          content: "⚽";
          position: absolute;
          font-size: 300px;
          opacity: 0.03;
          top: -60px; right: -80px;
          animation: floatBig 10s ease-in-out infinite;
          pointer-events: none;
        }

        .signup-page::after {
          content: "⚽";
          position: absolute;
          font-size: 200px;
          opacity: 0.03;
          bottom: -40px; left: -60px;
          animation: floatBig 8s ease-in-out infinite reverse;
          pointer-events: none;
        }

        @keyframes floatBig {
          0%,100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmer {
          0%   { left: -100%; }
          100% { left: 100%; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .signup-card {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 40px 36px;
          width: 100%;
          max-width: 560px;
          animation: fadeInUp 0.6s ease forwards;
          box-shadow: 0 25px 60px rgba(0,0,0,0.5);
          position: relative;
          z-index: 1;
        }

        /* Header */
        .signup-logo {
          width: 64px; height: 64px;
          background: linear-gradient(135deg, #6a11cb, #2575fc);
          border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          font-size: 30px;
          margin: 0 auto 20px;
          box-shadow: 0 8px 24px rgba(106,17,203,0.5);
        }

        .signup-title {
          color: #fff;
          font-size: 24px;
          font-weight: 800;
          text-align: center;
          margin-bottom: 4px;
        }

        .signup-subtitle {
          color: rgba(255,255,255,0.45);
          font-size: 13px;
          text-align: center;
          margin-bottom: 28px;
        }

        /* Progress steps */
        .steps-row {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
          gap: 0;
        }

        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          flex: 1;
          position: relative;
        }

        .step-item:not(:last-child)::after {
          content: "";
          position: absolute;
          top: 18px;
          left: 60%;
          width: 80%;
          height: 2px;
          background: rgba(255,255,255,0.1);
          z-index: 0;
          transition: background 0.3s;
        }

        .step-item.done:not(:last-child)::after {
          background: linear-gradient(90deg, #6a11cb, #2575fc);
        }

        .step-circle {
          width: 36px; height: 36px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
          font-weight: 700;
          border: 2px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.4);
          transition: all 0.3s;
          position: relative;
          z-index: 1;
        }

        .step-item.active .step-circle {
          background: linear-gradient(135deg, #6a11cb, #2575fc);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 0 0 4px rgba(106,17,203,0.3);
        }

        .step-item.done .step-circle {
          background: linear-gradient(135deg, #059669, #10b981);
          border-color: transparent;
          color: #fff;
        }

        .step-label {
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .step-item.active .step-label { color: #a78bfa; }
        .step-item.done  .step-label  { color: #6ee7b7; }

        /* Section title */
        .section-title {
          color: rgba(255,255,255,0.6);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .section-title::after {
          content: "";
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.08);
        }

        /* Form labels */
        .f-label {
          color: rgba(255,255,255,0.65);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 6px;
        }

        .f-group { margin-bottom: 18px; }

        /* Inputs */
        .f-input, .f-select {
          width: 100%;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 12px 14px;
          color: #fff;
          font-size: 14px;
          font-family: system-ui;
          outline: none;
          transition: all 0.3s;
          appearance: none;
        }

        .f-input::placeholder { color: rgba(255,255,255,0.2); }

        .f-input:focus, .f-select:focus {
          border-color: #6a11cb;
          background: rgba(106,17,203,0.1);
          box-shadow: 0 0 0 3px rgba(106,17,203,0.2);
        }

        .f-input:disabled { opacity: 0.5; cursor: not-allowed; }

        .f-select option { background: #302b63; color: #fff; }

        /* Input with icon */
        .input-wrap { position: relative; }
        .input-wrap .i-icon {
          position: absolute;
          left: 13px; top: 50%;
          transform: translateY(-50%);
          font-size: 15px;
          pointer-events: none;
        }
        .input-wrap .f-input { padding-left: 40px; }
        .input-wrap .f-input.with-toggle { padding-right: 44px; }
        .toggle-btn {
          position: absolute;
          right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: rgba(255,255,255,0.35);
          cursor: pointer; font-size: 15px;
          padding: 0; transition: color 0.2s;
        }
        .toggle-btn:hover { color: rgba(255,255,255,0.8); }

        /* Two-col grid */
        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        @media (max-width: 480px) { .two-col { grid-template-columns: 1fr; } }

        /* BMI display */
        .bmi-display {
          margin-top: 12px;
          padding: 12px 16px;
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .bmi-value {
          font-size: 22px;
          font-weight: 900;
          color: #fff;
        }

        .bmi-cat {
          font-size: 12px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          background: rgba(255,255,255,0.1);
        }

        /* Photo upload */
        .photo-upload-area {
          border: 2px dashed rgba(255,255,255,0.15);
          border-radius: 14px;
          padding: 32px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
        }

        .photo-upload-area:hover {
          border-color: rgba(106,17,203,0.5);
          background: rgba(106,17,203,0.08);
        }

        .photo-upload-area input[type="file"] {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
          width: 100%;
          height: 100%;
        }

        .photo-preview {
          width: 100px; height: 100px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #6a11cb;
          margin: 0 auto 10px;
          display: block;
          box-shadow: 0 0 20px rgba(106,17,203,0.4);
        }

        /* Nav buttons */
        .nav-btns {
          display: flex;
          gap: 12px;
          margin-top: 28px;
        }

        .btn-back {
          padding: 13px 24px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          color: rgba(255,255,255,0.7);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          font-family: system-ui;
        }

        .btn-back:hover { background: rgba(255,255,255,0.12); }

        .btn-next {
          flex: 1;
          padding: 13px;
          background: linear-gradient(135deg, #6a11cb, #2575fc);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
          font-family: system-ui;
        }

        .btn-next::before {
          content: "";
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          animation: shimmer 2.5s infinite;
        }

        .btn-next:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(106,17,203,0.5);
        }

        .btn-next:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .btn-submit {
          flex: 1;
          padding: 13px;
          background: linear-gradient(135deg, #059669, #10b981);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
          font-family: system-ui;
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(5,150,105,0.5);
        }

        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Alerts */
        .alert-err {
          margin-top: 14px;
          padding: 12px 16px;
          background: rgba(220,38,38,0.15);
          border: 1px solid rgba(220,38,38,0.3);
          border-radius: 10px;
          color: #fca5a5;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: fadeInUp 0.3s ease;
        }

        .alert-ok {
          margin-top: 14px;
          padding: 12px 16px;
          background: rgba(16,185,129,0.15);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 10px;
          color: #6ee7b7;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: fadeInUp 0.3s ease;
        }

        /* Spinner */
        .spinner {
          display: inline-block;
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin-right: 7px;
          vertical-align: middle;
        }

        /* Footer link */
        .login-link {
          text-align: center;
          color: rgba(255,255,255,0.4);
          font-size: 13px;
          margin-top: 20px;
        }

        .login-link a {
          color: #a78bfa;
          font-weight: 700;
          text-decoration: none;
          transition: color 0.2s;
        }

        .login-link a:hover { color: #c4b5fd; }

        /* Position grid */
        .position-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        @media (max-width: 480px) { .position-grid { grid-template-columns: repeat(2,1fr); } }

        .pos-btn {
          padding: 12px 8px;
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

        .pos-btn:hover {
          background: rgba(106,17,203,0.15);
          border-color: rgba(106,17,203,0.4);
          color: #fff;
        }

        .pos-btn.selected {
          background: linear-gradient(135deg, #6a11cb, #2575fc);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 4px 12px rgba(106,17,203,0.4);
        }
      `}</style>

      <div className="signup-page">
        <div className="signup-card">

          {/* Header */}
          <div className="signup-logo">⚽</div>
          <div className="signup-title">Create Your Account</div>
          <div className="signup-subtitle">Join Train Max AI — your personal football coach</div>

          {/* Progress steps */}
          <div className="steps-row">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`step-item ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
              >
                <div className="step-circle">
                  {i < step ? "✓" : i + 1}
                </div>
                <div className="step-label">{s}</div>
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit}>

            {/* ---- STEP 0: Account ---- */}
            {step === 0 && (
              <div>
                <div className="section-title">✉️ Login Details</div>

                <div className="f-group">
                  <label className="f-label">Email Address</label>
                  <div className="input-wrap">
                    <span className="i-icon">✉️</span>
                    <input
                      className="f-input"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEmail(val);
                        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                          setEmailError("Please enter a valid email address");
                        } else {
                          setEmailError("");
                        }
                      }}
                      required
                      disabled={loading}
                    />
                  </div>
                  {emailError && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{emailError}</div>}
                </div>

                <div className="f-group">
                  <label className="f-label">Password</label>
                  <div className="input-wrap">
                    <span className="i-icon">🔒</span>
                    <input
                      className={`f-input with-toggle`}
                      type={showPass ? "text" : "password"}
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPassword(val);
                        if (val.length < 6) {
                          setPasswordError("Password must be at least 6 characters");
                        } else {
                          setPasswordError("");
                        }
                      }}
                      required
                      minLength={6}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="toggle-btn"
                      onClick={() => setShowPass((p) => !p)}
                    >
                      {showPass ? "🙈" : "👁️"}
                    </button>
                  </div>
                  {passwordError && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{passwordError}</div>}
                </div>

                <div className="nav-btns">
                  <button
                    type="button"
                    className="btn-next"
                    onClick={() => {
                      if (!email || !password) { setErrorMsg("Please fill in email and password."); return; }
                      if (password.length < 6) { setErrorMsg("Password must be at least 6 characters."); return; }
                      setErrorMsg("");
                      setStep(1);
                    }}
                  >
                    Next: Personal Details →
                  </button>
                </div>
              </div>
            )}

            {/* ---- STEP 1: Personal ---- */}
            {step === 1 && (
              <div>
                <div className="section-title">👤 Personal Details</div>

                <div className="f-group">
                  <label className="f-label">Username *</label>
                  <div className="input-wrap">
                    <span className="i-icon">👤</span>
                    <input
                      className="f-input"
                      type="text"
                      placeholder="Your display name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="two-col">
                  <div className="f-group">
                    <label className="f-label">Age</label>
                    <div className="input-wrap">
                      <span className="i-icon">🎂</span>
                      <input
                        className="f-input"
                        type="number"
                        min="0"
                        placeholder="e.g. 22"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="f-group">
                    <label className="f-label">Birthday</label>
                    <input
                      className="f-input"
                      type="date"
                      value={birthDay}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBirthDay(val);
                        if (val) {
                          const bDate = new Date(val);
                          const today = new Date();
                          let calcAge = today.getFullYear() - bDate.getFullYear();
                          const m = today.getMonth() - bDate.getMonth();
                          if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) calcAge--;
                          setAge(calcAge.toString());
                        }
                      }}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="f-group">
                  <label className="f-label">Mobile Number</label>
                  <div className="input-wrap">
                    <span className="i-icon">📱</span>
                    <input
                      className="f-input"
                      type="tel"
                      placeholder="+94 77 xxx xxxx"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="f-group">
                  <label className="f-label">Address</label>
                  <div className="input-wrap">
                    <span className="i-icon">🏠</span>
                    <input
                      className="f-input"
                      type="text"
                      placeholder="Your city or address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="f-group">
                  <label className="f-label">Country</label>
                  <div className="input-wrap">
                    <span className="i-icon">🌍</span>
                    <input
                      className="f-input"
                      type="text"
                      list="country-options"
                      placeholder="e.g. Sri Lanka"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      disabled={loading}
                      autoComplete="off"
                    />
                    <datalist id="country-options">
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="nav-btns">
                  <button type="button" className="btn-back" onClick={() => setStep(0)}>← Back</button>
                  <button
                    type="button"
                    className="btn-next"
                    onClick={() => {
                      if (!userName) { setErrorMsg("Username is required."); return; }
                      setErrorMsg("");
                      setStep(2);
                    }}
                  >
                    Next: Football Profile →
                  </button>
                </div>
              </div>
            )}

            {/* ---- STEP 2: Football ---- */}
            {step === 2 && (
              <div>
                <div className="section-title">⚽ Football Profile</div>

                <div className="f-group">
                  <label className="f-label">Club (optional)</label>
                  <div className="input-wrap">
                    <span className="i-icon">🏟️</span>
                    <input
                      className="f-input"
                      type="text"
                      placeholder="e.g. FC Barcelona"
                      value={club}
                      onChange={(e) => setClub(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="f-group">
                  <label className="f-label">Position</label>
                  <div className="position-grid">
                    {POSITIONS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        className={`pos-btn ${position === p.value ? "selected" : ""}`}
                        onClick={() => setPosition(p.value)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="f-group" style={{ marginTop: 18 }}>
                  <label className="f-label">Focused Area (optional)</label>
                  <div className="input-wrap">
                    <span className="i-icon">🎯</span>
                    <input
                      className="f-input"
                      type="text"
                      placeholder="e.g. Dribbling, Passing, Shooting"
                      value={focusedArea}
                      onChange={(e) => setFocusedArea(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="two-col">
                  <div className="f-group">
                    <label className="f-label">Height (ft)</label>
                    <div className="input-wrap">
                      <span className="i-icon">📏</span>
                      <input
                        className="f-input"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 5.9"
                        value={heightFt}
                        onChange={(e) => setHeightFt(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="f-group">
                    <label className="f-label">Weight (kg)</label>
                    <div className="input-wrap">
                      <span className="i-icon">⚖️</span>
                      <input
                        className="f-input"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 72"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {bmiPreview && (
                  <div className="bmi-display">
                    <div>
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
                        BMI Score
                      </div>
                      <div className="bmi-value">{bmiPreview}</div>
                    </div>
                    {bmiCat && (
                      <div className="bmi-cat" style={{ color: bmiCat.color, borderColor: bmiCat.color }}>
                        {bmiCat.label}
                      </div>
                    )}
                  </div>
                )}

                <div className="nav-btns">
                  <button type="button" className="btn-back" onClick={() => setStep(1)}>← Back</button>
                  <button type="button" className="btn-next" onClick={() => { setErrorMsg(""); setStep(3); }}>
                    Next: Profile Photo →
                  </button>
                </div>
              </div>
            )}

            {/* ---- STEP 3: Photo + Submit ---- */}
            {step === 3 && (
              <div>
                <div className="section-title">📸 Profile Photo</div>

                <div className="photo-upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    disabled={loading}
                  />
                  {photoPreview ? (
                    <>
                      <img src={photoPreview} alt="Preview" className="photo-preview" />
                      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                        ✅ Photo selected — click to change
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 40, marginBottom: 10 }}>📸</div>
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                        Click to upload profile photo
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
                        JPG, PNG or WebP — optional
                      </div>
                    </>
                  )}
                </div>

                {/* Summary */}
                <div style={{
                  marginTop: 20,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: "14px 16px",
                }}>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                    Account Summary
                  </div>
                  <div style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
                    <div>✉️ <b>Email:</b> {email}</div>
                    <div>👤 <b>Name:</b> {userName}</div>
                    <div>⚽ <b>Position:</b> {POSITIONS.find(p => p.value === position)?.label}</div>
                    {club && <div>🏟️ <b>Club:</b> {club}</div>}
                    {bmiPreview && <div>📊 <b>BMI:</b> {bmiPreview} {bmiCat ? `(${bmiCat.label})` : ""}</div>}
                  </div>
                </div>

                <div className="nav-btns">
                  <button type="button" className="btn-back" onClick={() => setStep(2)}>← Back</button>
                  <button type="submit" className="btn-submit" disabled={loading}>
                    {loading ? (
                      <><span className="spinner" />Creating Account...</>
                    ) : (
                      "🎉 Create Account"
                    )}
                  </button>
                </div>

                {errorMsg  && <div className="alert-err"><span>❌</span>{errorMsg}</div>}
                {successMsg && <div className="alert-ok"><span>✅</span>{successMsg}</div>}
              </div>
            )}

            {errorMsg && step < 3 && (
              <div className="alert-err"><span>❌</span>{errorMsg}</div>
            )}

          </form>

          <div className="login-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>

        </div>
      </div>
    </>
  );
}