// screens/coach/CoachProfileScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, TextInput, Alert, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabaseClient';
import { API_BASE } from '../../services/api';

const EXP_LABELS = {
  beginner: '🌱 Just Starting',
  junior:   '📈 1–3 Years',
  mid:      '⚽ 3–7 Years',
  senior:   '🏆 7+ Years',
};

const EXP_OPTIONS = ['beginner', 'junior', 'mid', 'senior'];

export default function CoachProfileScreen({ navigation }) {
  const [user, setUser]       = useState(null);
  const [coach, setCoach]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({});

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }
      setUser(session.user);

      const { data, error } = await supabase
        .from('coach_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!error && data) {
        setCoach(data);
      }
    } catch (err) {
      console.warn('Error loading coach profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const startEditing = () => {
    setForm({
      full_name:        coach?.full_name || '',
      club:             coach?.club || '',
      country:          coach?.country || '',
      mobile_number:    coach?.mobile_number || '',
      experience_level: coach?.experience_level || 'beginner',
      specializations:  Array.isArray(coach?.specializations) ? coach.specializations.join(', ') : '',
      bio:              coach?.bio || '',
    });
    setEditing(true);
  };

  const saveProfile = async () => {
    if (!form.full_name?.trim() || !form.country?.trim()) {
      Alert.alert('Validation Error', 'Full Name and Country are required.');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const specsArray = (form.specializations || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        full_name:        form.full_name.trim(),
        club:             form.club.trim(),
        country:          form.country.trim(),
        mobile_number:    form.mobile_number.trim(),
        experience_level: form.experience_level,
        specializations:  specsArray,
        bio:              form.bio.trim(),
      };

      // 1. Update Supabase
      const { error: supErr } = await supabase
        .from('coach_profiles')
        .update(payload)
        .eq('id', session.user.id);

      if (supErr) throw supErr;

      // 2. Update via Backend API if possible
      if (session?.access_token) {
        await fetch(`${API_BASE}/api/coach/profile`, {
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
      Alert.alert('Success ✅', 'Your coach profile has been updated!');
    } catch (err) {
      Alert.alert('Error', 'Failed to save profile: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    // RootNavigator handles auth state
  };

  if (loading) {
    return (
      <View style={s.centerWrap}>
        <StatusBar barStyle="light-content" backgroundColor="#0f0c29" />
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={{ color: 'rgba(255,255,255,0.6)', marginTop: 12 }}>Loading Profile...</Text>
      </View>
    );
  }

  const specs = Array.isArray(coach?.specializations) ? coach.specializations : [];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0c29" />

      {/* ── Header ── */}
      <LinearGradient colors={['#6a11cb', '#2575fc']} style={s.header}>
        <View style={s.avatarWrap}>
          <Text style={{ fontSize: 36 }}>🏆</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerName}>{coach?.full_name || user?.email?.split('@')[0] || 'Coach'}</Text>
          <Text style={s.headerSub}>{coach?.club ? `Coaching at ${coach.club}` : 'Football Coach'}</Text>
          <View style={s.verBadge}>
            <Text style={s.verText}>{coach?.is_verified ? '✅ Verified Coach' : '⏳ Pending Verification'}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* ── Edit Button Bar ── */}
        <View style={s.actionRow}>
          <Text style={s.secTitle}>{editing ? '✏️ Edit Profile Details' : '📋 Profile Information'}</Text>
          <TouchableOpacity
            style={[s.editBtn, editing && s.cancelBtn]}
            onPress={editing ? () => setEditing(false) : startEditing}
            activeOpacity={0.8}
          >
            <Text style={[s.editBtnText, editing && s.cancelBtnText]}>
              {editing ? '✕ Cancel' : '✏️ Edit Profile'}
            </Text>
          </TouchableOpacity>
        </View>

        {editing ? (
          /* ── EDIT FORM ── */
          <View style={s.card}>
            <Text style={s.label}>Full Name *</Text>
            <TextInput
              style={s.input}
              value={form.full_name}
              onChangeText={t => setForm({ ...form, full_name: t })}
              placeholder="Enter your full name"
              placeholderTextColor="#666"
            />

            <Text style={s.label}>Club / Academy</Text>
            <TextInput
              style={s.input}
              value={form.club}
              onChangeText={t => setForm({ ...form, club: t })}
              placeholder="e.g. Real Madrid Academy"
              placeholderTextColor="#666"
            />

            <Text style={s.label}>Country *</Text>
            <TextInput
              style={s.input}
              value={form.country}
              onChangeText={t => setForm({ ...form, country: t })}
              placeholder="Enter your country"
              placeholderTextColor="#666"
            />

            <Text style={s.label}>Mobile Number</Text>
            <TextInput
              style={s.input}
              value={form.mobile_number}
              onChangeText={t => setForm({ ...form, mobile_number: t })}
              placeholder="+1 234 567 8900"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
            />

            <Text style={s.label}>Experience Level</Text>
            <View style={s.expGrid}>
              {EXP_OPTIONS.map(opt => {
                const active = form.experience_level === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[s.expPill, active && s.expPillActive]}
                    onPress={() => setForm({ ...form, experience_level: opt })}
                  >
                    <Text style={[s.expPillText, active && s.expPillTextActive]}>
                      {EXP_LABELS[opt]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.label}>Specializations (comma separated)</Text>
            <TextInput
              style={s.input}
              value={form.specializations}
              onChangeText={t => setForm({ ...form, specializations: t })}
              placeholder="Tactics, Goalkeeping, Fitness..."
              placeholderTextColor="#666"
            />

            <Text style={s.label}>Bio</Text>
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: 'top' }]}
              value={form.bio}
              onChangeText={t => setForm({ ...form, bio: t })}
              placeholder="Tell us about your coaching philosophy..."
              placeholderTextColor="#666"
              multiline
            />

            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={saveProfile}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={s.saveBtnText}>{saving ? '⏳ Saving...' : '💾 Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── VIEW MODE ── */
          <View style={s.card}>
            <View style={s.row}>
              <Text style={s.rowKey}>Full Name</Text>
              <Text style={s.rowVal}>{coach?.full_name || '—'}</Text>
            </View>

            <View style={s.row}>
              <Text style={s.rowKey}>Email</Text>
              <Text style={s.rowVal}>{coach?.email || user?.email || '—'}</Text>
            </View>

            <View style={s.row}>
              <Text style={s.rowKey}>Club / Academy</Text>
              <Text style={s.rowVal}>{coach?.club || 'Not set'}</Text>
            </View>

            <View style={s.row}>
              <Text style={s.rowKey}>Country</Text>
              <Text style={s.rowVal}>{coach?.country || '—'}</Text>
            </View>

            <View style={s.row}>
              <Text style={s.rowKey}>Mobile Number</Text>
              <Text style={s.rowVal}>{coach?.mobile_number || 'Not set'}</Text>
            </View>

            <View style={s.row}>
              <Text style={s.rowKey}>Experience</Text>
              <Text style={[s.rowVal, { color: '#10b981', fontWeight: '700' }]}>
                {EXP_LABELS[coach?.experience_level] || '—'}
              </Text>
            </View>

            <View style={[s.row, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
              <Text style={[s.rowKey, { marginBottom: 6 }]}>Specializations</Text>
              {specs.length > 0 ? (
                <View style={s.chipWrap}>
                  {specs.map((sp, i) => (
                    <View key={i} style={s.chip}>
                      <Text style={s.chipText}>{sp}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[s.rowVal, { color: 'rgba(255,255,255,0.4)' }]}>No specializations added.</Text>
              )}
            </View>

            {coach?.bio ? (
              <View style={[s.row, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start', marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }]}>
                <Text style={[s.rowKey, { marginBottom: 6 }]}>Bio</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20 }}>{coach.bio}</Text>
              </View>
            ) : null}
          </View>
        )}

        <TouchableOpacity onPress={logout} style={s.logoutBtn} activeOpacity={0.85}>
          <Text style={s.logoutBtnText}>🚪 Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#0f0c29' },
  centerWrap:{ flex: 1, backgroundColor: '#0f0c29', alignItems: 'center', justifyContent: 'center' },
  header:    { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 50 : 20, gap: 16 },
  avatarWrap:{ width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  headerName:{ color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 2 },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 },
  verBadge:  { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  verText:   { color: '#fff', fontSize: 11, fontWeight: '600' },

  scroll:    { padding: 16, paddingBottom: 50 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  secTitle:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  editBtn:   { backgroundColor: 'rgba(16,185,129,0.2)', borderWidth: 1, borderColor: '#10b981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText:{ color: '#10b981', fontWeight: '700', fontSize: 12 },
  cancelBtn: { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: '#ef4444' },
  cancelBtnText:{ color: '#ef4444' },

  card:      { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 20 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  rowKey:    { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },
  rowVal:    { color: '#fff', fontSize: 14, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  chipWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:      { backgroundColor: 'rgba(106,17,203,0.3)', borderWidth: 1, borderColor: 'rgba(106,17,203,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  chipText:  { color: '#fff', fontSize: 12, fontWeight: '600' },

  label:     { color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'uppercase', fontWeight: '700', marginTop: 12, marginBottom: 4 },
  input:     { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 14 },
  expGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  expPill:   { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  expPillActive:{ backgroundColor: 'rgba(16,185,129,0.25)', borderColor: '#10b981' },
  expPillText:{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  expPillTextActive:{ color: '#10b981', fontWeight: '700' },

  saveBtn:   { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  saveBtnText:{ color: '#fff', fontWeight: '700', fontSize: 16 },

  logoutBtn: { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  logoutBtnText:{ color: '#fca5a5', fontSize: 15, fontWeight: '700' },
});
