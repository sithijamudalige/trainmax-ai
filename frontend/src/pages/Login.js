import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import ForgotPasswordModal from "../components/ForgotPasswordModal";

export default function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data?.session) throw new Error("Login succeeded but no session was created.");

      setSuccessMsg("Login successful! Redirecting...");
      setTimeout(() => nav("/dashboard"), 800);
    } catch (err) {
      setErrorMsg(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Bootstrap CDN */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css"
      />

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .login-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        /* Floating football decorations */
        .login-page::before {
          content: "⚽";
          position: absolute;
          font-size: 180px;
          opacity: 0.04;
          top: -30px;
          left: -40px;
          animation: float 6s ease-in-out infinite;
        }

        .login-page::after {
          content: "⚽";
          position: absolute;
          font-size: 220px;
          opacity: 0.04;
          bottom: -50px;
          right: -50px;
          animation: float 8s ease-in-out infinite reverse;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(106, 17, 203, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(106, 17, 203, 0); }
          100% { box-shadow: 0 0 0 0 rgba(106, 17, 203, 0); }
        }

        .login-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 48px 40px;
          width: 100%;
          max-width: 440px;
          animation: fadeInUp 0.6s ease forwards;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
          position: relative;
          z-index: 1;
        }

        .login-logo {
          width: 80px;
          height: 80px;
          border-radius: 20px;
          object-fit: contain;
          margin: 0 auto 24px;
          box-shadow: 0 8px 24px rgba(106, 17, 203, 0.5);
          animation: pulse-ring 2s infinite;
          display: block;
        }

        .login-title {
          color: #fff;
          font-size: 26px;
          font-weight: 800;
          text-align: center;
          margin-bottom: 6px;
          letter-spacing: -0.5px;
        }

        .login-subtitle {
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          text-align: center;
          margin-bottom: 32px;
        }

        .form-label-custom {
          color: rgba(255,255,255,0.7);
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 6px;
          display: block;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .input-wrapper {
          position: relative;
          margin-bottom: 20px;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 16px;
          color: rgba(255,255,255,0.4);
          pointer-events: none;
          z-index: 2;
        }

        .input-custom {
          width: 100%;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 13px 44px 13px 42px;
          color: #fff;
          font-size: 15px;
          transition: all 0.3s;
          outline: none;
          font-family: system-ui;
        }

        .input-custom::placeholder {
          color: rgba(255,255,255,0.25);
        }

        .input-custom:focus {
          border-color: #6a11cb;
          background: rgba(106, 17, 203, 0.1);
          box-shadow: 0 0 0 3px rgba(106, 17, 203, 0.2);
        }

        .input-custom:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toggle-password {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          z-index: 2;
          transition: color 0.2s;
        }

        .toggle-password:hover {
          color: rgba(255,255,255,0.8);
        }

        .btn-login {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #6a11cb, #2575fc);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 8px;
          position: relative;
          overflow: hidden;
          font-family: system-ui;
          letter-spacing: 0.3px;
        }

        .btn-login::before {
          content: "";
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transition: left 0.5s;
        }

        .btn-login:hover::before {
          left: 100%;
        }

        .btn-login:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(106, 17, 203, 0.5);
        }

        .btn-login:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-login:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .alert-custom {
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 500;
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: fadeInUp 0.3s ease;
        }

        .alert-error {
          background: rgba(220, 38, 38, 0.15);
          border: 1px solid rgba(220, 38, 38, 0.3);
          color: #fca5a5;
        }

        .alert-success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #6ee7b7;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.1);
        }

        .divider-text {
          color: rgba(255,255,255,0.3);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .signup-link {
          text-align: center;
          color: rgba(255,255,255,0.5);
          font-size: 14px;
        }

        .signup-link a {
          color: #a78bfa;
          font-weight: 700;
          text-decoration: none;
          transition: color 0.2s;
        }

        .signup-link a:hover {
          color: #c4b5fd;
          text-decoration: underline;
        }

        .brand-tag {
          text-align: center;
          margin-top: 28px;
          color: rgba(255,255,255,0.2);
          font-size: 12px;
          letter-spacing: 1px;
        }

        .brand-tag span {
          color: rgba(255,255,255,0.4);
          font-weight: 700;
        }
      `}</style>

      <div className="login-page">
        <div className="login-card">

          {/* Logo */}
          <img className="login-logo" src="/logo.png" alt="Logo" />

          {/* Title */}
          <div className="login-title">Welcome Back</div>
          <div className="login-subtitle">Sign in to Train Max AI — your personal football coach</div>

          {/* Form */}
          <form onSubmit={onSubmit}>

            {/* Email */}
            <div>
              <label className="form-label-custom">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon">✉️</span>
                <input
                  className="input-custom"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="form-label-custom">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  className="input-custom"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((p) => !p)}
                  tabIndex={-1}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: "right", marginTop: -12, marginBottom: 20 }}>
              <span onClick={() => setShowForgot(true)} style={{ color: "#a78bfa", fontSize: 13, cursor: "pointer" }}>
                Forgot password?
              </span>
            </div>

            {/* Submit */}
            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  Signing in...
                </>
              ) : (
                "Sign In ➤"
              )}
            </button>

            {/* Alerts */}
            {errorMsg && (
              <div className="alert-custom alert-error">
                <span>❌</span> {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="alert-custom alert-success">
                <span>✅</span> {successMsg}
              </div>
            )}
          </form>

          {/* Divider */}
          <div className="divider">
            <div className="divider-line" />
            <div className="divider-text">New here?</div>
            <div className="divider-line" />
          </div>

          {/* Signup link */}
          <div className="signup-link">
            Don't have an account?{" "}
            <Link to="/signup">Create one free</Link>
          </div>

          {/* Back to Welcome */}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <Link to="/" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
              ← Back to Welcome Page
            </Link>
          </div>

          {/* Brand */}
          <div className="brand-tag">
            Powered by <span>Train Max AI</span> ⚽
          </div>

        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgot}
        onClose={() => setShowForgot(false)}
        defaultRole="player"
        defaultEmail={email}
      />
    </>
  );
}