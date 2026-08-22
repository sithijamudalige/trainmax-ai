// screens/coach/CoachDashboardScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, RefreshControl, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabaseClient';
import { API_BASE } from '../../services/api';
import NotificationBell from '../../components/NotificationBell';

const EXP_LABELS = {
  beginner: '🌱 Just Starting',
  junior:   '📈 1–3 Years',
  mid:      '⚽ 3–7 Years',
  senior:   '🏆 7+ Years',
};

function SectionHeading({ title }) {
  return (
    <View style={s.secHead}>
      <Text style={s.secHeadText}>{title}</Text>
      <View style={s.secLine} />
    </View>
  );
}

function Field({ label, value, valueStyle }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={[s.fieldVal, valueStyle]}>{value || '—'}</Text>
    </View>
  );
}

export default function CoachDashboardScreen({ navigation }) {
  const [coach,      setCoach]      = useState(null);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const loadCoach = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // RootNavigator handles Auth changes
        return;
      }

      const { data, error: profileErr } = await supabase
        .from('coach_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileErr || !data) {
        console.log('No coach profile found:', profileErr?.message);
        // Do nothing, RootNavigator handles Auth changes
        return;
      }
      setCoach(data);

      try {
        const statsRes = await fetch(`${API_BASE}/api/coach-chatbot/stats/${session.user.id}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats);
        }
      } catch (err) {
        console.warn('Failed to load coach stats:', err);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadCoach(); }, [loadCoach]);

  const onRefresh = () => { setRefreshing(true); loadCoach(); };

  const logout = async () => {
    await supabase.auth.signOut();
    // RootNavigator handles auth state
  };

  if (loading) return (
    <View style={s.loadingWrap}>
      <StatusBar barStyle="light-content" />
      <ActivityIndicator size="large" color="#10b981" />
      <Text style={s.loadingText}>Loading coach dashboard…</Text>
    </View>
  );

  if (error) return (
    <View style={s.loadingWrap}>
      <StatusBar barStyle="light-content" />
      <Text style={{ color: '#fca5a5', fontSize: 14 }}>⚠️ {error}</Text>
    </View>
  );

  const firstName = coach?.full_name?.split(' ')[0] || 'Coach';
  const specs     = Array.isArray(coach?.specializations) ? coach.specializations : [];

  // ── Use TAB names here, not nested stack screen names.
  // From one tab, navigation.navigate() only works with sibling tab names.
  // Your tab names are defined in CoachTabNavigator as:
  //   'Dashboard' | 'Coach AI' | 'Team' | 'Plans' | 'Profile'
  const ACTIONS = [
    {
      icon:  '⚽',
      label: 'Train Max AI',
      sub:   'AI coaching assistant',
      screen:'Coach AI',   // tab name — was 'CoachChatbot' (nested, unreachable)
      color: '#6a11cb',
    },
    {
      icon:  '👥',
      label: 'Team Creation',
      sub:   'Build & manage your team',
      screen:'Team',       // tab name — was 'CoachTeam' (nested, unreachable)
      color: '#0ea5e9',
    },
    {
      icon:  '📋',
      label: 'Training Plans',
      sub:   'Assign & track plans',
      screen:'Plans',      // tab name — was 'CoachPlans' (nested, unreachable)
      color: '#10b981',
    },
    {
      icon:  '📝',
      label: 'Notebook',
      sub:   'Match reports & notes',
      screen:'Notebook',
      color: '#ec4899',
    },
    {
      icon:  '✏️',
      label: 'Edit Profile',
      sub:   'Update credentials & bio',
      screen:'Profile',
      color: '#f59e0b',
    },
  ];

  const STATS = [
    { icon: '🏆', val: stats?.wins || 0, label: 'Wins' },
    { icon: '🤝', val: stats?.draws || 0, label: 'Draws' },
    { icon: '😞', val: stats?.losses || 0, label: 'Losses' },
    { icon: '🔥', val: stats?.win_streak || 0, label: 'Win Streak' },
    { icon: '🏅', val: EXP_LABELS[coach?.experience_level] || '—', label: 'Experience' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#0f0c29' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0c29" />

      {/* ── Top bar ── */}
      <LinearGradient
        colors={['rgba(16,185,129,0.3)', 'rgba(15,12,41,0)']}
        style={s.topBar}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.topTitle}>🏆 Coach Dashboard</Text>
          <Text style={s.topSub}>Train Max AI · Coach Portal</Text>
        </View>
        <NotificationBell />
        <TouchableOpacity onPress={logout} style={s.logoutBtn}>
          <Text style={{ fontSize: 18 }}>🚪</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Welcome banner ── */}
        <View style={s.welcome}>
          <Text style={{ fontSize: 44, marginBottom: 10 }}>🏆</Text>
          <Text style={s.welcomeTitle}>
            Welcome back,{' '}
            <Text style={{ color: '#10b981' }}>{firstName}!</Text>
          </Text>
          <Text style={s.welcomeSub}>
            Your coach dashboard is ready.
            {coach?.club ? ` Coaching at ${coach.club}.` : ''}
            {' '}Use the tools below to manage your team and players.
          </Text>
        </View>

        {/* ── Quick action cards ── */}
        <SectionHeading title="⚡ Quick Actions" />
        {ACTIONS.map(a => (
          <TouchableOpacity
            key={a.screen}
            style={s.actionCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(a.screen)}
          >
            <View style={[
              s.actionIconWrap,
              { backgroundColor: a.color + '22', borderColor: a.color + '55' },
            ]}>
              <Text style={{ fontSize: 26 }}>{a.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionLabel}>{a.label}</Text>
              <Text style={s.actionSub}>{a.sub}</Text>
            </View>
            <Text style={s.actionArrow}>›</Text>
          </TouchableOpacity>
        ))}

        {/* ── Stats overview ── */}
        <SectionHeading title="📊 Overview" />
        <View style={s.statsGrid}>
          {STATS.map((st, i) => (
            <View key={i} style={s.statCard}>
              <Text style={{ fontSize: 22, marginBottom: 6 }}>{st.icon}</Text>
              <Text style={s.statVal} numberOfLines={2}>{st.val}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Coach profile ── */}
        <SectionHeading title="📋 Coach Profile" />
        <View style={s.panel}>
          <Field label="Full Name"     value={coach?.full_name} />
          <View style={s.divider} />
          <Field label="Email"         value={coach?.email} />
          <View style={s.divider} />
          <Field label="Club / Academy" value={coach?.club || 'Not set'} />
          <View style={s.divider} />
          <Field label="Country"       value={coach?.country} />
          <View style={s.divider} />
          <Field label="Mobile"        value={coach?.mobile_number || 'Not set'} />
          <View style={s.divider} />
          <View style={s.field}>
            <Text style={s.fieldLabel}>Experience</Text>
            <View style={s.expBadge}>
              <Text style={s.expText}>{EXP_LABELS[coach?.experience_level] || '—'}</Text>
            </View>
          </View>
          {coach?.bio ? (
            <>
              <View style={s.divider} />
              <Field
                label="Bio"
                value={coach.bio}
                valueStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 18 }}
              />
            </>
          ) : null}
        </View>

        {/* ── Specializations ── */}
        <SectionHeading title="🎯 Specializations" />
        <View style={s.panel}>
          {specs.length > 0 ? (
            <View style={s.chipsWrap}>
              {specs.map(sp => (
                <View key={sp} style={s.chip}>
                  <Text style={s.chipText}>{sp}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
              No specializations set.
            </Text>
          )}
        </View>

        {/* ── Account status ── */}
        <SectionHeading title="📞 Account Status" />
        <View style={s.panel}>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Verification</Text>
            {coach?.is_verified
              ? <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 14 }}>✅ Verified Coach</Text>
              : <Text style={{ color: '#fbbf24', fontWeight: '700', fontSize: 14 }}>⏳ Pending Verification</Text>
            }
          </View>
        </View>

        {/* ── Coming soon ── */}
        <View style={s.comingSoon}>
          <Text style={{ fontSize: 36, marginBottom: 10 }}>🚧</Text>
          <Text style={s.comingTitle}>More Features Coming Soon</Text>
          <Text style={s.comingSub}>
            Player management, training plan assignment, match analysis,
            and performance tracking tools are on the way.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  loadingWrap:     { flex:1, backgroundColor:'#0f0c29', alignItems:'center', justifyContent:'center', gap:14 },
  loadingText:     { color:'rgba(255,255,255,0.4)', fontSize:13 },

  topBar:          { paddingTop: Platform.OS === 'android' ? 36 : 52, paddingHorizontal:20, paddingBottom:16, flexDirection:'row', alignItems:'center' },
  topTitle:        { color:'#fff', fontSize:20, fontWeight:'800' },
  topSub:          { color:'rgba(255,255,255,0.4)', fontSize:11, marginTop:2 },
  logoutBtn:       { padding:8, backgroundColor:'rgba(239,68,68,0.12)', borderRadius:10, borderWidth:1, borderColor:'rgba(239,68,68,0.2)' },

  welcome:         { backgroundColor:'rgba(16,185,129,0.08)', borderWidth:1, borderColor:'rgba(16,185,129,0.2)', borderRadius:18, padding:22, marginBottom:20, alignItems:'center' },
  welcomeTitle:    { color:'#fff', fontSize:22, fontWeight:'800', marginBottom:6, textAlign:'center' },
  welcomeSub:      { color:'rgba(255,255,255,0.5)', fontSize:13, lineHeight:19, textAlign:'center' },

  actionCard:      { backgroundColor:'rgba(255,255,255,0.05)', borderWidth:1, borderColor:'rgba(255,255,255,0.1)', borderRadius:14, padding:16, marginBottom:10, flexDirection:'row', alignItems:'center', gap:14 },
  actionIconWrap:  { width:50, height:50, borderRadius:14, alignItems:'center', justifyContent:'center', borderWidth:1, flexShrink:0 },
  actionLabel:     { color:'#fff', fontWeight:'700', fontSize:15, marginBottom:3 },
  actionSub:       { color:'rgba(255,255,255,0.4)', fontSize:12 },
  actionArrow:     { color:'rgba(255,255,255,0.25)', fontSize:26, fontWeight:'300' },

  statsGrid:       { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:14 },
  statCard:        { flex:1, minWidth:'45%', backgroundColor:'rgba(255,255,255,0.05)', borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderRadius:14, padding:14 },
  statVal:         { color:'#10b981', fontSize:18, fontWeight:'800', lineHeight:22, marginBottom:4 },
  statLabel:       { color:'rgba(255,255,255,0.4)', fontSize:10, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.8 },

  panel:           { backgroundColor:'rgba(255,255,255,0.05)', borderRadius:14, borderWidth:1, borderColor:'rgba(255,255,255,0.08)', padding:16, marginBottom:14 },
  field:           { paddingVertical:4 },
  fieldLabel:      { color:'rgba(255,255,255,0.38)', fontSize:10, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.7, marginBottom:4 },
  fieldVal:        { color:'rgba(255,255,255,0.85)', fontSize:14, fontWeight:'500' },
  divider:         { height:1, backgroundColor:'rgba(255,255,255,0.07)', marginVertical:10 },

  expBadge:        { backgroundColor:'rgba(245,158,11,0.12)', borderWidth:1, borderColor:'rgba(245,158,11,0.3)', borderRadius:20, paddingHorizontal:12, paddingVertical:4, alignSelf:'flex-start', marginTop:4 },
  expText:         { color:'#fbbf24', fontSize:12, fontWeight:'600' },

  chipsWrap:       { flexDirection:'row', flexWrap:'wrap', gap:8 },
  chip:            { backgroundColor:'rgba(16,185,129,0.12)', borderWidth:1, borderColor:'rgba(16,185,129,0.25)', borderRadius:20, paddingHorizontal:13, paddingVertical:5 },
  chipText:        { color:'#10b981', fontSize:12 },

  comingSoon:      { backgroundColor:'rgba(255,255,255,0.03)', borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderStyle:'dashed', borderRadius:18, padding:32, alignItems:'center', marginTop:4 },
  comingTitle:     { color:'#fff', fontWeight:'800', fontSize:18, marginBottom:8 },
  comingSub:       { color:'rgba(255,255,255,0.38)', fontSize:12, lineHeight:18, textAlign:'center' },

  secHead:         { flexDirection:'row', alignItems:'center', gap:10, marginBottom:12, marginTop:8 },
  secHeadText:     { color:'rgba(255,255,255,0.45)', fontSize:10, fontWeight:'700', textTransform:'uppercase', letterSpacing:1.5 },
  secLine:         { flex:1, height:1, backgroundColor:'rgba(255,255,255,0.07)' },
});