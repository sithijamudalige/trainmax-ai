// screens/coach/CoachTeamScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, StatusBar, Alert, Modal,
  Platform, RefreshControl, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabaseClient';
import { API_BASE } from '../../services/api';

const POSITIONS = [
  'Goalkeeper','Right Back','Left Back','Centre Back',
  'Defensive Mid','Central Mid','Attacking Mid',
  'Right Wing','Left Wing','Striker','Second Striker',
];
const ROLES = ['player','captain','vice-captain','goalkeeper'];
const TEAM_COLORS = [
  '#10b981','#6a11cb','#2575fc','#f59e0b',
  '#ef4444','#0ea5e9','#ec4899','#8b5cf6',
];

const initials = s => (s || '?').charAt(0).toUpperCase();

// ── API helper ────────────────────────────────────────────────────────────────
async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}

async function api(path, opts = {}) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

// ── Option picker modal ───────────────────────────────────────────────────────
function OptionModal({ visible, title, options, value, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={s.optionModal}>
          <Text style={s.optionModalTitle}>{title}</Text>
          <ScrollView>
            {options.map(opt => (
              <TouchableOpacity
                key={opt || '__none__'}
                style={[s.optionRow, value === opt && s.optionRowActive]}
                onPress={() => { onSelect(opt); onClose(); }}
              >
                <Text style={[s.optionText, value === opt && s.optionTextActive]}>
                  {opt || '— None —'}
                </Text>
                {value === opt && <Text style={{ color: '#10b981' }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={s.optionCancelBtn} onPress={onClose}>
            <Text style={s.optionCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Search bar with Search + Clear/Show All buttons ────────────────────────────
function PlayerSearchBar({ value, onChangeText, onSearch, onClear, placeholder, resultCount }) {
  return (
    <View>
      <View style={s.searchBarRow}>
        <View style={s.searchInputWrap}>
          <Text style={s.searchIco}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder={placeholder}
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity style={s.searchBtn} onPress={onSearch}>
          <Text style={s.searchBtnText}>🔍 Search</Text>
        </TouchableOpacity>
      </View>
      <View style={s.searchMetaRow}>
        <Text style={s.countText}>{resultCount} found</Text>
        {!!value && (
          <TouchableOpacity onPress={onClear}>
            <Text style={s.clearLinkText}>✕ Clear · Show All</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CoachTeamScreen({ navigation }) {
  const [pageLoading, setPageLoading] = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const [teams,       setTeams]       = useState([]);
  const [allPlayers,  setAllPlayers]  = useState([]);
  const [refreshing,  setRefreshing]  = useState(false);

  // View: 'list' | 'create' | 'detail'
  const [view,         setView]         = useState('list');
  const [activeTab,    setActiveTab]    = useState('roster');
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Create form
  const [fName,          setFName]          = useState('');
  const [fDesc,          setFDesc]          = useState('');
  const [fColor,         setFColor]         = useState('#10b981');
  const [createPlayers,  setCreatePlayers]  = useState([]);
  const [createSearch,   setCreateSearch]   = useState('');

  // Detail — edit info
  const [eInfoName,  setEInfoName]  = useState('');
  const [eInfoDesc,  setEInfoDesc]  = useState('');
  const [eInfoColor, setEInfoColor] = useState('#10b981');

  // Detail — add players
  const [addSearch, setAddSearch] = useState('');

  // Inline member edits {[player_id]: {role, position, jersey_number, collaborator}}
  const [memberEdits,    setMemberEdits]    = useState({});
  const [expandedMember, setExpandedMember] = useState(null);

  // Picker modal state
  const [picker, setPicker] = useState(null); // {type, playerId, context}

  useEffect(() => { init(); }, []);

  const init = async () => {
    setPageLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { return; }
      const [td, pd] = await Promise.all([
        api('/api/teams'),
        api('/api/teams/players'),
      ]);
      setTeams(td.teams || []);
      setAllPlayers(pd.players || []);
    } catch (e) {
      showErr(e.message);
    } finally {
      setPageLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await init();
    setRefreshing(false);
  };

  const showErr   = msg => { setError(msg);   setTimeout(() => setError(''),   5000); };
  const showFlash = msg => { setSuccess(msg); setTimeout(() => setSuccess(''), 3500); };

  // ── Create helpers ────────────────────────────────────────────────────────
  const resetCreate = () => {
    setFName(''); setFDesc(''); setFColor('#10b981');
    setCreatePlayers([]); setCreateSearch('');
  };

  const isInCreate = id => createPlayers.some(m => m.player_id === id);

  const toggleCreate = p => {
    if (isInCreate(p.id)) {
      setCreatePlayers(prev => prev.filter(m => m.player_id !== p.id));
      return;
    }
    if (createPlayers.length >= 20) { showErr('Maximum 20 players allowed.'); return; }
    setCreatePlayers(prev => [...prev, {
      player_id:     p.id,
      role:          'player',
      position:      p.position || '',
      jersey_number: '',
      collaborator:  false,
      _name:         p.user_name || p.email || '?',
    }]);
  };

  const updateCreate = (pid, field, val) =>
    setCreatePlayers(prev => prev.map(m => m.player_id === pid ? { ...m, [field]: val } : m));

  const handleCreate = async () => {
    if (!fName.trim())               { showErr('Team name is required.'); return; }
    if (createPlayers.length < 2)    { showErr('Add at least 2 players.'); return; }
    setSaving(true);
    try {
      const body = {
        name:        fName.trim(),
        description: fDesc.trim(),
        color:       fColor,
        members:     createPlayers.map(m => ({
          player_id:     m.player_id,
          role:          m.role,
          position:      m.position,
          jersey_number: m.jersey_number ? parseInt(m.jersey_number) : null,
          collaborator:  m.collaborator,
        })),
      };
      const res = await api('/api/teams', { method: 'POST', body: JSON.stringify(body) });
      setTeams(prev => [res.team, ...prev]);
      resetCreate();
      setView('list');
      showFlash('Team created successfully!');
    } catch (e) { showErr(e.message); }
    finally { setSaving(false); }
  };

  // ── Detail helpers ────────────────────────────────────────────────────────
  const openTeam = async team => {
    setPageLoading(true);
    setMemberEdits({});
    setActiveTab('roster');
    setExpandedMember(null);
    try {
      const res = await api(`/api/teams/${team.id}`);
      const t   = res.team;
      setSelectedTeam(t);
      setEInfoName(t.name);
      setEInfoDesc(t.description || '');
      setEInfoColor(t.color || '#10b981');
      setView('detail');
    } catch (e) { showErr(e.message); }
    finally { setPageLoading(false); }
  };

  const refreshTeam = async () => {
    try {
      const res = await api(`/api/teams/${selectedTeam.id}`);
      setSelectedTeam(res.team);
      setMemberEdits({});
      setExpandedMember(null);
    } catch (e) { showErr(e.message); }
  };

  const handleDeleteTeam = () => {
    Alert.alert(
      'Delete Team',
      `Delete "${selectedTeam?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api(`/api/teams/${selectedTeam.id}`, { method: 'DELETE' });
              setTeams(prev => prev.filter(t => t.id !== selectedTeam.id));
              setView('list');
              showFlash('Team deleted.');
            } catch (e) { showErr(e.message); }
          },
        },
      ]
    );
  };

  const handleDeleteFromList = (teamId, name) => {
    Alert.alert(
      'Delete Team',
      `Delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api(`/api/teams/${teamId}`, { method: 'DELETE' });
              setTeams(prev => prev.filter(t => t.id !== teamId));
              showFlash('Team deleted.');
            } catch (e) { showErr(e.message); }
          },
        },
      ]
    );
  };

  const handleSaveInfo = async () => {
    if (!eInfoName.trim()) { showErr('Team name cannot be empty.'); return; }
    setSaving(true);
    try {
      const body = {
        name:        eInfoName.trim(),
        description: eInfoDesc.trim(),
        color:       eInfoColor,
      };
      const res = await api(`/api/teams/${selectedTeam.id}`, {
        method: 'PUT', body: JSON.stringify(body),
      });
      setSelectedTeam(prev => ({ ...prev, ...res.team }));
      setTeams(prev => prev.map(t => t.id === selectedTeam.id ? { ...t, ...res.team } : t));
      showFlash('Team info updated!');
      setActiveTab('roster');
    } catch (e) { showErr(e.message); }
    finally { setSaving(false); }
  };

  const getMemberVal = (member, field) => {
    if (memberEdits[member.player_id]?.[field] !== undefined)
      return memberEdits[member.player_id][field];
    return member[field] ?? '';
  };

  const setMemberEdit = (pid, field, val) =>
    setMemberEdits(prev => ({ ...prev, [pid]: { ...(prev[pid] || {}), [field]: val } }));

  const hasDirty = Object.keys(memberEdits).length > 0;

  const saveAllMemberEdits = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(memberEdits).map(([pid, changes]) => {
          const body = {
            ...changes,
            jersey_number: changes.jersey_number ? parseInt(changes.jersey_number) : null,
          };
          return api(`/api/teams/${selectedTeam.id}/members/${pid}`, {
            method: 'PUT', body: JSON.stringify(body),
          });
        })
      );
      await refreshTeam();
      showFlash('Roster changes saved!');
    } catch (e) { showErr(e.message); }
    finally { setSaving(false); }
  };

  const handleRemoveMember = (pid, pname) => {
    if ((selectedTeam?.members?.length ?? 0) <= 2) {
      showErr('Team must have at least 2 players.'); return;
    }
    Alert.alert(
      'Remove Player',
      `Remove ${pname} from the team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await api(`/api/teams/${selectedTeam.id}/members/${pid}`, { method: 'DELETE' });
              await refreshTeam();
              showFlash(`${pname} removed.`);
            } catch (e) { showErr(e.message); }
          },
        },
      ]
    );
  };

  const currentPlayerIds = new Set((selectedTeam?.members || []).map(m => m.player_id));

  const handleAddPlayer = async player => {
    if ((selectedTeam?.members?.length ?? 0) >= 20) {
      showErr('Team already has 20 players.'); return;
    }
    setSaving(true);
    try {
      const body = {
        player_id:   player.id,
        role:        'player',
        position:    player.position || '',
        collaborator:false,
      };
      await api(`/api/teams/${selectedTeam.id}/members`, {
        method: 'POST', body: JSON.stringify(body),
      });
      await refreshTeam();
      showFlash(`${player.user_name || player.email} added!`);
    } catch (e) { showErr(e.message); }
    finally { setSaving(false); }
  };

  // ── PLAYER FILTERING — name-prefix search ─────────────────────────────────
  // Typing "s" -> shows players whose NAME starts with "s".
  // Typing "si" -> narrows to names starting with "si". Empty query -> show all.
  // If nothing matches by name prefix, falls back to substring match across
  // position/club/country so a search for "striker" or "Brazil" still works.
  const filterPlayers = (query, exclude = new Set()) => {
    const pool = allPlayers.filter(p => !exclude.has(p.id));
    const q = query.trim().toLowerCase();
    if (!q) return pool;

    const nameStartsWith = pool.filter(p =>
      (p.user_name || '').toLowerCase().startsWith(q)
    );
    if (nameStartsWith.length > 0) return nameStartsWith;

    // Fallback: substring match across name/email/position/club/country
    return pool.filter(p => {
      const haystack = [p.user_name, p.email, p.position, p.club, p.country]
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  };

  // ── Picker helpers ────────────────────────────────────────────────────────
  const getPickerValue = () => {
    if (!picker) return '';
    const { type, playerId, context } = picker;
    if (context === 'create') {
      const m = createPlayers.find(p => p.player_id === playerId);
      return m ? (m[type] || '') : '';
    }
    const member = (selectedTeam?.members || []).find(m => m.player_id === playerId);
    return member ? (getMemberVal(member, type) || '') : '';
  };

  const handlePickerSelect = val => {
    if (!picker) return;
    const { type, playerId, context } = picker;
    if (context === 'create') updateCreate(playerId, type, val);
    else                      setMemberEdit(playerId, type, val);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (pageLoading) return (
    <View style={s.loadingWrap}>
      <StatusBar barStyle="light-content" />
      <ActivityIndicator size="large" color="#10b981" />
      <Text style={s.loadingText}>Loading teams…</Text>
    </View>
  );

  const createResults = filterPlayers(createSearch);
  const addResults     = filterPlayers(addSearch, currentPlayerIds);

  return (
    <View style={{ flex: 1, backgroundColor: '#0f0c29' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0c29" />

      {/* ── Option picker modal ── */}
      {!!picker && (
        <OptionModal
          visible={!!picker}
          title={picker.type === 'role' ? 'Select Role' : 'Select Position'}
          options={picker.type === 'role' ? ROLES : ['', ...POSITIONS]}
          value={getPickerValue()}
          onSelect={handlePickerSelect}
          onClose={() => setPicker(null)}
        />
      )}

      {/* ── Header ── */}
      <LinearGradient
        colors={['rgba(16,185,129,0.35)', 'rgba(15,12,41,0)']}
        style={s.topBar}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.topTitle}>
            {view === 'create' ? '➕ Create Team'
              : view === 'detail' ? `👥 ${selectedTeam?.name}`
              : '👥 Team Management'}
          </Text>
          <Text style={s.topSub}>
            {view === 'list'
              ? `${teams.length} team${teams.length !== 1 ? 's' : ''} · 2–20 players each`
              : view === 'create'
                ? 'Pick players and assign roles'
                : `${selectedTeam?.members?.length ?? 0} players`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {view !== 'list' && (
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => { setView('list'); setError(''); setSuccess(''); resetCreate(); }}
            >
              <Text style={s.backBtnText}>← Back</Text>
            </TouchableOpacity>
          )}
          {view === 'list' && (
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => { resetCreate(); setView('create'); }}
            >
              <Text style={s.primaryBtnText}>➕ New Team</Text>
            </TouchableOpacity>
          )}
          {view === 'detail' && (
            <TouchableOpacity style={s.deleteHeaderBtn} onPress={handleDeleteTeam}>
              <Text style={{ fontSize: 16 }}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── Alert bars ── */}
      {!!error   && <View style={s.alertErr}><Text style={s.alertErrText}>⚠️ {error}</Text></View>}
      {!!success && <View style={s.alertOk}><Text style={s.alertOkText}>✅ {success}</Text></View>}

      {/* ══════════════════════════ LIST VIEW ══════════════════════════ */}
      {view === 'list' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
          }
          showsVerticalScrollIndicator={false}
        >
          {teams.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 52, marginBottom: 14 }}>👥</Text>
              <Text style={s.emptyTitle}>No Teams Yet</Text>
              <Text style={s.emptySub}>Create your first team to start managing players.</Text>
              <TouchableOpacity
                style={s.primaryBtn}
                onPress={() => { resetCreate(); setView('create'); }}
              >
                <Text style={s.primaryBtnText}>➕ Create First Team</Text>
              </TouchableOpacity>
            </View>
          ) : (
            teams.map(t => (
              <TouchableOpacity
                key={t.id}
                style={s.teamCard}
                activeOpacity={0.85}
                onPress={() => openTeam(t)}
              >
                <View style={[s.teamColorBar, { backgroundColor: t.color || '#10b981' }]} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <Text style={s.teamCardName}>{t.name}</Text>
                  <Text style={{ fontSize: 20 }}>⚽</Text>
                </View>
                {!!t.description && (
                  <Text style={s.teamCardDesc} numberOfLines={2}>{t.description}</Text>
                )}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <View style={s.badge}><Text style={s.badgeText}>👥 {t.member_count ?? 0} players</Text></View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={s.blueBtn} onPress={() => openTeam(t)}>
                    <Text style={s.blueBtnText}>✏️ Manage</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.dangerBtn}
                    onPress={() => handleDeleteFromList(t.id, t.name)}
                  >
                    <Text style={s.dangerBtnText}>🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* ══════════════════════════ CREATE VIEW ══════════════════════════ */}
      {view === 'create' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Team info */}
          <Text style={s.sectionTitle}>📋 Team Info</Text>

          <Text style={s.label}>Team Name *</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Alpha Wolves"
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={fName}
            onChangeText={setFName}
          />

          <Text style={s.label}>Description</Text>
          <TextInput
            style={[s.input, { minHeight: 68, textAlignVertical: 'top' }]}
            placeholder="Describe this team…"
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={fDesc}
            onChangeText={setFDesc}
            multiline
          />

          <Text style={s.label}>Team Color</Text>
          <View style={s.colorRow}>
            {TEAM_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[s.colorDot, { backgroundColor: c }, fColor === c && s.colorDotActive]}
                onPress={() => setFColor(c)}
              />
            ))}
          </View>

          <View style={s.divider} />

          {/* Player search */}
          <Text style={s.sectionTitle}>🔍 Player Registry</Text>
          <PlayerSearchBar
            value={createSearch}
            onChangeText={setCreateSearch}
            onSearch={() => Keyboard.dismiss()}
            onClear={() => { setCreateSearch(''); Keyboard.dismiss(); }}
            placeholder="Type a name — e.g. 's' then 'si'…"
            resultCount={createResults.length}
          />

          <View style={{ marginTop: 10 }}>
            {createResults.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptySub}>No players match "{createSearch}".</Text>
              </View>
            ) : (
              createResults.map(p => {
                const sel   = isInCreate(p.id);
                const maxed = createPlayers.length >= 20 && !sel;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[s.playerRow, sel && s.playerRowActive, maxed && { opacity: 0.4 }]}
                    onPress={() => !maxed && toggleCreate(p)}
                    activeOpacity={maxed ? 1 : 0.8}
                  >
                    <View style={s.playerAvatar}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                        {initials(p.user_name)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.playerName}>{p.user_name || '(no name)'}</Text>
                      <Text style={s.playerMeta}>
                        {[p.position, p.club, p.country].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <View style={[s.checkBox, sel && s.checkBoxActive]}>
                      {sel && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Selected players — assign details */}
          {createPlayers.length > 0 && (
            <>
              <View style={s.divider} />
              <Text style={s.sectionTitle}>🎽 Assign Details ({createPlayers.length})</Text>
              {createPlayers.map(m => (
                <View key={m.player_id} style={s.memberCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <View style={s.playerAvatar}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                        {initials(m._name)}
                      </Text>
                    </View>
                    <Text style={[s.playerName, { flex: 1 }]}>{m._name}</Text>
                    <TouchableOpacity
                      style={s.removeSmBtn}
                      onPress={() => setCreatePlayers(prev => prev.filter(p => p.player_id !== m.player_id))}
                    >
                      <Text style={s.removeSmBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <TouchableOpacity
                      style={s.miniPickerBtn}
                      onPress={() => setPicker({ type: 'role', playerId: m.player_id, context: 'create' })}
                    >
                      <Text style={s.miniPickerText}>{m.role || 'Role ▼'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.miniPickerBtn}
                      onPress={() => setPicker({ type: 'position', playerId: m.player_id, context: 'create' })}
                    >
                      <Text style={s.miniPickerText}>{m.position || 'Position ▼'}</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={s.miniInput}
                      placeholder="#"
                      placeholderTextColor="rgba(255,255,255,0.28)"
                      value={String(m.jersey_number || '')}
                      onChangeText={v => updateCreate(m.player_id, 'jersey_number', v)}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <TouchableOpacity
                      style={[s.collabBtn, m.collaborator && s.collabBtnActive]}
                      onPress={() => updateCreate(m.player_id, 'collaborator', !m.collaborator)}
                    >
                      <Text style={[s.collabBtnText, m.collaborator && { color: '#38bdf8' }]}>
                        🤝 {m.collaborator ? 'Collab ✓' : 'Collab'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Create actions */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => { setView('list'); resetCreate(); }}
            >
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.primaryBtn, { flex: 1 }, saving && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.primaryBtnText}>✅ Create Team</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ══════════════════════════ DETAIL VIEW ══════════════════════════ */}
      {view === 'detail' && !!selectedTeam && (
        <>
          {/* Team header */}
          <View style={s.detailHdr}>
            <View style={[s.detailHdrBar, { backgroundColor: selectedTeam.color || '#10b981' }]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View style={[s.colorDotSm, { backgroundColor: selectedTeam.color || '#10b981' }]} />
              <Text style={s.detailHdrName}>{selectedTeam.name}</Text>
            </View>
            {!!selectedTeam.description && (
              <Text style={s.detailHdrMeta}>{selectedTeam.description}</Text>
            )}
            <View style={s.badge}>
              <Text style={s.badgeText}>👥 {selectedTeam.members?.length ?? 0} / 20 players</Text>
            </View>
          </View>

          {/* Tab bar */}
          <View style={s.tabBar}>
            {[
              { id: 'roster',      label: '🎽 Roster'      },
              { id: 'edit-info',   label: '✏️ Edit Info'   },
              { id: 'add-players', label: '➕ Add Players'  },
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[s.tab, activeTab === tab.id && s.tabActive]}
                onPress={() => { setActiveTab(tab.id); setError(''); setSuccess(''); }}
              >
                <Text style={[s.tabText, activeTab === tab.id && s.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── ROSTER TAB ── */}
          {activeTab === 'roster' && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {hasDirty && (
                <View style={s.dirtyBar}>
                  <Text style={s.dirtyBarText}>● Unsaved changes</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={s.discardBtn}
                      onPress={() => { setMemberEdits({}); setExpandedMember(null); }}
                    >
                      <Text style={s.discardBtnText}>↩ Discard</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.saveChangesBtn, saving && { opacity: 0.6 }]}
                      onPress={saveAllMemberEdits}
                      disabled={saving}
                    >
                      {saving
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={s.saveChangesBtnText}>💾 Save</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {(selectedTeam.members || []).map((m, i) => {
                const isDirty    = !!memberEdits[m.player_id];
                const isExpanded = expandedMember === m.player_id;
                const pname      = m.profile?.user_name || '?';
                return (
                  <View key={m.id} style={[s.rosterCard, isDirty && s.rosterCardDirty]}>
                    <TouchableOpacity
                      style={s.rosterCardTop}
                      activeOpacity={0.8}
                      onPress={() => setExpandedMember(isExpanded ? null : m.player_id)}
                    >
                      <View style={s.rosterAvatarWrap}>
                        <Text style={s.rosterNum}>{i + 1}</Text>
                        <View style={s.playerAvatar}>
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                            {initials(pname)}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={s.rosterName}>{pname}</Text>
                          {isDirty && (
                            <View style={s.editedBadge}>
                              <Text style={s.editedBadgeText}>edited</Text>
                            </View>
                          )}
                        </View>
                        <Text style={s.rosterMeta}>
                          {getMemberVal(m, 'role')}
                          {' · '}{getMemberVal(m, 'position') || 'No position'}
                          {getMemberVal(m, 'jersey_number') ? ` · #${getMemberVal(m, 'jersey_number')}` : ''}
                        </Text>
                      </View>
                      <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 14 }}>
                        {isExpanded ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={s.rosterEditArea}>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                          <TouchableOpacity
                            style={s.miniPickerBtn}
                            onPress={() => setPicker({ type: 'role', playerId: m.player_id, context: 'roster' })}
                          >
                            <Text style={s.miniPickerText}>
                              {getMemberVal(m, 'role') || 'Role ▼'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={s.miniPickerBtn}
                            onPress={() => setPicker({ type: 'position', playerId: m.player_id, context: 'roster' })}
                          >
                            <Text style={s.miniPickerText}>
                              {getMemberVal(m, 'position') || 'Position ▼'}
                            </Text>
                          </TouchableOpacity>
                          <TextInput
                            style={s.miniInput}
                            placeholder="#"
                            placeholderTextColor="rgba(255,255,255,0.28)"
                            value={String(getMemberVal(m, 'jersey_number') || '')}
                            onChangeText={v => setMemberEdit(m.player_id, 'jersey_number', v)}
                            keyboardType="numeric"
                            maxLength={2}
                          />
                          <TouchableOpacity
                            style={[
                              s.collabBtn,
                              getMemberVal(m, 'collaborator') && s.collabBtnActive,
                            ]}
                            onPress={() => setMemberEdit(
                              m.player_id, 'collaborator', !getMemberVal(m, 'collaborator')
                            )}
                          >
                            <Text style={[
                              s.collabBtnText,
                              getMemberVal(m, 'collaborator') && { color: '#38bdf8' },
                            ]}>
                              🤝 {getMemberVal(m, 'collaborator') ? 'Collab ✓' : 'Collab'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={s.rosterMetaSmall}>
                          Club: {m.profile?.club || '—'} · Country: {m.profile?.country || '—'}
                          · {m.profile?.email || ''}
                        </Text>
                        <TouchableOpacity
                          style={s.removeBtn}
                          onPress={() => handleRemoveMember(m.player_id, pname)}
                        >
                          <Text style={s.removeBtnText}>🗑️ Remove from team</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* ── EDIT INFO TAB ── */}
          {activeTab === 'edit-info' && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={s.sectionTitle}>✏️ Edit Team Information</Text>

              <Text style={s.label}>Team Name *</Text>
              <TextInput
                style={s.input}
                value={eInfoName}
                onChangeText={setEInfoName}
                placeholderTextColor="rgba(255,255,255,0.28)"
              />

              <Text style={s.label}>Description</Text>
              <TextInput
                style={[s.input, { minHeight: 68, textAlignVertical: 'top' }]}
                value={eInfoDesc}
                onChangeText={setEInfoDesc}
                multiline
                placeholderTextColor="rgba(255,255,255,0.28)"
              />

              <Text style={s.label}>Team Color</Text>
              <View style={s.colorRow}>
                {TEAM_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[s.colorDot, { backgroundColor: c }, eInfoColor === c && s.colorDotActive]}
                    onPress={() => setEInfoColor(c)}
                  />
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setActiveTab('roster')}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.primaryBtn, { flex: 1 }, saving && { opacity: 0.6 }]}
                  onPress={handleSaveInfo}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.primaryBtnText}>💾 Save Info</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* ── ADD PLAYERS TAB ── */}
          {activeTab === 'add-players' && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={s.sectionTitle}>🔍 Player Registry</Text>
                <Text style={s.countText}>
                  {selectedTeam?.members?.length ?? 0} / 20 on team
                </Text>
              </View>

              <PlayerSearchBar
                value={addSearch}
                onChangeText={setAddSearch}
                onSearch={() => Keyboard.dismiss()}
                onClear={() => { setAddSearch(''); Keyboard.dismiss(); }}
                placeholder="Type a name — e.g. 's' then 'si'…"
                resultCount={addResults.length}
              />

              <View style={{ marginTop: 10 }}>
                {addResults.length === 0 ? (
                  <View style={s.empty}>
                    <Text style={s.emptySub}>
                      {allPlayers.length === currentPlayerIds.size
                        ? 'All registered players are already in this team.'
                        : `No players match "${addSearch}".`}
                    </Text>
                  </View>
                ) : (
                  addResults.map(p => (
                    <View key={p.id} style={s.playerRow}>
                      <View style={s.playerAvatar}>
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                          {initials(p.user_name)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.playerName}>{p.user_name || '(no name)'}</Text>
                        <Text style={s.playerMeta}>
                          {[p.position, p.club, p.country].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          s.addPlayerBtn,
                          (saving || (selectedTeam?.members?.length ?? 0) >= 20) && { opacity: 0.4 },
                        ]}
                        onPress={() => handleAddPlayer(p)}
                        disabled={saving || (selectedTeam?.members?.length ?? 0) >= 20}
                      >
                        <Text style={s.addPlayerBtnText}>+ Add</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  loadingWrap:     { flex:1, backgroundColor:'#0f0c29', alignItems:'center', justifyContent:'center', gap:14 },
  loadingText:     { color:'rgba(255,255,255,0.4)', fontSize:13 },

  topBar:          { paddingTop: Platform.OS === 'android' ? 36 : 52, paddingHorizontal:16, paddingBottom:14, flexDirection:'row', alignItems:'center', gap:10 },
  topTitle:        { color:'#fff', fontSize:18, fontWeight:'800' },
  topSub:          { color:'rgba(255,255,255,0.4)', fontSize:11, marginTop:2 },
  backBtn:         { backgroundColor:'rgba(255,255,255,0.08)', borderWidth:1, borderColor:'rgba(255,255,255,0.15)', borderRadius:10, paddingHorizontal:14, paddingVertical:8 },
  backBtnText:     { color:'rgba(255,255,255,0.75)', fontWeight:'600', fontSize:13 },
  primaryBtn:      { backgroundColor:'#059669', borderRadius:12, paddingHorizontal:16, paddingVertical:10, alignItems:'center', justifyContent:'center', flexDirection:'row', gap:6 },
  primaryBtnText:  { color:'#fff', fontWeight:'700', fontSize:14 },
  deleteHeaderBtn: { padding:8, backgroundColor:'rgba(239,68,68,0.12)', borderRadius:10, borderWidth:1, borderColor:'rgba(239,68,68,0.2)' },

  alertErr:        { backgroundColor:'rgba(239,68,68,0.12)', borderBottomWidth:1, borderBottomColor:'rgba(239,68,68,0.3)', padding:10, paddingHorizontal:16 },
  alertErrText:    { color:'#fca5a5', fontSize:12 },
  alertOk:         { backgroundColor:'rgba(16,185,129,0.12)', borderBottomWidth:1, borderBottomColor:'rgba(16,185,129,0.3)', padding:10, paddingHorizontal:16 },
  alertOkText:     { color:'#6ee7b7', fontSize:12 },

  teamCard:        { backgroundColor:'rgba(255,255,255,0.05)', borderWidth:1, borderColor:'rgba(255,255,255,0.1)', borderRadius:18, padding:18, marginBottom:14, overflow:'hidden' },
  teamColorBar:    { position:'absolute', top:0, left:0, right:0, height:4 },
  teamCardName:    { color:'#fff', fontWeight:'800', fontSize:18 },
  teamCardDesc:    { color:'rgba(255,255,255,0.42)', fontSize:12, lineHeight:18, marginBottom:10 },
  badge:           { backgroundColor:'rgba(255,255,255,0.08)', borderRadius:20, paddingHorizontal:12, paddingVertical:4, alignSelf:'flex-start' },
  badgeText:       { color:'rgba(255,255,255,0.6)', fontSize:12 },
  blueBtn:         { backgroundColor:'#2575fc', borderRadius:9, paddingHorizontal:16, paddingVertical:7 },
  blueBtnText:     { color:'#fff', fontWeight:'600', fontSize:12 },
  dangerBtn:       { backgroundColor:'rgba(239,68,68,0.12)', borderWidth:1, borderColor:'rgba(239,68,68,0.25)', borderRadius:9, paddingHorizontal:12, paddingVertical:7 },
  dangerBtnText:   { color:'#fca5a5', fontSize:12, fontWeight:'600' },

  empty:           { backgroundColor:'rgba(255,255,255,0.03)', borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderRadius:18, padding:32, alignItems:'center', marginBottom:14 },
  emptyTitle:      { color:'#fff', fontWeight:'700', fontSize:18, marginBottom:8 },
  emptySub:        { color:'rgba(255,255,255,0.38)', fontSize:13, textAlign:'center', marginBottom:20 },

  sectionTitle:    { color:'rgba(255,255,255,0.85)', fontWeight:'700', fontSize:15, marginBottom:14 },
  label:           { color:'rgba(255,255,255,0.5)', fontSize:10, fontWeight:'500', textTransform:'uppercase', letterSpacing:0.8, marginBottom:7 },
  input:           { backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.12)', borderRadius:12, padding:12, color:'#fff', fontSize:14, marginBottom:14 },
  divider:         { height:1, backgroundColor:'rgba(255,255,255,0.07)', marginVertical:16 },

  colorRow:        { flexDirection:'row', gap:10, flexWrap:'wrap', marginBottom:14 },
  colorDot:        { width:30, height:30, borderRadius:15, borderWidth:3, borderColor:'transparent' },
  colorDotActive:  { borderColor:'#fff', transform:[{ scale:1.15 }] },
  colorDotSm:      { width:12, height:12, borderRadius:6 },

  // ── Search bar (new) ──
  searchBarRow:    { flexDirection:'row', gap:8, alignItems:'center' },
  searchInputWrap: { flex:1, position:'relative', justifyContent:'center' },
  searchIco:       { position:'absolute', left:12, fontSize:14, zIndex:1 },
  searchInput:     { backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.12)', borderRadius:12, paddingLeft:38, paddingRight:12, paddingVertical:11, color:'#fff', fontSize:14 },
  searchBtn:       { backgroundColor:'#10b981', borderRadius:12, paddingHorizontal:14, paddingVertical:11 },
  searchBtnText:   { color:'#fff', fontWeight:'700', fontSize:12 },
  searchMetaRow:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:8 },
  countText:       { color:'rgba(255,255,255,0.35)', fontSize:11, textTransform:'uppercase', letterSpacing:0.5 },
  clearLinkText:   { color:'#a78bfa', fontSize:11, fontWeight:'700' },

  playerRow:       { backgroundColor:'rgba(255,255,255,0.05)', borderWidth:1, borderColor:'rgba(255,255,255,0.09)', borderRadius:12, padding:10, marginBottom:7, flexDirection:'row', alignItems:'center', gap:10 },
  playerRowActive: { backgroundColor:'rgba(16,185,129,0.1)', borderColor:'#10b981' },
  playerAvatar:    { width:36, height:36, borderRadius:18, backgroundColor:'#6a11cb', alignItems:'center', justifyContent:'center', flexShrink:0 },
  playerName:      { color:'#fff', fontWeight:'600', fontSize:13 },
  playerMeta:      { color:'rgba(255,255,255,0.4)', fontSize:11, marginTop:2 },
  checkBox:        { width:20, height:20, borderRadius:10, borderWidth:2, borderColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center' },
  checkBoxActive:  { backgroundColor:'#10b981', borderColor:'#10b981' },

  memberCard:      { backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderRadius:12, padding:12, marginBottom:8 },
  removeSmBtn:     { marginLeft:'auto', backgroundColor:'rgba(239,68,68,0.12)', borderRadius:5, paddingHorizontal:8, paddingVertical:3 },
  removeSmBtnText: { color:'#fca5a5', fontSize:11, fontWeight:'700' },

  miniPickerBtn:   { backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.12)', borderRadius:8, paddingHorizontal:10, paddingVertical:7 },
  miniPickerText:  { color:'#fff', fontSize:12 },
  miniInput:       { backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.12)', borderRadius:8, paddingHorizontal:8, paddingVertical:7, color:'#fff', fontSize:12, width:44 },
  collabBtn:       { backgroundColor:'rgba(14,165,233,0.08)', borderWidth:1, borderColor:'rgba(14,165,233,0.2)', borderRadius:8, paddingHorizontal:10, paddingVertical:7 },
  collabBtnActive: { backgroundColor:'rgba(14,165,233,0.18)', borderColor:'rgba(14,165,233,0.4)' },
  collabBtnText:   { color:'rgba(255,255,255,0.5)', fontSize:11, fontWeight:'600' },
  cancelBtn:       { backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.12)', borderRadius:12, paddingHorizontal:18, paddingVertical:10 },
  cancelBtnText:   { color:'rgba(255,255,255,0.6)', fontWeight:'600', fontSize:13 },

  detailHdr:       { backgroundColor:'rgba(255,255,255,0.05)', borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.07)', padding:14, paddingHorizontal:16, overflow:'hidden' },
  detailHdrBar:    { position:'absolute', top:0, left:0, right:0, height:3 },
  detailHdrName:   { color:'#fff', fontWeight:'800', fontSize:20 },
  detailHdrMeta:   { color:'rgba(255,255,255,0.45)', fontSize:12, marginBottom:6 },

  tabBar:          { backgroundColor:'rgba(255,255,255,0.04)', borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.07)', flexDirection:'row', padding:6, gap:4 },
  tab:             { flex:1, paddingVertical:8, borderRadius:8, alignItems:'center' },
  tabActive:       { backgroundColor:'rgba(255,255,255,0.1)' },
  tabText:         { color:'rgba(255,255,255,0.45)', fontSize:11, fontWeight:'600' },
  tabTextActive:   { color:'#fff' },

  dirtyBar:        { backgroundColor:'rgba(245,158,11,0.1)', borderWidth:1, borderColor:'rgba(245,158,11,0.25)', borderRadius:10, padding:10, marginBottom:12, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  dirtyBarText:    { color:'#fbbf24', fontSize:12, fontWeight:'600' },
  discardBtn:      { backgroundColor:'rgba(255,255,255,0.08)', borderRadius:8, paddingHorizontal:12, paddingVertical:6 },
  discardBtnText:  { color:'rgba(255,255,255,0.5)', fontSize:12 },
  saveChangesBtn:  { backgroundColor:'#059669', borderRadius:8, paddingHorizontal:14, paddingVertical:6 },
  saveChangesBtnText:{ color:'#fff', fontWeight:'700', fontSize:12 },

  rosterCard:       { backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1, borderColor:'rgba(255,255,255,0.07)', borderRadius:12, marginBottom:8, overflow:'hidden' },
  rosterCardDirty:  { borderColor:'rgba(245,158,11,0.4)' },
  rosterCardTop:    { flexDirection:'row', alignItems:'center', gap:10, padding:12 },
  rosterAvatarWrap: { flexDirection:'row', alignItems:'center', gap:6, flexShrink:0 },
  rosterNum:        { color:'rgba(255,255,255,0.3)', fontSize:11, width:18, textAlign:'right' },
  rosterName:       { color:'#fff', fontWeight:'600', fontSize:13 },
  rosterMeta:       { color:'rgba(255,255,255,0.4)', fontSize:11, marginTop:2 },
  rosterMetaSmall:  { color:'rgba(255,255,255,0.3)', fontSize:10, marginBottom:8, lineHeight:16 },
  rosterEditArea:   { borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.06)', padding:12, backgroundColor:'rgba(255,255,255,0.02)' },
  editedBadge:      { backgroundColor:'rgba(16,185,129,0.15)', borderRadius:20, paddingHorizontal:7, paddingVertical:2 },
  editedBadgeText:  { color:'#10b981', fontSize:9, fontWeight:'700' },
  removeBtn:        { backgroundColor:'rgba(239,68,68,0.1)', borderWidth:1, borderColor:'rgba(239,68,68,0.25)', borderRadius:8, padding:9, alignItems:'center', marginTop:6 },
  removeBtnText:    { color:'#fca5a5', fontSize:12, fontWeight:'600' },

  addPlayerBtn:     { backgroundColor:'rgba(16,185,129,0.14)', borderWidth:1, borderColor:'rgba(16,185,129,0.3)', borderRadius:8, paddingHorizontal:14, paddingVertical:7 },
  addPlayerBtnText: { color:'#10b981', fontWeight:'700', fontSize:12 },

  modalOverlay:     { flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'flex-end' },
  optionModal:      { backgroundColor:'#1a1535', borderTopLeftRadius:20, borderTopRightRadius:20, maxHeight:'70%', paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  optionModalTitle: { color:'#fff', fontWeight:'800', fontSize:16, padding:16, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.07)' },
  optionRow:        { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:14, paddingHorizontal:16, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.05)' },
  optionRowActive:  { backgroundColor:'rgba(16,185,129,0.1)' },
  optionText:       { color:'rgba(255,255,255,0.7)', fontSize:14 },
  optionTextActive: { color:'#10b981', fontWeight:'700' },
  optionCancelBtn:  { margin:14, backgroundColor:'rgba(255,255,255,0.07)', borderRadius:12, padding:13, alignItems:'center' },
  optionCancelText: { color:'rgba(255,255,255,0.6)', fontWeight:'600', fontSize:14 },
});