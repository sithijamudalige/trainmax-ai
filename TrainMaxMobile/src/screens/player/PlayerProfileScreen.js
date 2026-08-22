// screens/player/PlayerProfileScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, TextInput, Alert, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabaseClient';
import { API_BASE } from '../../services/api';
import { C } from '../../utils/colors';

const POS_OPTIONS = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper', 'Winger'];
const FOCUS_OPTIONS = ['Dribbling', 'Shooting', 'Passing', 'Speed & Agility', 'Stamina', 'Defending'];

export default function PlayerProfileScreen() {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState({});

  const init = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUser(session.user);

      const res  = await fetch(`${API_BASE}/api/auth/profile`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.profile) {
        setProfile(data.profile);
      } else {
        // Fallback to supabase direct query
        const { data: supData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        if (supData) setProfile(supData);
      }

      const sr = await fetch(`${API_BASE}/api/chatbot/stats/${session.user.id}`);
      const sd = await sr.json().catch(() => ({}));
      if (sr.ok && sd.stats) setStats(sd.stats);
    } catch (err) {
      console.warn('Error init player profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { init(); }, [init]);

  const startEditing = () => {
    setForm({
      user_name:     profile?.user_name || user?.email?.split('@')[0] || '',
      age:           profile?.age ? String(profile.age) : '',
      mobile_number: profile?.mobile_number || '',
      country:       profile?.country || '',
      position:      profile?.position || 'Forward',
      club:          profile?.club || '',
      focused_area:  profile?.focused_area || 'Dribbling',
      height_ft:     profile?.height_ft ? String(profile.height_ft) : '',
      weight_kg:     profile?.weight_kg ? String(profile.weight_kg) : '',
    });
    setEditing(true);
  };

  const saveProfile = async () => {
    if (!form.user_name?.trim() || !form.country?.trim()) {
      Alert.alert('Validation Error', 'Username and Country are required.');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const h = parseFloat(form.height_ft);
      const w = parseFloat(form.weight_kg);
      let calculatedBmi = profile?.bmi || null;
      if (!isNaN(h) && h > 0 && !isNaN(w) && w > 0) {
        const heightM = h * 0.3048;
        calculatedBmi = parseFloat((w / (heightM * heightM)).toFixed(1));
      }

      const payload = {
        user_name:     form.user_name.trim(),
        age:           form.age ? parseInt(form.age, 10) : null,
        mobile_number: form.mobile_number ? form.mobile_number.trim() : '',
        country:       form.country.trim(),
        position:      form.position ? form.position.trim() : '',
        club:          form.club ? form.club.trim() : '',
        focused_area:  form.focused_area ? form.focused_area.trim() : '',
        height_ft:     !isNaN(h) ? h : null,
        weight_kg:     !isNaN(w) ? w : null,
        bmi:           calculatedBmi,
      };

      // 1. Update Supabase
      const { error: supErr } = await supabase
        .from('user_profiles')
        .update(payload)
        .eq('id', session.user.id);

      if (supErr) throw supErr;

      // 2. Update via Backend API if possible
      if (session?.access_token) {
        await fetch(`${API_BASE}/api/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }).catch(() => {});
      }

      setProfile({ ...profile, ...payload });
      setEditing(false);
      Alert.alert('Success ✅', 'Your player profile has been updated!');
    } catch (err) {
      Alert.alert('Error', 'Failed to save profile: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => { await supabase.auth.signOut(); };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={C.purple} />
      <Text style={{ color: C.textFaint, marginTop: 12 }}>Loading Profile...</Text>
    </View>
  );

  const rows = [
    { k: 'Username',     v: profile?.user_name },
    { k: 'Email',        v: user?.email },
    { k: 'Age',          v: profile?.age },
    { k: 'Mobile',       v: profile?.mobile_number },
    { k: 'Country',      v: profile?.country },
    { k: 'Position',     v: profile?.position },
    { k: 'Club',         v: profile?.club },
    { k: 'Focused Area', v: profile?.focused_area },
    { k: 'Height',       v: profile?.height_ft ? `${profile.height_ft} ft` : null },
    { k: 'Weight',       v: profile?.weight_kg ? `${profile.weight_kg} kg` : null },
    { k: 'BMI',          v: profile?.bmi },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#6a11cb', '#2575fc']} style={s.header}>
        <LinearGradient colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']} style={s.avatar}>
          <Text style={{ fontSize: 32 }}>👤</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={s.headerName}>{profile?.user_name || user?.email?.split('@')[0] || 'Player'}</Text>
          <Text style={s.headerSub}>
            {profile?.position || 'Football Player'}
            {profile?.club ? ` · ${profile.club}` : ''}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 50 }}>
        {stats && !editing && (
          <View style={s.statsRow}>
            {[
              { icon: '⚽', val: stats.goals_scored ?? 0, lbl: 'Goals' },
              { icon: '🤝', val: stats.assists ?? 0,       lbl: 'Assists' },
              { icon: '🏆', val: stats.wins ?? 0,          lbl: 'Wins' },
              { icon: '⭐', val: stats.motm ?? 0,          lbl: 'MoTM' },
            ].map(({ icon, val, lbl }) => (
              <View key={lbl} style={s.statBox}>
                <Text style={s.statBoxIcon}>{icon}</Text>
                <Text style={s.statBoxVal}>{val}</Text>
                <Text style={s.statBoxLbl}>{lbl}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Action Bar ── */}
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
            <Text style={s.label}>Username / Display Name *</Text>
            <TextInput
              style={s.input}
              value={form.user_name}
              onChangeText={t => setForm({ ...form, user_name: t })}
              placeholder="Enter username"
              placeholderTextColor="#666"
            />

            <View style={s.grid2}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Age</Text>
                <TextInput
                  style={s.input}
                  value={form.age}
                  onChangeText={t => setForm({ ...form, age: t })}
                  placeholder="22"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Country *</Text>
                <TextInput
                  style={s.input}
                  value={form.country}
                  onChangeText={t => setForm({ ...form, country: t })}
                  placeholder="UK, Spain..."
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            <Text style={s.label}>Mobile Number</Text>
            <TextInput
              style={s.input}
              value={form.mobile_number}
              onChangeText={t => setForm({ ...form, mobile_number: t })}
              placeholder="+1 234 567 8900"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
            />

            <Text style={s.label}>Club / Team</Text>
            <TextInput
              style={s.input}
              value={form.club}
              onChangeText={t => setForm({ ...form, club: t })}
              placeholder="Real Madrid Academy"
              placeholderTextColor="#666"
            />

            <Text style={s.label}>Position</Text>
            <View style={s.pillGrid}>
              {POS_OPTIONS.map(opt => {
                const active = form.position === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[s.pill, active && s.pillActive]}
                    onPress={() => setForm({ ...form, position: opt })}
                  >
                    <Text style={[s.pillText, active && s.pillTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.label}>Focused Skill Area</Text>
            <View style={s.pillGrid}>
              {FOCUS_OPTIONS.map(opt => {
                const active = form.focused_area === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[s.pill, active && s.pillActive]}
                    onPress={() => setForm({ ...form, focused_area: opt })}
                  >
                    <Text style={[s.pillText, active && s.pillTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={s.grid2}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Height (ft)</Text>
                <TextInput
                  style={s.input}
                  value={form.height_ft}
                  onChangeText={t => setForm({ ...form, height_ft: t })}
                  placeholder="5.10"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Weight (kg)</Text>
                <TextInput
                  style={s.input}
                  value={form.weight_kg}
                  onChangeText={t => setForm({ ...form, weight_kg: t })}
                  placeholder="72"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              </View>
            </View>

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
            {rows.map(({ k, v }) => (
              <View key={k} style={s.row}>
                <Text style={s.rowKey}>{k}</Text>
                <Text style={s.rowVal}>{v || '—'}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity onPress={logout} style={s.logoutBtn} activeOpacity={0.85}>
          <Text style={s.logoutBtnText}>🚪 Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 20, paddingTop: Platform.OS === 'android' ? 40 : 56 },
  avatar:       { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerName:   { color: '#fff', fontWeight: '800', fontSize: 20, marginBottom: 3 },
  headerSub:    { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  statsRow:     { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox:      { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 12, alignItems: 'center' },
  statBoxIcon:  { fontSize: 20, marginBottom: 4 },
  statBoxVal:   { color: C.purpleLight, fontWeight: '900', fontSize: 22 },
  statBoxLbl:   { color: C.textFaint, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },

  actionRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  secTitle:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  editBtn:      { backgroundColor: 'rgba(16,185,129,0.2)', borderWidth: 1, borderColor: '#10b981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText:  { color: '#10b981', fontWeight: '700', fontSize: 12 },
  cancelBtn:    { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: '#ef4444' },
  cancelBtnText:{ color: '#ef4444' },

  card:         { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16, marginBottom: 16 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  rowKey:       { color: C.textFaint, fontWeight: '600', fontSize: 13 },
  rowVal:       { color: '#fff', fontWeight: '600', fontSize: 13, textAlign: 'right', flex: 1, marginLeft: 16 },

  label:        { color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'uppercase', fontWeight: '700', marginTop: 12, marginBottom: 5 },
  input:        { backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#fff', fontSize: 14 },
  grid2:        { flexDirection: 'row', gap: 12 },
  pillGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  pill:         { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8 },
  pillActive:   { backgroundColor: 'rgba(16,185,129,0.25)', borderColor: '#10b981' },
  pillText:     { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600' },
  pillTextActive:{ color: '#10b981', fontWeight: '700' },

  saveBtn:      { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 22 },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },

  logoutBtn:    { backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  logoutBtnText:{ color: '#fca5a5', fontWeight: '700', fontSize: 15 },
});