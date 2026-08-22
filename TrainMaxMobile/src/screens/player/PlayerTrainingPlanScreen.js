import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabaseClient';
import { API_BASE } from '../../services/api';
import { C } from '../../utils/colors';

function diffColor(d) {
  if (!d) return C.green;
  const l = d.toLowerCase();
  if (l.includes('adv')) return '#ef4444';
  if (l.includes('int')) return '#f59e0b';
  return '#10b981';
}

function normDrills(day) {
  const raw = day.drills || day.exercises || [];
  return raw.map(d => ({
    name:         d.name         || 'Drill',
    duration:     d.duration     || '',
    sets:         d.sets         || '',
    reps:         d.reps         || '',
    instructions: d.instructions || d.description  || '',
    tips:         Array.isArray(d.tips)          ? d.tips
                : Array.isArray(d.coaching_cues) ? d.coaching_cues : [],
  }));
}

// ─── Plan Preview ─────────────────────────────────────────────────────────────
function PlanPreview({ plan }) {
  const [expandedDay, setExpandedDay] = useState(0);
  if (!plan) return null;
  const days          = Array.isArray(plan.days)            ? plan.days            : [];
  const focusAreas    = Array.isArray(plan.key_focus_areas) ? plan.key_focus_areas : [];
  const nutritionTips = Array.isArray(plan.nutrition_tips)  ? plan.nutrition_tips  : [];
  const notes         = plan.notes || plan.coach_notes || '';

  return (
    <View>
      {/* Plan header */}
      <LinearGradient colors={['#6a11cb','#2575fc']} style={s.planHdr}>
        <Text style={s.planHdrTitle}>⚽ {plan.title}</Text>
        {plan.summary && <Text style={s.planHdrSummary}>{plan.summary}</Text>}
        <View style={s.planHdrTags}>
          {plan.duration     && <View style={s.hdrTag}><Text style={s.hdrTagText}>⏱ {plan.duration}</Text></View>}
          {plan.difficulty   && <View style={[s.hdrTag,{backgroundColor:diffColor(plan.difficulty)}]}><Text style={s.hdrTagText}>{plan.difficulty}</Text></View>}
          {focusAreas.map((a,i) => <View key={i} style={s.hdrTag}><Text style={s.hdrTagText}>🎯 {a}</Text></View>)}
        </View>
      </LinearGradient>

      {/* Days */}
      {days.map((day, di) => {
        const drills = normDrills(day);
        const focus  = day.focus || day.theme || '';
        const open   = expandedDay === di;
        return (
          <View key={di} style={s.dayCard}>
            <TouchableOpacity
              style={[s.dayHdr, open && s.dayHdrOpen]}
              onPress={() => setExpandedDay(open ? -1 : di)}
              activeOpacity={0.8}
            >
              <View>
                <Text style={s.dayName}>{day.day}</Text>
                {focus ? <Text style={s.dayFocus}>{focus}</Text> : null}
              </View>
              <Text style={{ color:'#a78bfa', fontWeight:'700' }}>{open ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {open && (
              <View style={s.dayBody}>
                {day.warmup && (
                  <View style={s.warmup}>
                    <Text style={s.warmupLbl}>🔥 WARMUP</Text>
                    <Text style={s.warmupTxt}>{day.warmup}</Text>
                  </View>
                )}

                {drills.map((drill, dri) => (
                  <View key={dri} style={s.drill}>
                    <Text style={s.drillName}>{dri+1}. {drill.name}</Text>
                    <View style={s.drillTags}>
                      {drill.duration && <View style={s.tagTime}><Text style={s.tagTimeText}>⏱ {drill.duration}</Text></View>}
                      {drill.sets     && <View style={s.tagSets}><Text style={s.tagSetsText}>Sets: {drill.sets}</Text></View>}
                      {drill.reps     && <View style={s.tagReps}><Text style={s.tagRepsText}>Reps: {drill.reps}</Text></View>}
                    </View>
                    {drill.instructions ? <Text style={s.drillInstr}>{drill.instructions}</Text> : null}
                    {drill.tips.length > 0 && (
                      <View style={s.drillTips}>
                        <Text style={s.drillTipsLbl}>💡 COACH TIPS</Text>
                        {drill.tips.map((t,ti) => <Text key={ti} style={s.drillTip}>• {t}</Text>)}
                      </View>
                    )}
                  </View>
                ))}

                {day.cooldown && (
                  <View style={s.cooldown}>
                    <Text style={s.cooldownLbl}>❄️ COOLDOWN</Text>
                    <Text style={s.cooldownTxt}>{day.cooldown}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}

      {nutritionTips.length > 0 && (
        <View style={s.nutrition}>
          <Text style={s.nutritionLbl}>🥗 Nutrition Tips</Text>
          {nutritionTips.map((t,i) => <Text key={i} style={s.nutritionTip}>• {t}</Text>)}
        </View>
      )}

      {notes ? (
        <View style={s.notes}>
          <Text style={s.notesLbl}>📝 Coach Notes</Text>
          <Text style={s.notesTxt}>{notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function PlayerTrainingPlanScreen({ route, navigation }) {
  const [user,        setUser]        = useState(null);
  const [savedPlans,  setSavedPlans]  = useState([]);
  const [activePlan,  setActivePlan]  = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [activeTab,   setActiveTab]   = useState('saved');
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState(null);

  const showToast = (msg, type='ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUser(session.user);
      await loadPlans(session.user.id);

      // If navigated from chatbot with extracted plan
      const extracted = route?.params?.extractedPlan;
      if (extracted) {
        setActivePlan(extracted);
        setActiveTab('preview');
      }
    }
    init();
  }, [route?.params?.extractedPlan]);

  const loadPlans = async uid => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/training-plan/list/${uid}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) setSavedPlans(data.plans || []);
    } catch {} finally { setLoading(false); }
  };

  const savePlan = async () => {
    if (!activePlan || !user) return;
    setSaving(true);
    try {
      const res  = await fetch(`${API_BASE}/api/training-plan/save`, {
        method:  'POST',
        headers: { 'Content-Type':'application/json' },
        body:    JSON.stringify({ user_id:user.id, plan:activePlan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(data.error || 'Save failed', 'err'); return; }
      showToast('✅ Plan saved to your account!');
      await loadPlans(user.id);
      setActiveTab('saved');
    } catch { showToast('Server error', 'err'); }
    finally { setSaving(false); }
  };

  const deletePlan = async planId => {
    try {
      const res = await fetch(`${API_BASE}/api/training-plan/delete/${user.id}/${planId}`, { method:'DELETE' });
      if (res.ok) { showToast('Plan deleted'); await loadPlans(user.id); }
      else showToast('Failed to delete', 'err');
    } catch { showToast('Server error', 'err'); }
  };

  return (
    <View style={{ flex:1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Toast */}
      {toast && (
        <View style={[s.toast, toast.type==='err' ? s.toastErr : s.toastOk]}>
          <Text style={toast.type==='err' ? s.toastErrText : s.toastOkText}>{toast.msg}</Text>
        </View>
      )}

      {/* Header */}
      <LinearGradient colors={['#6a11cb','#2575fc']} style={s.header}>
        <Text style={{ fontSize:26 }}>📋</Text>
        <View>
          <Text style={s.headerTitle}>My Training Plans</Text>
          <Text style={s.headerSub}>AI-extracted plans saved to your account</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Chatbot')}
          style={s.headerBtn}
        >
          <Text style={s.headerBtnText}>⚽ Coach</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Tabs */}
      <View style={s.tabs}>
        {[
          { id:'saved',   label:`📁 Saved (${savedPlans.length})` },
          { id:'preview', label:'👁 Preview' },
        ].map(t => (
          <TouchableOpacity
            key={t.id}
            style={[s.tab, activeTab===t.id && s.tabActive]}
            onPress={() => setActiveTab(t.id)}
          >
            <Text style={[s.tabText, activeTab===t.id && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding:16, paddingBottom:40 }}>

        {/* ── SAVED PLANS ── */}
        {activeTab === 'saved' && (
          loading ? (
            <View style={{ alignItems:'center', padding:60 }}>
              <ActivityIndicator size="large" color="#6a11cb" />
              <Text style={{ color:'#94a3b8', marginTop:12 }}>Loading your plans…</Text>
            </View>
          ) : savedPlans.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📋</Text>
              <Text style={s.emptyTitle}>No training plans yet</Text>
              <Text style={s.emptyText}>Chat with MAX and tap "Extract Plan" to save plans here.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('Chatbot')}>
                <Text style={s.emptyBtnText}>⚽ Start Coaching</Text>
              </TouchableOpacity>
            </View>
          ) : (
            savedPlans.map(plan => (
              <View key={plan.id} style={s.planCard}>
                <View style={{ flex:1 }}>
                  <Text style={s.planCardTitle}>⚽ {plan.title}</Text>
                  {plan.summary && <Text style={s.planCardSummary} numberOfLines={2}>{plan.summary}</Text>}
                  <View style={s.planCardTags}>
                    {plan.duration && <View style={s.tagBlue}><Text style={s.tagBlueText}>⏱ {plan.duration}</Text></View>}
                    <View style={[s.tagDiff,{backgroundColor:diffColor(plan.difficulty)}]}>
                      <Text style={s.tagDiffText}>{plan.difficulty}</Text>
                    </View>
                    <View style={s.tagGrey}><Text style={s.tagGreyText}>📅 {Array.isArray(plan.days)?plan.days.length:0} days</Text></View>
                    <View style={s.tagGrey}><Text style={s.tagGreyText}>🗓 {new Date(plan.saved_at).toLocaleDateString()}</Text></View>
                  </View>
                </View>
                <View style={{ flexDirection:'row', gap:8 }}>
                  <TouchableOpacity
                    style={s.viewBtn}
                    onPress={() => { setActivePlan(plan); setActiveTab('preview'); }}
                  >
                    <Text style={s.viewBtnText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.delBtn} onPress={() => deletePlan(plan.id)}>
                    <Text style={s.delBtnText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        )}

        {/* ── PREVIEW ── */}
        {activeTab === 'preview' && (
          activePlan ? (
            <View>
              {/* Save bar */}
              {!activePlan.created_at && (
                <View style={s.saveBar}>
                  <Text style={s.saveBarText}>✨ Plan extracted! Review and save below.</Text>
                  <TouchableOpacity onPress={savePlan} disabled={saving} style={s.saveBtn}>
                    {saving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={s.saveBtnText}>💾 Save Plan</Text>
                    }
                  </TouchableOpacity>
                </View>
              )}
              {activePlan.created_at && (
                <View style={s.savedBadge}>
                  <Text style={s.savedBadgeText}>✅ Saved · {new Date(activePlan.saved_at).toLocaleDateString()}</Text>
                </View>
              )}
              <PlanPreview plan={activePlan} />
            </View>
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>💬</Text>
              <Text style={s.emptyTitle}>No plan to preview</Text>
              <Text style={s.emptyText}>Go to Coach MAX and tap "Extract Plan"</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('Chatbot')}>
                <Text style={s.emptyBtnText}>⚽ Go to Coach MAX</Text>
              </TouchableOpacity>
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  toast:        { position:'absolute', top:16, right:16, left:16, borderRadius:10, padding:12, zIndex:999 },
  toastOk:      { backgroundColor:'#dcfce7', borderWidth:1, borderColor:'#bbf7d0' },
  toastErr:     { backgroundColor:'#fee2e2', borderWidth:1, borderColor:'#fecaca' },
  toastOkText:  { color:'#166534', fontWeight:'600', fontSize:13 },
  toastErrText: { color:'#991b1b', fontWeight:'600', fontSize:13 },

  header:       { flexDirection:'row', alignItems:'center', gap:14, paddingHorizontal:20, paddingVertical:16, paddingTop:Platform.OS==='android'?36:52 },
  headerTitle:  { color:'#fff', fontWeight:'800', fontSize:18 },
  headerSub:    { color:'rgba(255,255,255,0.8)', fontSize:11 },
  headerBtn:    { marginLeft:'auto', backgroundColor:'rgba(255,255,255,0.2)', borderWidth:1, borderColor:'rgba(255,255,255,0.4)', borderRadius:8, paddingHorizontal:14, paddingVertical:7 },
  headerBtnText:{ color:'#fff', fontWeight:'600', fontSize:13 },

  tabs:         { backgroundColor:'#13102a', borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.08)', flexDirection:'row' },
  tab:          { flex:1, paddingVertical:14, alignItems:'center', borderBottomWidth:3, borderBottomColor:'transparent' },
  tabActive:    { borderBottomColor:'#6a11cb' },
  tabText:      { color:'rgba(255,255,255,0.45)', fontWeight:'500', fontSize:13 },
  tabTextActive:{ color:'#a78bfa', fontWeight:'700' },

  empty:        { alignItems:'center', paddingVertical:60, paddingHorizontal:24 },
  emptyIcon:    { fontSize:48, marginBottom:12 },
  emptyTitle:   { fontSize:18, fontWeight:'700', color:'#fff', marginBottom:8, textAlign:'center' },
  emptyText:    { fontSize:13, color:'rgba(255,255,255,0.5)', lineHeight:20, textAlign:'center', marginBottom:20 },
  emptyBtn:     { backgroundColor:'#6a11cb', borderRadius:10, paddingHorizontal:24, paddingVertical:12 },
  emptyBtnText: { color:'#fff', fontWeight:'700', fontSize:14 },

  planCard:     { backgroundColor:'rgba(255,255,255,0.05)', borderRadius:12, padding:16, marginBottom:12, flexDirection:'row', alignItems:'flex-start', gap:12, borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  planCardTitle:{ fontWeight:'700', fontSize:15, color:'#fff', marginBottom:4 },
  planCardSummary:{ fontSize:12, color:'rgba(255,255,255,0.65)', marginBottom:8, lineHeight:18 },
  planCardTags: { flexDirection:'row', flexWrap:'wrap', gap:6 },
  tagBlue:      { backgroundColor:'rgba(99,102,241,0.18)', borderRadius:20, paddingHorizontal:10, paddingVertical:2, borderWidth:1, borderColor:'rgba(99,102,241,0.3)' },
  tagBlueText:  { color:'#818cf8', fontSize:11, fontWeight:'600' },
  tagDiff:      { borderRadius:20, paddingHorizontal:10, paddingVertical:2 },
  tagDiffText:  { color:'#fff', fontSize:11, fontWeight:'700' },
  tagGrey:      { backgroundColor:'rgba(255,255,255,0.08)', borderRadius:20, paddingHorizontal:10, paddingVertical:2 },
  tagGreyText:  { color:'rgba(255,255,255,0.6)', fontSize:11 },
  viewBtn:      { backgroundColor:'#6a11cb', borderRadius:8, paddingHorizontal:14, paddingVertical:8 },
  viewBtnText:  { color:'#fff', fontWeight:'600', fontSize:13 },
  delBtn:       { backgroundColor:'rgba(239,68,68,0.15)', borderRadius:8, paddingHorizontal:12, paddingVertical:8, borderWidth:1, borderColor:'rgba(239,68,68,0.3)' },
  delBtnText:   { color:'#fca5a5', fontWeight:'600', fontSize:13 },

  saveBar:      { backgroundColor:'rgba(99,102,241,0.15)', borderWidth:1, borderColor:'rgba(99,102,241,0.3)', borderRadius:10, padding:14, marginBottom:16, flexDirection:'row', alignItems:'center', gap:10 },
  saveBarText:  { color:'#c7d2fe', fontSize:13, flex:1 },
  saveBtn:      { backgroundColor:'#6a11cb', borderRadius:8, paddingHorizontal:16, paddingVertical:9 },
  saveBtnText:  { color:'#fff', fontWeight:'700', fontSize:13 },
  savedBadge:   { backgroundColor:'rgba(16,185,129,0.15)', borderWidth:1, borderColor:'rgba(16,185,129,0.3)', borderRadius:10, padding:12, marginBottom:16 },
  savedBadgeText:{ color:'#34d399', fontWeight:'600', fontSize:13 },

  planHdr:      { borderRadius:12, padding:20, marginBottom:14 },
  planHdrTitle: { color:'#fff', fontWeight:'800', fontSize:20, marginBottom:6 },
  planHdrSummary:{ color:'rgba(255,255,255,0.9)', fontSize:13, lineHeight:19, marginBottom:12 },
  planHdrTags:  { flexDirection:'row', flexWrap:'wrap', gap:8 },
  hdrTag:       { backgroundColor:'rgba(255,255,255,0.2)', borderRadius:20, paddingHorizontal:12, paddingVertical:3 },
  hdrTagText:   { color:'#fff', fontSize:12 },

  dayCard:      { backgroundColor:'rgba(255,255,255,0.04)', borderRadius:12, overflow:'hidden', marginBottom:10, borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  dayHdr:       { padding:14, flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'rgba(255,255,255,0.03)' },
  dayHdrOpen:   { backgroundColor:'rgba(106,17,203,0.18)', borderBottomWidth:1, borderBottomColor:'rgba(106,17,203,0.35)' },
  dayName:      { fontWeight:'700', color:'#fff', fontSize:15 },
  dayFocus:     { color:'rgba(255,255,255,0.55)', fontSize:12, marginTop:2 },
  dayBody:      { padding:14, gap:10 },

  warmup:       { backgroundColor:'rgba(245,158,11,0.12)', borderWidth:1, borderColor:'rgba(245,158,11,0.25)', borderRadius:8, padding:10 },
  warmupLbl:    { fontWeight:'700', fontSize:11, color:'#fbbf24', marginBottom:3, textTransform:'uppercase' },
  warmupTxt:    { fontSize:13, color:'#fef3c7' },

  drill:        { borderWidth:1, borderColor:'rgba(255,255,255,0.07)', borderRadius:10, padding:12, backgroundColor:'rgba(255,255,255,0.03)' },
  drillName:    { fontWeight:'700', fontSize:14, color:'#fff', marginBottom:7 },
  drillTags:    { flexDirection:'row', gap:7, flexWrap:'wrap', marginBottom:8 },
  tagTime:      { backgroundColor:'rgba(59,130,246,0.18)', borderRadius:20, paddingHorizontal:10, paddingVertical:2, borderWidth:1, borderColor:'rgba(59,130,246,0.3)' },
  tagTimeText:  { color:'#93c5fd', fontSize:11, fontWeight:'600' },
  tagSets:      { backgroundColor:'rgba(16,185,129,0.18)', borderRadius:20, paddingHorizontal:10, paddingVertical:2, borderWidth:1, borderColor:'rgba(16,185,129,0.3)' },
  tagSetsText:  { color:'#86efac', fontSize:11, fontWeight:'600' },
  tagReps:      { backgroundColor:'rgba(236,72,153,0.18)', borderRadius:20, paddingHorizontal:10, paddingVertical:2, borderWidth:1, borderColor:'rgba(236,72,153,0.3)' },
  tagRepsText:  { color:'#fbcfe8', fontSize:11, fontWeight:'600' },
  drillInstr:   { fontSize:12, color:'rgba(255,255,255,0.75)', lineHeight:18, marginBottom:7 },
  drillTips:    { backgroundColor:'rgba(16,185,129,0.12)', borderWidth:1, borderColor:'rgba(16,185,129,0.25)', borderRadius:6, padding:8 },
  drillTipsLbl: { fontWeight:'700', fontSize:10, color:'#6ee7b7', marginBottom:4, textTransform:'uppercase' },
  drillTip:     { fontSize:11, color:'#a7f3d0', marginBottom:2 },

  cooldown:     { backgroundColor:'rgba(139,92,246,0.15)', borderWidth:1, borderColor:'rgba(139,92,246,0.3)', borderRadius:8, padding:10 },
  cooldownLbl:  { fontWeight:'700', fontSize:11, color:'#c4b5fd', marginBottom:3, textTransform:'uppercase' },
  cooldownTxt:  { fontSize:13, color:'#ddd6fe' },

  nutrition:    { backgroundColor:'rgba(249,115,22,0.15)', borderWidth:1, borderColor:'rgba(249,115,22,0.3)', borderRadius:12, padding:14, marginTop:10 },
  nutritionLbl: { fontWeight:'700', color:'#fdba74', marginBottom:7, fontSize:13 },
  nutritionTip: { fontSize:12, color:'#ffedd5', marginBottom:3 },

  notes:        { backgroundColor:'rgba(255,255,255,0.04)', borderRadius:12, padding:14, borderWidth:1, borderColor:'rgba(255,255,255,0.08)', marginTop:10 },
  notesLbl:     { fontWeight:'700', color:'#fff', marginBottom:5, fontSize:13 },
  notesTxt:     { fontSize:12, color:'rgba(255,255,255,0.7)', lineHeight:18 },
});
