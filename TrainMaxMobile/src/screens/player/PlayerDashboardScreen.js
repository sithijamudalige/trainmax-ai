import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabaseClient';
import { API_BASE } from '../../services/api';
import { C } from '../../utils/colors';
import NotificationBell from '../../components/NotificationBell';

function diffColor(d) {
  if (!d) return C.green;
  const l = d.toLowerCase();
  if (l.includes('adv')) return '#ef4444';
  if (l.includes('int')) return '#f59e0b';
  return '#10b981';
}

function getSkillLevel(profile) {
  const club = (profile?.club || '').toLowerCase();
  const pros  = ['barcelona','real madrid','manchester','chelsea','juventus','liverpool'];
  if (pros.some(c => club.includes(c))) return { label:'Advanced',     color:'#ef4444', pct:90 };
  if (club && !['none','-',''].includes(club)) return { label:'Intermediate', color:'#f59e0b', pct:55 };
  return { label:'Beginner', color:'#10b981', pct:20 };
}

function getBmiStatus(profile) {
  const b = parseFloat(profile?.bmi);
  if (!b) return null;
  if (b < 18.5) return { label:'Underweight', color:'#60a5fa', pct:20 };
  if (b < 25)   return { label:'Normal ✓',    color:'#10b981', pct:60 };
  if (b < 30)   return { label:'Overweight',  color:'#f59e0b', pct:78 };
  return              { label:'Obese',         color:'#ef4444', pct:95 };
}

function StatCard({ icon, label, value, sub, live }) {
  return (
    <View style={s.statCard}>
      {live && <View style={s.liveDot} />}
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={s.statValue}>{value ?? 0}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {sub ? <Text style={s.statSub}>{sub}</Text> : null}
    </View>
  );
}

function SectionHeading({ title }) {
  return (
    <View style={s.secHead}>
      <Text style={s.secHeadText}>{title}</Text>
      <View style={s.secLine} />
    </View>
  );
}

function ProgressBar({ pct, color }) {
  return (
    <View style={s.progressWrap}>
      <View style={[s.progressFill, { width:`${Math.min(pct,100)}%`, backgroundColor:color }]} />
    </View>
  );
}

function PlanCard({ plan }) {
  return (
    <View style={s.planCard}>
      <LinearGradient colors={['#6a11cb','#2575fc']} style={s.planIcon}>
        <Text style={{ fontSize:20 }}>📋</Text>
      </LinearGradient>
      <View style={{ flex:1 }}>
        <Text style={s.planTitle} numberOfLines={1}>{plan.title}</Text>
        <Text style={s.planMeta}>⏱ {plan.duration} · 📅 {Array.isArray(plan.days)?plan.days.length:0} days</Text>
        <Text style={s.planMeta}>🗓 {new Date(plan.saved_at).toLocaleDateString()}</Text>
      </View>
      <View style={[s.diffBadge, { backgroundColor:diffColor(plan.difficulty) }]}>
        <Text style={s.diffText}>{plan.difficulty}</Text>
      </View>
    </View>
  );
}

function AchCard({ ach }) {
  return (
    <View style={s.achCard}>
      <LinearGradient colors={['#6a11cb','#2575fc']} style={s.achIcon}>
        <Text style={{ fontSize:22 }}>{ach.icon}</Text>
      </LinearGradient>
      <View style={{ flex:1 }}>
        <Text style={s.achTitle}>{ach.title}</Text>
        <Text style={s.achDesc}>{ach.desc}</Text>
        <Text style={s.achDate}>{new Date(ach.unlocked_at).toLocaleDateString()}</Text>
      </View>
    </View>
  );
}

const TABS = [
  { id:'overview',     label:'Overview',  icon:'📊' },
  { id:'stats',        label:'Stats',     icon:'⚽' },
  { id:'achievements', label:'Awards',    icon:'🏆' },
  { id:'memory',       label:'Memory',    icon:'🧠' },
  { id:'plans',        label:'Plans',     icon:'📋' },
  { id:'profile',      label:'Profile',   icon:'👤' },
];

export default function PlayerDashboardScreen({ navigation }) {
  const [user,         setUser]         = useState(null);
  const [profile,      setProfile]      = useState(null);
  const [stats,        setStats]        = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [matchLog,     setMatchLog]     = useState([]);
  const [plans,        setPlans]        = useState([]);
  const [memory,       setMemory]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [activeTab,    setActiveTab]    = useState('overview');
  const [lastRefreshed,setLastRefreshed]= useState(null);
  const [flaskOnline,  setFlaskOnline]  = useState(true);

  const fetchWithTimeout = async (url, ms = 8000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  };

  const loadStats = useCallback(async uid => {
    try {
      const res  = await fetchWithTimeout(`${API_BASE}/api/chatbot/stats/${uid}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStats(data.stats || null);
        setAchievements(data.achievements || []);
        setMatchLog(data.match_log || []);
        setLastRefreshed(new Date());
        setFlaskOnline(true);
      }
    } catch (e) {
      console.log('loadStats failed:', e.message);
      setFlaskOnline(false);
    }
  }, []);

  const loadPlans = useCallback(async uid => {
    try {
      const res  = await fetchWithTimeout(`${API_BASE}/api/training-plan/list/${uid}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) setPlans(data.plans || []);
    } catch (e) {
      console.log('loadPlans failed:', e.message);
    }
  }, []);

  const loadMemory = useCallback(async uid => {
    try {
      const res  = await fetchWithTimeout(`${API_BASE}/api/chatbot/memory/${uid}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) setMemory(data);
    } catch (e) {
      console.log('loadMemory failed:', e.message);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setLoading(false); return; }
        setUser(session.user);

        // Load profile directly from Supabase — always works even without Flask
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profileData) setProfile(profileData);

        // Load Flask data — will timeout gracefully if Flask is unreachable
        await Promise.allSettled([
          loadStats(session.user.id),
          loadPlans(session.user.id),
          loadMemory(session.user.id),
        ]);
      } catch (e) {
        console.log('Dashboard init error:', e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [loadStats, loadPlans, loadMemory]);

  // ── Auto-refresh every 30 s ───────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => loadStats(user.id), 30000);
    return () => clearInterval(interval);
  }, [user, loadStats]);

  const onRefresh = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await Promise.allSettled([
      loadStats(user.id),
      loadPlans(user.id),
      loadMemory(user.id),
    ]);
    setRefreshing(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return (
    <View style={{ flex:1, backgroundColor:C.bg, alignItems:'center', justifyContent:'center' }}>
      <StatusBar barStyle="light-content" />
      <ActivityIndicator size="large" color={C.purple} />
      <Text style={{ color:C.textFaint, marginTop:14, fontSize:13 }}>Loading dashboard…</Text>
    </View>
  );

  const winRate = stats?.matches_played > 0
    ? Math.round((stats.wins / stats.matches_played) * 100) : 0;
  const skill = profile ? getSkillLevel(profile) : null;
  const bmi   = profile ? getBmiStatus(profile)  : null;

  const totalSessions = memory?.history?.length    || 0;
  const goalsNoted    = memory?.goals?.length       || 0;
  const injuriesNoted = memory?.injuries?.length    || 0;
  const topicsCovered = memory?.last_topics         || [];
  const keyFacts      = memory?.key_facts           || [];
  const recentHistory = memory?.history?.slice(-5).reverse() || [];

  return (
    <View style={{ flex:1, backgroundColor:C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Hero */}
      <LinearGradient
        colors={['rgba(106,17,203,0.5)','rgba(37,117,252,0.3)','transparent']}
        style={s.hero}
      >
        <View style={s.heroRow}>
          <LinearGradient colors={['#6a11cb','#2575fc']} style={s.avatar}>
            <Text style={{ fontSize:28 }}>⚽</Text>
          </LinearGradient>
          <View style={{ flex:1 }}>
            <Text style={s.heroName}>
              {profile?.user_name || user?.email?.split('@')[0] || 'Player'} 👋
            </Text>
            <Text style={s.heroSub}>
              {profile?.position || 'Football Player'}
              {profile?.club ? ` · ${profile.club}` : ''}
            </Text>
          </View>
          <NotificationBell />
          <TouchableOpacity onPress={logout} style={s.logoutBtn}>
            <Text style={{ fontSize:18 }}>🚪</Text>
          </TouchableOpacity>
        </View>

        <View style={s.heroActions}>
          <TouchableOpacity
            style={s.heroBtnPrimary}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Chatbot')}
          >
            <Text style={s.heroBtnPrimaryText}>⚽ Train with MAX</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.heroBtnGhost}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Plans')}
          >
            <Text style={s.heroBtnGhostText}>📋 My Plans</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.heroBtnGhost}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={s.heroBtnGhostText}>✏️ Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Flask offline warning */}
      {!flaskOnline && (
        <View style={s.offlineBanner}>
          <Text style={s.offlineText}>⚠️ Flask server unreachable. Stats need Flask running at {API_BASE}</Text>
        </View>
      )}

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabBar}
        contentContainerStyle={{ paddingHorizontal:12 }}
      >
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[s.tab, activeTab===t.id && s.tabActive]}
            onPress={() => setActiveTab(t.id)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, activeTab===t.id && s.tabTextActive]}>
              {t.icon} {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Refresh strip */}
      <View style={s.refreshBar}>
        <View style={[s.liveDotSmall, { backgroundColor: flaskOnline ? C.green : '#f59e0b' }]} />
        <Text style={s.refreshText}>
          {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString()}` : flaskOnline ? 'Loading…' : 'Flask offline'}
        </Text>
        <TouchableOpacity onPress={onRefresh} style={s.refreshBtn} disabled={refreshing}>
          <Text style={s.refreshBtnText}>{refreshing ? '⏳' : '🔄'} Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex:1 }}
        contentContainerStyle={{ padding:16, paddingBottom:32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />
        }
        showsVerticalScrollIndicator={false}
      >

        {/* ══ OVERVIEW ══ */}
        {activeTab === 'overview' && (
          <>
            <SectionHeading title="📈 Live Stats" />
            <View style={s.grid2}>
              <StatCard icon="⚽" label="Goals"        value={stats?.goals_scored} sub={`${stats?.assists??0} assists`} live />
              <StatCard icon="🏆" label="Wins"          value={stats?.wins}         sub={`${winRate}% win rate`}        live />
              <StatCard icon="🏅" label="Achievements"  value={achievements.length} />
              <StatCard icon="📋" label="Plans"         value={plans.length} />
            </View>

            <View style={s.grid2}>
              <StatCard icon="🤝" label="Assists"       value={stats?.assists}      live />
              <StatCard icon="⭐" label="Man of Match"  value={stats?.motm}         live />
              <StatCard icon="🧱" label="Clean Sheets"  value={stats?.clean_sheets} live />
              <StatCard icon="🔥" label="Best Streak"   value={stats?.win_streak}   live />
            </View>

            {skill && (
              <>
                <SectionHeading title="⚡ Skill Level" />
                <View style={s.glassCard}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:8 }}>
                    <Text style={{ color:'#fff', fontWeight:'800', fontSize:18 }}>{skill.label}</Text>
                    <Text style={{ color:skill.color, fontWeight:'900', fontSize:18 }}>{skill.pct}%</Text>
                  </View>
                  <ProgressBar pct={skill.pct} color={skill.color} />
                  <Text style={s.cardSub}>Club: {profile?.club || 'Not set'}</Text>
                </View>
              </>
            )}

            {bmi && (
              <>
                <SectionHeading title="📊 BMI" />
                <View style={s.glassCard}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:8 }}>
                    <Text style={{ color:'#fff', fontWeight:'800', fontSize:18 }}>{profile?.bmi}</Text>
                    <Text style={{ color:bmi.color, fontWeight:'700' }}>{bmi.label}</Text>
                  </View>
                  <ProgressBar pct={bmi.pct} color={bmi.color} />
                  <Text style={s.cardSub}>{profile?.height_ft}ft · {profile?.weight_kg}kg</Text>
                </View>
              </>
            )}

            {stats?.matches_played > 0 && (
              <>
                <SectionHeading title="📊 Match Record" />
                <View style={s.glassCard}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:10 }}>
                    <Text style={{ color:'#10b981', fontWeight:'700' }}>W {stats.wins}</Text>
                    <Text style={{ color:'#f59e0b', fontWeight:'700' }}>D {stats.draws}</Text>
                    <Text style={{ color:'#ef4444', fontWeight:'700' }}>L {stats.losses}</Text>
                    <Text style={{ color:C.textFaint }}>{stats.matches_played} · {winRate}%</Text>
                  </View>
                  <View style={s.matchBar}>
                    <View style={[s.matchSeg, { flex:stats.wins||0,   backgroundColor:'#10b981' }]} />
                    <View style={[s.matchSeg, { flex:stats.draws||0,  backgroundColor:'#f59e0b' }]} />
                    <View style={[s.matchSeg, { flex:stats.losses||0, backgroundColor:'#ef4444' }]} />
                  </View>
                </View>
              </>
            )}

            {achievements.length > 0 && (
              <>
                <SectionHeading title="🏆 Recent Achievements" />
                {achievements.slice(-3).reverse().map(a => <AchCard key={a.id} ach={a} />)}
              </>
            )}

            {plans.length > 0 && (
              <>
                <SectionHeading title="📋 Recent Plans" />
                {plans.slice(0,3).map(p => <PlanCard key={p.id} plan={p} />)}
              </>
            )}

            {!stats?.matches_played && flaskOnline && (
              <View style={s.glassCard}>
                <Text style={{ color:C.textFaint, textAlign:'center', fontSize:32, marginBottom:10 }}>⚽</Text>
                <Text style={{ color:C.textMid, textAlign:'center', fontWeight:'700', marginBottom:6 }}>No match stats yet</Text>
                <Text style={{ color:C.textFaint, textAlign:'center', fontSize:13 }}>
                  Tell MAX: "I scored 2 goals today" or "We won 3-1"
                </Text>
              </View>
            )}
          </>
        )}

        {/* ══ STATS ══ */}
        {activeTab === 'stats' && (
          <>
            <SectionHeading title="⚽ Match Statistics" />
            <View style={s.grid2}>
              {[
                { icon:'⚽', label:'Goals',       val:stats?.goals_scored  },
                { icon:'🤝', label:'Assists',      val:stats?.assists       },
                { icon:'🧱', label:'Clean Sheets', val:stats?.clean_sheets  },
                { icon:'⭐', label:'Man of Match', val:stats?.motm          },
                { icon:'🏆', label:'Wins',         val:stats?.wins          },
                { icon:'🤝', label:'Draws',        val:stats?.draws         },
                { icon:'😞', label:'Losses',       val:stats?.losses        },
                { icon:'🎩', label:'Hat Tricks',   val:stats?.hat_trick     },
              ].map(({ icon, label, val }) => (
                <StatCard key={label} icon={icon} label={label} value={val} live />
              ))}
            </View>

            {stats?.matches_played > 0 && (
              <View style={s.glassCard}>
                <Text style={s.cardTitle}>{stats.matches_played} matches · {winRate}% win rate</Text>
                <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:10 }}>
                  <Text style={{ color:'#10b981', fontWeight:'700' }}>W {stats.wins}</Text>
                  <Text style={{ color:'#f59e0b', fontWeight:'700' }}>D {stats.draws}</Text>
                  <Text style={{ color:'#ef4444', fontWeight:'700' }}>L {stats.losses}</Text>
                </View>
                <View style={s.matchBar}>
                  <View style={[s.matchSeg,{flex:stats.wins||0,  backgroundColor:'#10b981'}]}/>
                  <View style={[s.matchSeg,{flex:stats.draws||0, backgroundColor:'#f59e0b'}]}/>
                  <View style={[s.matchSeg,{flex:stats.losses||0,backgroundColor:'#ef4444'}]}/>
                </View>
              </View>
            )}

            <SectionHeading title="📋 Match Log" />
            {matchLog.length > 0 ? (
              [...matchLog].reverse().map((entry, i) => (
                <View key={i} style={s.matchItem}>
                  <Text style={s.matchDate}>{new Date(entry.date).toLocaleDateString()}</Text>
                  <Text style={s.matchMsg}>{entry.message}</Text>
                  <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginTop:6 }}>
                    {entry.changes?.goals_scored && <View style={s.chip}><Text style={s.chipText}>⚽ +{entry.changes.goals_scored}</Text></View>}
                    {entry.changes?.wins         && <View style={[s.chip,{backgroundColor:'rgba(16,185,129,0.2)',borderColor:'rgba(16,185,129,0.3)'}]}><Text style={[s.chipText,{color:'#6ee7b7'}]}>🏆 Win</Text></View>}
                    {entry.changes?.losses       && <View style={[s.chip,{backgroundColor:'rgba(239,68,68,0.2)',borderColor:'rgba(239,68,68,0.3)'}]}><Text style={[s.chipText,{color:'#fca5a5'}]}>😞 Loss</Text></View>}
                    {entry.changes?.clean_sheets && <View style={s.chip}><Text style={s.chipText}>🧱 CS</Text></View>}
                    {entry.changes?.motm         && <View style={s.chip}><Text style={s.chipText}>⭐ MoTM</Text></View>}
                  </View>
                </View>
              ))
            ) : (
              <View style={s.empty}>
                <Text style={s.emptyText}>No match data yet. Tell MAX your results!</Text>
              </View>
            )}
          </>
        )}

        {/* ══ ACHIEVEMENTS ══ */}
        {activeTab === 'achievements' && (
          <>
            <View style={s.glassCard}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:8 }}>
                <Text style={{ color:C.purpleLight, fontWeight:'700' }}>Overall Progress</Text>
                <Text style={{ color:C.textFaint }}>{Math.round((achievements.length/20)*100)}%</Text>
              </View>
              <ProgressBar pct={(achievements.length/20)*100} color={C.purple} />
              <Text style={[s.cardSub,{marginTop:6}]}>{achievements.length} / 20 unlocked</Text>
            </View>

            <SectionHeading title="🏆 Your Achievements" />
            {achievements.length > 0
              ? achievements.map(a => <AchCard key={a.id} ach={a} />)
              : <View style={s.empty}><Text style={s.emptyText}>No achievements yet. Chat with MAX and share match results!</Text></View>
            }

            <SectionHeading title="💡 How to Unlock" />
            <View style={s.glassCard}>
              {[
                '"I scored 2 goals today" → goal achievements',
                '"We won 3-1" → win achievements',
                '"I got man of the match" → MoTM badge',
                '"I got an assist" → assist badge',
                '"Clean sheet today" → clean sheet badge',
              ].map((tip, i) => (
                <View key={i} style={{ paddingVertical:9, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.05)' }}>
                  <Text style={{ color:C.textMid, fontSize:13 }}>💡 {tip}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ══ MEMORY ══ */}
        {activeTab === 'memory' && (
          <>
            <View style={s.grid2}>
              <StatCard icon="💬" label="Exchanges"   value={totalSessions}        sub="With MAX" />
              <StatCard icon="🎯" label="Goals Noted" value={goalsNoted}           sub="By MAX"  />
              <StatCard icon="🩹" label="Injuries"    value={injuriesNoted}        sub="Tracked" />
              <StatCard icon="📚" label="Topics"      value={topicsCovered.length} sub="Trained" />
            </View>

            <SectionHeading title="🎯 Your Goals" />
            {memory?.goals?.length > 0
              ? memory.goals.map((g,i) => <View key={i} style={s.memItem}><Text style={s.memIcon}>🎯</Text><Text style={s.memText}>{g}</Text></View>)
              : <View style={s.empty}><Text style={s.emptyText}>Tell MAX what you want to improve!</Text></View>
            }

            <SectionHeading title="🩹 Injuries" />
            {memory?.injuries?.length > 0
              ? memory.injuries.map((inj,i) => <View key={i} style={[s.memItem,{borderColor:'rgba(239,68,68,0.2)',backgroundColor:'rgba(239,68,68,0.05)'}]}><Text style={s.memIcon}>🩹</Text><Text style={s.memText}>{inj}</Text></View>)
              : <View style={s.empty}><Text style={s.emptyText}>No injuries noted. Stay healthy! 💪</Text></View>
            }

            {keyFacts.length > 0 && (
              <>
                <SectionHeading title="💡 Key Facts" />
                {keyFacts.map((f,i) => <View key={i} style={[s.memItem,{borderColor:'rgba(167,139,250,0.2)',backgroundColor:'rgba(167,139,250,0.05)'}]}><Text style={s.memIcon}>💡</Text><Text style={s.memText}>{f}</Text></View>)}
              </>
            )}

            <SectionHeading title="📚 Topics Trained" />
            <View style={s.glassCard}>
              {topicsCovered.length > 0
                ? <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
                    {topicsCovered.map(t => <View key={t} style={s.topicPill}><Text style={s.topicText}>🎯 {t}</Text></View>)}
                  </View>
                : <Text style={{ color:C.textFaint, textAlign:'center', padding:16 }}>Ask MAX about specific skills!</Text>
              }
            </View>

            <SectionHeading title="💬 Recent Conversations" />
            {recentHistory.length > 0
              ? recentHistory.map((h,i) => (
                  <View key={i} style={s.histItem}>
                    <Text style={s.histQ}>👤 {h.q}</Text>
                    <Text style={s.histA}>⚽ {h.a?.slice(0,200)}{h.a?.length>200?'…':''}</Text>
                  </View>
                ))
              : <View style={s.empty}><Text style={s.emptyText}>No conversations yet. Start chatting with MAX!</Text></View>
            }
          </>
        )}

        {/* ══ PLANS ══ */}
        {activeTab === 'plans' && (
          <>
            <SectionHeading title="📋 All Training Plans" />
            {plans.length === 0
              ? <View style={s.empty}>
                  <Text style={{ fontSize:40, marginBottom:12, textAlign:'center' }}>📋</Text>
                  <Text style={[s.emptyText,{fontWeight:'700',fontSize:15,marginBottom:6}]}>No plans yet</Text>
                  <Text style={s.emptyText}>Chat with MAX and tap "Extract Plan"</Text>
                  <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('Chatbot')}>
                    <Text style={s.emptyBtnText}>⚽ Start Coaching</Text>
                  </TouchableOpacity>
                </View>
              : plans.map(p => <PlanCard key={p.id} plan={p} />)
            }
          </>
        )}

        {/* ══ PROFILE ══ */}
        {activeTab === 'profile' && (
          <>
            <SectionHeading title="👤 Personal Info" />
            <View style={s.glassCard}>
              {[
                { k:'Username', v:profile?.user_name    },
                { k:'Email',    v:user?.email            },
                { k:'Age',      v:profile?.age           },
                { k:'Mobile',   v:profile?.mobile_number },
                { k:'Country',  v:profile?.country       },
              ].map(({ k, v }) => (
                <View key={k} style={s.profRow}>
                  <Text style={s.profKey}>{k}</Text>
                  <Text style={s.profVal}>{v || '—'}</Text>
                </View>
              ))}
            </View>

            <SectionHeading title="⚽ Football Profile" />
            <View style={s.glassCard}>
              {[
                { k:'Position',     v:profile?.position    },
                { k:'Club',         v:profile?.club        },
                { k:'Focused Area', v:profile?.focused_area},
                { k:'Height',       v:profile?.height_ft ? `${profile.height_ft} ft` : null },
                { k:'Weight',       v:profile?.weight_kg ? `${profile.weight_kg} kg` : null },
                { k:'BMI',          v:profile?.bmi ? `${profile.bmi} (${bmi?.label||''})` : null },
              ].map(({ k, v }) => (
                <View key={k} style={s.profRow}>
                  <Text style={s.profKey}>{k}</Text>
                  <Text style={[s.profVal, k==='BMI'&&bmi?{color:bmi.color}:{}]}>{v || '—'}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity onPress={logout} style={s.logoutBtnFull} activeOpacity={0.85}>
              <Text style={s.logoutBtnFullText}>🚪 Logout</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  hero:          { paddingTop:52, paddingHorizontal:20, paddingBottom:16 },
  heroRow:       { flexDirection:'row', alignItems:'center', gap:14, marginBottom:14 },
  avatar:        { width:56, height:56, borderRadius:16, alignItems:'center', justifyContent:'center', flexShrink:0 },
  heroName:      { color:'#fff', fontSize:18, fontWeight:'800', marginBottom:2 },
  heroSub:       { color:C.textMid, fontSize:12 },
  logoutBtn:     { padding:8, backgroundColor:'rgba(239,68,68,0.12)', borderRadius:10, borderWidth:1, borderColor:'rgba(239,68,68,0.2)' },
  heroActions:   { flexDirection:'row', gap:10 },
  heroBtnPrimary:    { flex:1, backgroundColor:'#6a11cb', borderRadius:12, paddingVertical:11, alignItems:'center' },
  heroBtnPrimaryText:{ color:'#fff', fontWeight:'700', fontSize:13 },
  heroBtnGhost:      { flex:1, backgroundColor:'rgba(255,255,255,0.07)', borderRadius:12, paddingVertical:11, alignItems:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.12)' },
  heroBtnGhostText:  { color:C.textMid, fontWeight:'700', fontSize:13 },

  offlineBanner: { backgroundColor:'rgba(245,158,11,0.15)', borderBottomWidth:1, borderBottomColor:'rgba(245,158,11,0.3)', padding:10, paddingHorizontal:16 },
  offlineText:   { color:'#fbbf24', fontSize:11, textAlign:'center' },

  tabBar:     { backgroundColor:'rgba(0,0,0,0.25)', borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.06)', maxHeight:46, flexGrow:0 },
  tab:        { paddingHorizontal:14, paddingVertical:12, borderBottomWidth:3, borderBottomColor:'transparent' },
  tabActive:  { borderBottomColor:'#6a11cb' },
  tabText:    { color:C.textFaint, fontSize:11, fontWeight:'600' },
  tabTextActive:{ color:C.purpleLight },

  refreshBar:     { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(0,0,0,0.15)', paddingHorizontal:16, paddingVertical:5, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.04)', gap:8 },
  liveDotSmall:   { width:6, height:6, borderRadius:3 },
  refreshText:    { color:'rgba(255,255,255,0.25)', fontSize:10, flex:1 },
  refreshBtn:     { backgroundColor:'rgba(106,17,203,0.2)', borderRadius:7, paddingHorizontal:10, paddingVertical:3, borderWidth:1, borderColor:'rgba(106,17,203,0.25)' },
  refreshBtnText: { color:C.purpleLight, fontSize:10, fontWeight:'700' },

  grid2:       { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:14 },
  statCard:    { flex:1, minWidth:'45%', backgroundColor:'rgba(255,255,255,0.05)', borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderRadius:14, padding:14, position:'relative' },
  statIcon:    { fontSize:22, marginBottom:6 },
  statValue:   { fontSize:28, fontWeight:'900', color:C.purpleLight },
  statLabel:   { color:C.textFaint, fontSize:10, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.8, marginTop:2 },
  statSub:     { color:'rgba(255,255,255,0.25)', fontSize:10, marginTop:3 },
  liveDot:     { position:'absolute', top:10, right:10, width:7, height:7, borderRadius:4, backgroundColor:C.green },

  glassCard:   { backgroundColor:'rgba(255,255,255,0.05)', borderRadius:14, borderWidth:1, borderColor:'rgba(255,255,255,0.08)', padding:16, marginBottom:14 },
  cardTitle:   { color:C.textFaint, fontSize:10, fontWeight:'700', textTransform:'uppercase', letterSpacing:1, marginBottom:10 },
  cardSub:     { color:'rgba(255,255,255,0.25)', fontSize:11, marginTop:6 },

  progressWrap:{ backgroundColor:'rgba(255,255,255,0.08)', borderRadius:8, height:8, overflow:'hidden' },
  progressFill:{ height:8, borderRadius:8 },

  matchBar:    { flexDirection:'row', height:12, borderRadius:8, overflow:'hidden', backgroundColor:'rgba(255,255,255,0.05)' },
  matchSeg:    { height:12 },

  matchItem:   { backgroundColor:'rgba(255,255,255,0.03)', borderRadius:10, padding:12, marginBottom:8, borderWidth:1, borderColor:'rgba(255,255,255,0.06)' },
  matchDate:   { color:'rgba(255,255,255,0.25)', fontSize:11, marginBottom:4 },
  matchMsg:    { color:C.textMid, fontSize:13 },
  chip:        { backgroundColor:'rgba(106,17,203,0.2)', borderRadius:20, paddingHorizontal:10, paddingVertical:3, borderWidth:1, borderColor:'rgba(106,17,203,0.3)' },
  chipText:    { color:C.purpleLight, fontSize:11, fontWeight:'600' },

  planCard:    { backgroundColor:'rgba(255,255,255,0.04)', borderRadius:12, borderWidth:1, borderColor:'rgba(255,255,255,0.07)', padding:14, marginBottom:10, flexDirection:'row', alignItems:'center', gap:12 },
  planIcon:    { width:44, height:44, borderRadius:12, alignItems:'center', justifyContent:'center', flexShrink:0 },
  planTitle:   { color:'#fff', fontWeight:'700', fontSize:14, marginBottom:3 },
  planMeta:    { color:C.textFaint, fontSize:11 },
  diffBadge:   { borderRadius:20, paddingHorizontal:10, paddingVertical:4 },
  diffText:    { color:'#fff', fontSize:11, fontWeight:'700' },

  achCard:     { backgroundColor:'rgba(255,255,255,0.04)', borderRadius:12, borderWidth:1, borderColor:'rgba(255,255,255,0.08)', padding:14, marginBottom:10, flexDirection:'row', alignItems:'center', gap:14 },
  achIcon:     { width:48, height:48, borderRadius:14, alignItems:'center', justifyContent:'center', flexShrink:0 },
  achTitle:    { color:'#fff', fontWeight:'700', fontSize:14, marginBottom:2 },
  achDesc:     { color:C.textFaint, fontSize:12 },
  achDate:     { color:'rgba(255,255,255,0.2)', fontSize:11, marginTop:2 },

  secHead:     { flexDirection:'row', alignItems:'center', gap:10, marginBottom:12, marginTop:4 },
  secHeadText: { color:'rgba(255,255,255,0.45)', fontSize:10, fontWeight:'700', textTransform:'uppercase', letterSpacing:1.5 },
  secLine:     { flex:1, height:1, backgroundColor:'rgba(255,255,255,0.07)' },

  empty:       { backgroundColor:'rgba(255,255,255,0.03)', borderRadius:14, padding:28, alignItems:'center', marginBottom:14, borderWidth:1, borderColor:'rgba(255,255,255,0.06)' },
  emptyText:   { color:C.textFaint, fontSize:13, textAlign:'center', lineHeight:20 },
  emptyBtn:    { marginTop:14, backgroundColor:'#6a11cb', borderRadius:10, paddingHorizontal:22, paddingVertical:10 },
  emptyBtnText:{ color:'#fff', fontWeight:'700', fontSize:13 },

  memItem:     { flexDirection:'row', alignItems:'flex-start', gap:10, padding:12, backgroundColor:'rgba(255,255,255,0.03)', borderRadius:10, marginBottom:8, borderWidth:1, borderColor:'rgba(255,255,255,0.06)' },
  memIcon:     { fontSize:16, marginTop:1 },
  memText:     { color:C.textMid, fontSize:13, flex:1, lineHeight:18 },

  topicPill:   { backgroundColor:'rgba(106,17,203,0.2)', borderRadius:20, paddingHorizontal:12, paddingVertical:5, borderWidth:1, borderColor:'rgba(106,17,203,0.3)' },
  topicText:   { color:C.purpleLight, fontSize:12, fontWeight:'600' },

  histItem:    { backgroundColor:'rgba(255,255,255,0.03)', borderRadius:10, padding:12, marginBottom:10, borderWidth:1, borderColor:'rgba(255,255,255,0.06)' },
  histQ:       { color:'rgba(255,255,255,0.8)', fontSize:13, fontWeight:'600', marginBottom:6 },
  histA:       { color:C.textFaint, fontSize:12, lineHeight:18, paddingLeft:20 },

  profRow:     { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:10, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.05)' },
  profKey:     { color:C.textFaint, fontWeight:'600', fontSize:13 },
  profVal:     { color:'#fff', fontWeight:'600', fontSize:13, textAlign:'right', flex:1, marginLeft:16 },

  logoutBtnFull:     { backgroundColor:'rgba(239,68,68,0.12)', borderRadius:12, paddingVertical:13, alignItems:'center', marginBottom:10, borderWidth:1, borderColor:'rgba(239,68,68,0.2)', marginTop:8 },
  logoutBtnFullText: { color:'#fca5a5', fontWeight:'700', fontSize:14 },
});