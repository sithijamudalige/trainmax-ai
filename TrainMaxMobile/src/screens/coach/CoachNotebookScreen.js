// src/screens/player/NotebookScreen.js
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
  SafeAreaView, StatusBar, StyleSheet, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabaseClient';
import { apiFetch } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

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

const COLORS = ["#6a11cb", "#2575fc", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#64748b"];

export default function CoachNotebookScreen() {
  const navigation = useNavigation();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [activeNote, setActiveNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Form
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formTags, setFormTags] = useState("");
  const [formColor, setFormColor] = useState("#6a11cb");
  const [formPinned, setFormPinned] = useState(false);

  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserAndNotes();
  }, []);

  async function loadUserAndNotes() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigation.navigate('CoachLogin');
      return;
    }
    setUser(session.user);
    await loadNotes(session.user.id);
    setLoading(false);
  }

  async function loadNotes(uid) {
    try {
      const res = await apiFetch(`/api/notebook/list/${uid}`);
      const data = await res.json();
      if (res.ok) setNotes(data.notes || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function createNote() {
    if (!formTitle.trim()) {
      Alert.alert("Error", "Title is required");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/api/notebook/create', {
        method: 'POST',
        body: JSON.stringify({
          user_id: user.id,
          title: formTitle,
          content: formContent,
          category: formCategory,
          tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
          color: formColor,
          is_pinned: formPinned,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert("Success", "Note created!");
        setShowNew(false);
        resetForm();
        loadNotes(user.id);
        setActiveNote(data.note);
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveNote() {
    if (!activeNote) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/notebook/update/${activeNote.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: formTitle,
          content: formContent,
          category: formCategory,
          tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
          color: formColor,
          is_pinned: formPinned,
        }),
      });
      if (res.ok) {
        Alert.alert("Saved", "Note updated");
        setIsEditing(false);
        loadNotes(user.id);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId) {
    if (!await new Promise(resolve => Alert.alert("Delete?", "Are you sure?", [
      { text: "Cancel", onPress: () => resolve(false) },
      { text: "Delete", onPress: () => resolve(true) }
    ]))) return;

    try {
      await apiFetch(`/api/notebook/delete/${user.id}/${noteId}`, { method: 'DELETE' });
      Alert.alert("Deleted");
      if (activeNote?.id === noteId) {
        setActiveNote(null);
        setIsEditing(false);
      }
      loadNotes(user.id);
    } catch (e) {
      Alert.alert("Error", "Failed to delete");
    }
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

  const filteredNotes = notes.filter(n => {
    const matchesCat = filterCat === "all" || n.category === filterCat;
    const matchesQ = !searchQ || 
      n.title.toLowerCase().includes(searchQ.toLowerCase()) ||
      (n.content || "").toLowerCase().includes(searchQ.toLowerCase());
    return matchesCat && matchesQ;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#6a11cb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📓 Notebook</Text>
        <TouchableOpacity onPress={openNew} style={styles.newBtn}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          value={searchQ}
          onChangeText={setSearchQ}
        />
      </View>

      <View style={styles.catRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity style={[styles.catBtn, filterCat === "all" && styles.catActive]} onPress={() => setFilterCat("all")}>
            <Text style={styles.catText}>All</Text>
          </TouchableOpacity>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c.id} style={[styles.catBtn, filterCat === c.id && styles.catActive]} onPress={() => setFilterCat(c.id)}>
              <Text style={styles.catText}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Notes List */}
      <ScrollView style={styles.list}>
        {filteredNotes.length === 0 ? (
          <Text style={styles.empty}>No notes found</Text>
        ) : (
          filteredNotes.map(note => (
            <TouchableOpacity key={note.id} style={styles.noteCard} onPress={() => editNote(note)}>
              <View style={[styles.colorBar, { backgroundColor: note.color }]} />
              <Text style={styles.noteTitle}>{note.title}</Text>
              <Text style={styles.notePreview} numberOfLines={2}>{note.content}</Text>
              <Text style={styles.noteMeta}>{note.category} • {new Date(note.updated_at).toLocaleDateString()}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* New/Edit Modal */}
      <Modal visible={showNew || isEditing} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{showNew ? "New Note" : "Edit Note"}</Text>
            <TouchableOpacity onPress={() => { setShowNew(false); setIsEditing(false); }}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Form fields here (title, category, tags, color, content, etc.) */}
          <TextInput 
            style={styles.input} 
            placeholder="Note Title..." 
            placeholderTextColor="#64748b"
            value={formTitle} 
            onChangeText={setFormTitle} 
          />

          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.pickerChip, formCategory === c.id && { backgroundColor: c.color, borderColor: c.color }]}
                  onPress={() => setFormCategory(c.id)}
                >
                  <Text style={[styles.pickerChipText, formCategory === c.id && { color: '#fff' }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.sectionLabel}>TAGS</Text>
              <TextInput 
                style={[styles.input, { margin: 0 }]} 
                placeholder="tag1, tag2..." 
                placeholderTextColor="#64748b"
                value={formTags} 
                onChangeText={setFormTags} 
              />
            </View>
            <View>
              <Text style={styles.sectionLabel}>PINNED</Text>
              <TouchableOpacity 
                style={[styles.pinBtn, formPinned && styles.pinBtnActive]} 
                onPress={() => setFormPinned(!formPinned)}
              >
                <Ionicons name="pin" size={16} color={formPinned ? "#fff" : "#94a3b8"} />
                <Text style={{ color: formPinned ? "#fff" : "#94a3b8", marginLeft: 4, fontWeight: '600' }}>Pin</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>COLOR</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
              {COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorCircle, 
                    { backgroundColor: color },
                    formColor === color && styles.colorCircleActive
                  ]}
                  onPress={() => setFormColor(color)}
                />
              ))}
            </ScrollView>
          </View>

          <TextInput 
            style={[styles.input, styles.contentInput]} 
            placeholder="Write your note here..." 
            placeholderTextColor="#64748b"
            multiline 
            value={formContent} 
            onChangeText={setFormContent} 
          />

          <View style={styles.actionRow}>
            {isEditing && (
              <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteNote(activeNote.id)} disabled={saving}>
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.saveBtn, { flex: 1, marginLeft: isEditing ? 12 : 0 }]} onPress={showNew ? createNote : saveNote} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Note"}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0c29' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#1e1b4b' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  newBtn: { backgroundColor: '#6a11cb', padding: 8, borderRadius: 12 },
  searchRow: { padding: 12 },
  searchInput: { backgroundColor: '#1e1b4b', padding: 12, borderRadius: 12, color: '#fff' },
  catRow: { paddingHorizontal: 12 },
  catBtn: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#1e1b4b', marginRight: 8, borderRadius: 20 },
  catActive: { backgroundColor: '#6a11cb' },
  list: { flex: 1, padding: 12 },
  noteCard: { backgroundColor: '#1e1b4b', padding: 16, borderRadius: 16, marginBottom: 12 },
  colorBar: { height: 4, borderRadius: 4, marginBottom: 8 },
  noteTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  notePreview: { color: '#aaa', marginTop: 4 },
  noteMeta: { color: '#666', fontSize: 12, marginTop: 8 },
  empty: { color: '#666', textAlign: 'center', marginTop: 50 },
  modalContainer: { flex: 1, backgroundColor: '#0f0c29' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#1e1b4b' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  input: { backgroundColor: '#1e1b4b', color: '#fff', padding: 14, borderRadius: 12, marginHorizontal: 12, marginBottom: 12, fontSize: 16 },
  contentInput: { height: 200, textAlignVertical: 'top' },
  formSection: { marginHorizontal: 12, marginBottom: 16 },
  sectionLabel: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 },
  pickerRow: { flexDirection: 'row' },
  pickerChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#334155', marginRight: 8 },
  pickerChipText: { color: '#cbd5e1', fontWeight: '500' },
  row: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 16, alignItems: 'flex-end' },
  pinBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1b4b', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  pinBtnActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  colorRow: { flexDirection: 'row' },
  colorCircle: { width: 36, height: 36, borderRadius: 18, marginRight: 12, borderWidth: 2, borderColor: 'transparent' },
  colorCircleActive: { borderColor: '#fff' },
  actionRow: { flexDirection: 'row', marginHorizontal: 12, marginTop: 'auto', marginBottom: 32 },
  deleteBtn: { backgroundColor: '#1e1b4b', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155', width: 64 },
  saveBtn: { backgroundColor: '#6a11cb', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});