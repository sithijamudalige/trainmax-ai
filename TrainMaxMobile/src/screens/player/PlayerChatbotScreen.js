import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, StatusBar, KeyboardAvoidingView,
  Platform, Animated, Modal, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { supabase } from '../../services/supabaseClient';
import { API_BASE } from '../../services/api';
import { C } from '../../utils/colors';

export default function PlayerChatbotScreen({ navigation }) {
  const bottomRef  = useRef(null);
  const scrollRef  = useRef(null);

  const [user,         setUser]         = useState(null);
  const [profile,      setProfile]      = useState(null);
  const [playerStats,  setPlayerStats]  = useState(null);
  const [memoryStats,  setMemoryStats]  = useState(null);
  const [messages,     setMessages]     = useState([{
    role: 'bot',
    text: "👋 Hi! I'm MAX, your personal football coach AI.\nAsk me anything about training, drills, fitness or tactics!",
  }]);
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [extracting,   setExtracting]   = useState(false);
  const [extractModalVisible, setExtractModalVisible] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [recording,    setRecording]    = useState(null);
  const [isRecording,  setIsRecording]  = useState(false);
  const [statChanges,  setStatChanges]  = useState(null);
  const [newAchs,      setNewAchs]      = useState([]);
  const [error,        setError]        = useState('');

  // ── init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUser(session.user);

      try {
        const res  = await fetch(`${API_BASE}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.profile) {
          setProfile(data.profile);
          const p    = data.profile;
          const name = p.user_name || 'Player';
          const pos  = p.position  || 'player';
          const club = p.club      || '';
          try {
            const histRes = await fetch(`${API_BASE}/api/chatbot/history/${session.user.id}`);
            const histData = await histRes.json();
            if (histRes.ok && histData.history && histData.history.length > 0) {
              setMessages(histData.history);
            } else {
              setMessages([{
                role: 'bot',
                text: `👋 Welcome back, ${name}! I'm MAX, your AI football coach.\n\nI know you're a ${pos}${club ? ` at ${club}` : ''}.\n\nWhat do you want to work on today? 💪⚽`,
              }]);
            }
          } catch (e) {
            setMessages([{
              role: 'bot',
              text: `👋 Welcome back, ${name}! I'm MAX, your AI football coach.\n\nI know you're a ${pos}${club ? ` at ${club}` : ''}.\n\nWhat do you want to work on today? 💪⚽`,
            }]);
          }
        }
      } catch {}

      loadStats(session.user.id);
    }
    init();
  }, []);

  const loadStats = async uid => {
    try {
      const res  = await fetch(`${API_BASE}/api/chatbot/stats/${uid}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.stats) setPlayerStats(data.stats);
    } catch {}
  };

  // ── send ─────────────────────────────────────────────────────────────────
  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setMessages(prev => [...prev, { role:'user', text:q }]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/chatbot/ask`, {
        method:  'POST',
        headers: { 'Content-Type':'application/json' },
        body:    JSON.stringify({
          question: q,
          user_id:  user?.id || 'anonymous',
          profile:  profile ? {
            name:         profile.user_name,
            age:          profile.age,
            position:     profile.position,
            club:         profile.club,
            focused_area: profile.focused_area,
            height_ft:    profile.height_ft,
            weight_kg:    profile.weight_kg,
            bmi:          profile.bmi,
          } : {},
        }),
      });
      const data = await res.json().catch(() => ({}));
      const answer = data.answer || data.error || 'Sorry, something went wrong.';
      setMessages(prev => [...prev, { role:'bot', text:answer }]);

      if (data.memory_stats)     setMemoryStats(data.memory_stats);
      if (data.stats)            setPlayerStats(data.stats);
      if (data.new_achievements?.length > 0) {
        setNewAchs(data.new_achievements);
        setTimeout(() => setNewAchs([]), 6000);
      }
      if (data.stat_changes && Object.keys(data.stat_changes).length > 0) {
        setStatChanges(data.stat_changes);
        setTimeout(() => setStatChanges(null), 5000);
      }
    } catch {
      setMessages(prev => [...prev, {
        role:'bot', text:'⚠️ Could not reach server. Is Flask running?',
      }]);
    } finally {
      setLoading(false);
    }
  };

  // ── extract plan with message selection ───────────────────────────────────
  const openExtractModal = () => {
    if (!messages || messages.length <= 1) {
      Alert.alert('No Drills Found', 'Please ask MAX for training drills or advice first!');
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
    setExtracting(true);
    const chosenMessages = messages.filter((_, idx) => selectedIndices.includes(idx));
    try {
      const res  = await fetch(`${API_BASE}/api/training-plan/extract`, {
        method:  'POST',
        headers: { 'Content-Type':'application/json' },
        body:    JSON.stringify({
          user_id:  user?.id,
          messages: chosenMessages,
          profile: profile ? {
            name:profile.user_name, age:profile.age,
            position:profile.position, club:profile.club,
            focused_area:profile.focused_area,
          } : {},
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Extraction failed.'); return; }
      navigation.navigate('Plans', { extractedPlan: data.plan });
    } catch {
      setError('Could not reach server.');
    } finally {
      setExtracting(false);
    }
  };

  const clearMemory = () => {
    if (!user?.id) return;
    Alert.alert(
      "Clear Chat & Memory?",
      "Are you sure you want to delete this chat history? Your overall stats will be preserved.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear", 
          style: "destructive",
          onPress: async () => {
            try {
              await fetch(`${API_BASE}/api/chatbot/memory/${user.id}`, { method:'DELETE' });
              await fetch(`${API_BASE}/api/chatbot/chat/${user.id}`, { method:'DELETE' });
              setMemoryStats(null);
              setMessages([{ role:'bot', text:"🗑️ Memory & Chat cleared! Let's start fresh — what do you want to work on today?" }]);
            } catch {}
          }
        }
      ]
    );
  };

  // ── voice recording ──────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      if (isRecording) {
        await stopRecording();
        return;
      }

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Microphone permission denied.');
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
      setError('Failed to start recording.');
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
        setError(data.error || 'Failed to transcribe voice.');
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      setError('Failed to process recording.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 100);
  }, [messages]);

  const getSkillBadge = () => {
    const club = (profile?.club || '').toLowerCase();
    const pros  = ['barcelona','real madrid','manchester','chelsea','juventus','liverpool'];
    if (pros.some(c => club.includes(c))) return { label:'Advanced',     color:'#ef4444' };
    if (club && !['none','-',''].includes(club)) return { label:'Intermediate', color:'#f59e0b' };
    return { label:'Beginner', color:'#10b981' };
  };
  const badge = profile ? getSkillBadge() : null;

  const CHIPS = profile ? [
    `Drills for ${profile.position || 'my position'}`,
    `Improve my ${profile.focused_area || 'skills'}`,
    'We won 2-1 today',
    'We lost 1-0',
    'We drew 1-1',
    'I scored a goal',
    'I scored a hat-trick',
  ] : [];

  return (
    <KeyboardAvoidingView
      style={{ flex:1, backgroundColor:C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Achievement popups */}
      {newAchs.map((ach, i) => (
        <View key={ach.id} style={[s.achPopup, { top: 60 + i * 100 }]}>
          <Text style={s.achPopupLabel}>🏆 Achievement Unlocked!</Text>
          <Text style={s.achPopupTitle}>{ach.icon} {ach.title}</Text>
          <Text style={s.achPopupDesc}>{ach.desc}</Text>
        </View>
      ))}

      {/* Stat change toast */}
      {statChanges && (
        <View style={s.statToast}>
          <Text style={s.statToastText}>
            📊 Saved:{' '}
            {statChanges.goals_scored ? `⚽ +${statChanges.goals_scored} goal  ` : ''}
            {statChanges.assists      ? `🤝 +${statChanges.assists} assist  ` : ''}
            {statChanges.wins         ? '🏆 Win!  ' : ''}
            {statChanges.losses       ? '😞 Loss  ' : ''}
            {statChanges.clean_sheets ? '🧱 Clean Sheet!  ' : ''}
            {statChanges.motm         ? '⭐ MoTM!  ' : ''}
            {statChanges.hat_trick    ? '🎩 Hat Trick!' : ''}
          </Text>
        </View>
      )}

      {/* Live stats bar */}
      {playerStats && (
        <View style={s.statsBar}>
          <Text style={s.statsBarLabel}>📊</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex:1 }}>
            <View style={{ flexDirection:'row', gap:14, alignItems:'center' }}>
              <Text style={s.statItem}>⚽ <Text style={s.statVal}>{playerStats.goals_scored??0}</Text></Text>
              <Text style={s.statItem}>🤝 <Text style={s.statVal}>{playerStats.assists??0}</Text></Text>
              <Text style={s.statItem}>
                <Text style={{ color:'#10b981', fontWeight:'700' }}>{playerStats.wins??0}W </Text>
                <Text style={{ color:'#f59e0b', fontWeight:'700' }}>{playerStats.draws??0}D </Text>
                <Text style={{ color:'#ef4444', fontWeight:'700' }}>{playerStats.losses??0}L</Text>
              </Text>
              <Text style={s.statItem}>🧱 <Text style={s.statVal}>{playerStats.clean_sheets??0}</Text></Text>
              <Text style={s.statItem}>⭐ <Text style={s.statVal}>{playerStats.motm??0}</Text></Text>
              {(playerStats.win_streak??0) > 0 && <Text style={s.statItem}>🔥 <Text style={s.statVal}>{playerStats.win_streak}</Text></Text>}
            </View>
          </ScrollView>
          <TouchableOpacity onPress={() => user && loadStats(user.id)} style={s.refreshMini}>
            <Text style={s.refreshMiniText}>🔄</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Header */}
      <LinearGradient colors={['#6a11cb','#2575fc']} style={s.header}>
        <Text style={{ fontSize:24 }}>⚽</Text>
        <View style={{ flex:1 }}>
          <Text style={s.headerTitle}>Train Max AI</Text>
          <Text style={s.headerSub}>Your personal football coach</Text>
        </View>
        <TouchableOpacity onPress={clearMemory} style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginRight: 8 }}>
           <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>🗑️ Clear Chat</Text>
        </TouchableOpacity>
        {profile && badge && (
          <View style={[s.skillBadge, { backgroundColor: badge.color }]}>
            <Text style={s.skillBadgeText}>{badge.label}</Text>
          </View>
        )}
      </LinearGradient>

      {/* Memory bar */}
      {memoryStats && (
        <View style={s.memBar}>
          <Text style={s.memBarText}>
            🧠 {memoryStats.history_count} chats · 🎯 {memoryStats.goals_noted} goals · 🩹 {memoryStats.injuries_noted} injuries
          </Text>
          <TouchableOpacity onPress={clearMemory} style={s.clearMemBtn}>
            <Text style={s.clearMemBtnText}>🗑️ Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error */}
      {!!error && (
        <View style={s.errBar}>
          <Text style={s.errText}>⚠️ {error}</Text>
          <TouchableOpacity onPress={() => setError('')}><Text style={{ color:'#fca5a5', fontWeight:'700', fontSize:16 }}>✕</Text></TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex:1 }}
        contentContainerStyle={{ padding:14, gap:10 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg, i) => (
          <View key={i} style={[s.msgRow, msg.role === 'user' && s.msgRowUser]}>
            {msg.role === 'bot' && (
              <LinearGradient colors={['#6a11cb','#2575fc']} style={s.botAv}>
                <Text style={{ fontSize:14 }}>⚽</Text>
              </LinearGradient>
            )}
            <View style={[
              s.bubble,
              msg.role === 'user' ? s.bubbleUser : s.bubbleBot,
            ]}>
              {msg.role === 'bot' && <Text style={s.bubbleLabel}>MAX · AI Coach</Text>}
              <Text selectable={true} style={msg.role === 'user' ? s.bubbleUserText : s.bubbleBotText}>
                {msg.text}
              </Text>
            </View>
            {msg.role === 'user' && (
              <View style={s.userAv}><Text style={{ fontSize:14 }}>👤</Text></View>
            )}
          </View>
        ))}

        {loading && (
          <View style={s.msgRow}>
            <LinearGradient colors={['#6a11cb','#2575fc']} style={s.botAv}>
              <Text style={{ fontSize:14 }}>⚽</Text>
            </LinearGradient>
            <View style={s.bubbleBot}>
              <Text style={s.bubbleBotText}>MAX is thinking...</Text>
            </View>
          </View>
        )}
        <View style={{ height:8 }} />
      </ScrollView>

      {/* Quick chips */}
      {messages.length <= 2 && CHIPS.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipsScroll}
          contentContainerStyle={{ paddingHorizontal:14, gap:8 }}
        >
          {CHIPS.map(c => (
            <TouchableOpacity key={c} style={s.chip} onPress={() => setInput(c)}>
              <Text style={s.chipText}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input bar */}
      <View style={s.inputBar}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder='Ask MAX or report: "I scored today", "We won 3-1"…'
          placeholderTextColor={C.textFaint}
          multiline
          numberOfLines={2}
          onSubmitEditing={send}
          blurOnSubmit={false}
        />
        <View style={s.inputBtns}>
          <TouchableOpacity
            onPress={startRecording}
            style={[s.micBtn, isRecording && { borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.2)' }]}
          >
            <Text style={s.micBtnText}>{isRecording ? '🛑' : '🎤'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openExtractModal}
            disabled={extracting || loading}
            style={[s.extractBtn, (extracting||loading) && { opacity:0.4 }]}
          >
            <Text style={s.extractBtnText}>{extracting ? '⏳' : '📋'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={send}
            disabled={loading || !input.trim()}
            style={[s.sendBtn, (loading||!input.trim()) && { opacity:0.4 }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.sendBtnText}>➤</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SELECT MESSAGES FOR EXTRACTION MODAL ── */}
      <Modal visible={extractModalVisible} animationType="slide" transparent={true}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>📋 Select Drills to Extract</Text>
                <Text style={s.modalSub}>Choose which advice & drills MAX should put into your training plan:</Text>
              </View>
              <TouchableOpacity onPress={() => setExtractModalVisible(false)} style={s.modalCloseBtn}>
                <Text style={s.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={s.modalActionRow}>
              <TouchableOpacity onPress={selectAllMessages} style={s.modalMiniBtn}>
                <Text style={s.modalMiniBtnText}>✅ Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={deselectAllMessages} style={s.modalMiniBtn}>
                <Text style={s.modalMiniBtnText}>✕ Deselect All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalScroll} contentContainerStyle={{ gap: 10 }}>
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
                        {msg.role === 'user' ? '👤 You Asked:' : (revIdx === 0 ? '🔥 LATEST DRILL ANSWER:' : '🤖 MAX Coach Answer:')}
                      </Text>
                      <Text style={s.selectCardText} numberOfLines={6}>{msg.text}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[s.confirmBtn, (selectedIndices.length === 0 || extracting) && { opacity: 0.5 }]}
              disabled={selectedIndices.length === 0 || extracting}
              onPress={confirmExtractPlan}
              activeOpacity={0.8}
            >
              {extracting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.confirmBtnText}>⚡ Extract ({selectedIndices.length}) into Training Plan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  statsBar:       { backgroundColor:'#1e1b4b', borderBottomWidth:1, borderBottomColor:'rgba(106,17,203,0.3)', paddingHorizontal:14, paddingVertical:7, flexDirection:'row', alignItems:'center', gap:8 },
  statsBarLabel:  { fontSize:14 },
  statItem:       { color:'rgba(255,255,255,0.7)', fontSize:12 },
  statVal:        { color:'#fff', fontWeight:'700' },
  refreshMini:    { padding:4 },
  refreshMiniText:{ fontSize:14 },

  header:       { flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:18, paddingVertical:12, paddingTop:Platform.OS==='android'?36:52 },
  headerTitle:  { color:'#fff', fontWeight:'700', fontSize:16 },
  headerSub:    { color:'rgba(255,255,255,0.75)', fontSize:11 },
  skillBadge:   { borderRadius:20, paddingHorizontal:12, paddingVertical:4 },
  skillBadgeText:{ color:'#fff', fontWeight:'700', fontSize:11 },

  memBar:       { backgroundColor:'#1a1535', borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.07)', paddingHorizontal:14, paddingVertical:6, flexDirection:'row', alignItems:'center', gap:8 },
  memBarText:   { color:'rgba(255,255,255,0.55)', fontSize:11, flex:1 },
  clearMemBtn:  { backgroundColor:'rgba(255,255,255,0.05)', borderRadius:6, paddingHorizontal:10, paddingVertical:3, borderWidth:1, borderColor:'rgba(255,255,255,0.09)' },
  clearMemBtnText:{ color:'rgba(255,255,255,0.4)', fontSize:10, fontWeight:'700' },

  errBar:       { backgroundColor:'rgba(239,68,68,0.12)', borderBottomWidth:1, borderBottomColor:'rgba(239,68,68,0.3)', paddingHorizontal:14, paddingVertical:8, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  errText:      { color:'#fca5a5', fontSize:12, flex:1 },

  msgRow:       { flexDirection:'row', alignItems:'flex-end', gap:8, marginBottom:8 },
  msgRowUser:   { justifyContent:'flex-end' },
  botAv:        { width:32, height:32, borderRadius:16, alignItems:'center', justifyContent:'center', flexShrink:0 },
  userAv:       { width:32, height:32, borderRadius:16, backgroundColor:'rgba(255,255,255,0.1)', alignItems:'center', justifyContent:'center', flexShrink:0 },
  bubble:       { maxWidth:'74%', padding:11, borderRadius:14 },
  bubbleBot:    { backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.1)', borderBottomLeftRadius:3 },
  bubbleUser:   { backgroundColor:'#6a11cb', borderBottomRightRadius:3 },
  bubbleLabel:  { color:'#a78bfa', fontSize:9, fontWeight:'700', marginBottom:4 },
  bubbleBotText:{ color:'rgba(255,255,255,0.9)', fontSize:13, lineHeight:19 },
  bubbleUserText:{ color:'#fff', fontSize:13, lineHeight:19 },

  chipsScroll:  { maxHeight:44, flexGrow:0, borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.06)' },
  chip:         { backgroundColor:'rgba(67,56,202,0.15)', borderWidth:1, borderColor:'#c7d2fe', borderRadius:20, paddingHorizontal:12, paddingVertical:6 },
  chipText:     { color:'#818cf8', fontSize:11, fontWeight:'600' },

  inputBar:     { borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.08)', backgroundColor:'#13102a', padding:10, flexDirection:'row', gap:8, alignItems:'flex-end' },
  input:        { flex:1, backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.12)', borderRadius:12, padding:10, color:'#fff', fontSize:13, maxHeight:80 },
  inputBtns:    { flexDirection:'row', gap:7, alignItems:'flex-end' },
  micBtn:       { backgroundColor:'rgba(67,56,202,0.15)', borderWidth:1, borderColor:'#c7d2fe', borderRadius:12, width:42, height:42, alignItems:'center', justifyContent:'center' },
  micBtnText:   { fontSize:18 },
  extractBtn:   { backgroundColor:'rgba(67,56,202,0.15)', borderWidth:1, borderColor:'#c7d2fe', borderRadius:12, width:42, height:42, alignItems:'center', justifyContent:'center' },
  extractBtnText:{ fontSize:18 },
  sendBtn:      { backgroundColor:'#6a11cb', borderRadius:12, width:42, height:42, alignItems:'center', justifyContent:'center' },
  sendBtnText:  { color:'#fff', fontWeight:'700', fontSize:16 },

  achPopup:     { position:'absolute', right:16, zIndex:999, backgroundColor:'#6a11cb', borderRadius:16, padding:14, maxWidth:280, shadowColor:'#6a11cb', shadowOffset:{width:0,height:8}, shadowOpacity:0.6, shadowRadius:20, elevation:12 },
  achPopupLabel:{ color:'rgba(255,255,255,0.7)', fontSize:10, fontWeight:'700', textTransform:'uppercase', letterSpacing:1, marginBottom:4 },
  achPopupTitle:{ color:'#fff', fontSize:18, fontWeight:'700', marginBottom:4 },
  achPopupDesc: { color:'rgba(255,255,255,0.8)', fontSize:12 },

  statToast:    { position:'absolute', bottom:90, left:16, right:16, zIndex:999, backgroundColor:'#059669', borderRadius:12, padding:12 },
  statToastText:{ color:'#fff', fontWeight:'700', fontSize:13 },

  modalOverlay:   { flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'center', padding:16 },
  modalBox:       { backgroundColor:'#13102a', borderRadius:20, borderWidth:1, borderColor:'rgba(106,17,203,0.4)', maxHeight:'82%', padding:16 },
  modalHeader:    { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 },
  modalTitle:     { color:'#fff', fontSize:18, fontWeight:'700' },
  modalSub:       { color:'rgba(255,255,255,0.6)', fontSize:12, marginTop:2, maxWidth:'90%' },
  modalCloseBtn:  { width:30, height:30, borderRadius:15, backgroundColor:'rgba(255,255,255,0.1)', alignItems:'center', justifyContent:'center' },
  modalCloseText: { color:'#fff', fontSize:14, fontWeight:'700' },
  modalActionRow: { flexDirection:'row', gap:10, marginBottom:12 },
  modalMiniBtn:   { backgroundColor:'rgba(67,56,202,0.2)', borderWidth:1, borderColor:'#6a11cb', borderRadius:8, paddingHorizontal:12, paddingVertical:6 },
  modalMiniBtnText:{ color:'#a78bfa', fontSize:12, fontWeight:'600' },
  modalScroll:    { maxHeight:350, marginBottom:14 },
  selectCard:     { flexDirection:'row', gap:12, padding:12, borderRadius:12, backgroundColor:'rgba(255,255,255,0.05)', borderWidth:1, borderColor:'rgba(255,255,255,0.1)' },
  selectCardActive:{ backgroundColor:'rgba(106,17,203,0.15)', borderColor:'#8b5cf6' },
  checkbox:       { width:22, height:22, borderRadius:6, borderWidth:2, borderColor:'rgba(255,255,255,0.3)', alignItems:'center', justifyContent:'center', marginTop:2 },
  checkboxActive: { backgroundColor:'#6a11cb', borderColor:'#a78bfa' },
  selectCardRole: { color:'#a78bfa', fontSize:11, fontWeight:'700', marginBottom:2 },
  selectCardText: { color:'#fff', fontSize:13, lineHeight:18 },
  confirmBtn:     { backgroundColor:'#6a11cb', borderRadius:14, paddingVertical:14, alignItems:'center', justifyContent:'center' },
  confirmBtnText: { color:'#fff', fontSize:16, fontWeight:'700' },
});