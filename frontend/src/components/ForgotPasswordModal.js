import React, { useState, useEffect } from 'react';

const API_BASE = 'http://127.0.0.1:5000';

export default function ForgotPasswordModal({ isOpen, onClose, defaultRole = 'player', defaultEmail = '' }) {
  const [step, setStep] = useState(1); // 1: Send Code, 2: Verify Code, 3: New Password
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(defaultRole);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devCode, setDevCode] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setEmail(defaultEmail || '');
      setRole(defaultRole || 'player');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
      setDevCode(null);
    }
  }, [isOpen, defaultEmail, defaultRole]);

  if (!isOpen) return null;

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address.'); return; }
    setLoading(true); setError(''); setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send verification code.');
      }
      setSuccess('Verification code sent to your Gmail!');
      if (data.dev_code) {
        setDevCode(data.dev_code);
      }
      setTimeout(() => {
        setSuccess('');
        setStep(2);
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!code) { setError('Please enter the 6-digit verification code.'); return; }
    setLoading(true); setError(''); setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid verification code.');
      }
      setSuccess('Code verified!');
      setTimeout(() => {
        setSuccess('');
        setStep(3);
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) { setError('Please fill in both password fields.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError(''); setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, new_password: newPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset password.');
      }
      setSuccess('🎉 Password reset successfully! You can now log in.');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #13102a, #241e4a)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 20, padding: 28, width: '100%', maxWidth: 440,
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)', color: '#fff', position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)',
            border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 16,
            cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          ✕
        </button>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #a855f7, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Reset Password
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
            {step === 1 && 'Receive a 6-digit verification code via Gmail'}
            {step === 2 && `Enter the verification code sent to ${email}`}
            {step === 3 && 'Create a new secure password'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#6ee7b7', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
            ✅ {success}
          </div>
        )}

        {devCode && (
          <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px dashed #f59e0b', color: '#fcd34d', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
            ✨ <strong>Dev/Test Mode Code:</strong> {devCode}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSendCode}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Account Type</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {['player', 'coach'].map((r) => (
                  <button
                    key={r} type="button" onClick={() => setRole(r)}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13, textTransform: 'capitalize',
                      background: role === r ? 'linear-gradient(135deg, #6a11cb, #2575fc)' : 'rgba(255,255,255,0.06)',
                      border: role === r ? '1px solid #6a11cb' : '1px solid rgba(255,255,255,0.15)', color: '#fff'
                    }}
                  >
                    {r === 'coach' ? '🏆 Coach Account' : '⚽ Player Account'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Email Address</label>
              <input
                type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 14 }}
              />
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15,
                background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? '⏳ Sending Code...' : '📧 Send Verification Code'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyCode}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>6-Digit Verification Code</label>
              <input
                type="text" required placeholder="123456" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                style={{ width: '100%', padding: '14px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: '#10b981', fontSize: 24, fontWeight: 700, textAlign: 'center', letterSpacing: 6 }}
              />
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15,
                background: 'linear-gradient(135deg, #6a11cb, #2575fc)', color: '#fff', opacity: loading ? 0.7 : 1, marginBottom: 10
              }}
            >
              {loading ? '⏳ Verifying...' : '✅ Verify Code'}
            </button>
            <button
              type="button" onClick={() => setStep(1)}
              style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}
            >
              ← Back / Resend Code
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>New Password</label>
              <input
                type="password" required placeholder="At least 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 14 }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Confirm New Password</label>
              <input
                type="password" required placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 14 }}
              />
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15,
                background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#fff', opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? '⏳ Resetting Password...' : '🔐 Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
