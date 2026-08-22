import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import CoachNavbar from '../components/CoachNavbar';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .cd-root {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    font-family: 'Inter', sans-serif; color: #fff;
  }

  /* ── Body ── */
  .cd-body { padding: 32px; max-width: 1100px; margin: 0 auto; }

  /* Welcome banner */
  .cd-welcome {
    background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2);
    border-radius: 20px; padding: 28px 32px; margin-bottom: 32px;
    display: flex; align-items: center; gap: 20px;
    animation: cdFadeUp 0.5s ease both;
  }
  @keyframes cdFadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .cd-welcome-icon { font-size: 52px; flex-shrink: 0; }
  .cd-welcome h2 {
    font-family: 'Rajdhani', sans-serif;
    font-size: 26px; font-weight: 700; margin-bottom: 6px;
  }
  .cd-welcome p { font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6; }
  .cd-welcome-green { color: #10b981; font-weight: 600; }

  /* ── Quick action cards ── */
  .cd-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px; margin-bottom: 32px;
  }
  .cd-action-card {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px; padding: 22px 20px;
    cursor: pointer; transition: all 0.2s;
    animation: cdFadeUp 0.5s ease both;
    display: flex; flex-direction: column; gap: 10px;
  }
  .cd-action-card:hover {
    transform: translateY(-3px);
    border-color: rgba(255,255,255,0.25);
    background: rgba(255,255,255,0.09);
  }
  .cd-action-icon { font-size: 28px; }
  .cd-action-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 16px; font-weight: 700; color: #fff;
  }
  .cd-action-sub { font-size: 12px; color: rgba(255,255,255,0.4); }
  .cd-action-arrow {
    font-size: 18px; color: rgba(255,255,255,0.25);
    margin-top: auto; align-self: flex-end;
  }

  /* ── Stats row ── */
  .cd-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 16px; margin-bottom: 32px;
  }
  .cd-stat-card {
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px; padding: 20px;
    animation: cdFadeUp 0.5s ease both;
    transition: border-color 0.2s;
  }
  .cd-stat-card:hover { border-color: rgba(16,185,129,0.3); }
  .cd-stat-icon { font-size: 24px; margin-bottom: 10px; }
  .cd-stat-val {
    font-family: 'Rajdhani', sans-serif;
    font-size: 26px; font-weight: 700; color: #10b981;
    line-height: 1.2;
  }
  .cd-stat-label {
    font-size: 11px; color: rgba(255,255,255,0.4);
    margin-top: 4px; text-transform: uppercase; letter-spacing: 0.6px;
  }

  /* ── Two-col grid ── */
  .cd-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 20px; margin-bottom: 32px;
  }
  @media (max-width: 700px) { .cd-grid { grid-template-columns: 1fr; } }

  /* ── Panel ── */
  .cd-panel {
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px; padding: 24px;
    animation: cdFadeUp 0.6s ease both;
  }
  .cd-panel-title {
    font-family: 'Rajdhani', sans-serif; font-size: 17px; font-weight: 700;
    margin-bottom: 18px; display: flex; align-items: center; gap: 8px;
    color: #fff;
  }

  /* Profile fields */
  .cd-field { margin-bottom: 14px; }
  .cd-field-label {
    font-size: 11px; color: rgba(255,255,255,0.38);
    text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 4px;
  }
  .cd-field-val { font-size: 14px; color: rgba(255,255,255,0.85); font-weight: 500; }

  /* Chips */
  .cd-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
  .cd-chip {
    background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.25);
    border-radius: 20px; padding: 4px 13px; font-size: 12px; color: #10b981;
  }

  /* Exp badge */
  .cd-exp {
    display: inline-block;
    background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.3);
    border-radius: 20px; padding: 3px 13px;
    font-size: 12px; color: #fbbf24; font-weight: 500; margin-top: 4px;
  }

  /* Divider inside panel */
  .cd-panel-divider {
    height: 1px; background: rgba(255,255,255,0.07);
    margin: 20px 0;
  }

  /* ── Coming soon ── */
  .cd-coming {
    background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.1);
    border-radius: 20px; padding: 40px; text-align: center;
    margin-bottom: 24px; animation: cdFadeUp 0.7s ease both;
  }
  .cd-coming-icon { font-size: 40px; margin-bottom: 12px; }
  .cd-coming h3 {
    font-family: 'Rajdhani', sans-serif; font-size: 20px;
    font-weight: 700; margin-bottom: 6px;
  }
  .cd-coming p { font-size: 13px; color: rgba(255,255,255,0.38); }

  /* ── Loading ── */
  .cd-loading {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 16px;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  }
  .cd-loading-spinner {
    width: 44px; height: 44px;
    border: 3px solid rgba(255,255,255,0.08); border-top-color: #10b981;
    border-radius: 50%; animation: cdSpin 0.8s linear infinite;
  }
  @keyframes cdSpin { to { transform: rotate(360deg); } }
  .cd-loading p { font-size: 14px; color: rgba(255,255,255,0.4); font-family: 'Inter', sans-serif; }
`;

const EXP_LABELS = {
  beginner: '🌱 Just Starting',
  junior:   '📈 1–3 Years',
  mid:      '⚽ 3–7 Years',
  senior:   '🏆 7+ Years',
};

export default function CoachDashboard() {
  const navigate = useNavigate();
  const [coach, setCoach]       = useState(null);
  const [stats, setStats]       = useState(null);
  const [error, setError]     = useState('');
  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const tag = document.createElement('style');
    tag.textContent = styles;
    document.head.appendChild(tag);
    return () => document.head.removeChild(tag);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadCoach(); }, []);

  const loadCoach = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/coach-login'); return; }

      const { data, error: profileErr } = await supabase
        .from('coach_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileErr || !data) {
        await supabase.auth.signOut();
        navigate('/coach-login');
        return;
      }
      setCoach(data);

      try {
        const statsRes = await fetch(`http://127.0.0.1:5000/api/coach-chatbot/stats/${session.user.id}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats);
        }
      } catch (err) {
        console.error('Failed to load coach stats:', err);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const specsArray = (form.specializations || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        full_name: form.full_name,
        club: form.club,
        country: form.country,
        mobile_number: form.mobile_number,
        experience_level: form.experience_level,
        specializations: specsArray,
        bio: form.bio,
      };

      await supabase
        .from('coach_profiles')
        .update(payload)
        .eq('id', session.user.id);

      if (session?.access_token) {
        await fetch('http://127.0.0.1:5000/api/coach/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }).catch(() => {});
      }

      setCoach({ ...coach, ...payload });
      setEditing(false);
    } catch (err) {
      alert('Failed to save profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ── Loading state ── */
  if (loading) return (
    <div className="cd-loading">
      <div className="cd-loading-spinner" />
      <p>Loading coach dashboard…</p>
    </div>
  );

  if (error) return (
    <div className="cd-loading">
      <p style={{ color: '#fca5a5' }}>⚠️ {error}</p>
    </div>
  );

  const firstName = coach?.full_name?.split(' ')[0] || 'Coach';
  const specs     = Array.isArray(coach?.specializations) ? coach.specializations : [];

  /* ── Quick-action cards ── */
  const ACTIONS = [
    {
      icon: '⚽', label: 'Train Max AI',
      sub: 'AI coaching assistant',
      path: '/coach-chatbot',
      delay: '0s',
      border: 'rgba(101,16,203,0.4)',
    },
    {
      icon: '👥', label: 'Team Creation',
      sub: 'Build & manage your team',
      path: '/coach-team',
      delay: '0.06s',
      border: 'rgba(14,165,233,0.4)',
    },
    {
      icon: '📋', label: 'Training Plans',
      sub: 'Assign & track plans',
      path: '/coach-training-plans',
      delay: '0.12s',
      border: 'rgba(16,185,129,0.4)',
    },
  ];

  return (
    <div className="cd-root">

      {/* ── Coach Navbar ── */}
      <CoachNavbar />

      <div className="cd-body">

        {/* ── Welcome banner ── */}
        <div className="cd-welcome">
          <div className="cd-welcome-icon">🏆</div>
          <div>
            <h2>
              Welcome back,{' '}
              <span className="cd-welcome-green">{firstName}!</span>
            </h2>
            <p>
              Your coach dashboard is ready.
              {coach?.club ? ` Coaching at ${coach.club}.` : ''}
              {' '}Use the tools below to manage your team and players.
            </p>
          </div>
        </div>

        {/* ── Quick action cards ── */}
        <div className="cd-actions">
          {ACTIONS.map(a => (
            <div
              key={a.path}
              className="cd-action-card"
              style={{ animationDelay: a.delay }}
              onClick={() => navigate(a.path)}
            >
              <div className="cd-action-icon">{a.icon}</div>
              <div>
                <div className="cd-action-label">{a.label}</div>
                <div className="cd-action-sub">{a.sub}</div>
              </div>
              <div className="cd-action-arrow">→</div>
            </div>
          ))}
        </div>

        {/* ── Stats ── */}
        <div className="cd-stats">
          {[
            { icon: '🏆', val: stats?.wins || 0, label: 'Wins' },
            { icon: '🤝', val: stats?.draws || 0, label: 'Draws' },
            { icon: '😞', val: stats?.losses || 0, label: 'Losses' },
            { icon: '🔥', val: stats?.win_streak || 0, label: 'Win Streak' },
            { icon: '🏅', val: EXP_LABELS[coach?.experience_level] || '—', label: 'Experience' },
          ].map((s, i) => (
            <div
              key={i}
              className="cd-stat-card"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="cd-stat-icon">{s.icon}</div>
              <div className="cd-stat-val">{s.val}</div>
              <div className="cd-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Profile + Specializations ── */}
        <div className="cd-grid">

          {/* Profile panel */}
          <div className="cd-panel">
            <div className="cd-panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📋 Coach Profile</span>
              <button
                type="button"
                onClick={() => {
                  if (!editing) {
                    setForm({
                      full_name: coach?.full_name || '',
                      club: coach?.club || '',
                      country: coach?.country || '',
                      mobile_number: coach?.mobile_number || '',
                      experience_level: coach?.experience_level || 'beginner',
                      specializations: (coach?.specializations || []).join(', '),
                      bio: coach?.bio || '',
                    });
                    setEditing(true);
                  } else {
                    setEditing(false);
                  }
                }}
                style={{
                  padding: '5px 12px',
                  background: editing ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  border: editing ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                  color: editing ? '#fca5a5' : '#10b981',
                  borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12,
                  transition: 'all 0.2s',
                }}
              >
                {editing ? '✕ Cancel' : '✏️ Edit Profile'}
              </button>
            </div>

            {editing ? (
              <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: 12, marginTop: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Full Name</label>
                  <input
                    type="text"
                    value={form.full_name || ''}
                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 14, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Club / Academy</label>
                  <input
                    type="text"
                    value={form.club || ''}
                    onChange={e => setForm({ ...form, club: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 14, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Country</label>
                  <input
                    type="text"
                    value={form.country || ''}
                    onChange={e => setForm({ ...form, country: e.target.value })}
                    required
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 14, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Mobile Number</label>
                  <input
                    type="text"
                    value={form.mobile_number || ''}
                    onChange={e => setForm({ ...form, mobile_number: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 14, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Experience Level</label>
                  <select
                    value={form.experience_level || 'beginner'}
                    onChange={e => setForm({ ...form, experience_level: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 14, marginTop: 4 }}
                  >
                    <option value="beginner">🌱 Just Starting</option>
                    <option value="junior">📈 1–3 Years</option>
                    <option value="mid">⚽ 3–7 Years</option>
                    <option value="senior">🏆 7+ Years</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Specializations (comma separated)</label>
                  <input
                    type="text"
                    value={form.specializations || ''}
                    onChange={e => setForm({ ...form, specializations: e.target.value })}
                    placeholder="Goalkeeping, Tactics, Fitness..."
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 14, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Bio</label>
                  <textarea
                    rows={3}
                    value={form.bio || ''}
                    onChange={e => setForm({ ...form, bio: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 14, marginTop: 4, fontFamily: 'inherit' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '11px 18px',
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    border: 'none', borderRadius: 8, color: '#fff',
                    fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
                    marginTop: 6,
                  }}
                >
                  {saving ? '⏳ Saving...' : '💾 Save Profile'}
                </button>
              </form>
            ) : (
              <>
                <div className="cd-field">
                  <div className="cd-field-label">Full Name</div>
                  <div className="cd-field-val">{coach?.full_name || '—'}</div>
                </div>
                <div className="cd-field">
                  <div className="cd-field-label">Email</div>
                  <div className="cd-field-val">{coach?.email || '—'}</div>
                </div>
                <div className="cd-field">
                  <div className="cd-field-label">Club / Academy</div>
                  <div className="cd-field-val">{coach?.club || 'Not set'}</div>
                </div>
                <div className="cd-field">
                  <div className="cd-field-label">Country</div>
                  <div className="cd-field-val">{coach?.country || '—'}</div>
                </div>
                <div className="cd-field">
                  <div className="cd-field-label">Experience</div>
                  <div className="cd-exp">{EXP_LABELS[coach?.experience_level] || '—'}</div>
                </div>
                {coach?.bio && (
                  <div className="cd-field">
                    <div className="cd-field-label">Bio</div>
                    <div className="cd-field-val" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                      {coach.bio}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Specializations + Contact panel */}
          <div className="cd-panel">
            <div className="cd-panel-title">🎯 Specializations</div>

            {specs.length > 0 ? (
              <div className="cd-chips">
                {specs.map(s => <span key={s} className="cd-chip">{s}</span>)}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>
                No specializations set.
              </p>
            )}

            <div className="cd-panel-divider" />

            <div className="cd-panel-title">📞 Contact</div>
            <div className="cd-field">
              <div className="cd-field-label">Mobile</div>
              <div className="cd-field-val">{coach?.mobile_number || 'Not set'}</div>
            </div>
            <div className="cd-field">
              <div className="cd-field-label">Account Status</div>
              <div className="cd-field-val">
                {coach?.is_verified
                  ? <span style={{ color: '#10b981' }}>✅ Verified Coach</span>
                  : <span style={{ color: '#fbbf24' }}>⏳ Pending Verification</span>
                }
              </div>
            </div>
          </div>

        </div>

        {/* ── Coming soon ── */}
        <div className="cd-coming">
          <div className="cd-coming-icon">🚧</div>
          <h3>More Features Coming Soon</h3>
          <p>
            Player management, training plan assignment, match analysis,
            and performance tracking tools are on the way.
          </p>
        </div>

      </div>
    </div>
  );
}