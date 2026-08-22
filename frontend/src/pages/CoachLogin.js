import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@300;400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .cl-root {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', sans-serif;
    position: relative; overflow: hidden;
  }
  .cl-ball {
    position: absolute; border-radius: 50%; opacity: 0.07;
    pointer-events: none; animation: clFloat linear infinite;
    background: radial-gradient(circle at 35% 35%, #fff 0%, transparent 70%);
    border: 2px solid rgba(255,255,255,0.15);
  }
  @keyframes clFloat {
    0%   { transform: translateY(0) rotate(0deg); }
    100% { transform: translateY(-120vh) rotate(720deg); }
  }
  .cl-card {
    background: rgba(255,255,255,0.06); backdrop-filter: blur(18px);
    border: 1px solid rgba(255,255,255,0.12); border-radius: 24px;
    padding: 48px 44px; width: 100%; max-width: 420px;
    position: relative; z-index: 10;
    animation: clFadeUp 0.55s ease both;
  }
  @keyframes clFadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .cl-header { text-align: center; margin-bottom: 36px; }
  .cl-icon {
    width: 76px; height: 76px;
    border-radius: 20px; object-fit: contain;
    margin: 0 auto 14px; display: block;
    box-shadow: 0 8px 32px rgba(16,185,129,0.35);
  }
  .cl-title { font-family: 'Rajdhani', sans-serif; font-size: 28px; font-weight: 700; color: #fff; }
  .cl-sub { font-size: 13px; color: rgba(255,255,255,0.45); margin-top: 5px; }
  .cl-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3);
    border-radius: 20px; padding: 4px 14px;
    font-size: 12px; font-weight: 500; color: #10b981; margin-top: 10px;
  }
  .cl-dot {
    width: 6px; height: 6px; background: #10b981; border-radius: 50%;
    animation: clPulse 2s ease-in-out infinite;
  }
  @keyframes clPulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.4;transform:scale(0.8);} }
  .cl-group { margin-bottom: 20px; }
  .cl-label {
    display: block; font-size: 11px; font-weight: 500;
    color: rgba(255,255,255,0.55); margin-bottom: 8px;
    text-transform: uppercase; letter-spacing: 0.8px;
  }
  .cl-wrap { position: relative; }
  .cl-input {
    width: 100%; background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12); border-radius: 12px;
    padding: 13px 16px 13px 44px;
    color: #fff; font-size: 14px; font-family: 'Inter', sans-serif;
    outline: none; transition: border-color 0.2s, background 0.2s;
  }
  .cl-input::placeholder { color: rgba(255,255,255,0.28); }
  .cl-input:focus { border-color: rgba(16,185,129,0.6); background: rgba(255,255,255,0.1); }
  .cl-ico {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    font-size: 16px; opacity: 0.45; pointer-events: none;
  }
  .cl-eye {
    position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
    background: none; border: none; color: rgba(255,255,255,0.4);
    cursor: pointer; font-size: 16px; padding: 0; transition: color 0.2s;
  }
  .cl-eye:hover { color: rgba(255,255,255,0.8); }
  .cl-error {
    background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3);
    border-radius: 10px; padding: 11px 14px; font-size: 13px; color: #fca5a5;
    margin-bottom: 18px; display: flex; align-items: center; gap: 8px;
  }
  .cl-btn {
    width: 100%; background: linear-gradient(135deg, #059669, #10b981);
    color: #fff; border: none; border-radius: 12px; padding: 14px;
    font-size: 15px; font-weight: 600; font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.5px; cursor: pointer;
    transition: opacity 0.2s, transform 0.15s; margin-top: 4px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .cl-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .cl-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .cl-spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
    border-radius: 50%; animation: clSpin 0.7s linear infinite;
  }
  @keyframes clSpin { to { transform: rotate(360deg); } }
  .cl-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 26px 0 0; }
  .cl-footer { text-align: center; margin-top: 14px; }
  .cl-footer p { font-size: 13px; color: rgba(255,255,255,0.4); margin-bottom: 6px; }
  .cl-footer a { color: #10b981; text-decoration: none; font-weight: 500; transition: color 0.2s; }
  .cl-footer a:hover { color: #6ee7b7; }
  .cl-footer a.purple { color: #818cf8; }
  .cl-footer a.purple:hover { color: #a5b4fc; }
`;

export default function CoachLogin() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showForgot, setShowForgot] = useState(false);

  const [balls] = useState(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i, size: 30 + Math.random() * 60,
      left: Math.random() * 100,
      delay: Math.random() * 12,
      dur: 14 + Math.random() * 10,
    }))
  );

  useEffect(() => {
    const tag = document.createElement('style');
    tag.textContent = styles;
    document.head.appendChild(tag);
    return () => document.head.removeChild(tag);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError('');

    try {
      // 1. Sign in with Supabase Auth
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;

      const userId = data.user?.id;

      // 2. Confirm the user has a coach_profiles row
      const { data: coachData, error: profileErr } = await supabase
        .from('coach_profiles')
        .select('id, full_name')
        .eq('id', userId)
        .single();

      if (profileErr || !coachData) {
        await supabase.auth.signOut();
        throw new Error('No coach account found. Please register as a coach first.');
      }

      // 3. ✅ Redirect to coach dashboard
      navigate('/coach-dashboard');

    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cl-root">
      {balls.map(b => (
        <div key={b.id} className="cl-ball" style={{
          width: b.size, height: b.size,
          left: `${b.left}%`, bottom: '-10%',
          animationDuration: `${b.dur}s`,
          animationDelay: `${b.delay}s`,
        }} />
      ))}

      <div className="cl-card">
        <div className="cl-header">
          <img className="cl-icon" src="/logo.png" alt="Logo" />
          <h1 className="cl-title">Coach Portal</h1>
          <p className="cl-sub">Train Max AI — Coach Access</p>
          <div className="cl-badge"><span className="cl-dot" /> Coach Login</div>
        </div>

        {error && <div className="cl-error">⚠️ {error}</div>}

        <form onSubmit={handleLogin}>
          <div className="cl-group">
            <label className="cl-label">Email Address</label>
            <div className="cl-wrap">
              <span className="cl-ico">📧</span>
              <input className="cl-input" type="email" placeholder="coach@example.com"
                value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>
          </div>

          <div className="cl-group">
            <label className="cl-label">Password</label>
            <div className="cl-wrap">
              <span className="cl-ico">🔒</span>
              <input className="cl-input" type={showPw ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password} onChange={e => setPassword(e.target.value)}
                autoComplete="current-password" style={{ paddingRight: 44 }} />
              <button type="button" className="cl-eye"
                onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={{ textAlign: "right", marginTop: -6, marginBottom: 16 }}>
            <span onClick={() => setShowForgot(true)} style={{ color: "#a855f7", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
              Forgot password?
            </span>
          </div>

          <button className="cl-btn" type="submit" disabled={loading}>
            {loading
              ? <><div className="cl-spinner" /> Signing in…</>
              : '🏆 Sign In as Coach'}
          </button>
        </form>

        <div className="cl-divider" />
        <div className="cl-footer">
          <p>Don't have a coach account? <Link to="/coach-signup">Register as Coach →</Link></p>
          <p>Are you a player? <Link to="/login" className="purple">Player Login</Link></p>
          
          <div style={{ marginTop: 20 }}>
            <Link to="/" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
              ← Back to Welcome Page
            </Link>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgot}
        onClose={() => setShowForgot(false)}
        defaultRole="coach"
        defaultEmail={email}
      />
    </div>
  );
}