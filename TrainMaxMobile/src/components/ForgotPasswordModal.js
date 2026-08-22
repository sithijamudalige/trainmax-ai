// components/ForgotPasswordModal.js
import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE } from '../services/api';

export default function ForgotPasswordModal({ visible, onClose, defaultRole = 'player', defaultEmail = '' }) {
  const [step, setStep] = useState(1);
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
    if (visible) {
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
  }, [visible, defaultEmail, defaultRole]);

  if (!visible) return null;

  const handleSendCode = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true); setError(''); setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send verification code.');
      }
      setSuccess('Verification code sent to your Gmail!');
      if (data.dev_code) {
        setDevCode(data.dev_code);
        Alert.alert('✨ Dev/Test Mode Code', `Verification Code: ${data.dev_code}\n(Also sent via email if configured)`);
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

  const handleVerifyCode = async () => {
    if (!code.trim()) { setError('Please enter the 6-digit verification code.'); return; }
    setLoading(true); setError(''); setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() })
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

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) { setError('Please fill in both password fields.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError(''); setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim(), new_password: newPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset password.');
      }
      Alert.alert('Success 🎉', 'Password reset successfully! You can now log in with your new password.');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.backdrop}
      >
        <View style={s.modalCard}>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={s.scroll}>
            <View style={s.headerWrap}>
              <Text style={{ fontSize: 38 }}>🔐</Text>
              <Text style={s.title}>Reset Password</Text>
              <Text style={s.subtitle}>
                {step === 1 && 'Receive a verification code via Gmail'}
                {step === 2 && `Enter verification code sent to ${email}`}
                {step === 3 && 'Create a new secure password'}
              </Text>
            </View>

            {error ? <View style={s.errorBox}><Text style={s.errorText}>⚠️ {error}</Text></View> : null}
            {success ? <View style={s.successBox}><Text style={s.successText}>✅ {success}</Text></View> : null}
            {devCode ? <View style={s.devBox}><Text style={s.devText}>✨ Dev Code: {devCode}</Text></View> : null}

            {step === 1 && (
              <View>
                <Text style={s.label}>Account Type</Text>
                <View style={s.roleRow}>
                  {['player', 'coach'].map((r) => {
                    const active = role === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[s.roleBtn, active && s.roleBtnActive]}
                        onPress={() => setRole(r)}
                      >
                        <Text style={[s.roleText, active && s.roleTextActive]}>
                          {r === 'coach' ? '🏆 Coach' : '⚽ Player'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={s.label}>Email Address</Text>
                <TextInput
                  style={s.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#666"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={[s.submitBtn, loading && { opacity: 0.7 }]}
                  onPress={handleSendCode}
                  disabled={loading}
                >
                  <Text style={s.submitBtnText}>{loading ? '⏳ Sending...' : '📧 Send Verification Code'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 2 && (
              <View>
                <Text style={s.label}>6-Digit Verification Code</Text>
                <TextInput
                  style={[s.input, s.codeInput]}
                  placeholder="123456"
                  placeholderTextColor="#555"
                  value={code}
                  onChangeText={t => setCode(t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  maxLength={6}
                />

                <TouchableOpacity
                  style={[s.submitBtn, s.purpleBtn, loading && { opacity: 0.7 }]}
                  onPress={handleVerifyCode}
                  disabled={loading}
                >
                  <Text style={s.submitBtnText}>{loading ? '⏳ Verifying...' : '✅ Verify Code'}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep(1)} style={s.backBtn}>
                  <Text style={s.backBtnText}>← Back / Resend Code</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 3 && (
              <View>
                <Text style={s.label}>New Password</Text>
                <TextInput
                  style={s.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#666"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />

                <Text style={s.label}>Confirm New Password</Text>
                <TextInput
                  style={s.input}
                  placeholder="Confirm new password"
                  placeholderTextColor="#666"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />

                <TouchableOpacity
                  style={[s.submitBtn, s.indigoBtn, loading && { opacity: 0.7 }]}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  <Text style={s.submitBtnText}>{loading ? '⏳ Resetting...' : '🔐 Reset Password'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 18 },
  modalCard:    { backgroundColor: '#13102a', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', padding: 22, maxHeight: '90%' },
  closeBtn:     { alignSelf: 'flex-end', backgroundColor: 'rgba(255,255,255,0.1)', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  closeText:    { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  scroll:       { paddingBottom: 20 },
  headerWrap:   { alignItems: 'center', marginBottom: 20 },
  title:        { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 8 },
  subtitle:     { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', marginTop: 4 },
  
  errorBox:     { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444', borderWidth: 1, padding: 12, borderRadius: 10, marginBottom: 14 },
  errorText:    { color: '#fca5a5', fontSize: 13, fontWeight: '600' },
  successBox:   { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10b981', borderWidth: 1, padding: 12, borderRadius: 10, marginBottom: 14 },
  successText:  { color: '#6ee7b7', fontSize: 13, fontWeight: '600' },
  devBox:       { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: '#f59e0b', borderWidth: 1, padding: 12, borderRadius: 10, marginBottom: 14 },
  devText:      { color: '#fcd34d', fontSize: 13, fontWeight: '700' },

  label:        { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 10 },
  roleRow:      { flexDirection: 'row', gap: 10, marginBottom: 10 },
  roleBtn:      { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  roleBtnActive:{ backgroundColor: 'rgba(106,17,203,0.3)', borderColor: '#6a11cb' },
  roleText:     { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
  roleTextActive:{ color: '#fff', fontWeight: '800' },

  input:        { backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 15 },
  codeInput:    { fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: 8, color: '#10b981', paddingVertical: 16 },

  submitBtn:    { backgroundColor: '#10b981', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 22 },
  purpleBtn:    { backgroundColor: '#6a11cb' },
  indigoBtn:    { backgroundColor: '#6366f1' },
  submitBtnText:{ color: '#fff', fontSize: 16, fontWeight: '800' },
  backBtn:      { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  backBtnText:  { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
});
