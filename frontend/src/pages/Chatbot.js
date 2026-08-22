// pages/Chatbot.jsx
// ========================================================
// Train Max AI - Chatbot Screen (Web Version)
// Full code with improved Voice Input
// Author: Grok (Fixed & Expanded for user request)
// ========================================================

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Navbar from "../components/Navbar";

const API_BASE = "http://127.0.0.1:5000";

// Helper function to format date
// eslint-disable-next-line no-unused-vars
const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  }).format(new Date(date));
};

// Helper to calculate win rate
// eslint-disable-next-line no-unused-vars
const calculateWinRate = (wins, matches) => {
  if (!matches || matches === 0) return 0;
  return Math.round((wins / matches) * 100);
};

// Main Component
export default function Chatbot() {
  const nav            = useNavigate();
  const bottomRef      = useRef(null);
  const recognitionRef = useRef(null);

  // Core State
  const [messages,        setMessages]        = useState([{
    role: "bot",
    text: "👋 Hi! I'm Max, your personal football coach AI. Ask me anything about training, drills, fitness, or tactics!",
  }]);
  const [input,           setInput]           = useState("");
  const [loading,         setLoading]         = useState(false);
  const [profile,         setProfile]         = useState(null);
  const [user,            setUser]            = useState(null);
  const [memoryStats,     setMemoryStats]     = useState(null);
  const [extracting,      setExtracting]      = useState(false);
  const [extractModalVisible, setExtractModalVisible] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [newAchievements, setNewAchievements] = useState([]);
  const [statChanges,     setStatChanges]     = useState(null);
  const [playerStats,     setPlayerStats]     = useState(null);

  // Voice Input State
  const [listening,      setListening]      = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError,     setVoiceError]     = useState(null);
  const [transcript,     setTranscript]     = useState("");
  // eslint-disable-next-line no-unused-vars
  const [voicePermissionAsked, setVoicePermissionAsked] = useState(false);

  // Additional UI States
  // eslint-disable-next-line no-unused-vars
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Check Voice Support
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setVoiceSupported(true);
    } else {
      console.warn("Audio recording not supported in this browser");
    }
  }, []);

  // Stop Listening Function
  const stopListening = useCallback(() => {
    if (recognitionRef.current && recognitionRef.current.state !== 'inactive') {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log("Stop error:", e);
      }
    }
    setListening(false);
    setTranscript("");
  }, []);

  // Start Listening - Improved Voice Input
  const startListening = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { 
      setVoiceError("Microphone not supported in this browser.");
      return; 
    }

    if (listening) { 
      stopListening(); 
      return; 
    }

    setVoiceError(null);
    setTranscript("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        setListening(false);
        setTranscript("");
        
        if (audioChunks.length === 0) return;
        
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append("audio", audioBlob, "voice.webm");
        
        try {
          const res = await fetch(`${API_BASE}/api/voice/transcribe`, {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (res.ok && data.transcript) {
            setInput(prev => (prev ? prev + " " + data.transcript : data.transcript).trim());
          } else {
            setVoiceError(data.error || "Failed to transcribe voice.");
          }
        } catch (e) {
          setVoiceError("Could not reach voice server.");
        }
      };

      recognitionRef.current = mediaRecorder;
      mediaRecorder.start();
      setListening(true);
      console.log("🎤 Voice recording started");
    } catch (err) {
      console.error("Voice start error:", err);
      setVoiceError("Microphone permission denied or not available.");
      setListening(false);
    }
  }, [listening, stopListening]);

  // Auto cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current && recognitionRef.current.state !== 'inactive') {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Refresh Stats
  const refreshStats = useCallback(async (uid) => {
    if (!uid) return;
    try {
      const sRes  = await fetch(`${API_BASE}/api/chatbot/stats/${uid}`);
      const sData = await sRes.json().catch(() => ({}));
      if (sRes.ok && sData.stats) {
        setPlayerStats(sData.stats);
        console.log("📊 Stats refreshed successfully");
      }
    } catch (err) {
      console.log("Stats refresh failed:", err);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    async function init() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session?.user) { 
          nav("/login"); 
          return; 
        }

        setUser(session.user);
        const uid   = session.user.id;
        const token = session.access_token;

        // Profile
        const res  = await fetch(`${API_BASE}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        
        if (res.ok && data.profile) {
          setProfile(data.profile);
          const pos  = data.profile.position  || "player";
          const name = data.profile.user_name || "Player";
          const club = data.profile.club      || "";
          try {
            const histRes = await fetch(`${API_BASE}/api/chatbot/history/${uid}`);
            const histData = await histRes.json();
            if (histRes.ok && histData.history && histData.history.length > 0) {
              setMessages(histData.history);
            } else {
              setMessages([{
                role: "bot",
                text: `👋 Welcome back, ${name}! I'm Max, your personal AI football coach.\n\nI know you're a ${pos}${club ? ` at ${club}` : ""}. I remember all your stats and past sessions.\n\nWhat do you want to work on today? 💪⚽`,
              }]);
            }
          } catch (e) {
            setMessages([{
              role: "bot",
              text: `👋 Welcome back, ${name}! I'm Max, your personal AI football coach.\n\nI know you're a ${pos}${club ? ` at ${club}` : ""}. I remember all your stats and past sessions.\n\nWhat do you want to work on today? 💪⚽`,
            }]);
          }
        }

        await refreshStats(uid);
      } catch (error) {
        console.error("Init error:", error);
      }
    }
    
    init();
  }, [nav, refreshStats]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send Message
  async function sendMessage() {
    const q = input.trim();
    if (!q || loading) return;
    if (listening) stopListening();

    setMessages(prev => [...prev, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chatbot/ask`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          question: q,
          user_id:  user?.id || "anonymous",
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

      const data   = await res.json().catch(() => ({}));
      const answer = data.answer || data.error || "Sorry, something went wrong.";
      
      setMessages(prev => [...prev, { role: "bot", text: answer }]);

      if (data.memory_stats) setMemoryStats(data.memory_stats);
      if (data.stats) setPlayerStats(data.stats);

      if (data.new_achievements?.length > 0) {
        setNewAchievements(data.new_achievements);
        setTimeout(() => setNewAchievements([]), 7000);
      }

      if (data.stat_changes && Object.keys(data.stat_changes).length > 0) {
        setStatChanges(data.stat_changes);
        setTimeout(() => setStatChanges(null), 5000);
      }

    } catch (_) {
      setMessages(prev => [...prev, {
        role: "bot",
        text: "⚠️ Could not reach the server. Is the backend running?",
      }]);
    } finally {
      setLoading(false);
    }
  }

  const openExtractModal = () => {
    if (!messages || messages.length <= 1) {
      alert("Not enough content yet. Ask Max for a plan first!");
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

  // Extract Plan
  async function extractPlan() {
    if (selectedIndices.length === 0) return;
    setExtractModalVisible(false);
    setExtracting(true);
    const chosenMessages = messages.filter((_, idx) => selectedIndices.includes(idx));
    try {
      const res = await fetch(`${API_BASE}/api/training-plan/extract`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          user_id:  user?.id,
          messages: chosenMessages,
          profile: profile || {},
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { 
        alert(data.error || "Failed to extract plan."); 
        return; 
      }
      nav("/training-plan", { state: { extractedPlan: data.plan, messages, profile } });
    } catch (_) {
      alert("Could not reach server.");
    } finally {
      setExtracting(false);
    }
  }

  // Clear Memory
  async function clearMemory() {
    if (!user?.id || !window.confirm("Clear coaching memory? Your match stats are kept in the database.")) return;
    try {
      await fetch(`${API_BASE}/api/chatbot/memory/${user.id}`, { method: "DELETE" });
      await fetch(`${API_BASE}/api/chatbot/chat/${user.id}`, { method: "DELETE" });
      setMemoryStats(null);
      setMessages([{ role: "bot", text: "🗑️ Memory cleared! Your match stats are still saved. Let's start fresh — what do you want to work on today?" }]);
    } catch (_) { 
      alert("Failed to clear memory."); 
    }
  }

  // Keyboard Handler
  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { 
      e.preventDefault(); 
      sendMessage(); 
    }
  }

  // Skill Badge
  function getSkillBadge() {
    const club = (profile?.club || "").toLowerCase();
    const pros  = ["barcelona","fcb","real madrid","manchester","chelsea","juventus","liverpool"];
    if (pros.some(c => club.includes(c)))               return { label: "Advanced",     color: "#e53e3e" };
    if (club && club !== "none" && club !== "-")         return { label: "Intermediate", color: "#d69e2e" };
    return                                                      { label: "Beginner",     color: "#38a169" };
  }

  const badge = profile ? getSkillBadge() : null;

  // Render
  return (
    <div style={{ fontFamily:"system-ui", height:"100vh", display:"flex", flexDirection:"column", background:"#f7f8fc" }}>
      <Navbar />

      {/* Achievement Popups */}
      {newAchievements.map((ach, i) => (
        <div key={ach.id} style={{
          position:"fixed", top: 80 + i * 110, right: 20,
          background:"linear-gradient(135deg,#6a11cb,#2575fc)",
          border:"1px solid rgba(255,255,255,0.2)", borderRadius:16,
          padding:"16px 20px", color:"#fff", zIndex:9999,
          boxShadow:"0 8px 32px rgba(106,17,203,0.6)", maxWidth:300,
          animation:"slideIn 0.4s ease",
        }}>
          <div style={{ fontSize:11, fontWeight:700, opacity:0.7, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>
            🏆 Achievement Unlocked!
          </div>
          <div style={{ fontSize:22, marginBottom:4 }}>{ach.icon} {ach.title}</div>
          <div style={{ fontSize:12, opacity:0.85 }}>{ach.desc}</div>
        </div>
      ))}

      {/* Stat Changes Toast */}
      {statChanges && (
        <div style={{
          position:"fixed", bottom:120, left:"50%", transform:"translateX(-50%)",
          background:"linear-gradient(135deg,#059669,#10b981)",
          borderRadius:14, padding:"12px 24px", color:"#fff",
          zIndex:9999, fontSize:13, fontWeight:700,
          display:"flex", alignItems:"center", gap:12, flexWrap:"wrap",
          boxShadow:"0 4px 20px rgba(5,150,105,0.5)",
          animation:"slideUp 0.3s ease", maxWidth:"90vw",
        }}>
          <span style={{ fontWeight:800 }}>📊 Saved to database:</span>
          {statChanges.goals_scored && <span>⚽ +{statChanges.goals_scored} goal{statChanges.goals_scored > 1 ? "s" : ""}</span>}
          {statChanges.assists      && <span>🤝 +{statChanges.assists} assist{statChanges.assists > 1 ? "s" : ""}</span>}
          {statChanges.wins         && <span>🏆 Win recorded!</span>}
          {statChanges.losses       && <span>😞 Loss recorded</span>}
          {statChanges.draws        && <span>🤝 Draw recorded</span>}
          {statChanges.clean_sheets && <span>🧱 Clean sheet!</span>}
          {statChanges.motm         && <span>⭐ MoTM!</span>}
          {statChanges.hat_trick    && <span>🎩 Hat trick!</span>}
        </div>
      )}

      {/* Live Stats Bar */}
      {playerStats && (
        <div style={{
          background:"#1e1b4b",
          borderBottom:"1px solid rgba(106,17,203,0.3)",
          padding:"7px 20px",
          display:"flex", gap:16, alignItems:"center",
          fontSize:12, color:"rgba(255,255,255,0.75)",
          flexShrink:0, overflowX:"auto",
        }}>
          <span style={{ fontWeight:800, color:"#a78bfa", whiteSpace:"nowrap", flexShrink:0 }}>
            📊 Career Stats:
          </span>
          <span style={{ whiteSpace:"nowrap" }}>⚽ <b style={{ color:"#fff" }}>{playerStats.goals_scored ?? 0}</b> goals</span>
          <span style={{ whiteSpace:"nowrap" }}>🤝 <b style={{ color:"#fff" }}>{playerStats.assists ?? 0}</b> assists</span>
          <span style={{ whiteSpace:"nowrap" }}>
            🏆 <b style={{ color:"#10b981" }}>{playerStats.wins  ?? 0}W</b>{" "}
                <b style={{ color:"#f59e0b" }}>{playerStats.draws ?? 0}D</b>{" "}
                <b style={{ color:"#ef4444" }}>{playerStats.losses ?? 0}L</b>
          </span>
          <span style={{ whiteSpace:"nowrap" }}>🧱 <b style={{ color:"#fff" }}>{playerStats.clean_sheets ?? 0}</b> CS</span>
          <span style={{ whiteSpace:"nowrap" }}>⭐ <b style={{ color:"#fff" }}>{playerStats.motm ?? 0}</b> MoTM</span>
          {(playerStats.hat_trick ?? 0) > 0 && (
            <span style={{ whiteSpace:"nowrap" }}>🎩 <b style={{ color:"#fff" }}>{playerStats.hat_trick}</b> hat tricks</span>
          )}
          {(playerStats.win_streak ?? 0) > 0 && (
            <span style={{ whiteSpace:"nowrap" }}>🔥 streak: <b style={{ color:"#fff" }}>{playerStats.win_streak}</b></span>
          )}
          <span style={{ whiteSpace:"nowrap", opacity:0.4 }}>💬 {playerStats.sessions ?? 0} sessions</span>
          <button
            onClick={() => refreshStats(user?.id)}
            style={{
              marginLeft:"auto", background:"rgba(167,139,250,0.15)",
              border:"1px solid rgba(167,139,250,0.3)", borderRadius:6,
              padding:"2px 10px", color:"#a78bfa", cursor:"pointer",
              fontSize:11, fontWeight:700, flexShrink:0, whiteSpace:"nowrap",
            }}
          >🔄 Refresh</button>
        </div>
      )}

      {/* Chat Header */}
      <div style={{
        padding:"14px 24px",
        background:"linear-gradient(135deg,#6a11cb,#2575fc)",
        color:"#fff", display:"flex", alignItems:"center", gap:12, flexShrink:0,
      }}>
        <span style={{ fontSize:28 }}>⚽</span>
        <div>
          <div style={{ fontWeight:700, fontSize:17 }}>Train Max AI</div>
          <div style={{ fontSize:11, opacity:0.8 }}>Your personal football coach — powered by AI</div>
        </div>
        {profile && badge && (
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:10, fontSize:13 }}>
            <button
              onClick={clearMemory}
              style={{
                background:"rgba(255,255,255,0.2)", border:"none", borderRadius:12,
                padding:"6px 12px", color:"#fff", cursor:"pointer",
                fontSize:11, fontWeight:700, whiteSpace:"nowrap",
              }}
            >🗑️ Clear Chat</button>
            <span style={{ background:badge.color, color:"#fff", padding:"2px 10px", borderRadius:20, fontWeight:700, fontSize:11 }}>
              {badge.label}
            </span>
            <div style={{ opacity:0.9, textAlign:"right" }}>
              <div style={{ fontWeight:600 }}>👤 {profile.user_name || "Player"}</div>
              <div style={{ fontSize:11, opacity:0.75 }}>{profile.position || ""}{profile.club ? ` · ${profile.club}` : ""}</div>
            </div>
          </div>
        )}
      </div>

      {/* Memory Bar */}
      {memoryStats && (
        <div style={{
          background:"#eef2ff", borderBottom:"1px solid #c7d2fe",
          padding:"6px 20px", fontSize:12, color:"#4338ca",
          display:"flex", gap:16, alignItems:"center", flexShrink:0, overflowX:"auto",
        }}>
          <span>🧠 Max remembers:</span>
          <span>💬 {memoryStats.history_count} chats</span>
          <span>🎯 {memoryStats.goals_noted} goals noted</span>
          <span>🩹 {memoryStats.injuries_noted} injuries</span>
          {memoryStats.topics_covered?.length > 0 && (
            <span>📚 {memoryStats.topics_covered.join(", ")}</span>
          )}
          <button
            onClick={clearMemory}
            style={{
              marginLeft:"auto", background:"none", border:"1px solid #c7d2fe",
              borderRadius:6, padding:"2px 10px", color:"#4338ca",
              cursor:"pointer", fontSize:11, whiteSpace:"nowrap",
            }}
          >🗑️ Clear Memory</button>
        </div>
      )}

      {/* Voice Error */}
      {voiceError && (
        <div style={{
          background:"#fee2e2", borderBottom:"1px solid #fecaca",
          padding:"8px 20px", fontSize:13, color:"#991b1b",
          display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0,
        }}>
          <span>🎤 {voiceError}</span>
          <button
            onClick={() => setVoiceError(null)}
            style={{ background:"none", border:"none", color:"#991b1b", cursor:"pointer", fontWeight:700 }}
          >✕</button>
        </div>
      )}

      {/* Live Transcript */}
      {listening && transcript && (
        <div style={{
          background:"#f0fdf4", borderBottom:"1px solid #bbf7d0",
          padding:"8px 20px", fontSize:13, color:"#166534",
          display:"flex", alignItems:"center", gap:8, flexShrink:0,
        }}>
          <span>🎙️</span><span style={{ fontStyle:"italic" }}>{transcript}</span>
        </div>
      )}

      {/* Messages Area */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display:"flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            alignItems:"flex-end", gap:8,
          }}>
            {msg.role === "bot" && (
              <div style={{
                width:32, height:32, borderRadius:"50%",
                background:"linear-gradient(135deg,#6a11cb,#2575fc)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:15, flexShrink:0,
              }}>⚽</div>
            )}
            <div style={{
              maxWidth:"70%", padding:"11px 15px",
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background:   msg.role === "user" ? "linear-gradient(135deg,#6a11cb,#2575fc)" : "#fff",
              color:        msg.role === "user" ? "#fff" : "#222",
              boxShadow:"0 2px 8px rgba(0,0,0,0.08)",
              fontSize:14, lineHeight:1.7, whiteSpace:"pre-wrap",
            }}>
              {msg.role === "bot" && (
                <div style={{ fontWeight:700, fontSize:11, color:"#6a11cb", marginBottom:3 }}>MAX · AI Coach</div>
              )}
              {msg.text}
            </div>
            {msg.role === "user" && (
              <div style={{
                width:32, height:32, borderRadius:"50%", background:"#e2e8f0",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:15, flexShrink:0,
              }}>👤</div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display:"flex", alignItems:"flex-end", gap:8 }}>
            <div style={{
              width:32, height:32, borderRadius:"50%",
              background:"linear-gradient(135deg,#6a11cb,#2575fc)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:15,
            }}>⚽</div>
            <div style={{
              padding:"11px 16px", borderRadius:"18px 18px 18px 4px",
              background:"#fff", boxShadow:"0 2px 8px rgba(0,0,0,0.08)",
              fontSize:14, color:"#888", display:"flex", gap:4, alignItems:"center",
            }}>
              <span>Max is thinking</span>
              <span style={{ letterSpacing:2 }}>...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Reply Chips */}
      {messages.length <= 2 && profile && (
        <div style={{ padding:"0 20px 10px", display:"flex", gap:8, flexWrap:"wrap", flexShrink:0 }}>
          {[
            `Drills for ${profile.position || "my position"}`,
            `Improve my ${profile.focused_area || "skills"}`,
            "We won 2-1 today",
            "We lost 1-0",
            "We drew 1-1",
            "I scored a goal",
            "I scored a hat-trick",
          ].map(s => (
            <button
              key={s}
              onClick={() => setInput(s)}
              style={{
                padding:"5px 12px", border:"1px solid #c7d2fe",
                borderRadius:20, background:"#eef2ff", color:"#4338ca",
                fontSize:12, cursor:"pointer", fontWeight:600,
              }}
            >{s}</button>
          ))}
        </div>
      )}

      {/* INPUT BAR WITH DEFAULT VOICE BUTTON */}
      <div style={{
        padding:"12px 20px", borderTop:"1px solid #e5e5e5",
        background:"#fff", display:"flex", flexDirection:"column", gap:8, flexShrink:0,
      }}>
        {listening && (
          <div style={{
            display:"flex", alignItems:"center", gap:8,
            padding:"6px 12px", background:"#fef2f2",
            border:"1px solid #fecaca", borderRadius:8, fontSize:13, color:"#dc2626",
          }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:"#dc2626", display:"inline-block", animation:"pulse 1s infinite" }} />
            <span style={{ fontWeight:600 }}>Listening... speak now</span>
            <button
              onClick={stopListening}
              style={{
                marginLeft:"auto", background:"#dc2626", color:"#fff",
                border:"none", borderRadius:6, padding:"2px 10px", cursor:"pointer", fontSize:12, fontWeight:700,
              }}
            >Stop</button>
          </div>
        )}

        <div style={{ display:"flex", gap:8 }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              listening ? "🎙️ Listening..."
              : profile  ? `Ask Max or report: "I scored 2 goals", "We won 3-1", "Got man of the match"...`
              : "Ask Max anything..."
            }
            rows={2}
            style={{
              flex:1, padding:"10px 14px",
              border:     listening ? "1px solid #fca5a5" : "1px solid #ddd",
              borderRadius:10, fontSize:14, resize:"none",
              fontFamily:"system-ui", outline:"none", lineHeight:1.5,
              background: listening ? "#fff5f5" : "#fff",
            }}
          />

          {/* VOICE BUTTON - ALWAYS VISIBLE & IMPROVED */}
          {voiceSupported && (
            <button
              onClick={listening ? stopListening : startListening}
              style={{
                padding:"0 16px",
                background: listening ? "linear-gradient(135deg,#dc2626,#ef4444)" : "linear-gradient(135deg,#6a11cb,#2575fc)",
                color: "#fff",
                border: "none",
                borderRadius:10, 
                fontSize:22, 
                cursor:"pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                minWidth: "60px",
              }}
              title="Hold to speak - Voice Input"
            >
              {listening ? "🔴" : "🎤"}
            </button>
          )}

          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              padding:"0 18px",
              background: loading || !input.trim() ? "#e2e8f0" : "linear-gradient(135deg,#6a11cb,#2575fc)",
              color:      loading || !input.trim() ? "#aaa"    : "#fff",
              border:"none", borderRadius:10, fontWeight:700,
              fontSize:14, cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              whiteSpace:"nowrap",
            }}
          >Send ➤</button>

          <button
            onClick={openExtractModal}
            disabled={extracting || loading}
            style={{
              padding:"0 14px",
              background: "#eef2ff",
              color: "#4338ca",
              border:"1px solid",
              borderColor: "#c7d2fe",
              borderRadius:10, fontWeight:700, fontSize:12,
              cursor: extracting || loading ? "not-allowed" : "pointer",
              whiteSpace:"nowrap",
            }}
          >{extracting ? "⏳..." : "📋 Extract Plan"}</button>
        </div>
      </div>

      {/* ══ SELECT MESSAGES MODAL ══ */}
      {extractModalVisible && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 99999, padding: 20
        }} onClick={() => setExtractModalVisible(false)}>
          <div style={{
            background: "#fff", borderRadius: 24, width: "100%", maxWidth: 650,
            overflow: "hidden", display: "flex", flexDirection: "column",
            boxShadow: "0 24px 50px rgba(0,0,0,0.2)"
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: "24px 30px", borderBottom: "1px solid #f3f4f6",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 4 }}>📋 Select Chat to Scan</div>
                <div style={{ fontSize: 14, color: "#6b7280" }}>Choose which discussion & drills Max should scan into your plan:</div>
              </div>
              <button onClick={() => setExtractModalVisible(false)} style={{
                background: "#f3f4f6", border: "none", width: 36, height: 36,
                borderRadius: "50%", color: "#6b7280", fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700
              }}>✕</button>
            </div>
            <div style={{ padding: "24px 30px" }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <button style={{ height: 32, fontSize: 12, padding: "0 14px", borderRadius: 8, border: "none", background: "#eef2ff", color: "#4f46e5", fontWeight: 600, cursor: "pointer" }} onClick={selectAllMessages}>✅ Select All</button>
                <button style={{ height: 32, fontSize: 12, padding: "0 14px", borderRadius: 8, border: "none", background: "#f3f4f6", color: "#4b5563", fontWeight: 600, cursor: "pointer" }} onClick={deselectAllMessages}>✕ Deselect All</button>
              </div>
              <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                {messages.slice().reverse().map((msg, revIdx) => {
                  const i = messages.length - 1 - revIdx;
                  if (i === 0 && msg.role === "bot") return null;
                  const isSelected = selectedIndices.includes(i);
                  return (
                    <div
                      key={i}
                      onClick={() => toggleSelectIndex(i)}
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        background: isSelected ? "rgba(79,70,229,0.08)" : "#f9fafb",
                        border: `1px solid ${isSelected ? "#4f46e5" : "#e5e7eb"}`,
                        cursor: "pointer",
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: 6,
                        border: `2px solid ${isSelected ? "#4f46e5" : "#d1d5db"}`,
                        background: isSelected ? "#4f46e5" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2
                      }}>
                        {isSelected ? "✓" : ""}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#4f46e5", marginBottom: 3 }}>
                          {msg.role === "user" ? "👤 You Asked:" : "🤖 MAX Answer:"}
                        </div>
                        <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{
              padding: "16px 30px", borderTop: "1px solid #f3f4f6", background: "#f9fafb",
              display: "flex", justifyContent: "flex-end", gap: 12
            }}>
              <button style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#e5e7eb", color: "#374151", fontWeight: 700, cursor: "pointer" }} onClick={() => setExtractModalVisible(false)}>Cancel</button>
              <button
                disabled={selectedIndices.length === 0 || loading}
                onClick={extractPlan}
                style={{
                  padding: "10px 24px", borderRadius: 10, border: "none",
                  background: selectedIndices.length === 0 ? "#a5b4fc" : "linear-gradient(135deg,#6a11cb,#2575fc)",
                  color: "#fff", fontWeight: 700, cursor: selectedIndices.length === 0 ? "not-allowed" : "pointer",
                  minWidth: 200
                }}
              >
                {loading ? "Scanning..." : `⚡ Scan (${selectedIndices.length}) into Plan`}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideUp { from{opacity:0;transform:translate(-50%,20px)} to{opacity:1;transform:translate(-50%,0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}