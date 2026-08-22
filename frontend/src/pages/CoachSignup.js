import { COUNTRIES } from '../utils/countries';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';

const SPECIALIZATIONS = [
  'Goalkeeper', 'Defender', 'Midfielder', 'Forward',
  'Fitness & Conditioning', 'Tactical Analysis',
  'Youth Development', 'Nutrition', 'Mental Coaching',
];

const EXPERIENCE_LEVELS = [
  { label: 'Just Starting', value: 'beginner', icon: '🌱' },
  { label: '1–3 Years',     value: 'junior',   icon: '📈' },
  { label: '3–7 Years',     value: 'mid',       icon: '⚽' },
  { label: '7+ Years',      value: 'senior',    icon: '🏆' },
];

const STEPS = ['Account', 'Profile', 'Experience'];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@300;400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .cs-root {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', sans-serif;
    position: relative; overflow: hidden; padding: 24px 16px;
  }
  .cs-ball {
    position: absolute; border-radius: 50%; opacity: 0.07;
    pointer-events: none; animation: csFloat linear infinite;
    background: radial-gradient(circle at 35% 35%, #fff 0%, transparent 70%);
    border: 2px solid rgba(255,255,255,0.15);
  }
  @keyframes csFloat {
    0%   { transform: translateY(0) rotate(0deg); }
    100% { transform: translateY(-120vh) rotate(720deg); }
  }
  .cs-card {
    background: rgba(255,255,255,0.06); backdrop-filter: blur(18px);
    border: 1px solid rgba(255,255,255,0.12); border-radius: 24px;
    padding: 44px 44px 40px; width: 100%; max-width: 480px;
    position: relative; z-index: 10;
    animation: csFadeUp 0.55s ease both;
  }
  @keyframes csFadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Header */
  .cs-header { text-align: center; margin-bottom: 28px; }
  .cs-icon {
    width: 68px; height: 68px;
    background: linear-gradient(135deg, #059669, #10b981);
    border-radius: 20px; display: flex; align-items: center;
    justify-content: center; font-size: 30px;
    margin: 0 auto 14px; box-shadow: 0 8px 32px rgba(16,185,129,0.35);
  }
  .cs-title { font-family: 'Rajdhani', sans-serif; font-size: 26px; font-weight: 700; color: #fff; }
  .cs-sub { font-size: 13px; color: rgba(255,255,255,0.45); margin-top: 5px; }

  /* Step bar */
  .cs-stepbar { display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
  .cs-circle {
    width: 32px; height: 32px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 600; transition: all 0.3s;
  }
  .cs-circle.done { background: #10b981; color: #fff; box-shadow: 0 0 0 3px rgba(16,185,129,0.2); }
  .cs-circle.active { background: linear-gradient(135deg,#059669,#10b981); color: #fff; box-shadow: 0 0 0 3px rgba(16,185,129,0.25); }
  .cs-circle.idle { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.1); }
  .cs-line { flex: 1; height: 2px; max-width: 50px; background: rgba(255,255,255,0.1); transition: background 0.3s; }
  .cs-line.done { background: #10b981; }
  .cs-steplabels { display: flex; justify-content: space-between; margin-bottom: 24px; }
  .cs-steplabel { font-size: 10px; color: rgba(255,255,255,0.3); text-align: center; flex: 1; text-transform: uppercase; letter-spacing: 0.5px; }
  .cs-steplabel.active { color: #10b981; font-weight: 600; }

  /* Form */
  .cs-group { margin-bottom: 18px; }
  .cs-label {
    display: block; font-size: 11px; font-weight: 500;
    color: rgba(255,255,255,0.55); margin-bottom: 7px;
    text-transform: uppercase; letter-spacing: 0.8px;
  }
  .cs-wrap { position: relative; }
  .cs-input {
    width: 100%; background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12); border-radius: 12px;
    padding: 12px 16px 12px 42px;
    color: #fff; font-size: 14px; font-family: 'Inter', sans-serif;
    outline: none; transition: border-color 0.2s, background 0.2s;
  }
  .cs-input::placeholder { color: rgba(255,255,255,0.28); }
  .cs-input:focus { border-color: rgba(16,185,129,0.6); background: rgba(255,255,255,0.1); }
  .cs-ico { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); font-size: 15px; opacity: 0.45; pointer-events: none; }
  .cs-eye { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 15px; padding: 0; transition: color 0.2s; }
  .cs-eye:hover { color: rgba(255,255,255,0.8); }
  .cs-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .cs-hint { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 5px; }

  /* Chips */
  .cs-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .cs-chip {
    padding: 7px 14px; border-radius: 20px; font-size: 12px; font-weight: 500;
    background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.6); cursor: pointer; transition: all 0.2s; user-select: none;
  }
  .cs-chip:hover { border-color: rgba(16,185,129,0.4); color: #fff; }
  .cs-chip.on { background: rgba(16,185,129,0.18); border-color: #10b981; color: #10b981; }

  /* Exp grid */
  .cs-expgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .cs-expcard {
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px; padding: 14px 12px; cursor: pointer;
    transition: all 0.2s; text-align: center; user-select: none;
  }
  .cs-expcard:hover { border-color: rgba(16,185,129,0.4); }
  .cs-expcard.on { background: rgba(16,185,129,0.12); border-color: #10b981; }
  .cs-expicon { font-size: 22px; margin-bottom: 6px; }
  .cs-explabel { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.7); }
  .cs-expcard.on .cs-explabel { color: #10b981; }

  /* Error */
  .cs-error {
    background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3);
    border-radius: 10px; padding: 11px 14px; font-size: 13px; color: #fca5a5;
    margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
  }

  /* Buttons */
  .cs-btnrow { display: flex; gap: 12px; margin-top: 8px; }
  .cs-back {
    flex: 1; background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7);
    border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 13px;
    font-size: 14px; font-weight: 500; font-family: 'Inter', sans-serif;
    cursor: pointer; transition: all 0.2s;
  }
  .cs-back:hover { background: rgba(255,255,255,0.12); }
  .cs-next {
    flex: 2; background: linear-gradient(135deg, #059669, #10b981);
    color: #fff; border: none; border-radius: 12px; padding: 13px;
    font-size: 15px; font-weight: 600; font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.5px; cursor: pointer; transition: all 0.2s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .cs-next:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .cs-next:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .cs-next.full { width: 100%; flex: unset; }
  .cs-spinner {
    width: 17px; height: 17px;
    border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
    border-radius: 50%; animation: csSpin 0.7s linear infinite;
  }
  @keyframes csSpin { to { transform: rotate(360deg); } }

  /* Footer */
  .cs-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 22px 0 0; }
  .cs-footer { text-align: center; margin-top: 12px; }
  .cs-footer p { font-size: 13px; color: rgba(255,255,255,0.4); margin-bottom: 5px; }
  .cs-footer a { color: #10b981; text-decoration: none; font-weight: 500; }
  .cs-footer a.purple { color: #818cf8; }

  /* Success */
  .cs-success { text-align: center; padding: 12px 0; }
  .cs-success .big { font-size: 64px; margin-bottom: 20px; }
  .cs-success h2 { font-family: 'Rajdhani', sans-serif; font-size: 26px; font-weight: 700; color: #fff; margin-bottom: 8px; }
  .cs-success p { font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6; }
`;

export default function CoachSignup() {
  const navigate = useNavigate();
  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);

  // Step 0
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [showCPw, setShowCPw]     = useState(false);
  const [emailError, setEmailError]       = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Step 1
  const [fullName, setFullName] = useState('');
  const [club, setClub]         = useState('');
  const [country, setCountry]   = useState('');
  const [mobile, setMobile]     = useState('');

  // Step 2
  const [experience, setExperience]           = useState('');
  const [specializations, setSpecializations] = useState([]);
  const [bio, setBio]                         = useState('');

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

  const toggleSpec = (s) =>
    setSpecializations(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const validate = () => {
    if (step === 0) {
      if (!email || !password || !confirmPw) return 'Please fill in all fields.';
      if (password.length < 6) return 'Password must be at least 6 characters.';
      if (password !== confirmPw) return 'Passwords do not match.';
    }
    if (step === 1) {
      if (!fullName.trim()) return 'Please enter your full name.';
      if (!country.trim()) return 'Please enter your country.';
    }
    if (step === 2) {
      if (!experience) return 'Please select your experience level.';
      if (specializations.length === 0) return 'Please select at least one specialization.';
    }
    return '';
  };

  const handleNext = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');

    if (step < STEPS.length - 1) { setStep(s => s + 1); return; }

    // ── Final submit ──────────────────────────────────────────────────────────
    setLoading(true);
    try {
      // 1. Create Supabase auth user
      const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password });
      if (authErr) throw authErr;

      const userId = authData.user?.id;
      if (!userId) throw new Error('Signup failed — no user ID returned.');

      // 2. Insert coach profile row
      const { error: profileErr } = await supabase.from('coach_profiles').insert({
        id:               userId,
        email,
        full_name:        fullName,
        club:             club || '',
        country,
        mobile_number:    mobile || '',
        experience_level: experience,
        specializations,
        bio:              bio || '',
        is_verified:      false,
      });

      if (profileErr) throw profileErr;

      // 3. ✅ Show success then redirect
      setDone(true);
      setTimeout(() => navigate('/coach-dashboard'), 3000);

    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('already registered')) {
        setError('This email is already registered. Please log in instead.');
      } else {
        setError(msg || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    if (done) return (
      <div className="cs-success">
        <div className="big">🎉</div>
        <h2>Welcome, Coach {fullName.split(' ')[0]}!</h2>
        <p>Your account is created.<br />Redirecting to your dashboard…</p>
        <button className="cs-next full" style={{ marginTop: 28 }}
          onClick={() => navigate('/coach-dashboard')}>
          Go to Dashboard →
        </button>
      </div>
    );

    if (step === 0) return (
      <>
        <div className="cs-group">
          <label className="cs-label">Email Address</label>
          <div className="cs-wrap">
            <span className="cs-ico">📧</span>
            <input className="cs-input" type="email" placeholder="coach@example.com"
              value={email} onChange={e => {
                const val = e.target.value;
                setEmail(val);
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                  setEmailError("Please enter a valid email address");
                } else {
                  setEmailError("");
                }
              }} />
          </div>
          {emailError && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{emailError}</div>}
        </div>
        <div className="cs-group">
          <label className="cs-label">Password</label>
          <div className="cs-wrap">
            <span className="cs-ico">🔒</span>
            <input className="cs-input" type={showPw ? 'text' : 'password'}
              placeholder="Min. 6 characters" value={password}
              onChange={e => {
                const val = e.target.value;
                setPassword(val);
                if (val.length < 6) {
                  setPasswordError("Password must be at least 6 characters");
                } else {
                  setPasswordError("");
                }
              }} style={{ paddingRight: 42 }} />
            <button type="button" className="cs-eye" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
          {passwordError && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{passwordError}</div>}
        </div>
        <div className="cs-group">
          <label className="cs-label">Confirm Password</label>
          <div className="cs-wrap">
            <span className="cs-ico">🔒</span>
            <input className="cs-input" type={showCPw ? 'text' : 'password'}
              placeholder="Re-enter password" value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)} style={{ paddingRight: 42 }} />
            <button type="button" className="cs-eye" onClick={() => setShowCPw(v => !v)} tabIndex={-1}>
              {showCPw ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
      </>
    );

    if (step === 1) return (
      <>
        <div className="cs-group">
          <label className="cs-label">Full Name</label>
          <div className="cs-wrap">
            <span className="cs-ico">👤</span>
            <input className="cs-input" type="text" placeholder="Coach John Smith"
              value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
        </div>
        <div className="cs-row">
          <div className="cs-group" style={{ marginBottom: 0 }}>
            <label className="cs-label">Club / Academy</label>
            <div className="cs-wrap">
              <span className="cs-ico">🏟️</span>
              <input className="cs-input" type="text" placeholder="City FC"
                value={club} onChange={e => setClub(e.target.value)} />
            </div>
          </div>
          <div className="cs-group" style={{ marginBottom: 0 }}>
            <label className="cs-label">Country</label>
            <div className="cs-wrap">
              <span className="cs-ico">🌍</span>
              <input className="cs-input" type="text" placeholder="Sri Lanka" list="coach-country-options"
                value={country} onChange={e => setCountry(e.target.value)} autoComplete="off" />
              <datalist id="coach-country-options">
                {COUNTRIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>
        </div>
        <div className="cs-group" style={{ marginTop: 18 }}>
          <label className="cs-label">Mobile Number <span style={{ opacity: 0.4 }}>(optional)</span></label>
          <div className="cs-wrap">
            <span className="cs-ico">📱</span>
            <input className="cs-input" type="tel" placeholder="+94 77 000 0000"
              value={mobile} onChange={e => setMobile(e.target.value)} />
          </div>
        </div>
      </>
    );

    if (step === 2) return (
      <>
        <div className="cs-group">
          <label className="cs-label">Experience Level</label>
          <div className="cs-expgrid">
            {EXPERIENCE_LEVELS.map(lvl => (
              <div key={lvl.value}
                className={`cs-expcard${experience === lvl.value ? ' on' : ''}`}
                onClick={() => setExperience(lvl.value)}>
                <div className="cs-expicon">{lvl.icon}</div>
                <div className="cs-explabel">{lvl.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="cs-group">
          <label className="cs-label">Specializations</label>
          <div className="cs-chips">
            {SPECIALIZATIONS.map(s => (
              <div key={s}
                className={`cs-chip${specializations.includes(s) ? ' on' : ''}`}
                onClick={() => toggleSpec(s)}>
                {s}
              </div>
            ))}
          </div>
          <p className="cs-hint">Select all that apply</p>
        </div>
        <div className="cs-group">
          <label className="cs-label">Short Bio <span style={{ opacity: 0.4 }}>(optional)</span></label>
          <textarea className="cs-input"
            style={{ paddingLeft: 16, minHeight: 72, resize: 'vertical' }}
            placeholder="Your coaching philosophy…"
            value={bio} onChange={e => setBio(e.target.value)} />
        </div>
      </>
    );
  };

  return (
    <div className="cs-root">
      {balls.map(b => (
        <div key={b.id} className="cs-ball" style={{
          width: b.size, height: b.size,
          left: `${b.left}%`, bottom: '-10%',
          animationDuration: `${b.dur}s`,
          animationDelay: `${b.delay}s`,
        }} />
      ))}

      <div className="cs-card">
        {!done && (
          <div className="cs-header">
            <div className="cs-icon">🧑‍💼</div>
            <h1 className="cs-title">Register as Coach</h1>
            <p className="cs-sub">Train Max AI — Coach Portal</p>
          </div>
        )}

        {!done && (
          <>
            <div className="cs-stepbar">
              {STEPS.map((s, i) => (
                <React.Fragment key={s}>
                  {i > 0 && <div className={`cs-line${i <= step ? ' done' : ''}`} />}
                  <div className={`cs-circle ${i < step ? 'done' : i === step ? 'active' : 'idle'}`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div className="cs-steplabels">
              {STEPS.map((s, i) => (
                <div key={s} className={`cs-steplabel${i === step ? ' active' : ''}`}>{s}</div>
              ))}
            </div>
          </>
        )}

        {error && <div className="cs-error">⚠️ {error}</div>}

        {renderStep()}

        {!done && (
          <>
            <div className="cs-btnrow">
              {step > 0 && (
                <button className="cs-back" onClick={() => { setStep(s => s - 1); setError(''); }}>
                  ← Back
                </button>
              )}
              <button
                className={`cs-next${step === 0 ? ' full' : ''}`}
                onClick={handleNext}
                disabled={loading}>
                {loading
                  ? <><div className="cs-spinner" /> Creating account…</>
                  : step < STEPS.length - 1 ? 'Continue →' : '🎉 Create Coach Account'
                }
              </button>
            </div>

            <div className="cs-divider" />
            <div className="cs-footer">
              <p>Already have a coach account? <Link to="/coach-login">Sign In</Link></p>
              <p>Are you a player? <Link to="/signup" className="purple">Player Signup</Link></p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}