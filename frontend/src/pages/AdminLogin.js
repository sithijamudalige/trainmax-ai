import { useState } from "react";
import { useNavigate } from "react-router-dom";

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .login-root {
    min-height: 100vh;
    background: #f8fafc;
    font-family: system-ui, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .login-card {
    background: #fff;
    width: 100%;
    max-width: 400px;
    padding: 40px 32px;
    border-radius: 16px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
    border: 1px solid #e2e8f0;
  }
  .login-header {
    text-align: center;
    margin-bottom: 32px;
  }
  .login-logo {
    font-size: 24px;
    font-weight: 800;
    color: #0f172a;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .login-sub {
    font-size: 14px;
    color: #64748b;
  }
  .login-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .input-label {
    font-size: 13px;
    font-weight: 600;
    color: #475569;
  }
  .login-input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 14px;
    color: #0f172a;
    outline: none;
    transition: all 0.2s;
    font-family: system-ui, sans-serif;
  }
  .login-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .login-btn {
    width: 100%;
    padding: 12px;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 8px;
    font-family: system-ui, sans-serif;
  }
  .login-btn:hover:not(:disabled) {
    background: #1d4ed8;
  }
  .login-btn:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }
  .msg-error {
    margin-top: 16px;
    padding: 12px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    border-radius: 8px;
    font-size: 13px;
    text-align: center;
  }
  .msg-success {
    margin-top: 16px;
    padding: 12px;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    color: #059669;
    border-radius: 8px;
    font-size: 13px;
    text-align: center;
  }
`;

export default function AdminLogin() {
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:5000/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Admin login failed");
      }

      setSuccessMsg("Admin login successful! Redirecting...");
      localStorage.setItem("is_admin", "true");

      setTimeout(() => nav("/admin/dashboard"), 500);
    } catch (err) {
      setErrorMsg(err?.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{styles}</style>
      <div className="login-root">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <img src="/logo.png" alt="Train Max Logo" style={{ width: 36, height: 36, borderRadius: 8 }} />
              Train Max AI
            </div>
            <div className="login-sub">Admin Portal Login</div>
          </div>

          <form onSubmit={onSubmit} className="login-form">
            <div className="input-group">
              <label className="input-label">Username</label>
              <input
                className="login-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                required
                disabled={loading}
              />
            </div>
            
            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                className="login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Enter admin password"
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Signing in..." : "Sign in to Admin Portal"}
            </button>
          </form>

          {errorMsg && <div className="msg-error">{errorMsg}</div>}
          {successMsg && <div className="msg-success">{successMsg}</div>}
        </div>
      </div>
    </>
  );
}