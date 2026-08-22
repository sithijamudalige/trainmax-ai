import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Navbar from "../components/Navbar";

const API_BASE = "http://127.0.0.1:5000";

const CATEGORIES = [
  { id: "general",   label: "📝 General",   color: "#6a11cb" },
  { id: "training",  label: "💪 Training",  color: "#2575fc" },
  { id: "match",     label: "⚽ Match",     color: "#10b981" },
  { id: "tactics",   label: "🎯 Tactics",   color: "#f59e0b" },
  { id: "nutrition", label: "🥗 Nutrition", color: "#ec4899" },
  { id: "injury",    label: "🩹 Injury",    color: "#ef4444" },
  { id: "goals",     label: "🏆 Goals",     color: "#8b5cf6" },
  { id: "other",     label: "📌 Other",     color: "#64748b" },
];

const NOTE_COLORS = [
  "#6a11cb","#2575fc","#10b981","#f59e0b",
  "#ef4444","#ec4899","#8b5cf6","#64748b",
];

export default function Notebook() {
  const nav = useNavigate();

  const [user,         setUser]         = useState(null);
  const [notes,        setNotes]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [searchQ,      setSearchQ]      = useState("");
  const [filterCat,    setFilterCat]    = useState("all");
  const [activeNote,   setActiveNote]   = useState(null);
  const [isEditing,    setIsEditing]    = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [toast,        setToast]        = useState(null);
  const [deleteConfirm,setDeleteConfirm]= useState(null);
  const autoSaveRef = useRef(null);

  // New/edit form state
  const [formTitle,    setFormTitle]    = useState("");
  const [formContent,  setFormContent]  = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formTags,     setFormTags]     = useState("");
  const [formColor,    setFormColor]    = useState("#6a11cb");
  const [formPinned,   setFormPinned]   = useState(false);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session?.user) { nav("/login"); return; }
      setUser(session.user);
      await loadNotes(session.user.id);
      setLoading(false);
    }
    load();
  }, [nav]);

  async function loadNotes(uid) {
    try {
      const res  = await fetch(`${API_BASE}/api/notebook/list/${uid || user?.id}`);
      const data = await res.json();
      if (res.ok) setNotes(data.notes || []);
    } catch (e) {
      console.error("Failed to load notes", e);
    }
  }

  async function createNote() {
    if (!formTitle.trim()) { showToast("Title is required", "error"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/notebook/create`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id:  user.id,
          title:    formTitle,
          content:  formContent,
          category: formCategory,
          tags:     formTags.split(",").map(t => t.trim()).filter(Boolean),
          color:    formColor,
          is_pinned: formPinned,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Failed to create", "error"); return; }
      showToast("✅ Note created!");
      setShowNew(false);
      resetForm();
      await loadNotes();
      setActiveNote(data.note);
    } finally {
      setSaving(false);
    }
  }

  async function saveNote() {
    if (!activeNote) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/notebook/update/${activeNote.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:    formTitle,
          content:  formContent,
          category: formCategory,
          tags:     formTags.split(",").map(t => t.trim()).filter(Boolean),
          color:    formColor,
          is_pinned: formPinned,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Failed to save", "error"); return; }
      showToast("💾 Saved!");
      setIsEditing(false);
      setActiveNote(data.note);
      await loadNotes();
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId) {
    try {
      await fetch(`${API_BASE}/api/notebook/delete/${user.id}/${noteId}`, { method: "DELETE" });
      showToast("🗑️ Note deleted");
      setDeleteConfirm(null);
      if (activeNote?.id === noteId) { setActiveNote(null); setIsEditing(false); }
      await loadNotes();
    } catch (e) {
      showToast("Failed to delete", "error");
    }
  }

  async function togglePin(noteId) {
    try {
      const res  = await fetch(`${API_BASE}/api/notebook/pin/${noteId}`, { method: "PATCH" });
      const data = await res.json();
      if (res.ok) {
        await loadNotes();
        if (activeNote?.id === noteId) setActiveNote(data.note);
      }
    } catch (e) {}
  }

  function openNote(note) {
    setActiveNote(note);
    setIsEditing(false);
    setShowNew(false);
  }

  function editNote(note) {
    setActiveNote(note);
    setFormTitle(note.title);
    setFormContent(note.content || "");
    setFormCategory(note.category || "general");
    setFormTags((note.tags || []).join(", "));
    setFormColor(note.color || "#6a11cb");
    setFormPinned(note.is_pinned || false);
    setIsEditing(true);
    setShowNew(false);
  }

  function openNew() {
    resetForm();
    setShowNew(true);
    setActiveNote(null);
    setIsEditing(false);
  }

  function resetForm() {
    setFormTitle("");
    setFormContent("");
    setFormCategory("general");
    setFormTags("");
    setFormColor("#6a11cb");
    setFormPinned(false);
  }

  function getCategoryInfo(catId) {
    return CATEGORIES.find(c => c.id === catId) || CATEGORIES[0];
  }

  // Auto-save while editing
  useEffect(() => {
    if (!isEditing || !activeNote) return;
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      saveNote();
    }, 3000);
    return () => clearTimeout(autoSaveRef.current);
  }, [formContent, formTitle]);

  // Filter notes
  const filteredNotes = notes.filter(n => {
    const matchesCat = filterCat === "all" || n.category === filterCat;
    const matchesQ   = !searchQ
      || (n.title   || "").toLowerCase().includes(searchQ.toLowerCase())
      || (n.content || "").toLowerCase().includes(searchQ.toLowerCase())
      || (n.tags    || []).some(t => t.toLowerCase().includes(searchQ.toLowerCase()));
    return matchesCat && matchesQ;
  });

  const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
  const otherNotes  = filteredNotes.filter(n => !n.is_pinned);

  if (loading) return (
    <>
      <style>{`.nb-load{min-height:100vh;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);display:flex;align-items:center;justify-content:center;font-family:system-ui;}.nb-spin{width:44px;height:44px;border:4px solid rgba(255,255,255,0.1);border-top-color:#6a11cb;border-radius:50%;animation:spin 0.8s linear infinite;}@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      <div className="nb-load"><div style={{textAlign:"center"}}><div className="nb-spin" style={{margin:"0 auto 14px"}}/><div style={{color:"rgba(255,255,255,0.4)",fontSize:13}}>Loading notebook...</div></div></div>
    </>
  );

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css" />

      <style>{`
        * { box-sizing: border-box; }
        .nb-page { min-height:100vh; background:linear-gradient(135deg,#0f0c29,#302b63,#24243e); font-family:system-ui; display:flex; flex-direction:column; }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }

        /* Layout */
        .nb-body { display:flex; flex:1; overflow:hidden; height:calc(100vh - 56px); }
        .nb-sidebar { width:300px; flex-shrink:0; background:rgba(0,0,0,0.3); border-right:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; overflow:hidden; }
        .nb-main { flex:1; display:flex; flex-direction:column; overflow:hidden; }

        /* Sidebar top */
        .nb-sidebar-top { padding:16px; border-bottom:1px solid rgba(255,255,255,0.06); }
        .nb-new-btn { width:100%; padding:10px; background:linear-gradient(135deg,#6a11cb,#2575fc); border:none; border-radius:10px; color:#fff; font-size:14px; font-weight:700; cursor:pointer; font-family:system-ui; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:6px; margin-bottom:12px; }
        .nb-new-btn:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(106,17,203,0.4); }

        .nb-search { width:100%; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:8px 12px; color:#fff; font-size:13px; font-family:system-ui; outline:none; }
        .nb-search::placeholder { color:rgba(255,255,255,0.25); }
        .nb-search:focus { border-color:#6a11cb; }

        /* Category filter */
        .nb-cats { padding:10px 16px; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; gap:6px; flex-wrap:wrap; }
        .nb-cat-btn { padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; cursor:pointer; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.5); transition:all 0.2s; font-family:system-ui; }
        .nb-cat-btn.active { background:rgba(106,17,203,0.3); border-color:#6a11cb; color:#a78bfa; }
        .nb-cat-btn:hover { color:#fff; }

        /* Note list */
        .nb-note-list { flex:1; overflow-y:auto; padding:8px; }
        .nb-note-list::-webkit-scrollbar { width:4px; }
        .nb-note-list::-webkit-scrollbar-track { background:transparent; }
        .nb-note-list::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:4px; }

        .nb-section-label { color:rgba(255,255,255,0.25); font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; padding:8px 8px 4px; }

        .nb-note-item { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:12px; margin-bottom:6px; cursor:pointer; transition:all 0.2s; position:relative; animation:slideIn 0.3s ease; }
        .nb-note-item:hover { background:rgba(255,255,255,0.07); border-color:rgba(255,255,255,0.12); }
        .nb-note-item.active { background:rgba(106,17,203,0.2); border-color:rgba(106,17,203,0.4); }
        .nb-note-color-bar { width:3px; height:100%; position:absolute; left:0; top:0; border-radius:10px 0 0 10px; }
        .nb-note-title { color:#fff; font-size:13px; font-weight:700; margin-bottom:4px; padding-left:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .nb-note-preview { color:rgba(255,255,255,0.35); font-size:11px; line-height:1.4; padding-left:10px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
        .nb-note-meta { display:flex; align-items:center; gap:6px; padding-left:10px; margin-top:6px; }
        .nb-note-cat { font-size:10px; background:rgba(255,255,255,0.08); border-radius:20px; padding:1px 8px; color:rgba(255,255,255,0.4); }
        .nb-note-date { font-size:10px; color:rgba(255,255,255,0.25); margin-left:auto; }
        .nb-pin-icon { font-size:11px; color:#f59e0b; }

        /* Main area */
        .nb-empty-main { flex:1; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:12px; color:rgba(255,255,255,0.2); }

        /* Note viewer */
        .nb-viewer { flex:1; overflow-y:auto; padding:32px 40px; animation:fadeInUp 0.3s ease; }
        .nb-viewer-header { display:flex; align-items:flex-start; gap:12px; margin-bottom:24px; }
        .nb-viewer-title { color:#fff; font-size:26px; font-weight:800; flex:1; line-height:1.2; }
        .nb-viewer-actions { display:flex; gap:8px; flex-shrink:0; }
        .nb-action-btn { padding:7px 14px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; border:none; font-family:system-ui; transition:all 0.2s; display:flex; align-items:center; gap:5px; }
        .nb-action-edit { background:linear-gradient(135deg,#6a11cb,#2575fc); color:#fff; }
        .nb-action-pin  { background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); color:#fbbf24; }
        .nb-action-del  { background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); color:#fca5a5; }
        .nb-action-btn:hover { transform:translateY(-1px); }

        .nb-viewer-tags { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:20px; }
        .nb-tag { background:rgba(106,17,203,0.2); border:1px solid rgba(106,17,203,0.3); border-radius:20px; padding:3px 10px; font-size:11px; color:#c4b5fd; font-weight:600; }

        .nb-viewer-content { color:rgba(255,255,255,0.8); font-size:15px; line-height:1.8; white-space:pre-wrap; }

        .nb-viewer-footer { margin-top:32px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.06); display:flex; gap:16px; font-size:12px; color:rgba(255,255,255,0.25); }

        /* Editor */
        .nb-editor { flex:1; display:flex; flex-direction:column; padding:24px 32px; animation:fadeInUp 0.3s ease; overflow-y:auto; }
        .nb-editor-header { display:flex; align-items:center; gap:10px; margin-bottom:20px; }
        .nb-editor-title-input { flex:1; background:transparent; border:none; border-bottom:2px solid rgba(255,255,255,0.1); color:#fff; font-size:22px; font-weight:800; padding:8px 0; outline:none; font-family:system-ui; }
        .nb-editor-title-input::placeholder { color:rgba(255,255,255,0.2); }
        .nb-editor-title-input:focus { border-bottom-color:#6a11cb; }

        .nb-editor-toolbar { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px; align-items:center; }
        .nb-toolbar-label { color:rgba(255,255,255,0.4); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }

        .nb-cat-select { background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:6px 10px; color:#fff; font-size:12px; font-family:system-ui; outline:none; cursor:pointer; }
        .nb-cat-select option { background:#302b63; }

        .nb-tags-input { background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:6px 10px; color:#fff; font-size:12px; font-family:system-ui; outline:none; width:200px; }
        .nb-tags-input::placeholder { color:rgba(255,255,255,0.2); }

        .nb-color-dot { width:24px; height:24px; border-radius:50%; cursor:pointer; border:2px solid transparent; transition:all 0.2s; flex-shrink:0; }
        .nb-color-dot.selected { border-color:#fff; transform:scale(1.2); }

        .nb-pin-toggle { background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.2); border-radius:8px; padding:6px 12px; color:#fbbf24; font-size:12px; font-weight:600; cursor:pointer; font-family:system-ui; transition:all 0.2s; }
        .nb-pin-toggle.pinned { background:rgba(245,158,11,0.3); border-color:#f59e0b; }

        .nb-content-area { flex:1; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:16px; color:rgba(255,255,255,0.85); font-size:14px; line-height:1.8; resize:none; outline:none; font-family:system-ui; min-height:300px; }
        .nb-content-area::placeholder { color:rgba(255,255,255,0.2); }
        .nb-content-area:focus { border-color:#6a11cb; }

        .nb-editor-footer { display:flex; gap:10px; margin-top:16px; align-items:center; }
        .nb-save-btn { padding:10px 24px; background:linear-gradient(135deg,#059669,#10b981); border:none; border-radius:10px; color:#fff; font-size:14px; font-weight:700; cursor:pointer; font-family:system-ui; transition:all 0.2s; }
        .nb-save-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 4px 14px rgba(5,150,105,0.4); }
        .nb-save-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .nb-cancel-btn { padding:10px 20px; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1); border-radius:10px; color:rgba(255,255,255,0.6); font-size:14px; font-weight:600; cursor:pointer; font-family:system-ui; }
        .nb-autosave-hint { color:rgba(255,255,255,0.25); font-size:12px; margin-left:auto; }

        /* Stats bar */
        .nb-stats { padding:10px 16px; background:rgba(0,0,0,0.2); border-bottom:1px solid rgba(255,255,255,0.05); display:flex; gap:16px; font-size:11px; color:rgba(255,255,255,0.3); font-weight:600; }

        /* Delete confirm modal */
        .nb-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999; }
        .nb-modal { background:#1e1b4b; border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:28px; max-width:360px; width:90%; text-align:center; }
        .nb-modal h3 { color:#fff; font-size:18px; font-weight:700; margin-bottom:8px; }
        .nb-modal p { color:rgba(255,255,255,0.5); font-size:13px; margin-bottom:20px; }
        .nb-modal-btns { display:flex; gap:10px; justify-content:center; }

        /* Toast */
        .nb-toast { position:fixed; top:20px; right:20px; padding:12px 20px; border-radius:10px; font-size:13px; font-weight:600; z-index:9999; animation:fadeInUp 0.3s ease; box-shadow:0 4px 12px rgba(0,0,0,0.3); }

        @media (max-width:700px) {
          .nb-sidebar { width:100%; height:auto; }
          .nb-body { flex-direction:column; }
        }
      `}</style>

      <div className="nb-page">
        <Navbar />

        {/* Toast */}
        {toast && (
          <div className="nb-toast" style={{
            background: toast.type === "error" ? "#fee2e2" : "#dcfce7",
            color:      toast.type === "error" ? "#991b1b" : "#166534",
          }}>
            {toast.msg}
          </div>
        )}

        {/* Delete confirm */}
        {deleteConfirm && (
          <div className="nb-modal-overlay">
            <div className="nb-modal">
              <h3>🗑️ Delete Note?</h3>
              <p>"{deleteConfirm.title}" will be permanently deleted.</p>
              <div className="nb-modal-btns">
                <button onClick={() => deleteNote(deleteConfirm.id)} style={{ padding:"8px 20px", background:"#ef4444", border:"none", borderRadius:8, color:"#fff", fontWeight:700, cursor:"pointer" }}>
                  Delete
                </button>
                <button onClick={() => setDeleteConfirm(null)} style={{ padding:"8px 20px", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, color:"#fff", cursor:"pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="nb-body">

          {/* ---- SIDEBAR ---- */}
          <div className="nb-sidebar">

            {/* Top controls */}
            <div className="nb-sidebar-top">
              <button className="nb-new-btn" onClick={openNew}>
                ✏️ New Note
              </button>
              <input
                className="nb-search"
                placeholder="🔍 Search notes..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
            </div>

            {/* Stats */}
            <div className="nb-stats">
              <span>📝 {notes.length} notes</span>
              <span>📌 {notes.filter(n => n.is_pinned).length} pinned</span>
              <span>📁 {new Set(notes.map(n => n.category)).size} categories</span>
            </div>

            {/* Category filter */}
            <div className="nb-cats">
              <button className={`nb-cat-btn ${filterCat === "all" ? "active" : ""}`} onClick={() => setFilterCat("all")}>All</button>
              {CATEGORIES.map(c => (
                <button key={c.id} className={`nb-cat-btn ${filterCat === c.id ? "active" : ""}`} onClick={() => setFilterCat(c.id)}>
                  {c.label.split(" ")[0]}
                </button>
              ))}
            </div>

            {/* Note list */}
            <div className="nb-note-list">
              {filteredNotes.length === 0 ? (
                <div style={{ textAlign:"center", padding:"32px 16px", color:"rgba(255,255,255,0.2)", fontSize:13 }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>📝</div>
                  {notes.length === 0 ? "No notes yet. Create your first one!" : "No notes match your search."}
                </div>
              ) : (
                <>
                  {pinnedNotes.length > 0 && (
                    <>
                      <div className="nb-section-label">📌 Pinned</div>
                      {pinnedNotes.map(note => <NoteItem key={note.id} note={note} active={activeNote?.id === note.id} onClick={() => openNote(note)} getCatInfo={getCategoryInfo} />)}
                    </>
                  )}
                  {otherNotes.length > 0 && (
                    <>
                      {pinnedNotes.length > 0 && <div className="nb-section-label">📝 Notes</div>}
                      {otherNotes.map(note => <NoteItem key={note.id} note={note} active={activeNote?.id === note.id} onClick={() => openNote(note)} getCatInfo={getCategoryInfo} />)}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ---- MAIN AREA ---- */}
          <div className="nb-main">

            {/* New note form */}
            {showNew && (
              <div className="nb-editor">
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:12, marginBottom:16 }}>✏️ Creating new note</div>
                <div className="nb-editor-header">
                  <input
                    className="nb-editor-title-input"
                    placeholder="Note title..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="nb-editor-toolbar">
                  <span className="nb-toolbar-label">Category</span>
                  <select className="nb-cat-select" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>

                  <span className="nb-toolbar-label">Tags</span>
                  <input className="nb-tags-input" placeholder="tag1, tag2, tag3" value={formTags} onChange={(e) => setFormTags(e.target.value)} />

                  <span className="nb-toolbar-label">Color</span>
                  {NOTE_COLORS.map(c => (
                    <div key={c} className={`nb-color-dot ${formColor === c ? "selected" : ""}`} style={{ background:c }} onClick={() => setFormColor(c)} />
                  ))}

                  <button className={`nb-pin-toggle ${formPinned ? "pinned" : ""}`} onClick={() => setFormPinned(p => !p)}>
                    {formPinned ? "📌 Pinned" : "📌 Pin"}
                  </button>
                </div>

                <textarea
                  className="nb-content-area"
                  placeholder="Write your note here... Use it for match reports, training plans, tactics, goals, anything you want to remember!"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={14}
                />

                <div className="nb-editor-footer">
                  <button className="nb-save-btn" onClick={createNote} disabled={saving}>
                    {saving ? "Creating..." : "✅ Create Note"}
                  </button>
                  <button className="nb-cancel-btn" onClick={() => { setShowNew(false); resetForm(); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Edit mode */}
            {isEditing && activeNote && (
              <div className="nb-editor">
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:12, marginBottom:16 }}>✏️ Editing · Auto-saves after 3 seconds</div>
                <div className="nb-editor-header">
                  <input
                    className="nb-editor-title-input"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="nb-editor-toolbar">
                  <span className="nb-toolbar-label">Category</span>
                  <select className="nb-cat-select" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>

                  <span className="nb-toolbar-label">Tags</span>
                  <input className="nb-tags-input" placeholder="tag1, tag2" value={formTags} onChange={(e) => setFormTags(e.target.value)} />

                  <span className="nb-toolbar-label">Color</span>
                  {NOTE_COLORS.map(c => (
                    <div key={c} className={`nb-color-dot ${formColor === c ? "selected" : ""}`} style={{ background:c }} onClick={() => setFormColor(c)} />
                  ))}

                  <button className={`nb-pin-toggle ${formPinned ? "pinned" : ""}`} onClick={() => setFormPinned(p => !p)}>
                    {formPinned ? "📌 Pinned" : "📌 Pin"}
                  </button>
                </div>

                <textarea
                  className="nb-content-area"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={14}
                />

                <div className="nb-editor-footer">
                  <button className="nb-save-btn" onClick={saveNote} disabled={saving}>
                    {saving ? "Saving..." : "💾 Save Note"}
                  </button>
                  <button className="nb-cancel-btn" onClick={() => { setIsEditing(false); setActiveNote(notes.find(n => n.id === activeNote.id) || null); }}>
                    Cancel
                  </button>
                  <div className="nb-autosave-hint">💾 Auto-saves in 3s</div>
                </div>
              </div>
            )}

            {/* View mode */}
            {!showNew && !isEditing && activeNote && (
              <div className="nb-viewer">
                <div className="nb-viewer-header">
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:activeNote.color || "#6a11cb" }} />
                      <span style={{ fontSize:12, color:getCategoryInfo(activeNote.category).color, fontWeight:700 }}>
                        {getCategoryInfo(activeNote.category).label}
                      </span>
                      {activeNote.is_pinned && <span style={{ fontSize:12, color:"#f59e0b" }}>📌 Pinned</span>}
                    </div>
                    <div className="nb-viewer-title">{activeNote.title}</div>
                  </div>
                  <div className="nb-viewer-actions">
                    <button className="nb-action-btn nb-action-edit"  onClick={() => editNote(activeNote)}>✏️ Edit</button>
                    <button className="nb-action-btn nb-action-pin"   onClick={() => togglePin(activeNote.id)}>
                      {activeNote.is_pinned ? "📌 Unpin" : "📌 Pin"}
                    </button>
                    <button className="nb-action-btn nb-action-del"   onClick={() => setDeleteConfirm(activeNote)}>🗑️</button>
                  </div>
                </div>

                {(activeNote.tags || []).length > 0 && (
                  <div className="nb-viewer-tags">
                    {activeNote.tags.map(tag => <span key={tag} className="nb-tag">#{tag}</span>)}
                  </div>
                )}

                <div className="nb-viewer-content">
                  {activeNote.content || <span style={{ color:"rgba(255,255,255,0.2)", fontStyle:"italic" }}>No content yet. Click Edit to add notes.</span>}
                </div>

                <div className="nb-viewer-footer">
                  <span>Created {new Date(activeNote.created_at).toLocaleDateString()}</span>
                  <span>Updated {new Date(activeNote.updated_at).toLocaleString()}</span>
                  <span>{(activeNote.content || "").length} characters</span>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!showNew && !isEditing && !activeNote && (
              <div className="nb-empty-main">
                <div style={{ fontSize:64, marginBottom:8 }}>📓</div>
                <div style={{ fontSize:20, fontWeight:700, color:"rgba(255,255,255,0.3)" }}>Your Notebook</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.2)", textAlign:"center", maxWidth:300, lineHeight:1.6 }}>
                  Keep track of your match reports, training notes, tactics, goals, and anything important.
                </div>
                <button className="nb-new-btn" style={{ marginTop:16, width:"auto", padding:"10px 24px" }} onClick={openNew}>
                  ✏️ Create First Note
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function NoteItem({ note, active, onClick, getCatInfo }) {
  const cat     = getCatInfo(note.category);
  const preview = (note.content || "").slice(0, 80);
  const date    = new Date(note.updated_at);
  const dateStr = date.toLocaleDateString();

  return (
    <div className={`nb-note-item ${active ? "active" : ""}`} onClick={onClick}>
      <div className="nb-note-color-bar" style={{ background: note.color || "#6a11cb" }} />
      <div className="nb-note-title">
        {note.is_pinned && <span style={{ marginRight:4 }}>📌</span>}
        {note.title}
      </div>
      {preview && <div className="nb-note-preview">{preview}</div>}
      <div className="nb-note-meta">
        <span className="nb-note-cat">{cat.label}</span>
        {(note.tags || []).slice(0, 2).map(t => (
          <span key={t} style={{ fontSize:10, color:"rgba(255,255,255,0.25)" }}>#{t}</span>
        ))}
        <span className="nb-note-date">{dateStr}</span>
      </div>
    </div>
  );
}