// screens/coach/CoachChatbotScreen.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, StatusBar, KeyboardAvoidingView,
  Platform, Modal, FlatList, SafeAreaView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { supabase } from '../../services/supabaseClient';
import { API_BASE } from '../../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function extractSentenceWith(text, keyword) {
  const sentences = text.split(/[.!?\n]/);
  const match = sentences.find(s => s.toLowerCase().includes(keyword));
  return match ? match.trim().slice(0, 120) : `Focus on ${keyword} technique and precision.`;
}

function extractCues(keyword) {
  const cueMap = {
    'pass':     ['Keep your head up',        'Weight the pass correctly'],
    'dribbl':   ['Keep the ball close',       'Change direction quickly'],
    'shoot':    ['Plant foot beside ball',    'Follow through'],
    'press':    ['Cut passing lanes',         'Trigger on back pass'],
    'sprint':   ['Drive arms',                'Maintain posture'],
    'defend':   ['Stay goal-side',            'Delay the attacker'],
    'cross':    ['Pick your spot early',      'Whip the ball in'],
    'finish':   ['Strike through the ball',   'Aim for corners'],
    'position': ['Hold your shape',           'Communicate constantly'],
    'tactic':   ['Maintain compact shape',    'Press as a unit'],
    'fitness':  ['Control your breathing',    'Keep intensity high'],
    'stamina':  ['Pace yourself early',       'Push through fatigue'],
    'warm':     ['Gradual intensity increase','Activate all muscle groups'],
    'heading':  ['Eyes on the ball',          'Use your forehead'],
    'set piece':['Practice the routine',      'Timing is everything'],
    'game':     ['Quick decisions',           'Support the ball carrier'],
    'agility':  ['Light on your feet',        'Quick foot placement'],
    'rondo':    ['Move after passing',        'Keep it quick'],
  };
  for (const [kw, cues] of Object.entries(cueMap)) {
    if (keyword.includes(kw)) return cues;
  }
  return ['Focus on technique', 'Stay composed'];
}

function scanPlanFromMessages(messages) {
  const botMsgs = messages.filter(m => m.role === 'bot' && m.text.length > 40);
  if (botMsgs.length === 0) return null;

  const allText = botMsgs.map(m => m.text).join('\n');
  const lower   = allText.toLowerCase();

  const drillKeywords = [
    ['pass',       'Passing & Movement'],
    ['dribbl',     'Dribbling Circuit'],
    ['shoot',      'Shooting Practice'],
    ['press',      'High Pressing Drill'],
    ['tactic',     'Tactical Shape'],
    ['fitness',    'Fitness & Conditioning'],
    ['sprint',     'Sprint Intervals'],
    ['set piece',  'Set Piece Routine'],
    ['finish',     'Finishing Drill'],
    ['cross',      'Crossing & Delivery'],
    ['defend',     'Defensive Shape'],
    ['game',       'Small-sided Game'],
    ['warm',       'Warmup Routine'],
    ['position',   'Positional Play'],
    ['stamina',    'Stamina Circuit'],
    ['heading',    'Heading Practice'],
    ['turn',       'Turning & Receiving'],
    ['one-two',    'One-Two Combinations'],
    ['rondo',      'Rondo Possession'],
    ['agility',    'Agility Ladder'],
  ];

  const foundDrills = [];
  drillKeywords.forEach(([kw, name]) => {
    if (lower.includes(kw) && !foundDrills.find(d => d.name === name)) {
      foundDrills.push({
        name,
        duration:      '15 mins',
        sets:          '3',
        reps:          '10',
        description:   extractSentenceWith(allText, kw),
        coaching_cues: extractCues(kw),
      });
    }
  });

  if (foundDrills.length === 0) return null;

  const focusMap = {
    'passing':'Passing','dribbling':'Dribbling','shooting':'Shooting',
    'tactics':'Tactics','fitness':'Fitness','pressing':'Pressing',
    'defending':'Defending','set piece':'Set Pieces','crossing':'Crossing',
    'stamina':'Stamina','speed':'Speed','positioning':'Positioning',
    'heading':'Heading','finishing':'Finishing',
  };
  const focusAreas = Object.entries(focusMap)
    .filter(([kw]) => lower.includes(kw))
    .map(([, label]) => label)
    .slice(0, 5);

  let difficulty = 'Intermediate';
  if (lower.includes('beginner') || lower.includes('basic'))  difficulty = 'Beginner';
  if (lower.includes('advanced') || lower.includes('elite'))  difficulty = 'Advanced';

  const chunkSize = 3;
  const days = [];
  for (let i = 0; i < Math.min(foundDrills.length, 9); i += chunkSize) {
    const chunk  = foundDrills.slice(i, i + chunkSize);
    const dayNum = Math.floor(i / chunkSize) + 1;
    days.push({
      day:       `Day ${dayNum}`,
      theme:     chunk[0]?.name || 'Training Session',
      focus:     chunk[0]?.name || 'Training Session',
      intensity: dayNum % 2 === 0 ? 'High' : 'Medium',
      drills:    chunk,
    });
  }

  const nutritionTips = [];
  if (lower.includes('hydrat') || lower.includes('water'))
    nutritionTips.push('Stay hydrated — water before, during and after');
  if (lower.includes('protein'))
    nutritionTips.push('Eat protein within 1 hour of training');
  if (lower.includes('carb') || lower.includes('energy'))
    nutritionTips.push('Complex carbs 2 hours before session');
  if (nutritionTips.length === 0)
    nutritionTips.push('Stay hydrated throughout training');

  const title = focusAreas.length > 0
    ? `${focusAreas[0]} & ${focusAreas[1] || 'Fitness'} Training Plan`
    : 'Coaching Session Training Plan';

  return {
    title,
    summary:         `A ${difficulty.toLowerCase()} plan covering ${focusAreas.slice(0,3).join(', ') || 'key football skills'}.`,
    duration:        `${days.length} session${days.length > 1 ? 's' : ''}`,
    difficulty,
    key_focus_areas: focusAreas.length > 0 ? focusAreas : ['Technical Skills', 'Fitness'],
    days,
    nutrition_tips:  nutritionTips,
    coach_notes:     'Plan scanned from your coaching session with MAX.',
    extracted_at:    new Date().toISOString(),
    _source:         'frontend_scan',
  };
}

const ini = s => (s || '?').charAt(0).toUpperCase();

// ─── Main component ───────────────────────────────────────────────────────────
export default function CoachChatbotScreen({ navigation }) {
  const scrollRef = useRef(null);

  const [user,           setUser]           = useState(null);
  const [coach,          setCoach]          = useState(null);
  const [pageLoading,    setPageLoading]    = useState(true);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');
  const [successMsg,     setSuccessMsg]     = useState('');

  // Teams / players
  const [allTeams,       setAllTeams]       = useState([]);
  const [ctxTeams,       setCtxTeams]       = useState([]);
  const [selectedTeam,   setSelectedTeam]   = useState(null);
  const [teamPlayers,    setTeamPlayers]    = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Chat
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [memoryStats, setMemoryStats] = useState(null);
  const [coachStats,  setCoachStats]  = useState(null);
  const [mode,        setMode]        = useState('general'); // 'general' | 'player'

  // Plan
  const [scannedPlan,  setScannedPlan]  = useState(null);
  const [showPlan,     setShowPlan]     = useState(false);
  const [planSaved,    setPlanSaved]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [expandedDay,  setExpandedDay]  = useState(0);
  const [saveTarget,   setSaveTarget]   = useState('coach');

  // Modals
  const [showSidebar,         setShowSidebar]         = useState(false);
  const [extractModalVisible, setExtractModalVisible] = useState(false);
  const [selectedIndices,     setSelectedIndices]     = useState([]);

  // Voice recording
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const flash   = msg => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 5000); };
  const showErr = msg => { setError(msg);       setTimeout(() => setError(''),     6000); };

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  const authHeaders = async () => ({
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${await getToken()}`,
  });

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => { init(); }, []);

  const init = async () => {
    setPageLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { return; }
      setUser(session.user);

      const { data: cp } = await supabase
        .from('coach_profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (!cp) { return; }
      setCoach(cp);

      try {
        const histRes = await fetch(`${API_BASE}/api/coach-chatbot/history/${session.user.id}`);
        const histData = await histRes.json();
        if (histRes.ok && histData.history && histData.history.length > 0) {
          setMessages(histData.history);
        } else {
          setMessages([{
            role: 'bot',
            text: `👋 Welcome back, Coach ${cp.full_name?.split(' ')[0] || ''}!\n\nI'm MAX, your AI coaching partner.\n\n📌 Tap the 👥 button to add teams so I know your players.\n⚡ Chat with me, then tap Quick Scan to build a training plan.\n\nWhat are we working on today? 🏆`,
            mode: 'general',
          }]);
        }
      } catch (e) {
        setMessages([{
          role: 'bot',
          text: `👋 Welcome back, Coach ${cp.full_name?.split(' ')[0] || ''}!\n\nI'm MAX, your AI coaching partner.\n\n📌 Tap the 👥 button to add teams so I know your players.\n⚡ Chat with me, then tap Quick Scan to build a training plan.\n\nWhat are we working on today? 🏆`,
          mode: 'general',
        }]);
      }

      try {
        const statsRes = await fetch(`${API_BASE}/api/coach-chatbot/stats/${session.user.id}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setCoachStats(statsData.stats);
        }
      } catch (e) {}

      await Promise.all([
        loadAllTeams(session.user.id),
        loadCtxTeams(session.user.id),
      ]);
    } catch (e) {
      showErr(e.message);
    } finally {
      setPageLoading(false);
    }
  };

  const loadAllTeams = async (uid) => {
    try {
      const h = await authHeaders();
      const r = await fetch(`${API_BASE}/api/coach-chatbot/teams`, { headers: h });
      const d = await r.json().catch(() => ({}));
      if (r.ok) setAllTeams(d.teams || []);
    } catch {}
  };

  const loadCtxTeams = async (uid) => {
    try {
      const h = await authHeaders();
      const r = await fetch(`${API_BASE}/api/coach-chatbot/context-teams/${uid}`, { headers: h });
      const d = await r.json().catch(() => ({}));
      if (r.ok) setCtxTeams(d.context_teams || []);
    } catch {}
  };

  const addTeam = async team => {
    try {
      const h = await authHeaders();
      const r = await fetch(`${API_BASE}/api/coach-chatbot/context-teams`, {
        method: 'POST', headers: h,
        body: JSON.stringify({ team_id: team.id }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        setCtxTeams(d.context_teams || []);
        setMessages(prev => [...prev, {
          role: 'bot',
          text: `✅ Team "${team.name}" added! I now know all ${team.member_count ?? 0} players.`,
          mode: 'general',
        }]);
      }
    } catch (e) { showErr(e.message); }
  };

  const removeTeam = async (teamId, name) => {
    try {
      const h = await authHeaders();
      const r = await fetch(`${API_BASE}/api/coach-chatbot/context-teams/${teamId}`, { method: 'DELETE', headers: h });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        setCtxTeams(d.context_teams || []);
        if (selectedTeam?.id === teamId) {
          setSelectedTeam(null); setTeamPlayers([]); setSelectedPlayer(null); setMode('general');
        }
        setMessages(prev => [...prev, { role: 'bot', text: `🗑️ Team "${name}" removed.`, mode: 'general' }]);
      }
    } catch (e) { showErr(e.message); }
  };

  const loadTeamPlayers = async team => {
    if (selectedTeam?.id === team.id) { setSelectedTeam(null); setTeamPlayers([]); return; }
    try {
      const h = await authHeaders();
      const r = await fetch(`${API_BASE}/api/coach-chatbot/team-players/${team.id}`, { headers: h });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setSelectedTeam(d.team); setTeamPlayers(d.team?.members || []); }
    } catch {}
  };

  const selectPlayer = m => {
    if (selectedPlayer?.player_id === m.player_id) {
      setSelectedPlayer(null); setMode('general'); return;
    }
    setSelectedPlayer(m);
    setMode('player');
    setShowSidebar(false);
    const pname = m.profile?.user_name || 'this player';
    setMessages(prev => [...prev, {
      role: 'bot',
      text: `🎯 Player focus: ${pname}\n${m.position || m.profile?.position || '?'} · ⚽${m.stats?.goals_scored ?? 0}G · 🏆${m.stats?.wins ?? 0}W\n\nAsk me how to develop ${pname}!`,
      mode: 'player',
    }]);
  };

  // ── Send message ─────────────────────────────────────────────────────────────
  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setMessages(prev => [...prev, { role: 'user', text: q, mode }]);
    setInput('');
    setLoading(true);

    try {
      const h = await authHeaders();
      const endpoint = mode === 'player' && selectedPlayer
        ? `${API_BASE}/api/coach-chatbot/ask-player`
        : `${API_BASE}/api/coach-chatbot/ask`;
      const body = mode === 'player' && selectedPlayer
        ? { question: q, player_id: selectedPlayer.player_id }
        : { question: q };

      const res = await fetch(endpoint, { method: 'POST', headers: h, body: JSON.stringify(body) });
      const d   = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Request failed');

      setMessages(prev => [...prev, { role: 'bot', text: d.answer || 'Something went wrong.', mode }]);
      if (d.memory_stats) setMemoryStats(d.memory_stats);

      try {
        const statsRes = await fetch(`${API_BASE}/api/coach-chatbot/stats/${user.id}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setCoachStats(statsData.stats);
        }
      } catch (e) {}
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: '⚠️ Could not reach server. Is Flask running?',
        mode,
      }]);
    } finally {
      setLoading(false);
    }
  };

  // ── Quick Scan with Message Selection ─────────────────────────────────────────
  const openExtractModal = () => {
    if (!messages || messages.length <= 1) {
      showErr('Not enough content yet. Ask MAX for drills or a training plan first!');
      return;
    }
    setSelectedIndices(messages.map((_, idx) => idx).filter(i => i > 0));
    setExtractModalVisible(true);
  };

  const toggleSelectIndex = (idx) => {
    setSelectedIndices(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const selectAllMessages = () => {
    setSelectedIndices(messages.map((_, idx) => idx).filter(i => i > 0));
  };

  const deselectAllMessages = () => {
    setSelectedIndices([]);
  };

  const confirmExtractPlan = async () => {
    if (selectedIndices.length === 0) return;
    setExtractModalVisible(false);
    setLoading(true);
    const chosenMessages = messages.filter((_, idx) => selectedIndices.includes(idx));
    try {
      const h = await authHeaders();
      const res = await fetch(`${API_BASE}/api/coach-training-plan/extract`, {
        method: 'POST', headers: h,
        body: JSON.stringify({
          messages: chosenMessages,
          player_id: selectedPlayer ? selectedPlayer.player_id : '',
          player_name: selectedPlayer ? selectedPlayer.profile?.user_name : '',
          team_name: selectedTeam ? selectedTeam.name : '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const localPlan = scanPlanFromMessages(chosenMessages);
        if (localPlan) {
          setScannedPlan(localPlan);
          setPlanSaved(false);
          setSaveTarget('coach');
          setExpandedDay(0);
          setShowPlan(true);
        } else {
          showErr(data.error || 'Could not extract plan from selected messages.');
        }
      } else if (data.plan) {
        setScannedPlan(data.plan);
        setPlanSaved(false);
        setSaveTarget('coach');
        setExpandedDay(0);
        setShowPlan(true);
      }
    } catch {
      const localPlan = scanPlanFromMessages(chosenMessages);
      if (localPlan) {
        setScannedPlan(localPlan);
        setPlanSaved(false);
        setSaveTarget('coach');
        setExpandedDay(0);
        setShowPlan(true);
      } else {
        showErr('Could not reach server and local scan found no drills.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Save plan ────────────────────────────────────────────────────────────────
  const savePlan = async () => {
    if (!scannedPlan || saving) return;
    setSaving(true);
    try {
      const h = await authHeaders();
      const res = await fetch(`${API_BASE}/api/coach-chatbot/save-plan`, {
        method: 'POST', headers: h,
        body: JSON.stringify({
          plan:      scannedPlan,
          player_id: saveTarget !== 'coach' ? saveTarget : '',
          team_id:   ctxTeams.length === 1 ? ctxTeams[0].team_id : '',
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Save failed');

      setPlanSaved(true);
      flash(`✅ Plan "${scannedPlan.title}" saved!`);
      setMessages(prev => [...prev, {
        role: 'bot',
        text: `✅ Training plan "${scannedPlan.title}" saved!\n\nGo to Plans tab to view it.`,
        mode,
      }]);
    } catch (e) {
      showErr(e.message || 'Save failed. Check Flask is running.');
    } finally {
      setSaving(false);
    }
  };

  const clearMemory = () => {
    if (!user?.id) return;
    Alert.alert(
      "Clear Chat & Memory?",
      "Are you sure you want to delete this chat history? Your coaching stats will be preserved.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear", 
          style: "destructive",
          onPress: async () => {
            try {
              const h = await authHeaders();
              await fetch(`${API_BASE}/api/coach-chatbot/memory/${user.id}`, { method: 'DELETE', headers: h });
              await fetch(`${API_BASE}/api/coach-chatbot/chat/${user.id}`, { method: 'DELETE', headers: h });
              setMemoryStats(null);
              setMessages([{ role: 'bot', text: "🗑️ Memory & Chat cleared! Let's start fresh.", mode: 'general' }]);
            } catch {}
          }
        }
      ]
    );
  };

  // ── Voice Recording ─────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      if (isRecording) {
        await stopRecording();
        return;
      }

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        showErr('Microphone permission denied.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      showErr('Failed to start recording.');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) return;

      const formData = new FormData();
      formData.append('audio', {
        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        name: 'voice.m4a',
        type: 'audio/m4a'
      });

      setLoading(true);
      const res = await fetch(`${API_BASE}/api/voice/transcribe`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok && data.transcript) {
        setInput(prev => (prev ? prev + " " + data.transcript : data.transcript).trim());
      } else {
        showErr(data.error || 'Failed to transcribe voice.');
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      showErr('Failed to process recording.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  const isInCtx = id => ctxTeams.some(t => t.team_id === id);

  const GENERAL_CHIPS = [
    'Best formation for my team',
    'High pressing drill',
    'We won our match today 2-1',
    'My team lost 1-0',
    'We drew 1-1',
    'My striker scored a hat-trick',
  ];
  const PLAYER_CHIPS = selectedPlayer ? [
    `Drills for ${selectedPlayer.profile?.user_name?.split(' ')[0] || 'this player'}`,
    `Develop their ${selectedPlayer.position || 'position'}`,
    'Weaknesses from their stats',
    'Best feedback approach',
  ] : [];

  if (pageLoading) return (
    <View style={s.loadingWrap}>
      <StatusBar barStyle="light-content" />
      <ActivityIndicator size="large" color="#10b981" />
      <Text style={s.loadingText}>Loading coach AI…</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0f0c29' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f0c29" />

      {/* ── Achievement / stat toast ── */}
      {!!successMsg && (
        <View style={s.successToast}>
          <Text style={s.successToastText}>{successMsg}</Text>
        </View>
      )}

      {/* ── Header ── */}
      <LinearGradient colors={['#059669', '#10b981']} style={s.header}>
        <Text style={{ fontSize: 22 }}>🏆</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>MAX — Coach AI</Text>
          <Text style={s.headerSub}>
            {ctxTeams.length > 0
              ? `${ctxTeams.length} team${ctxTeams.length > 1 ? 's' : ''} · ${ctxTeams.reduce((a, t) => a + (t.member_count || 0), 0)} players`
              : 'Tap 👥 to add teams'}
          </Text>
        </View>
        {coach && (
          <Text style={s.headerCoach} numberOfLines={1}>
            🧑‍💼 {coach.full_name?.split(' ')[0]}
          </Text>
        )}
        <TouchableOpacity onPress={clearMemory} style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginRight: 8, marginLeft: 8 }}>
           <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>🗑️ Clear Chat</Text>
        </TouchableOpacity>
        {/* Sidebar toggle */}
        <TouchableOpacity onPress={() => setShowSidebar(true)} style={s.sidebarBtn}>
          <Text style={{ fontSize: 18 }}>👥</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Memory bar ── */}
      {(memoryStats || coachStats) && (
        <View style={s.memBar}>
          <View style={{ flex: 1 }}>
            {memoryStats && (
              <Text style={s.memBarText}>
                🧠 {memoryStats.history_count} chats
                {memoryStats.topics?.length > 0 ? ` · 📚 ${memoryStats.topics.join(', ')}` : ''}
              </Text>
            )}
            {coachStats && (
              <Text style={[s.memBarText, { color: '#10b981', marginTop: 2, fontWeight: '600' }]}>
                🏆 {coachStats.wins}W {coachStats.draws}D {coachStats.losses}L (🔥 {coachStats.win_streak})
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={clearMemory} style={s.clearMemBtn}>
            <Text style={s.clearMemText}>🗑️ Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Mode bar ── */}
      <View style={s.modeBar}>
        <TouchableOpacity
          style={[s.modeBtn, mode === 'general' && s.modeBtnActive]}
          onPress={() => { setMode('general'); setSelectedPlayer(null); }}
        >
          <Text style={[s.modeBtnText, mode === 'general' && s.modeBtnTextActive]}>
            🏟️ General
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.modeBtn, s.modeBtnPurple, mode === 'player' && s.modeBtnPurpleActive]}
          onPress={() => {
            if (!selectedPlayer) { showErr('Select a player from 👥 teams first.'); return; }
            setMode('player');
          }}
        >
          <Text style={[s.modeBtnText, mode === 'player' && s.modeBtnTextActive]}>
            🎯 {selectedPlayer
              ? (selectedPlayer.profile?.user_name?.split(' ')[0] || 'Player')
              : 'Player'}
          </Text>
        </TouchableOpacity>

        {scannedPlan && !showPlan && (
          <TouchableOpacity onPress={openExtractModal} style={s.planReadyBtn}>
            <Text style={s.planReadyText}>⚡ Plan Ready</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Player context bar ── */}
      {mode === 'player' && selectedPlayer && (
        <View style={s.playerBar}>
          <Text style={s.playerBarText}>
            🎯 {selectedPlayer.profile?.user_name}
            {' · '}{selectedPlayer.position || selectedPlayer.profile?.position || '?'}
            {' · ⚽'}{selectedPlayer.stats?.goals_scored ?? 0}
            {' · 🏆'}{selectedPlayer.stats?.wins ?? 0}W
          </Text>
        </View>
      )}

      {/* ── Error bar ── */}
      {!!error && (
        <View style={s.errBar}>
          <Text style={s.errText}>⚠️ {error}</Text>
          <TouchableOpacity onPress={() => setError('')}>
            <Text style={{ color: '#fca5a5', fontWeight: '700', fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Messages ── */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg, i) => (
          <View key={i} style={[s.msgRow, msg.role === 'user' && s.msgRowUser]}>
            {msg.role === 'bot' && (
              <LinearGradient colors={['#059669','#10b981']} style={s.botAvatar}>
                <Text style={{ fontSize: 13 }}>⚽</Text>
              </LinearGradient>
            )}
            <View style={[
              s.bubble,
              msg.role === 'user'
                ? s.bubbleUser
                : msg.mode === 'player' ? s.bubblePlayer : s.bubbleBot,
            ]}>
              {msg.role === 'bot' && (
                <Text style={s.bubbleLabel}>
                  {msg.mode === 'player' ? 'MAX · Player Coach' : 'MAX · Coach AI'}
                </Text>
              )}
              <Text selectable={true} style={msg.role === 'user' ? s.bubbleUserText : s.bubbleBotText}>
                {msg.text}
              </Text>
            </View>
            {msg.role === 'user' && (
              <View style={s.userAvatar}><Text style={{ fontSize: 13 }}>🧑‍💼</Text></View>
            )}
          </View>
        ))}

        {loading && (
          <View style={s.msgRow}>
            <LinearGradient colors={['#059669','#10b981']} style={s.botAvatar}>
              <Text style={{ fontSize: 13 }}>⚽</Text>
            </LinearGradient>
            <View style={s.bubbleBot}>
              <Text style={s.bubbleBotText}>MAX is thinking…</Text>
            </View>
          </View>
        )}
        <View style={{ height: 8 }} />
      </ScrollView>

      {/* ── Quick chips ── */}
      {messages.length <= 2 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipsScroll}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
        >
          {(mode === 'player' ? PLAYER_CHIPS : GENERAL_CHIPS).map(c => (
            <TouchableOpacity
              key={c}
              style={[s.chip, mode === 'player' && s.chipPurple]}
              onPress={() => setInput(c)}
            >
              <Text style={[s.chipText, mode === 'player' && s.chipTextPurple]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Input bar ── */}
      <View style={s.inputBar}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder={
            mode === 'player' && selectedPlayer
              ? `Ask about ${selectedPlayer.profile?.user_name || 'this player'}…`
              : ctxTeams.length === 0
                ? 'Add a team first, then ask MAX…'
                : 'Ask MAX — formations, drills, tactics…'
          }
          placeholderTextColor="rgba(255,255,255,0.28)"
          multiline
          numberOfLines={2}
          onSubmitEditing={send}
          blurOnSubmit={false}
        />
        <View style={{ gap: 6, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={startRecording}
            style={[s.scanBtn, isRecording && { borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.2)' }]}
          >
            <Text style={s.scanBtnText}>{isRecording ? '🛑' : '🎤'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openExtractModal}
            disabled={messages.length <= 2}
            style={[s.scanBtn, messages.length <= 2 && { opacity: 0.4 }]}
          >
            <Text style={s.scanBtnText}>⚡</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={send}
            disabled={loading || !input.trim()}
            style={[s.sendBtn, (loading || !input.trim()) && { opacity: 0.4 }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.sendBtnText}>➤</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* ══════════════════════════════════════════════════
          SIDEBAR MODAL — Teams & Players
      ══════════════════════════════════════════════════ */}
      <Modal
        visible={showSidebar}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSidebar(false)}
      >
        <View style={s.sidebarModal}>
          <View style={s.sidebarHdr}>
            <Text style={s.sidebarTitle}>👥 Teams & Players</Text>
            <TouchableOpacity onPress={() => setShowSidebar(false)} style={s.sidebarClose}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>

            {/* Active context teams */}
            <Text style={s.sbSectionLabel}>📌 Active Context</Text>
            {ctxTeams.length === 0 ? (
              <Text style={s.sbEmpty}>No teams added yet. Add one below.</Text>
            ) : (
              ctxTeams.map(ct => (
                <View key={ct.team_id} style={s.ctxChip}>
                  <View style={[s.ctxDot, { backgroundColor: ct.color || '#10b981' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.ctxName}>{ct.name}</Text>
                    <Text style={s.ctxMeta}>{ct.member_count ?? '?'} players</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeTeam(ct.team_id, ct.name)}
                    style={s.ctxRemoveBtn}
                  >
                    <Text style={s.ctxRemoveText}>✕ Remove</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* All teams */}
            <Text style={[s.sbSectionLabel, { marginTop: 18 }]}>🏟️ Your Teams</Text>
            {allTeams.length === 0 ? (
              <Text style={s.sbEmpty}>No teams created yet.</Text>
            ) : (
              allTeams.map(t => {
                const added = isInCtx(t.id);
                return (
                  <View key={t.id} style={[s.teamRow, added && s.teamRowAdded]}>
                    <View style={[s.teamDot, { backgroundColor: t.color || '#10b981' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.teamName}>{t.name}</Text>
                      <Text style={s.teamCount}>👥 {t.member_count ?? 0} players</Text>
                    </View>
                    {added ? (
                      <Text style={s.addedTag}>✓ Added</Text>
                    ) : (
                      <TouchableOpacity onPress={() => addTeam(t)} style={s.addBtn}>
                        <Text style={s.addBtnText}>+ Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}

            {/* Player picker */}
            {ctxTeams.length > 0 && (
              <>
                <Text style={[s.sbSectionLabel, { marginTop: 18 }]}>🎯 Player Focus</Text>
                <Text style={s.sbEmpty}>Tap a team to expand, then select a player.</Text>
                {ctxTeams.map(ct => (
                  <View key={ct.team_id} style={{ marginBottom: 10 }}>
                    <TouchableOpacity
                      onPress={() => loadTeamPlayers({ id: ct.team_id, name: ct.name })}
                      style={s.teamExpandBtn}
                    >
                      <View style={[s.teamDot, { backgroundColor: ct.color || '#10b981' }]} />
                      <Text style={s.teamExpandText}>{ct.name}</Text>
                      <Text style={{ color: '#10b981', marginLeft: 'auto' }}>
                        {selectedTeam?.id === ct.team_id ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>

                    {selectedTeam?.id === ct.team_id && teamPlayers.map(m => {
                      const pname    = m.profile?.user_name || '?';
                      const isActive = selectedPlayer?.player_id === m.player_id;
                      return (
                        <TouchableOpacity
                          key={m.player_id}
                          style={[s.playerRow, isActive && s.playerRowActive]}
                          onPress={() => selectPlayer(m)}
                        >
                          <View style={s.playerAvatar}>
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>
                              {ini(pname)}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.playerName}>{pname}</Text>
                            <Text style={s.playerMeta}>
                              {m.position || m.profile?.position || '?'}
                            </Text>
                            <Text style={s.playerStats}>
                              ⚽{m.stats?.goals_scored ?? 0}G · 🏆{m.stats?.wins ?? 0}W
                            </Text>
                          </View>
                          {isActive && (
                            <Text style={{ color: '#6a11cb', fontWeight: '700' }}>✓</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </>
            )}
          </ScrollView>

          {/* Bottom nav */}
          <View style={s.sidebarNav}>
            <TouchableOpacity
              style={s.navBtn}
              onPress={() => { setShowSidebar(false); navigation.navigate('Dashboard'); }}
            >
              <Text style={s.navBtnText}>🏠 Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.navBtn}
              onPress={() => { setShowSidebar(false); navigation.navigate('Plans'); }}
            >
              <Text style={s.navBtnText}>📋 Training Plans</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.navBtn}
              onPress={() => { setShowSidebar(false); navigation.navigate('Team'); }}
            >
              <Text style={s.navBtnText}>👥 Team Management</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════
          PLAN MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        visible={showPlan && !!scannedPlan}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPlan(false)}
      >
        <View style={s.planModal}>
          {/* Header */}
          <View style={s.planModalHdr}>
            <View style={{ flex: 1 }}>
              <Text style={s.planModalTitle}>📋 {scannedPlan?.title}</Text>
              <Text style={s.planModalSource}>⚡ Scanned from your chat</Text>
            </View>
            <TouchableOpacity onPress={() => setShowPlan(false)} style={s.sidebarClose}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>

            {/* Scan notice */}
            <View style={s.scanNote}>
              <Text style={s.scanNoteText}>
                ⚡ Quick Scan plan — keywords detected from your MAX conversation.
              </Text>
            </View>

            {/* Plan header card */}
            <LinearGradient colors={['#059669','#10b981']} style={s.planHdrCard}>
              <Text style={s.planHdrTitle}>{scannedPlan?.title}</Text>
              {scannedPlan?.summary && (
                <Text style={s.planHdrSummary}>{scannedPlan.summary}</Text>
              )}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
                {scannedPlan?.duration && (
                  <View style={s.planTag}><Text style={s.planTagText}>⏱ {scannedPlan.duration}</Text></View>
                )}
                {scannedPlan?.difficulty && (
                  <View style={s.planTag}><Text style={s.planTagText}>{scannedPlan.difficulty}</Text></View>
                )}
                {scannedPlan?.days?.length > 0 && (
                  <View style={s.planTag}><Text style={s.planTagText}>📅 {scannedPlan.days.length} sessions</Text></View>
                )}
              </View>
            </LinearGradient>

            {/* Focus areas */}
            {scannedPlan?.key_focus_areas?.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
                {scannedPlan.key_focus_areas.map((f, i) => (
                  <View key={i} style={s.focusChip}>
                    <Text style={s.focusChipText}>🎯 {f}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Training days */}
            {scannedPlan?.days?.map((day, di) => (
              <View key={di} style={s.dayCard}>
                <TouchableOpacity
                  style={[s.dayHdr, expandedDay === di && s.dayHdrOpen]}
                  onPress={() => setExpandedDay(expandedDay === di ? -1 : di)}
                  activeOpacity={0.8}
                >
                  <View>
                    <Text style={s.dayTitle}>{day.day}</Text>
                    <Text style={s.dayTheme}>{day.theme}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {day.intensity && (
                      <View style={[
                        s.intensityBadge,
                        day.intensity === 'High'   && s.intensityHigh,
                        day.intensity === 'Medium' && s.intensityMedium,
                        day.intensity === 'Low'    && s.intensityLow,
                      ]}>
                        <Text style={[
                          s.intensityText,
                          day.intensity === 'High'   && { color: '#fca5a5' },
                          day.intensity === 'Medium' && { color: '#fbbf24' },
                          day.intensity === 'Low'    && { color: '#10b981' },
                        ]}>{day.intensity}</Text>
                      </View>
                    )}
                    <Text style={{ color: '#10b981', fontWeight: '700' }}>
                      {expandedDay === di ? '▲' : '▼'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {expandedDay === di && (
                  <View style={s.dayBody}>
                    {(day.drills || []).map((ex, ei) => (
                      <View key={ei} style={s.exercise}>
                        <Text style={s.exName}>⚽ {ex.name}</Text>
                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                          {ex.duration && <View style={s.exTagT}><Text style={s.exTagTText}>⏱ {ex.duration}</Text></View>}
                          {ex.sets     && <View style={s.exTagS}><Text style={s.exTagSText}>Sets: {ex.sets}</Text></View>}
                          {ex.reps     && <View style={s.exTagR}><Text style={s.exTagRText}>Reps: {ex.reps}</Text></View>}
                        </View>
                        {ex.description && (
                          <Text style={s.exDesc}>{ex.description}</Text>
                        )}
                        {ex.coaching_cues?.length > 0 && (
                          <Text style={s.exCues}>💡 {ex.coaching_cues.join(' · ')}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {/* Nutrition */}
            {scannedPlan?.nutrition_tips?.length > 0 && (
              <View style={s.nutritionBox}>
                <Text style={s.nutritionLabel}>🥗 Nutrition Tips</Text>
                {scannedPlan.nutrition_tips.map((t, i) => (
                  <Text key={i} style={s.nutritionTip}>• {t}</Text>
                ))}
              </View>
            )}

            {/* Coach notes */}
            {scannedPlan?.coach_notes && (
              <View style={s.notesBox}>
                <Text style={s.notesLabel}>📝 Coach Notes</Text>
                <Text style={s.notesText}>{scannedPlan.coach_notes}</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer — save controls */}
          <View style={s.planModalFtr}>
            {planSaved ? (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <View style={s.savedBadge}>
                  <Text style={s.savedBadgeText}>✅ Saved!</Text>
                </View>
                <TouchableOpacity
                  style={s.viewPlansBtn}
                  onPress={() => { setShowPlan(false); navigation.navigate('Plans'); }}
                >
                  <Text style={s.viewPlansBtnText}>📋 View Plans →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flex: 1 }}>
                <TouchableOpacity
                  style={[s.saveDbBtn, saving && { opacity: 0.6 }]}
                  onPress={savePlan}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.saveDbBtnText}>💾 Save to Database</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.closePlanBtn}
                  onPress={() => setShowPlan(false)}
                >
                  <Text style={s.closePlanBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── SELECT MESSAGES FOR EXTRACTION MODAL ── */}
      <Modal visible={extractModalVisible} animationType="slide" transparent={true}>
        <View style={s.extractOverlay}>
          <View style={s.extractBox}>
            <View style={s.extractHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.extractTitle}>📋 Select Chat to Scan</Text>
                <Text style={s.extractSub}>Choose which discussion & drills MAX should scan into your coaching plan:</Text>
              </View>
              <TouchableOpacity onPress={() => setExtractModalVisible(false)} style={s.extractCloseBtn}>
                <Text style={s.extractCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={s.extractActionRow}>
              <TouchableOpacity onPress={selectAllMessages} style={s.extractMiniBtn}>
                <Text style={s.extractMiniBtnText}>✅ Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={deselectAllMessages} style={s.extractMiniBtn}>
                <Text style={s.extractMiniBtnText}>✕ Deselect All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s.extractScroll} contentContainerStyle={{ gap: 10 }}>
              {messages.slice().reverse().map((msg, revIdx) => {
                const i = messages.length - 1 - revIdx;
                if (i === 0 && msg.role === 'bot') return null;
                const isSelected = selectedIndices.includes(i);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[s.selectCard, isSelected && s.selectCardActive]}
                    onPress={() => toggleSelectIndex(i)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.checkbox, isSelected && s.checkboxActive]}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{isSelected ? '✓' : ''}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.selectCardRole}>
                        {msg.role === 'user' ? '👤 You Asked:' : (revIdx === 0 ? '🔥 LATEST COACH DRILL:' : '🤖 MAX Coach Answer:')}
                      </Text>
                      <Text style={s.selectCardText} numberOfLines={6}>{msg.text}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[s.confirmScanBtn, (selectedIndices.length === 0 || loading) && { opacity: 0.5 }]}
              disabled={selectedIndices.length === 0 || loading}
              onPress={confirmExtractPlan}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.confirmScanBtnText}>⚡ Scan ({selectedIndices.length}) into Training Plan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  loadingWrap:  { flex:1, backgroundColor:'#0f0c29', alignItems:'center', justifyContent:'center', gap:14 },
  loadingText:  { color:'rgba(255,255,255,0.4)', fontSize:13 },

  // Header
  header:       { paddingTop: Platform.OS === 'android' ? 36 : 52, paddingHorizontal:16, paddingBottom:12, flexDirection:'row', alignItems:'center', gap:10 },
  headerTitle:  { color:'#fff', fontWeight:'800', fontSize:16 },
  headerSub:    { color:'rgba(255,255,255,0.75)', fontSize:11, marginTop:1 },
  headerCoach:  { color:'rgba(255,255,255,0.8)', fontSize:11, fontWeight:'700', maxWidth:80 },
  sidebarBtn:   { padding:8, backgroundColor:'rgba(255,255,255,0.15)', borderRadius:10, borderWidth:1, borderColor:'rgba(255,255,255,0.2)' },

  // Memory bar
  memBar:       { backgroundColor:'#1a1535', borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.07)', paddingHorizontal:14, paddingVertical:6, flexDirection:'row', alignItems:'center' },
  memBarText:   { color:'rgba(255,255,255,0.55)', fontSize:11, flex:1 },
  clearMemBtn:  { backgroundColor:'rgba(255,255,255,0.05)', borderRadius:5, paddingHorizontal:8, paddingVertical:2, borderWidth:1, borderColor:'rgba(255,255,255,0.09)' },
  clearMemText: { color:'rgba(255,255,255,0.4)', fontSize:10 },

  // Mode bar
  modeBar:      { backgroundColor:'rgba(255,255,255,0.04)', borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.07)', paddingHorizontal:12, paddingVertical:6, flexDirection:'row', gap:7, alignItems:'center' },
  modeBtn:      { backgroundColor:'transparent', borderWidth:1, borderColor:'rgba(255,255,255,0.11)', borderRadius:6, paddingHorizontal:12, paddingVertical:5 },
  modeBtnActive:{ backgroundColor:'#059669', borderColor:'#059669' },
  modeBtnPurple:{ },
  modeBtnPurpleActive:{ backgroundColor:'#6a11cb', borderColor:'#6a11cb' },
  modeBtnText:  { color:'rgba(255,255,255,0.55)', fontSize:11, fontWeight:'600' },
  modeBtnTextActive:{ color:'#fff' },
  planReadyBtn: { marginLeft:'auto', backgroundColor:'rgba(245,158,11,0.14)', borderWidth:1, borderColor:'rgba(245,158,11,0.28)', borderRadius:6, paddingHorizontal:10, paddingVertical:5 },
  planReadyText:{ color:'#fbbf24', fontSize:11, fontWeight:'700' },

  // Player bar
  playerBar:    { backgroundColor:'rgba(106,17,203,0.12)', borderBottomWidth:1, borderBottomColor:'rgba(106,17,203,0.2)', paddingHorizontal:14, paddingVertical:6 },
  playerBarText:{ color:'#a78bfa', fontSize:11 },

  // Error
  errBar:       { backgroundColor:'rgba(239,68,68,0.12)', borderBottomWidth:1, borderBottomColor:'rgba(239,68,68,0.3)', paddingHorizontal:14, paddingVertical:8, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  errText:      { color:'#fca5a5', fontSize:12, flex:1 },

  // Toast
  successToast: { position:'absolute', top:60, left:16, right:16, zIndex:999, backgroundColor:'#059669', borderRadius:12, padding:12 },
  successToastText:{ color:'#fff', fontWeight:'700', fontSize:13 },

  // Messages
  msgRow:       { flexDirection:'row', alignItems:'flex-end', gap:7, marginBottom:8 },
  msgRowUser:   { justifyContent:'flex-end' },
  botAvatar:    { width:30, height:30, borderRadius:15, alignItems:'center', justifyContent:'center', flexShrink:0 },
  userAvatar:   { width:30, height:30, borderRadius:15, backgroundColor:'rgba(255,255,255,0.09)', alignItems:'center', justifyContent:'center', flexShrink:0 },
  bubble:       { maxWidth:'74%', padding:10, borderRadius:14 },
  bubbleBot:    { backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.1)', borderBottomLeftRadius:3 },
  bubbleUser:   { backgroundColor:'#059669', borderBottomRightRadius:3 },
  bubblePlayer: { backgroundColor:'rgba(106,17,203,0.14)', borderWidth:1, borderColor:'rgba(106,17,203,0.22)', borderBottomLeftRadius:3 },
  bubbleLabel:  { color:'#a78bfa', fontSize:9, fontWeight:'700', marginBottom:3 },
  bubbleBotText:{ color:'rgba(255,255,255,0.9)', fontSize:13, lineHeight:19 },
  bubbleUserText:{ color:'#fff', fontSize:13, lineHeight:19 },

  // Chips
  chipsScroll:  { maxHeight:44, flexGrow:0, borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.06)' },
  chip:         { backgroundColor:'rgba(16,185,129,0.07)', borderWidth:1, borderColor:'rgba(16,185,129,0.28)', borderRadius:20, paddingHorizontal:12, paddingVertical:6 },
  chipPurple:   { backgroundColor:'rgba(106,17,203,0.08)', borderColor:'rgba(106,17,203,0.32)' },
  chipText:     { color:'#10b981', fontSize:11, fontWeight:'600' },
  chipTextPurple:{ color:'#a78bfa' },

  // Input
  inputBar:     { borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.07)', backgroundColor:'#13102a', padding:10, flexDirection:'row', gap:8, alignItems:'flex-end' },
  input:        { flex:1, backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.11)', borderRadius:12, padding:10, color:'#fff', fontSize:13, maxHeight:80 },
  scanBtn:      { backgroundColor:'rgba(245,158,11,0.14)', borderWidth:1, borderColor:'rgba(245,158,11,0.28)', borderRadius:10, width:42, height:42, alignItems:'center', justifyContent:'center' },
  scanBtnText:  { fontSize:20 },
  sendBtn:      { backgroundColor:'#059669', borderRadius:10, width:42, height:42, alignItems:'center', justifyContent:'center' },
  sendBtnText:  { color:'#fff', fontWeight:'700', fontSize:16 },

  // ── Sidebar modal ──
  sidebarModal: { flex:1, backgroundColor:'#0f0c29' },
  sidebarHdr:   { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, paddingTop: Platform.OS === 'android' ? 36 : 52, backgroundColor:'#1a1535', borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.07)' },
  sidebarTitle: { color:'#fff', fontWeight:'800', fontSize:18 },
  sidebarClose: { width:36, height:36, borderRadius:18, backgroundColor:'rgba(255,255,255,0.07)', alignItems:'center', justifyContent:'center' },
  sidebarNav:   { padding:12, borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.06)', gap:6 },
  navBtn:       { backgroundColor:'rgba(255,255,255,0.05)', borderWidth:1, borderColor:'rgba(255,255,255,0.09)', borderRadius:8, padding:10, alignItems:'center' },
  navBtnText:   { color:'rgba(255,255,255,0.6)', fontSize:12, fontWeight:'600' },

  sbSectionLabel:{ color:'rgba(255,255,255,0.45)', fontSize:10, fontWeight:'700', textTransform:'uppercase', letterSpacing:1.2, marginBottom:8 },
  sbEmpty:      { color:'rgba(255,255,255,0.28)', fontSize:12, textAlign:'center', marginBottom:10 },

  ctxChip:      { backgroundColor:'rgba(16,185,129,0.1)', borderWidth:1, borderColor:'rgba(16,185,129,0.22)', borderRadius:10, padding:10, marginBottom:8, flexDirection:'row', alignItems:'center', gap:8 },
  ctxDot:       { width:8, height:8, borderRadius:4, flexShrink:0 },
  ctxName:      { color:'#fff', fontWeight:'600', fontSize:12 },
  ctxMeta:      { color:'rgba(255,255,255,0.35)', fontSize:10 },
  ctxRemoveBtn: { backgroundColor:'rgba(239,68,68,0.12)', borderWidth:1, borderColor:'rgba(239,68,68,0.18)', borderRadius:5, paddingHorizontal:8, paddingVertical:3 },
  ctxRemoveText:{ color:'#fca5a5', fontSize:10, fontWeight:'700' },

  teamRow:      { backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderRadius:9, padding:10, marginBottom:7, flexDirection:'row', alignItems:'center', gap:8 },
  teamRowAdded: { backgroundColor:'rgba(16,185,129,0.07)', borderColor:'rgba(16,185,129,0.2)' },
  teamDot:      { width:8, height:8, borderRadius:4, flexShrink:0 },
  teamName:     { color:'#fff', fontWeight:'600', fontSize:12 },
  teamCount:    { color:'rgba(255,255,255,0.35)', fontSize:10 },
  addedTag:     { color:'#10b981', fontWeight:'700', fontSize:11 },
  addBtn:       { backgroundColor:'rgba(16,185,129,0.14)', borderWidth:1, borderColor:'rgba(16,185,129,0.22)', borderRadius:5, paddingHorizontal:10, paddingVertical:4 },
  addBtnText:   { color:'#10b981', fontSize:11, fontWeight:'700' },

  teamExpandBtn:{ flexDirection:'row', alignItems:'center', gap:7, paddingVertical:8 },
  teamExpandText:{ color:'#10b981', fontSize:11, fontWeight:'700' },

  playerRow:    { backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1, borderColor:'rgba(255,255,255,0.06)', borderRadius:8, padding:9, marginBottom:5, marginLeft:14, flexDirection:'row', alignItems:'center', gap:8 },
  playerRowActive:{ borderColor:'#6a11cb', backgroundColor:'rgba(106,17,203,0.14)' },
  playerAvatar: { width:28, height:28, borderRadius:14, backgroundColor:'#6a11cb', alignItems:'center', justifyContent:'center', flexShrink:0 },
  playerName:   { color:'#fff', fontWeight:'600', fontSize:11 },
  playerMeta:   { color:'rgba(255,255,255,0.35)', fontSize:9 },
  playerStats:  { color:'#10b981', fontWeight:'600', fontSize:9, marginTop:1 },

  // ── Plan modal ──
  planModal:    { flex:1, backgroundColor:'#1a1535' },
  planModalHdr: { flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', padding:16, paddingTop: Platform.OS === 'android' ? 36 : 52, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.07)', backgroundColor:'#1a1535' },
  planModalTitle:{ color:'#fff', fontWeight:'800', fontSize:16, flex:1 },
  planModalSource:{ color:'#fbbf24', fontSize:10, marginTop:2 },
  planModalFtr: { flexDirection:'row', alignItems:'center', gap:8, padding:14, borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.06)', backgroundColor:'#1a1535' },

  scanNote:     { backgroundColor:'rgba(245,158,11,0.1)', borderWidth:1, borderColor:'rgba(245,158,11,0.22)', borderRadius:8, padding:9, marginBottom:12 },
  scanNoteText: { color:'#fbbf24', fontSize:11 },

  planHdrCard:  { borderRadius:12, padding:16, marginBottom:12 },
  planHdrTitle: { color:'#fff', fontWeight:'800', fontSize:18, marginBottom:4 },
  planHdrSummary:{ color:'rgba(255,255,255,0.9)', fontSize:12, lineHeight:18, marginBottom:8 },
  planTag:      { backgroundColor:'rgba(255,255,255,0.2)', borderRadius:20, paddingHorizontal:10, paddingVertical:3 },
  planTagText:  { color:'#fff', fontSize:11 },

  focusChip:    { backgroundColor:'rgba(16,185,129,0.1)', borderWidth:1, borderColor:'rgba(16,185,129,0.2)', borderRadius:20, paddingHorizontal:10, paddingVertical:3 },
  focusChipText:{ color:'#10b981', fontSize:11 },

  dayCard:      { backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1, borderColor:'rgba(255,255,255,0.07)', borderRadius:10, marginBottom:8, overflow:'hidden' },
  dayHdr:       { padding:12, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  dayHdrOpen:   { backgroundColor:'rgba(16,185,129,0.07)', borderBottomWidth:1, borderBottomColor:'rgba(16,185,129,0.14)' },
  dayTitle:     { color:'#10b981', fontWeight:'700', fontSize:13 },
  dayTheme:     { color:'rgba(255,255,255,0.42)', fontSize:10, marginTop:2 },
  dayBody:      { padding:12, gap:8 },

  intensityBadge:{ borderRadius:20, paddingHorizontal:8, paddingVertical:2 },
  intensityHigh: { backgroundColor:'rgba(239,68,68,0.14)' },
  intensityMedium:{ backgroundColor:'rgba(245,158,11,0.14)' },
  intensityLow:  { backgroundColor:'rgba(16,185,129,0.14)' },
  intensityText: { fontSize:10, fontWeight:'700' },

  exercise:     { borderWidth:1, borderColor:'rgba(255,255,255,0.07)', borderRadius:9, padding:10, backgroundColor:'rgba(255,255,255,0.03)' },
  exName:       { color:'#fff', fontWeight:'700', fontSize:12, marginBottom:6 },
  exTagT:       { backgroundColor:'rgba(59,130,246,0.2)', borderRadius:20, paddingHorizontal:9, paddingVertical:2, borderWidth:1, borderColor:'rgba(59,130,246,0.3)' },
  exTagTText:   { color:'#93c5fd', fontSize:10, fontWeight:'600' },
  exTagS:       { backgroundColor:'rgba(16,185,129,0.2)', borderRadius:20, paddingHorizontal:9, paddingVertical:2, borderWidth:1, borderColor:'rgba(16,185,129,0.3)' },
  exTagSText:   { color:'#86efac', fontSize:10, fontWeight:'600' },
  exTagR:       { backgroundColor:'rgba(236,72,153,0.2)', borderRadius:20, paddingHorizontal:9, paddingVertical:2, borderWidth:1, borderColor:'rgba(236,72,153,0.3)' },
  exTagRText:   { color:'#fbcfe8', fontSize:10, fontWeight:'600' },
  exDesc:       { color:'rgba(255,255,255,0.48)', fontSize:11, lineHeight:16, marginBottom:4 },
  exCues:       { color:'#a78bfa', fontSize:10 },

  nutritionBox: { backgroundColor:'rgba(249,115,22,0.15)', borderWidth:1, borderColor:'rgba(249,115,22,0.3)', borderRadius:10, padding:12, marginBottom:10 },
  nutritionLabel:{ fontWeight:'700', color:'#fdba74', marginBottom:6, fontSize:12 },
  nutritionTip: { fontSize:11, color:'#ffedd5', marginBottom:3 },

  notesBox:     { backgroundColor:'rgba(255,255,255,0.03)', borderRadius:10, padding:12, borderWidth:1, borderColor:'rgba(255,255,255,0.07)', marginBottom:10 },
  notesLabel:   { fontWeight:'700', color:'rgba(255,255,255,0.55)', marginBottom:4, fontSize:12 },
  notesText:    { fontSize:11, color:'rgba(255,255,255,0.45)', lineHeight:16 },

  savedBadge:   { backgroundColor:'rgba(16,185,129,0.14)', borderWidth:1, borderColor:'rgba(16,185,129,0.28)', borderRadius:20, paddingHorizontal:12, paddingVertical:6 },
  savedBadgeText:{ color:'#10b981', fontWeight:'700', fontSize:12 },
  viewPlansBtn: { backgroundColor:'#059669', borderRadius:10, paddingHorizontal:16, paddingVertical:9 },
  viewPlansBtnText:{ color:'#fff', fontWeight:'700', fontSize:13 },
  saveDbBtn:    { flex:1, backgroundColor:'#059669', borderRadius:10, paddingVertical:11, alignItems:'center', justifyContent:'center' },
  saveDbBtnText:{ color:'#fff', fontWeight:'700', fontSize:13 },
  closePlanBtn: { backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.09)', borderRadius:10, paddingHorizontal:14, paddingVertical:11 },
  closePlanBtnText:{ color:'rgba(255,255,255,0.5)', fontSize:13, fontWeight:'600' },

  extractOverlay:   { flex:1, backgroundColor:'rgba(0,0,0,0.8)', justifyContent:'center', padding:16 },
  extractBox:       { backgroundColor:'#1a1535', borderRadius:20, borderWidth:1, borderColor:'rgba(245,158,11,0.4)', maxHeight:'82%', padding:16 },
  extractHeader:    { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 },
  extractTitle:     { color:'#fff', fontSize:18, fontWeight:'700' },
  extractSub:       { color:'rgba(255,255,255,0.6)', fontSize:12, marginTop:2 },
  extractCloseBtn:  { width:30, height:30, borderRadius:15, backgroundColor:'rgba(255,255,255,0.1)', alignItems:'center', justifyContent:'center' },
  extractCloseText: { color:'#fff', fontSize:14, fontWeight:'700' },
  extractActionRow: { flexDirection:'row', gap:10, marginBottom:12 },
  extractMiniBtn:   { backgroundColor:'rgba(245,158,11,0.15)', borderWidth:1, borderColor:'#f59e0b', borderRadius:8, paddingHorizontal:12, paddingVertical:6 },
  extractMiniBtnText:{ color:'#fbbf24', fontSize:12, fontWeight:'600' },
  extractScroll:    { maxHeight:350, marginBottom:14 },
  selectCard:       { flexDirection:'row', gap:12, padding:12, borderRadius:12, backgroundColor:'rgba(255,255,255,0.05)', borderWidth:1, borderColor:'rgba(255,255,255,0.1)' },
  selectCardActive: { backgroundColor:'rgba(245,158,11,0.15)', borderColor:'#f59e0b' },
  checkbox:         { width:22, height:22, borderRadius:6, borderWidth:2, borderColor:'rgba(255,255,255,0.3)', alignItems:'center', justifyContent:'center', marginTop:2 },
  checkboxActive:   { backgroundColor:'#f59e0b', borderColor:'#fbbf24' },
  selectCardRole:   { color:'#fbbf24', fontSize:11, fontWeight:'700', marginBottom:2 },
  selectCardText:   { color:'#fff', fontSize:13, lineHeight:18 },
  confirmScanBtn:   { backgroundColor:'#059669', borderRadius:14, paddingVertical:14, alignItems:'center', justifyContent:'center' },
  confirmScanBtnText:{ color:'#fff', fontSize:16, fontWeight:'700' },
});