import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import CoachNavbar from '../components/CoachNavbar';

const API = 'http://127.0.0.1:5000';

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

/* ─── styles ───────────────────────────────────────────────────────────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}

  .ct-root{min-height:100vh;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);font-family:'Inter',sans-serif;color:#fff;}
  .ct-body{padding:28px 32px;max-width:1240px;margin:0 auto;}

  /* buttons */
  .ct-btn-primary{background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:12px;padding:10px 20px;font-size:14px;font-weight:600;font-family:'Rajdhani',sans-serif;letter-spacing:.4px;cursor:pointer;transition:opacity .2s,transform .15s;display:flex;align-items:center;gap:7px;}
  .ct-btn-primary:hover:not(:disabled){opacity:.88;transform:translateY(-1px);}
  .ct-btn-primary:disabled{opacity:.5;cursor:not-allowed;}
  .ct-btn-blue{background:linear-gradient(135deg,#2575fc,#6a11cb);color:#fff;border:none;border-radius:12px;padding:10px 20px;font-size:14px;font-weight:600;font-family:'Rajdhani',sans-serif;cursor:pointer;transition:opacity .2s;display:flex;align-items:center;gap:7px;}
  .ct-btn-blue:hover{opacity:.88;}
  .ct-btn-secondary{background:rgba(255,255,255,.08);color:rgba(255,255,255,.75);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:10px 20px;font-size:14px;font-weight:500;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:7px;}
  .ct-btn-secondary:hover{background:rgba(255,255,255,.13);}
  .ct-btn-danger{background:rgba(239,68,68,.12);color:#fca5a5;border:1px solid rgba(239,68,68,.25);border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;transition:all .2s;}
  .ct-btn-danger:hover{background:rgba(239,68,68,.24);}
  .ct-btn-sm{padding:6px 14px;font-size:12px;border-radius:8px;}

  /* page header */
  .ct-page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px;}
  .ct-page-title{font-family:'Rajdhani',sans-serif;font-size:26px;font-weight:700;}
  .ct-page-sub{font-size:13px;color:rgba(255,255,255,.45);margin-top:3px;}

  /* teams grid */
  .ct-teams-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;margin-bottom:32px;}
  .ct-team-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:22px;cursor:pointer;transition:all .2s;animation:ctFadeUp .5s ease both;position:relative;overflow:hidden;}
  .ct-team-card:hover{transform:translateY(-3px);border-color:rgba(255,255,255,.22);}
  .ct-color-bar{position:absolute;top:0;left:0;right:0;height:4px;border-radius:20px 20px 0 0;}
  .ct-team-card-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;}
  .ct-team-name{font-family:'Rajdhani',sans-serif;font-size:20px;font-weight:700;}
  .ct-team-desc{font-size:12px;color:rgba(255,255,255,.42);margin-bottom:14px;line-height:1.5;}
  .ct-team-meta{display:flex;gap:10px;flex-wrap:wrap;}
  .ct-badge{background:rgba(255,255,255,.08);border-radius:20px;padding:4px 12px;font-size:12px;color:rgba(255,255,255,.6);display:flex;align-items:center;gap:5px;}
  .ct-team-actions{display:flex;gap:8px;margin-top:16px;}
  @keyframes ctFadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}

  /* empty */
  .ct-empty{background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.1);border-radius:20px;padding:56px;text-align:center;margin-bottom:24px;}
  .ct-empty-icon{font-size:52px;margin-bottom:14px;}
  .ct-empty h3{font-family:'Rajdhani',sans-serif;font-size:22px;font-weight:700;margin-bottom:8px;}
  .ct-empty p{font-size:13px;color:rgba(255,255,255,.38);margin-bottom:20px;}

  /* error/success */
  .ct-error{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:11px 14px;font-size:13px;color:#fca5a5;margin-bottom:16px;display:flex;align-items:center;gap:8px;}
  .ct-success{background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);border-radius:10px;padding:11px 14px;font-size:13px;color:#6ee7b7;margin-bottom:16px;display:flex;align-items:center;gap:8px;}

  /* form */
  .ct-section-title{font-family:'Rajdhani',sans-serif;font-size:16px;font-weight:700;margin-bottom:14px;color:rgba(255,255,255,.85);display:flex;align-items:center;gap:8px;}
  .ct-group{margin-bottom:17px;}
  .ct-label{display:block;font-size:11px;font-weight:500;color:rgba(255,255,255,.5);margin-bottom:7px;text-transform:uppercase;letter-spacing:.8px;}
  .ct-input{width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:11px 14px;color:#fff;font-size:14px;font-family:'Inter',sans-serif;outline:none;transition:border-color .2s;}
  .ct-input::placeholder{color:rgba(255,255,255,.28);}
  .ct-input:focus{border-color:rgba(16,185,129,.55);}
  .ct-textarea{resize:vertical;min-height:68px;}
  .ct-divider{height:1px;background:rgba(255,255,255,.07);margin:20px 0;}

  /* colors */
  .ct-colors{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px;}
  .ct-color-dot{width:30px;height:30px;border-radius:50%;cursor:pointer;border:3px solid transparent;transition:all .2s;}
  .ct-color-dot.on{border-color:#fff;transform:scale(1.15);}

  /* player search list */
  .ct-search-wrap{position:relative;}
  .ct-search-ico{position:absolute;left:12px;top:50%;transform:translateY(-50%);opacity:.4;font-size:15px;pointer-events:none;}
  .ct-search-input{padding-left:38px !important;}
  .ct-player-list{margin-top:10px;display:flex;flex-direction:column;gap:7px;max-height:280px;overflow-y:auto;padding-right:2px;}
  .ct-player-list::-webkit-scrollbar{width:4px;}
  .ct-player-list::-webkit-scrollbar-track{background:transparent;}
  .ct-player-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:4px;}
  .ct-player-row{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:10px 13px;display:flex;align-items:center;gap:11px;cursor:pointer;transition:all .15s;}
  .ct-player-row:hover{border-color:rgba(16,185,129,.35);}
  .ct-player-row.on{background:rgba(16,185,129,.1);border-color:#10b981;}
  .ct-player-row.disabled{opacity:.4;cursor:not-allowed;}
  .ct-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6a11cb,#2575fc);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;}
  .ct-avatar.sm{width:30px;height:30px;font-size:12px;}
  .ct-player-info{flex:1;min-width:0;}
  .ct-player-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .ct-player-meta{font-size:11px;color:rgba(255,255,255,.4);margin-top:2px;}
  .ct-check{width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;transition:all .15s;}
  .ct-player-row.on .ct-check{background:#10b981;border-color:#10b981;color:#fff;}

  /* member editor rows */
  .ct-member-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;}
  .ct-member-card.dirty{border-color:rgba(245,158,11,.35);}
  .ct-member-card.new{border-color:rgba(16,185,129,.35);}
  .ct-member-left{display:flex;align-items:center;gap:10px;min-width:150px;flex:1;}
  .ct-member-fields{display:flex;gap:8px;flex-wrap:wrap;align-items:center;flex:2;}
  .ct-mini-select{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:6px 10px;color:#fff;font-size:12px;font-family:'Inter',sans-serif;outline:none;cursor:pointer;}
  .ct-mini-select option { background: #302b63; color: #fff; }
  .ct-mini-input{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:6px 10px;color:#fff;font-size:12px;font-family:'Inter',sans-serif;outline:none;width:60px;}
  .ct-mini-input::placeholder{color:rgba(255,255,255,.28);}
  .ct-collab-lbl{display:flex;align-items:center;gap:6px;font-size:12px;color:rgba(255,255,255,.55);cursor:pointer;user-select:none;}
  .ct-collab-box{width:16px;height:16px;border-radius:4px;border:1px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:10px;transition:all .15s;}
  .ct-collab-box.on{background:#6a11cb;border-color:#6a11cb;color:#fff;}

  /* mini badge */
  .ct-role-badge{background:rgba(101,16,203,.15);border:1px solid rgba(101,16,203,.3);border-radius:20px;padding:2px 10px;font-size:11px;color:#818cf8;}
  .ct-collab-badge{background:rgba(14,165,233,.12);border:1px solid rgba(14,165,233,.25);border-radius:20px;padding:2px 10px;font-size:11px;color:#38bdf8;}
  .ct-new-badge{background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);border-radius:20px;padding:2px 8px;font-size:10px;color:#10b981;}
  .ct-count-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
  .ct-count-txt{font-size:12px;color:rgba(255,255,255,.4);}
  .ct-count-num{font-weight:700;color:#10b981;}
  .ct-count-num.warn{color:#fbbf24;}
  .ct-count-num.err{color:#ef4444;}

  /* detail tabs */
  .ct-tabs{display:flex;gap:4px;margin-bottom:24px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:5px;}
  .ct-tab{flex:1;padding:9px 16px;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;font-family:'Rajdhani',sans-serif;letter-spacing:.3px;transition:all .2s;background:transparent;color:rgba(255,255,255,.5);}
  .ct-tab.on{background:rgba(255,255,255,.1);color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.2);}

  /* detail header */
  .ct-detail-hdr{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:24px 28px;margin-bottom:22px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;position:relative;overflow:hidden;}
  .ct-detail-hdr-bar{position:absolute;top:0;left:0;right:0;height:4px;}
  .ct-detail-name{font-family:'Rajdhani',sans-serif;font-size:28px;font-weight:700;margin-bottom:6px;}
  .ct-detail-meta{font-size:13px;color:rgba(255,255,255,.45);}
  .ct-github-link{color:#818cf8;text-decoration:none;font-size:13px;display:flex;align-items:center;gap:6px;margin-top:8px;transition:color .2s;}
  .ct-github-link:hover{color:#a5b4fc;}

  /* roster table */
  .ct-table-wrap{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:20px;overflow:hidden;}
  .ct-table-hdr{display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid rgba(255,255,255,.07);}
  .ct-table-title{font-family:'Rajdhani',sans-serif;font-size:17px;font-weight:700;}
  table.ct-tbl{width:100%;border-collapse:collapse;}
  table.ct-tbl th{font-size:11px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.7px;padding:10px 14px;text-align:left;border-bottom:1px solid rgba(255,255,255,.07);}
  table.ct-tbl td{padding:11px 14px;font-size:13px;color:rgba(255,255,255,.8);border-bottom:1px solid rgba(255,255,255,.04);vertical-align:middle;}
  table.ct-tbl tr:last-child td{border-bottom:none;}
  table.ct-tbl tr:hover td{background:rgba(255,255,255,.03);}

  /* inline edit in table */
  .ct-tbl-select{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:7px;padding:5px 9px;color:#fff;font-size:12px;outline:none;cursor:pointer;}
  .ct-tbl-select option { background: #302b63; color: #fff; }
  .ct-tbl-input{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:7px;padding:5px 9px;color:#fff;font-size:12px;outline:none;width:56px;}

  /* spinner */
  .ct-spinner{width:17px;height:17px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:ctSpin .7s linear infinite;}
  @keyframes ctSpin{to{transform:rotate(360deg);}}
  .ct-loading{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);}
  .ct-loading-spinner{width:44px;height:44px;border:3px solid rgba(255,255,255,.08);border-top-color:#10b981;border-radius:50%;animation:ctSpin .8s linear infinite;}

  /* two-col layout */
  .ct-two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
  @media(max-width:780px){.ct-two-col{grid-template-columns:1fr;}}
`;

/* ─── helpers ───────────────────────────────────────────────────────────────── */
async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}
async function api(path, opts = {}) {
  const token = await getToken();
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}
const initials = (s) => (s || '?').charAt(0).toUpperCase();
const countColor = (n) => n > 18 ? 'err' : n > 14 ? 'warn' : '';

/* ─── component ─────────────────────────────────────────────────────────────── */
export default function CoachTeam() {
  const navigate = useNavigate();

  // global
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [teams, setTeams]             = useState([]);
  const [allPlayers, setAllPlayers]   = useState([]);

  // view: 'list' | 'create' | 'detail'
  const [view, setView]               = useState('list');
  const [activeTab, setActiveTab]     = useState('roster'); // 'roster' | 'edit-info' | 'add-players'
  const [selectedTeam, setSelectedTeam] = useState(null);

  // create-form
  const [fName, setFName]   = useState('');
  const [fDesc, setFDesc]   = useState('');
  const [fColor, setFColor] = useState('#10b981');
  const [createPlayers, setCreatePlayers] = useState([]); // {player_id,role,position,jersey_number,collaborator,_name}
  const [createSearch, setCreateSearch]   = useState('');

  // detail — edit-info form
  const [eInfoName, setEInfoName]     = useState('');
  const [eInfoDesc, setEInfoDesc]     = useState('');
  const [eInfoColor, setEInfoColor]   = useState('#10b981');

  // detail — add players
  const [addSearch, setAddSearch]     = useState('');

  // detail — inline member edits {[player_id]: {role,position,jersey_number,collaborator}}
  const [memberEdits, setMemberEdits] = useState({});

  /* inject styles */
  useEffect(() => {
    const t = document.createElement('style');
    t.textContent = styles;
    document.head.appendChild(t);
    return () => document.head.removeChild(t);
  }, []);

  /* init */
  useEffect(() => { init(); }, []);

  const init = async () => {
    setPageLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/coach-login'); return; }
      const [td, pd] = await Promise.all([api('/api/teams'), api('/api/teams/players')]);
      setTeams(td.teams || []);
      setAllPlayers(pd.players || []);
    } catch (e) { setError(e.message); }
    finally { setPageLoading(false); }
  };

  /* flash helpers */
  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3500); };
  const err   = (msg) => { setError(msg);   setTimeout(() => setError(''), 5000); };

  /* ── create form helpers ── */
  const resetCreate = () => { setFName(''); setFDesc(''); setFColor('#10b981'); setCreatePlayers([]); setCreateSearch(''); };

  const isInCreate = (id) => createPlayers.some(m => m.player_id === id);

  const toggleCreate = (p) => {
    if (isInCreate(p.id)) { setCreatePlayers(prev => prev.filter(m => m.player_id !== p.id)); return; }
    if (createPlayers.length >= 20) { err('Maximum 20 players allowed.'); return; }
    setCreatePlayers(prev => [...prev, { player_id: p.id, role: 'player', position: p.position || '', jersey_number: '', collaborator: false, _name: p.user_name || p.email || '?' }]);
  };

  const updateCreate = (pid, field, val) =>
    setCreatePlayers(prev => prev.map(m => m.player_id === pid ? { ...m, [field]: val } : m));

  const handleCreate = async () => {
    setError('');
    if (!fName.trim()) { err('Team name is required.'); return; }
    if (createPlayers.length < 2) { err('Add at least 2 players.'); return; }
    setSaving(true);
    try {
      const body = {
        name: fName.trim(), description: fDesc.trim(),
        color: fColor,
        members: createPlayers.map(m => ({
          player_id: m.player_id, role: m.role, position: m.position,
          jersey_number: m.jersey_number ? parseInt(m.jersey_number) : null,
          collaborator: m.collaborator,
        })),
      };
      const res = await api('/api/teams', { method: 'POST', body: JSON.stringify(body) });
      setTeams(prev => [res.team, ...prev]);
      resetCreate();
      setView('list');
      flash('Team created successfully!');
    } catch (e) { err(e.message); }
    finally { setSaving(false); }
  };

  /* ── open team detail ── */
  const openTeam = async (team) => {
    setPageLoading(true);
    setMemberEdits({});
    setActiveTab('roster');
    try {
      const res = await api(`/api/teams/${team.id}`);
      const t = res.team;
      setSelectedTeam(t);
      setEInfoName(t.name); setEInfoDesc(t.description || ''); setEInfoColor(t.color || '#10b981');
      setView('detail');
    } catch (e) { err(e.message); }
    finally { setPageLoading(false); }
  };

  const refreshTeam = async () => {
    try {
      const res = await api(`/api/teams/${selectedTeam.id}`);
      setSelectedTeam(res.team);
      setMemberEdits({});
    } catch (e) { err(e.message); }
  };

  /* ── delete team ── */
  const handleDeleteTeam = async () => {
    if (!window.confirm(`Delete "${selectedTeam?.name}"? This cannot be undone.`)) return;
    try {
      await api(`/api/teams/${selectedTeam.id}`, { method: 'DELETE' });
      setTeams(prev => prev.filter(t => t.id !== selectedTeam.id));
      setView('list');
      flash('Team deleted.');
    } catch (e) { err(e.message); }
  };

  const handleDeleteFromList = async (teamId, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await api(`/api/teams/${teamId}`, { method: 'DELETE' });
      setTeams(prev => prev.filter(t => t.id !== teamId));
      flash('Team deleted.');
    } catch (e) { err(e.message); }
  };

  /* ── edit info save ── */
  const handleSaveInfo = async () => {
    if (!eInfoName.trim()) { err('Team name cannot be empty.'); return; }
    setSaving(true);
    try {
      const body = { name: eInfoName.trim(), description: eInfoDesc.trim(), color: eInfoColor };
      const res = await api(`/api/teams/${selectedTeam.id}`, { method: 'PUT', body: JSON.stringify(body) });
      setSelectedTeam(prev => ({ ...prev, ...res.team }));
      setTeams(prev => prev.map(t => t.id === selectedTeam.id ? { ...t, ...res.team } : t));
      flash('Team info updated!');
      setActiveTab('roster');
    } catch (e) { err(e.message); }
    finally { setSaving(false); }
  };

  /* ── member inline edits ── */
  const getMemberVal = (member, field) => {
    if (memberEdits[member.player_id]?.[field] !== undefined) return memberEdits[member.player_id][field];
    return member[field] ?? '';
  };

  const setMemberEdit = (pid, field, val) =>
    setMemberEdits(prev => ({ ...prev, [pid]: { ...(prev[pid] || {}), [field]: val } }));

  const hasDirty = Object.keys(memberEdits).length > 0;

  const saveAllMemberEdits = async () => {
    setSaving(true);
    try {
      await Promise.all(Object.entries(memberEdits).map(([pid, changes]) => {
        const body = { ...changes, jersey_number: changes.jersey_number ? parseInt(changes.jersey_number) : null };
        return api(`/api/teams/${selectedTeam.id}/members/${pid}`, { method: 'PUT', body: JSON.stringify(body) });
      }));
      await refreshTeam();
      flash('Roster changes saved!');
    } catch (e) { err(e.message); }
    finally { setSaving(false); }
  };

  /* ── remove member ── */
  const handleRemoveMember = async (pid, pname) => {
    if ((selectedTeam?.members?.length ?? 0) <= 2) { err('Team must have at least 2 players.'); return; }
    if (!window.confirm(`Remove ${pname} from the team?`)) return;
    try {
      await api(`/api/teams/${selectedTeam.id}/members/${pid}`, { method: 'DELETE' });
      await refreshTeam();
      flash(`${pname} removed.`);
    } catch (e) { err(e.message); }
  };

  /* ── add player to existing team ── */
  const currentPlayerIds = new Set((selectedTeam?.members || []).map(m => m.player_id));

  const handleAddPlayer = async (player) => {
    if ((selectedTeam?.members?.length ?? 0) >= 20) { err('Team already has 20 players.'); return; }
    setSaving(true);
    try {
      const body = { player_id: player.id, role: 'player', position: player.position || '', collaborator: false };
      await api(`/api/teams/${selectedTeam.id}/members`, { method: 'POST', body: JSON.stringify(body) });
      await refreshTeam();
      flash(`${player.user_name || player.email} added!`);
    } catch (e) { err(e.message); }
    finally { setSaving(false); }
  };

  /* ── filtered lists ── */
  const filterPlayers = (query, exclude = new Set()) =>
    allPlayers.filter(p => {
      if (exclude.has(p.id)) return false;
      const q = query.toLowerCase();
      return !q || (p.user_name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q) || (p.position || '').toLowerCase().includes(q) || (p.club || '').toLowerCase().includes(q);
    });

  /* ══════════════════════ RENDER ══════════════════════ */
  if (pageLoading) return (
    <div className="ct-loading">
      <div className="ct-loading-spinner" />
      <p style={{ fontFamily: 'Inter', color: 'rgba(255,255,255,.4)' }}>Loading…</p>
    </div>
  );

  return (
    <div className="ct-root">
      <CoachNavbar />

      <div className="ct-body">

        {/* ── Page header ── */}
        <div className="ct-page-header">
          <div>
            <div className="ct-page-title">
              {view === 'create' ? '➕ Create New Team'
                : view === 'detail' ? `👥 ${selectedTeam?.name}`
                : '👥 Team Management'}
            </div>
            <div className="ct-page-sub">
              {view === 'list' ? `${teams.length} team${teams.length !== 1 ? 's' : ''} · 2–20 players per team`
                : view === 'create' ? 'Pick players, assign roles and positions'
                : `${selectedTeam?.members?.length ?? 0} players · created ${new Date(selectedTeam?.created_at).toLocaleDateString()}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {view !== 'list' && (
              <button className="ct-btn-secondary" onClick={() => { setView('list'); setError(''); setSuccess(''); resetCreate(); }}>
                ← Back to Teams
              </button>
            )}
            {view === 'list' && (
              <button className="ct-btn-primary" onClick={() => { resetCreate(); setView('create'); }}>
                ➕ New Team
              </button>
            )}
          </div>
        </div>

        {error   && <div className="ct-error">⚠️ {error}</div>}
        {success && <div className="ct-success">✅ {success}</div>}

        {/* ══════════ LIST ══════════ */}
        {view === 'list' && (
          teams.length === 0 ? (
            <div className="ct-empty">
              <div className="ct-empty-icon">👥</div>
              <h3>No Teams Yet</h3>
              <p>Create your first team to start managing players.</p>
              <button className="ct-btn-primary" onClick={() => setView('create')}>➕ Create First Team</button>
            </div>
          ) : (
            <div className="ct-teams-grid">
              {teams.map((t, i) => (
                <div key={t.id} className="ct-team-card" style={{ animationDelay: `${i * 0.07}s` }} onClick={() => openTeam(t)}>
                  <div className="ct-color-bar" style={{ background: t.color || '#10b981' }} />
                  <div className="ct-team-card-top">
                    <div className="ct-team-name">{t.name}</div>
                    <span style={{ fontSize: 22 }}>⚽</span>
                  </div>
                  {t.description && <div className="ct-team-desc">{t.description}</div>}
                  <div className="ct-team-meta">
                    <span className="ct-badge">👥 {t.member_count ?? 0} players</span>
                  </div>
                  <div className="ct-team-actions" onClick={e => e.stopPropagation()}>
                    <button className="ct-btn-blue ct-btn-sm" onClick={() => openTeam(t)}>✏️ Manage</button>
                    <button className="ct-btn-danger" onClick={(e) => handleDeleteFromList(t.id, t.name, e)}>🗑️ Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ══════════ CREATE ══════════ */}
        {view === 'create' && (
          <div className="ct-two-col">
            {/* Left: info + selected players */}
            <div>
              <div className="ct-section-title">📋 Team Info</div>

              <div className="ct-group">
                <label className="ct-label">Team Name *</label>
                <input className="ct-input" placeholder="e.g. Alpha Wolves" value={fName} onChange={e => setFName(e.target.value)} />
              </div>
              <div className="ct-group">
                <label className="ct-label">Description</label>
                <textarea className="ct-input ct-textarea" placeholder="Describe this team…" value={fDesc} onChange={e => setFDesc(e.target.value)} />
              </div>
              <div className="ct-group">
                <label className="ct-label">Team Color</label>
                <div className="ct-colors">
                  {TEAM_COLORS.map(c => <div key={c} className={`ct-color-dot${fColor === c ? ' on' : ''}`} style={{ background: c }} onClick={() => setFColor(c)} />)}
                </div>
              </div>

              {createPlayers.length > 0 && (
                <>
                  <div className="ct-divider" />
                  <div className="ct-section-title">🎽 Selected Players — Assign Details</div>
                  <div className="ct-count-bar">
                    <span className="ct-count-txt">Players selected</span>
                    <span className={`ct-count-num ${countColor(createPlayers.length)}`}>{createPlayers.length} / 20</span>
                  </div>
                  {createPlayers.map(m => (
                    <div key={m.player_id} className="ct-member-card">
                      <div className="ct-member-left">
                        <div className="ct-avatar">{initials(m._name)}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{m._name}</div>
                        </div>
                      </div>
                      <div className="ct-member-fields">
                        <select className="ct-mini-select" value={m.role} onChange={e => updateCreate(m.player_id, 'role', e.target.value)}>
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select className="ct-mini-select" value={m.position} onChange={e => updateCreate(m.player_id, 'position', e.target.value)}>
                          <option value="">Position</option>
                          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input className="ct-mini-input" type="number" placeholder="#" min={1} max={99}
                          value={m.jersey_number} onChange={e => updateCreate(m.player_id, 'jersey_number', e.target.value)} />
                        <label className="ct-collab-lbl" onClick={() => updateCreate(m.player_id, 'collaborator', !m.collaborator)}>
                          <div className={`ct-collab-box${m.collaborator ? ' on' : ''}`}>{m.collaborator && '✓'}</div>
                          Collab
                        </label>
                        <button className="ct-btn-danger" style={{ padding: '5px 10px' }}
                          onClick={() => setCreatePlayers(prev => prev.filter(p => p.player_id !== m.player_id))}>✕</button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                <button className="ct-btn-secondary" onClick={() => { setView('list'); resetCreate(); }}>Cancel</button>
                <button className="ct-btn-primary" onClick={handleCreate} disabled={saving}>
                  {saving ? <><div className="ct-spinner" /> Creating…</> : '✅ Create Team'}
                </button>
              </div>
            </div>

            {/* Right: player picker */}
            <div>
              <div className="ct-section-title">🔍 Player Registry</div>
              <div className="ct-search-wrap">
                <span className="ct-search-ico">🔍</span>
                <input className="ct-input ct-search-input" placeholder="Search name, position, club…"
                  value={createSearch} onChange={e => setCreateSearch(e.target.value)} />
              </div>
              <div style={{ margin: '10px 0 6px', fontSize: 11, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: .6 }}>
                {filterPlayers(createSearch).length} players found
              </div>
              <div className="ct-player-list">
                {filterPlayers(createSearch).map(p => {
                  const sel = isInCreate(p.id);
                  const maxed = createPlayers.length >= 20 && !sel;
                  return (
                    <div key={p.id} className={`ct-player-row${sel ? ' on' : ''}${maxed ? ' disabled' : ''}`}
                      onClick={() => !maxed && toggleCreate(p)}>
                      <div className="ct-avatar">{initials(p.user_name)}</div>
                      <div className="ct-player-info">
                        <div className="ct-player-name">{p.user_name || '(no name)'}</div>
                        <div className="ct-player-meta">{[p.position, p.club, p.country].filter(Boolean).join(' · ')}</div>
                      </div>
                      <div className="ct-check">{sel && '✓'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ DETAIL ══════════ */}
        {view === 'detail' && selectedTeam && (
          <>
            {/* Team header */}
            <div className="ct-detail-hdr">
              <div className="ct-detail-hdr-bar" style={{ background: selectedTeam.color || '#10b981' }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: selectedTeam.color || '#10b981', flexShrink: 0 }} />
                  <div className="ct-detail-name">{selectedTeam.name}</div>
                </div>
                {selectedTeam.description && <div className="ct-detail-meta">{selectedTeam.description}</div>}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="ct-badge">👥 {selectedTeam.members?.length ?? 0} / 20 players</span>
                <button className="ct-btn-danger" onClick={handleDeleteTeam}>🗑️ Delete Team</button>
              </div>
            </div>

            {/* Tabs */}
            <div className="ct-tabs">
              {[
                { id: 'roster',      label: '🎽 Roster' },
                { id: 'edit-info',   label: '✏️ Edit Info' },
                { id: 'add-players', label: '➕ Add Players' },
              ].map(tab => (
                <button key={tab.id} className={`ct-tab${activeTab === tab.id ? ' on' : ''}`}
                  onClick={() => { setActiveTab(tab.id); setError(''); setSuccess(''); }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ─── TAB: ROSTER ─── */}
            {activeTab === 'roster' && (
              <div className="ct-table-wrap">
                <div className="ct-table-hdr">
                  <div className="ct-table-title">🎽 Team Roster</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {hasDirty && (
                      <span style={{ fontSize: 12, color: '#fbbf24' }}>● Unsaved changes</span>
                    )}
                    {hasDirty && (
                      <button className="ct-btn-primary ct-btn-sm" onClick={saveAllMemberEdits} disabled={saving}>
                        {saving ? <><div className="ct-spinner" /> Saving…</> : '💾 Save Changes'}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="ct-tbl">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Player</th>
                        <th>Role</th>
                        <th>Position</th>
                        <th>Jersey</th>
                        <th>Collaborator</th>
                        <th>Club</th>
                        <th>Country</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedTeam.members || []).map((m, i) => {
                        const isDirty = !!memberEdits[m.player_id];
                        return (
                          <tr key={m.id}>
                            <td style={{ color: 'rgba(255,255,255,.35)' }}>{i + 1}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <div className="ct-avatar sm">{initials(m.profile?.user_name)}</div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 13 }}>{m.profile?.user_name || '—'}</div>
                                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.32)' }}>{m.profile?.email}</div>
                                </div>
                                {isDirty && <span className="ct-new-badge">edited</span>}
                              </div>
                            </td>
                            <td>
                              <select className="ct-tbl-select"
                                value={getMemberVal(m, 'role')}
                                onChange={e => setMemberEdit(m.player_id, 'role', e.target.value)}>
                                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </td>
                            <td>
                              <select className="ct-tbl-select"
                                value={getMemberVal(m, 'position')}
                                onChange={e => setMemberEdit(m.player_id, 'position', e.target.value)}>
                                <option value="">—</option>
                                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </td>
                            <td>
                              <input className="ct-tbl-input" type="number" placeholder="—" min={1} max={99}
                                value={getMemberVal(m, 'jersey_number')}
                                onChange={e => setMemberEdit(m.player_id, 'jersey_number', e.target.value)} />
                            </td>
                            <td>
                              <label className="ct-collab-lbl"
                                onClick={() => setMemberEdit(m.player_id, 'collaborator', !getMemberVal(m, 'collaborator'))}>
                                <div className={`ct-collab-box${getMemberVal(m, 'collaborator') ? ' on' : ''}`}>
                                  {getMemberVal(m, 'collaborator') && '✓'}
                                </div>
                                {getMemberVal(m, 'collaborator') ? <span className="ct-collab-badge">🤝 Yes</span> : '—'}
                              </label>
                            </td>
                            <td>{m.profile?.club || '—'}</td>
                            <td>{m.profile?.country || '—'}</td>
                            <td>
                              <button className="ct-btn-danger"
                                onClick={() => handleRemoveMember(m.player_id, m.profile?.user_name || 'Player')}>
                                🗑️ Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {hasDirty && (
                  <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button className="ct-btn-secondary ct-btn-sm" onClick={() => setMemberEdits({})}>↩ Discard Changes</button>
                    <button className="ct-btn-primary ct-btn-sm" onClick={saveAllMemberEdits} disabled={saving}>
                      {saving ? <><div className="ct-spinner" /> Saving…</> : '💾 Save All Changes'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB: EDIT INFO ─── */}
            {activeTab === 'edit-info' && (
              <div style={{ maxWidth: 560 }}>
                <div className="ct-section-title">✏️ Edit Team Information</div>

                <div className="ct-group">
                  <label className="ct-label">Team Name *</label>
                  <input className="ct-input" value={eInfoName} onChange={e => setEInfoName(e.target.value)} />
                </div>
                <div className="ct-group">
                  <label className="ct-label">Description</label>
                  <textarea className="ct-input ct-textarea" value={eInfoDesc} onChange={e => setEInfoDesc(e.target.value)} />
                </div>
                <div className="ct-group">
                  <label className="ct-label">Team Color</label>
                  <div className="ct-colors">
                    {TEAM_COLORS.map(c => <div key={c} className={`ct-color-dot${eInfoColor === c ? ' on' : ''}`} style={{ background: c }} onClick={() => setEInfoColor(c)} />)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button className="ct-btn-secondary" onClick={() => setActiveTab('roster')}>Cancel</button>
                  <button className="ct-btn-primary" onClick={handleSaveInfo} disabled={saving}>
                    {saving ? <><div className="ct-spinner" /> Saving…</> : '💾 Save Info'}
                  </button>
                </div>
              </div>
            )}

            {/* ─── TAB: ADD PLAYERS ─── */}
            {activeTab === 'add-players' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div className="ct-section-title" style={{ marginBottom: 0 }}>🔍 Player Registry</div>
                  <span className={`ct-count-num ${countColor(selectedTeam?.members?.length || 0)}`} style={{ fontSize: 13 }}>
                    {selectedTeam?.members?.length ?? 0} / 20 players
                  </span>
                </div>

                <div className="ct-search-wrap" style={{ marginBottom: 10 }}>
                  <span className="ct-search-ico">🔍</span>
                  <input className="ct-input ct-search-input" placeholder="Search by name, position, club…"
                    value={addSearch} onChange={e => setAddSearch(e.target.value)} />
                </div>

                <div className="ct-player-list" style={{ maxHeight: 420 }}>
                  {filterPlayers(addSearch, currentPlayerIds).length === 0 ? (
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', textAlign: 'center', padding: 32 }}>
                      {allPlayers.length === currentPlayerIds.size ? 'All registered players are already in this team.' : 'No players found.'}
                    </div>
                  ) : (
                    filterPlayers(addSearch, currentPlayerIds).map(p => (
                      <div key={p.id} className="ct-player-row">
                        <div className="ct-avatar">{initials(p.user_name)}</div>
                        <div className="ct-player-info">
                          <div className="ct-player-name">{p.user_name || '(no name)'}</div>
                          <div className="ct-player-meta">{[p.position, p.club, p.country].filter(Boolean).join(' · ')}</div>
                        </div>
                        <button className="ct-btn-primary ct-btn-sm"
                          disabled={saving || (selectedTeam?.members?.length ?? 0) >= 20}
                          onClick={() => handleAddPlayer(p)}>
                          {saving ? <div className="ct-spinner" /> : '+ Add'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
