import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import CoachNavbar from "../components/CoachNavbar";

const API = "http://127.0.0.1:5000";

// ─── Frontend-only plan scanner ───────────────────────────────────────────────
function scanPlanFromMessages(messages) {
  const botMsgs = messages.filter(m => m.role === "bot" && m.text.length > 40);
  if (botMsgs.length === 0) return null;

  const allText = botMsgs.map(m => m.text).join("\n");
  const lower   = allText.toLowerCase();

  const drillKeywords = [
    ["pass",      "Passing & Movement"],
    ["dribbl",    "Dribbling Circuit"],
    ["shoot",     "Shooting Practice"],
    ["press",     "High Pressing Drill"],
    ["tactic",    "Tactical Shape"],
    ["fitness",   "Fitness & Conditioning"],
    ["sprint",    "Sprint Intervals"],
    ["set piece", "Set Piece Routine"],
    ["finish",    "Finishing Drill"],
    ["cross",     "Crossing & Delivery"],
    ["defend",    "Defensive Shape"],
    ["game",      "Small-sided Game"],
    ["warm",      "Warmup Routine"],
    ["position",  "Positional Play"],
    ["stamina",   "Stamina Circuit"],
    ["heading",   "Heading Practice"],
    ["turn",      "Turning & Receiving"],
    ["one-two",   "One-Two Combinations"],
    ["rondo",     "Rondo Possession"],
    ["agility",   "Agility Ladder"],
  ];

  const foundDrills = [];
  drillKeywords.forEach(([kw, name]) => {
    if (lower.includes(kw) && !foundDrills.find(d => d.name === name)) {
      foundDrills.push({
        name,
        duration:      "15 mins",
        sets:          "3",
        reps:          "10",
        description:   extractSentenceWith(allText, kw),
        coaching_cues: extractCues(kw),
        equipment:     "cones, ball",
      });
    }
  });

  if (foundDrills.length === 0) return null;

  const focusMap = {
    "passing":"Passing","dribbling":"Dribbling","shooting":"Shooting",
    "tactics":"Tactics","fitness":"Fitness","pressing":"Pressing",
    "defending":"Defending","set piece":"Set Pieces","crossing":"Crossing",
    "stamina":"Stamina","speed":"Speed","positioning":"Positioning",
    "heading":"Heading","finishing":"Finishing",
  };
  const focusAreas = Object.entries(focusMap)
    .filter(([kw]) => lower.includes(kw))
    .map(([, label]) => label)
    .slice(0, 5);

  let difficulty = "Intermediate";
  if (lower.includes("beginner") || lower.includes("basic"))   difficulty = "Beginner";
  if (lower.includes("advanced") || lower.includes("elite"))   difficulty = "Advanced";

  const chunkSize = 3;
  const days = [];
  for (let i = 0; i < Math.min(foundDrills.length, 9); i += chunkSize) {
    const chunk  = foundDrills.slice(i, i + chunkSize);
    const dayNum = Math.floor(i / chunkSize) + 1;
    days.push({
      day:              `Day ${dayNum}`,
      theme:            chunk[0]?.name || "Training Session",
      focus:            chunk[0]?.name || "Training Session",
      duration_minutes: 60,
      intensity:        dayNum % 2 === 0 ? "High" : "Medium",
      exercises:        chunk,
      drills:           chunk,
    });
  }

  const nutritionTips = [];
  if (lower.includes("hydrat") || lower.includes("water"))  nutritionTips.push("Stay hydrated — water before, during and after");
  if (lower.includes("protein"))                             nutritionTips.push("Eat protein within 1 hour of training");
  if (lower.includes("carb") || lower.includes("energy"))   nutritionTips.push("Complex carbs 2 hours before session");
  if (nutritionTips.length === 0)                            nutritionTips.push("Stay hydrated throughout training");

  const title = focusAreas.length > 0
    ? `${focusAreas[0]} & ${focusAreas[1] || "Fitness"} Training Plan`
    : "Coaching Session Training Plan";

  return {
    title,
    summary:           `A ${difficulty.toLowerCase()} plan covering ${focusAreas.slice(0,3).join(", ") || "key football skills"}, from your MAX coaching session.`,
    duration:          `${days.length} session${days.length > 1 ? "s" : ""}`,
    difficulty,
    sessions_per_week: Math.min(days.length, 3),
    key_focus_areas:   focusAreas.length > 0 ? focusAreas : ["Technical Skills", "Fitness"],
    days,
    nutrition_tips:    nutritionTips,
    coach_notes:       "Plan scanned from your coaching session with MAX.",
    extracted_at:      new Date().toISOString(),
    _source:           "frontend_scan",
  };
}

function extractSentenceWith(text, keyword) {
  const sentences = text.split(/[.!?\n]/);
  const match = sentences.find(s => s.toLowerCase().includes(keyword));
  return match ? match.trim().slice(0, 120) : `Focus on ${keyword} technique and precision.`;
}

function extractCues(keyword) {
  const cueMap = {
    "pass":     ["Keep your head up",        "Weight the pass correctly"],
    "dribbl":   ["Keep the ball close",       "Change direction quickly"],
    "shoot":    ["Plant foot beside ball",    "Follow through"],
    "press":    ["Cut passing lanes",         "Trigger on back pass"],
    "sprint":   ["Drive arms",                "Maintain posture"],
    "defend":   ["Stay goal-side",            "Delay the attacker"],
    "cross":    ["Pick your spot early",      "Whip the ball in"],
    "finish":   ["Strike through the ball",   "Aim for corners"],
    "position": ["Hold your shape",           "Communicate constantly"],
    "tactic":   ["Maintain compact shape",    "Press as a unit"],
    "fitness":  ["Control your breathing",    "Keep intensity high"],
    "stamina":  ["Pace yourself early",       "Push through fatigue"],
    "warm":     ["Gradual intensity increase","Activate all muscle groups"],
    "heading":  ["Eyes on the ball",          "Use your forehead"],
    "set piece":["Practice the routine",      "Timing is everything"],
    "game":     ["Quick decisions",           "Support the ball carrier"],
    "agility":  ["Light on your feet",        "Quick foot placement"],
    "rondo":    ["Move after passing",        "Keep it quick"],
  };
  for (const [kw, cues] of Object.entries(cueMap)) {
    if (keyword.includes(kw)) return cues;
  }
  return ["Focus on technique", "Stay composed"];
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}

  .cc-root{height:100vh;display:flex;flex-direction:column;background:#0f0c29;font-family:'Inter',sans-serif;color:#fff;}

  .cc-mem-bar{background:#1a1535;border-bottom:1px solid rgba(255,255,255,.07);padding:6px 20px;display:flex;gap:14px;align-items:center;font-size:11px;color:rgba(255,255,255,.55);flex-shrink:0;overflow-x:auto;}
  .cc-mem-bar::-webkit-scrollbar{height:0;}
  .cc-mem-label{font-weight:800;color:#a78bfa;white-space:nowrap;}

  .cc-header{background:linear-gradient(135deg,#059669,#10b981);padding:11px 22px;display:flex;align-items:center;gap:11px;flex-shrink:0;}
  .cc-hdr-icon{font-size:22px;}
  .cc-hdr-title{font-family:'Rajdhani',sans-serif;font-size:16px;font-weight:700;}
  .cc-hdr-sub{font-size:10px;opacity:.8;margin-top:1px;}
  .cc-hdr-right{margin-left:auto;text-align:right;}
  .cc-hdr-name{font-weight:700;font-size:12px;}
  .cc-hdr-club{font-size:10px;opacity:.7;}

  .cc-main{display:flex;flex:1;overflow:hidden;}

  /* sidebar */
  .cc-sidebar{width:260px;flex-shrink:0;background:#13102a;border-right:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;overflow:hidden;}
  .cc-sb-top{padding:11px 13px;border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0;}
  .cc-sb-title{font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;color:rgba(255,255,255,.6);margin-bottom:7px;display:flex;align-items:center;gap:5px;}
  .cc-sb-scroll{flex:1;overflow-y:auto;padding:10px 13px;}
  .cc-sb-scroll::-webkit-scrollbar{width:3px;}
  .cc-sb-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px;}

  .cc-ctx-chip{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.22);border-radius:9px;padding:7px 10px;margin-bottom:6px;display:flex;align-items:center;gap:7px;}
  .cc-ctx-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
  .cc-ctx-info{flex:1;min-width:0;}
  .cc-ctx-name{font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .cc-ctx-meta{font-size:9px;color:rgba(255,255,255,.35);}
  .cc-ctx-rm{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.18);color:#fca5a5;border-radius:4px;padding:1px 6px;font-size:9px;cursor:pointer;transition:all .2s;flex-shrink:0;}
  .cc-ctx-rm:hover{background:rgba(239,68,68,.26);}

  .cc-team-row{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:7px 10px;margin-bottom:5px;display:flex;align-items:center;gap:7px;transition:all .2s;}
  .cc-team-row:hover{border-color:rgba(16,185,129,.32);}
  .cc-team-row.added{background:rgba(16,185,129,.07);border-color:rgba(16,185,129,.2);}
  .cc-team-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
  .cc-team-name{font-size:11px;font-weight:600;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .cc-team-count{font-size:9px;color:rgba(255,255,255,.32);}
  .cc-add-btn{background:rgba(16,185,129,.14);border:1px solid rgba(16,185,129,.22);color:#10b981;border-radius:4px;padding:2px 7px;font-size:10px;cursor:pointer;transition:all .2s;flex-shrink:0;}
  .cc-add-btn:hover{background:rgba(16,185,129,.28);}
  .cc-added-tag{font-size:9px;color:#10b981;font-weight:700;flex-shrink:0;}

  .cc-player-row{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:7px;padding:6px 9px;margin-bottom:4px;display:flex;align-items:center;gap:7px;cursor:pointer;transition:all .2s;}
  .cc-player-row:hover{border-color:rgba(106,17,203,.38);background:rgba(106,17,203,.07);}
  .cc-player-row.active{border-color:#6a11cb;background:rgba(106,17,203,.14);}
  .cc-p-avatar{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#6a11cb,#2575fc);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;}
  .cc-p-name{font-size:10px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .cc-p-meta{font-size:9px;color:rgba(255,255,255,.32);}
  .cc-p-stats{font-size:9px;color:#10b981;font-weight:600;}

  .cc-sb-nav{padding:12px 13px;border-top:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column;gap:5px;flex-shrink:0;}
  .cc-nav-btn{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:rgba(255,255,255,.5);border-radius:8px;padding:7px 12px;font-size:11px;cursor:pointer;transition:all .2s;text-align:left;display:flex;align-items:center;gap:6px;}
  .cc-nav-btn:hover{background:rgba(255,255,255,.1);color:#fff;}

  /* chat */
  .cc-chat{flex:1;display:flex;flex-direction:column;overflow:hidden;}

  .cc-mode-bar{background:rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.07);padding:6px 14px;display:flex;align-items:center;gap:7px;flex-shrink:0;flex-wrap:wrap;}
  .cc-modebt{background:transparent;border:1px solid rgba(255,255,255,.11);border-radius:6px;padding:4px 11px;color:rgba(255,255,255,.45);font-size:11px;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;transition:all .2s;}
  .cc-modebt.on{background:linear-gradient(135deg,#059669,#10b981);color:#fff;border-color:transparent;}
  .cc-modebt.purple.on{background:linear-gradient(135deg,#6a11cb,#2575fc);}
  .cc-modebt.amber{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.28);color:#fbbf24;}
  .cc-modebt.amber:hover{background:rgba(245,158,11,.22);}
  .cc-modebt.amber.pulse{animation:ccPulse 2s ease-in-out infinite;}
  @keyframes ccPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.4);}50%{box-shadow:0 0 0 6px rgba(245,158,11,0);}}

  .cc-player-bar{background:rgba(106,17,203,.12);border-bottom:1px solid rgba(106,17,203,.2);padding:6px 16px;font-size:11px;color:#a78bfa;display:flex;align-items:center;gap:6px;flex-shrink:0;}

  .cc-messages{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:9px;}
  .cc-messages::-webkit-scrollbar{width:3px;}
  .cc-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px;}

  .cc-msg-row{display:flex;align-items:flex-end;gap:6px;}
  .cc-msg-row.user{justify-content:flex-end;}
  .cc-bot-ico{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#059669,#10b981);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}
  .cc-bubble{max-width:74%;padding:9px 13px;font-size:13px;line-height:1.7;white-space:pre-wrap;word-break:break-word;}
  .cc-bubble.bot{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:14px 14px 14px 3px;color:rgba(255,255,255,.9);}
  .cc-bubble.user{background:linear-gradient(135deg,#059669,#10b981);border-radius:14px 14px 3px 14px;color:#fff;}
  .cc-bubble.player{background:rgba(106,17,203,.14);border:1px solid rgba(106,17,203,.22);border-radius:14px 14px 14px 3px;color:rgba(255,255,255,.9);}
  .cc-msg-label{font-size:9px;font-weight:700;margin-bottom:2px;opacity:.6;}
  .cc-user-ico{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.09);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}

  .cc-thinking{display:flex;align-items:center;gap:5px;padding:9px 13px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:14px 14px 14px 3px;font-size:12px;color:rgba(255,255,255,.4);}
  .cc-dots span{display:inline-block;animation:ccDot 1.2s infinite;margin:0 1px;}
  .cc-dots span:nth-child(2){animation-delay:.2s;}
  .cc-dots span:nth-child(3){animation-delay:.4s;}
  @keyframes ccDot{0%,80%,100%{opacity:.2;transform:scale(.8);}40%{opacity:1;transform:scale(1);}}

  .cc-chips{padding:0 16px 7px;display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;}
  .cc-chip{padding:3px 11px;border:1px solid rgba(16,185,129,.28);border-radius:20px;background:rgba(16,185,129,.07);color:#10b981;font-size:11px;cursor:pointer;font-weight:600;transition:all .2s;white-space:nowrap;}
  .cc-chip:hover{background:rgba(16,185,129,.17);}
  .cc-chip.purple{border-color:rgba(106,17,203,.32);background:rgba(106,17,203,.08);color:#a78bfa;}

  .cc-input-bar{padding:9px 16px;border-top:1px solid rgba(255,255,255,.07);background:#13102a;display:flex;gap:6px;flex-shrink:0;align-items:flex-end;}
  .cc-textarea{flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.11);border-radius:10px;padding:8px 12px;color:#fff;font-size:13px;font-family:'Inter',sans-serif;resize:none;outline:none;line-height:1.5;transition:border-color .2s;}
  .cc-textarea::placeholder{color:rgba(255,255,255,.26);}
  .cc-textarea:focus{border-color:rgba(16,185,129,.5);}

  .cc-btn{border:none;border-radius:10px;padding:0 15px;height:40px;font-size:13px;font-weight:700;font-family:'Rajdhani',sans-serif;cursor:pointer;transition:all .2s;white-space:nowrap;display:flex;align-items:center;gap:5px;flex-shrink:0;}
  .cc-btn.green{background:linear-gradient(135deg,#059669,#10b981);color:#fff;}
  .cc-btn.green:disabled{opacity:.42;cursor:not-allowed;}
  .cc-btn.amber{background:rgba(245,158,11,.14);border:1px solid rgba(245,158,11,.28);color:#fbbf24;}
  .cc-btn.amber:hover:not(:disabled){background:rgba(245,158,11,.26);}
  .cc-btn.amber:disabled{opacity:.38;cursor:not-allowed;}
  .cc-btn.grey{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);color:rgba(255,255,255,.42);}
  .cc-btn.grey:hover{background:rgba(255,255,255,.11);}

  .cc-error{background:rgba(239,68,68,.11);border:1px solid rgba(239,68,68,.28);border-radius:8px;padding:7px 13px;font-size:12px;color:#fca5a5;margin:5px 16px;display:flex;align-items:center;gap:6px;flex-shrink:0;}
  .cc-success-strip{background:rgba(16,185,129,.11);border:1px solid rgba(16,185,129,.28);border-radius:8px;padding:7px 13px;font-size:12px;color:#6ee7b7;margin:5px 16px;display:flex;align-items:center;gap:6px;flex-shrink:0;cursor:pointer;transition:background .2s;}
  .cc-success-strip:hover{background:rgba(16,185,129,.2);}

  .cc-empty-sb{text-align:center;padding:14px 7px;color:rgba(255,255,255,.26);font-size:10px;line-height:1.7;}

  /* plan modal */
  .cc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.78);backdrop-filter:blur(8px);z-index:500;display:flex;align-items:center;justify-content:center;padding:14px;animation:ccOvIn .2s ease both;}
  @keyframes ccOvIn{from{opacity:0;}to{opacity:1;}}
  .cc-modal{background:#1a1535;border:1px solid rgba(255,255,255,.11);border-radius:20px;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;animation:ccMdIn .28s ease both;}
  @keyframes ccMdIn{from{opacity:0;transform:translateY(22px) scale(.97);}to{opacity:1;transform:translateY(0) scale(1);}}
  .cc-modal::-webkit-scrollbar{width:4px;}
  .cc-modal::-webkit-scrollbar-thumb{background:rgba(255,255,255,.11);border-radius:4px;}

  .cc-modal-hdr{display:flex;justify-content:space-between;align-items:flex-start;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,.07);position:sticky;top:0;background:#1a1535;z-index:10;border-radius:20px 20px 0 0;}
  .cc-modal-title{font-family:'Rajdhani',sans-serif;font-size:17px;font-weight:700;}
  .cc-modal-source{font-size:10px;color:#fbbf24;margin-top:2px;}
  .cc-modal-close{background:rgba(255,255,255,.07);border:none;color:rgba(255,255,255,.5);width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;}
  .cc-modal-close:hover{background:rgba(255,255,255,.14);color:#fff;}
  .cc-modal-body{padding:18px 22px;flex:1;}
  .cc-modal-ftr{display:flex;justify-content:flex-end;gap:8px;align-items:center;padding:12px 22px;border-top:1px solid rgba(255,255,255,.06);position:sticky;bottom:0;background:#1a1535;border-radius:0 0 20px 20px;}

  .cc-plan-hdr-card{background:linear-gradient(135deg,#059669,#10b981);border-radius:11px;padding:16px 18px;color:#fff;margin-bottom:13px;}
  .cc-plan-hdr-title{font-family:'Rajdhani',sans-serif;font-size:18px;font-weight:700;margin-bottom:4px;}
  .cc-plan-hdr-summary{font-size:12px;opacity:.9;line-height:1.5;margin-bottom:9px;}
  .cc-plan-tags{display:flex;gap:6px;flex-wrap:wrap;}
  .cc-plan-tag{background:rgba(255,255,255,.2);padding:2px 10px;border-radius:20px;font-size:11px;}

  .cc-focus-row{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:13px;}
  .cc-focus-chip{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);border-radius:20px;padding:2px 10px;font-size:11px;color:#10b981;}

  .cc-day-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:11px;margin-bottom:8px;overflow:hidden;}
  .cc-day-hdr{padding:10px 14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;transition:background .2s;}
  .cc-day-hdr:hover{background:rgba(255,255,255,.04);}
  .cc-day-hdr.open{background:rgba(16,185,129,.07);border-bottom:1px solid rgba(16,185,129,.14);}
  .cc-day-title{font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;}
  .cc-day-theme{font-size:10px;color:rgba(255,255,255,.42);margin-left:6px;}
  .cc-intensity{border-radius:20px;padding:1px 8px;font-size:10px;font-weight:700;}
  .cc-intensity.Medium{background:rgba(245,158,11,.14);color:#fbbf24;}
  .cc-intensity.High{background:rgba(239,68,68,.14);color:#fca5a5;}
  .cc-intensity.Low{background:rgba(16,185,129,.14);color:#10b981;}
  .cc-day-body{padding:10px 14px;display:flex;flex-direction:column;gap:8px;}
  .cc-exercise{border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:10px 12px;background:rgba(255,255,255,.03);}
  .cc-ex-name{font-size:12px;font-weight:700;margin-bottom:5px;}
  .cc-ex-tags{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:5px;}
  .cc-ex-tag{padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;}
  .cc-ex-tag.t{background:#dbeafe;color:#1d4ed8;}
  .cc-ex-tag.s{background:#dcfce7;color:#166534;}
  .cc-ex-tag.r{background:#fce7f3;color:#9d174d;}
  .cc-ex-desc{font-size:11px;color:rgba(255,255,255,.48);line-height:1.5;margin-bottom:4px;}
  .cc-ex-cues{font-size:10px;color:#a78bfa;}

  .cc-scan-note{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.22);border-radius:7px;padding:6px 11px;font-size:11px;color:#fbbf24;margin-bottom:12px;display:flex;align-items:center;gap:5px;}

  .cc-save-row{display:flex;align-items:center;gap:7px;flex:1;min-width:0;}
  .cc-save-select{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.11);border-radius:8px;padding:7px 10px;color:#fff;font-size:12px;font-family:'Inter',sans-serif;outline:none;cursor:pointer;flex:1;min-width:0;}
  .cc-save-select option{background:#1a1535;color:#fff;}
  .cc-saved-badge{background:rgba(16,185,129,.14);border:1px solid rgba(16,185,129,.28);border-radius:20px;padding:4px 12px;font-size:11px;color:#10b981;font-weight:600;white-space:nowrap;}

  .cc-spin{width:13px;height:13px;border:2px solid rgba(255,255,255,.22);border-top-color:#fff;border-radius:50%;animation:ccSpin .7s linear infinite;display:inline-block;}
  @keyframes ccSpin{to{transform:rotate(360deg);}}

  .cc-nutrition-box{background:#fff7ed;border-radius:9px;padding:11px 14px;margin-bottom:9px;}
  .cc-nutrition-lbl{font-weight:700;color:#c2410c;margin-bottom:5px;font-size:12px;}
  .cc-nutrition-tip{font-size:11px;color:#9a3412;margin-bottom:3px;}
  .cc-notes-box{background:rgba(255,255,255,.03);border-radius:9px;padding:11px 14px;border:1px solid rgba(255,255,255,.07);}
  .cc-notes-lbl{font-weight:700;color:rgba(255,255,255,.55);margin-bottom:4px;font-size:12px;}
  .cc-notes-txt{font-size:11px;color:rgba(255,255,255,.45);line-height:1.6;}
`;

const ini = s => (s || "?").charAt(0).toUpperCase();

export default function CoachChatbot() {
  const nav       = useNavigate();
  const bottomRef = useRef(null);

  const [user, setUser]                   = useState(null);
  const [coach, setCoach]                 = useState(null);
  const [loading, setLoading]             = useState(false);
  const [pageLoading, setPageLoading]     = useState(true);
  const [error, setError]                 = useState("");
  const [successBar, setSuccessBar]       = useState("");

  const [allTeams, setAllTeams]           = useState([]);
  const [ctxTeams, setCtxTeams]           = useState([]);

  const [mode, setMode]                   = useState("general");
  const [selectedTeam, setSelectedTeam]   = useState(null);
  const [teamPlayers, setTeamPlayers]     = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState("");
  const [memoryStats, setMemoryStats]     = useState(null);
  const [coachStats, setCoachStats]       = useState(null);

  // Voice recording state
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState(null);

  // Plan & Modals
  const [scannedPlan, setScannedPlan]     = useState(null);
  const [showPlan, setShowPlan]           = useState(false);
  const [planSaved, setPlanSaved]         = useState(false);
  const [saving, setSaving]               = useState(false);
  const [saveTarget, setSaveTarget]       = useState("coach");
  const [expandedDay, setExpandedDay]     = useState(0);
  const [extractModalVisible, setExtractModalVisible] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState([]);

  // Inject styles
  useEffect(() => {
    const t = document.createElement("style");
    t.textContent = STYLES;
    document.head.appendChild(t);
    return () => document.head.removeChild(t);
  }, []);

  useEffect(() => { init(); }, []);

  const init = async () => {
    setPageLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { nav("/coach-login"); return; }
      setUser(session.user);

      const { data: cp } = await supabase
        .from("coach_profiles").select("*").eq("id", session.user.id).single();
      if (!cp) { nav("/coach-login"); return; }
      setCoach(cp);

      try {
        const histRes = await fetch(`${API}/api/coach-chatbot/history/${session.user.id}`);
        const histData = await histRes.json();
        if (histRes.ok && histData.history && histData.history.length > 0) {
          setMessages(histData.history);
        } else {
          setMessages([{
            role: "bot",
            text: `👋 Welcome back, Coach ${cp.full_name?.split(" ")[0] || ""}!\n\nI'm MAX, your AI coaching partner.\n\n📌 Add teams from the sidebar so I know your players.\n⚡ Chat with me, then click **Quick Scan** to instantly build a training plan from our conversation.\n\nWhat are we working on today? 🏆`,
            mode: "general",
          }]);
        }
      } catch (e) {
        setMessages([{
          role: "bot",
          text: `👋 Welcome back, Coach ${cp.full_name?.split(" ")[0] || ""}!\n\nI'm MAX, your AI coaching partner.\n\n📌 Add teams from the sidebar so I know your players.\n⚡ Chat with me, then click **Quick Scan** to instantly build a training plan from our conversation.\n\nWhat are we working on today? 🏆`,
          mode: "general",
        }]);
      }

      try {
        const statsRes = await fetch(`${API}/api/coach-chatbot/stats/${session.user.id}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setCoachStats(statsData.stats);
        }
      } catch (e) {}

      await Promise.all([loadAllTeams(), loadCtxTeams(session.user.id)]);
    } catch (e) {
      setError(e.message);
    } finally {
      setPageLoading(false);
    }
  };

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  };

  const hdr = async () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${await getToken()}`,
  });

  const flash   = msg => { setSuccessBar(msg); setTimeout(() => setSuccessBar(""), 5000); };
  const showErr = msg => { setError(msg);       setTimeout(() => setError(""),     6000); };

  const loadAllTeams = async () => {
    try {
      const h = await hdr();
      const r = await fetch(`${API}/api/coach-chatbot/teams`, { headers: h });
      const d = await r.json().catch(() => ({}));
      if (r.ok) setAllTeams(d.teams || []);
    } catch {}
  };

  const loadCtxTeams = async uid => {
    try {
      const h = await hdr();
      const r = await fetch(`${API}/api/coach-chatbot/context-teams/${uid}`, { headers: h });
      const d = await r.json().catch(() => ({}));
      if (r.ok) setCtxTeams(d.context_teams || []);
    } catch {}
  };

  const addTeam = async team => {
    try {
      const h = await hdr();
      const r = await fetch(`${API}/api/coach-chatbot/context-teams`, {
        method: "POST", headers: h,
        body: JSON.stringify({ team_id: team.id }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        setCtxTeams(d.context_teams || []);
        setMessages(prev => [...prev, {
          role: "bot",
          text: `✅ Team "${team.name}" added! I now know all ${team.member_count ?? 0} players and their stats.`,
          mode: "general",
        }]);
      }
    } catch (e) { showErr(e.message); }
  };

  const removeTeam = async (teamId, name) => {
    try {
      const h = await hdr();
      const r = await fetch(`${API}/api/coach-chatbot/context-teams/${teamId}`, { method: "DELETE", headers: h });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        setCtxTeams(d.context_teams || []);
        if (selectedTeam?.id === teamId) {
          setSelectedTeam(null); setTeamPlayers([]); setSelectedPlayer(null); setMode("general");
        }
        setMessages(prev => [...prev, { role: "bot", text: `🗑️ Team "${name}" removed.`, mode: "general" }]);
      }
    } catch (e) { showErr(e.message); }
  };

  const loadTeamPlayers = async team => {
    if (selectedTeam?.id === team.id) { setSelectedTeam(null); setTeamPlayers([]); return; }
    try {
      const h = await hdr();
      const r = await fetch(`${API}/api/coach-chatbot/team-players/${team.id}`, { headers: h });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setSelectedTeam(d.team); setTeamPlayers(d.team?.members || []); }
    } catch {}
  };

  const selectPlayer = m => {
    if (selectedPlayer?.player_id === m.player_id) { setSelectedPlayer(null); setMode("general"); return; }
    setSelectedPlayer(m);
    setMode("player");
    const pname = m.profile?.user_name || "this player";
    setMessages(prev => [...prev, {
      role: "bot",
      text: `🎯 Player focus: **${pname}**\n${m.position || m.profile?.position || "?"} · ⚽${m.stats?.goals_scored ?? 0}G · 🏆${m.stats?.wins ?? 0}W\n\nAsk me how to develop ${pname}!`,
      mode: "player",
    }]);
  };

  // ── QUICK SCAN WITH MESSAGE SELECTION ─────────────────────────────────────
  const openExtractModal = () => {
    if (!messages || messages.length <= 1) {
      showErr("Not enough content yet. Ask MAX for drills, formations, or a training plan first!");
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
      const h = await hdr();
      const res = await fetch(`${API}/api/coach-training-plan/extract`, {
        method: "POST", headers: h,
        body: JSON.stringify({
          messages: chosenMessages,
          player_id: selectedPlayer ? selectedPlayer.id : "",
          player_name: selectedPlayer ? selectedPlayer.user_name : "",
          team_name: selectedTeam ? selectedTeam.team_name : "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const localPlan = scanPlanFromMessages(chosenMessages);
        if (localPlan) {
          setScannedPlan(localPlan);
          setPlanSaved(false);
          setSaveTarget("coach");
          setExpandedDay(0);
          setShowPlan(true);
        } else {
          showErr(data.error || "Could not extract plan from selected messages.");
        }
      } else if (data.plan) {
        setScannedPlan(data.plan);
        setPlanSaved(false);
        setSaveTarget("coach");
        setExpandedDay(0);
        setShowPlan(true);
      }
    } catch {
      const localPlan = scanPlanFromMessages(chosenMessages);
      if (localPlan) {
        setScannedPlan(localPlan);
        setPlanSaved(false);
        setSaveTarget("coach");
        setExpandedDay(0);
        setShowPlan(true);
      } else {
        showErr("Could not reach server and local scan found no drills.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── SAVE PLAN TO DB ───────────────────────────────────────────────────────
  const savePlan = async () => {
    if (!scannedPlan || saving) return;
    setSaving(true);
    try {
      const h = await hdr();
      const res = await fetch(`${API}/api/coach-chatbot/save-plan`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({
          plan:      scannedPlan,
          player_id: saveTarget !== "coach" ? saveTarget : "",
          team_id:   ctxTeams.length === 1 ? ctxTeams[0].team_id : "",
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Save failed");

      setPlanSaved(true);
      const tname = saveTarget === "coach"
        ? "your coach account"
        : teamPlayers.find(m => m.player_id === saveTarget)?.profile?.user_name || "player";

      flash(`✅ Plan "${scannedPlan.title}" saved to ${tname}!`);
      setMessages(prev => [...prev, {
        role: "bot",
        text: `✅ Training plan **"${scannedPlan.title}"** saved to ${tname}'s plans!\n\nClick "View Plans" in the sidebar to see it.`,
        mode,
      }]);
    } catch (e) {
      showErr(e.message || "Save failed. Check Flask is running.");
    } finally {
      setSaving(false);
    }
  };

  // ── SEND MESSAGE ─────────────────────────────────────────────────────────
  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setMessages(prev => [...prev, { role: "user", text: q, mode }]);
    setInput("");
    setLoading(true);

    try {
      const h = await hdr();
      const endpoint = mode === "player" && selectedPlayer
        ? `${API}/api/coach-chatbot/ask-player`
        : `${API}/api/coach-chatbot/ask`;
      const body = mode === "player" && selectedPlayer
        ? { question: q, player_id: selectedPlayer.player_id }
        : { question: q };

      const res = await fetch(endpoint, { method: "POST", headers: h, body: JSON.stringify(body) });
      const d   = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Request failed");

      setMessages(prev => [...prev, { role: "bot", text: d.answer || "Something went wrong.", mode }]);
      if (d.memory_stats) setMemoryStats(d.memory_stats);

      // Re-fetch stats after every message to get live updates
      try {
        const statsRes = await fetch(`${API}/api/coach-chatbot/stats/${user.id}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setCoachStats(statsData.stats);
        }
      } catch(e) {}
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "bot",
        text: "⚠️ Could not reach the server. Is Flask running?",
        mode,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearMemory = async () => {
    if (!user?.id || !window.confirm("Clear coaching memory?")) return;
    try {
      const h = await hdr();
      await fetch(`${API}/api/coach-chatbot/memory/${user.id}`, { method: "DELETE", headers: h });
      await fetch(`${API}/api/coach-chatbot/chat/${user.id}`, { method: "DELETE", headers: h });
      setMemoryStats(null);
      setMessages([{ role: "bot", text: "🗑️ Memory cleared! Let's start fresh.", mode: "general" }]);
    } catch {}
  };

  // ── VOICE RECORDING ──────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (recognitionRef.current && recognitionRef.current.state !== 'inactive') {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log("Stop error:", e);
      }
    }
    setListening(false);
  }, []);

  const startListening = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { 
      showErr("Microphone not supported in this browser.");
      return; 
    }

    if (listening) { 
      stopListening(); 
      return; 
    }

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
        
        if (audioChunks.length === 0) return;
        
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append("audio", audioBlob, "voice.webm");
        
        setLoading(true);
        try {
          const res = await fetch(`${API}/api/voice/transcribe`, {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (res.ok && data.transcript) {
            setInput(prev => (prev ? prev + " " + data.transcript : data.transcript).trim());
          } else {
            showErr(data.error || "Failed to transcribe voice.");
          }
        } catch (e) {
          showErr("Could not reach voice server.");
        } finally {
          setLoading(false);
        }
      };

      recognitionRef.current = mediaRecorder;
      mediaRecorder.start();
      setListening(true);
      console.log("🎤 Voice recording started");
    } catch (err) {
      console.error("Voice start error:", err);
      showErr("Microphone permission denied or not available.");
      setListening(false);
    }
  }, [listening, stopListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current && recognitionRef.current.state !== 'inactive') {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const isInCtx = id => ctxTeams.some(t => t.team_id === id);

  const generalChips = [
    "Best formation for my team",
    "High pressing system drill",
    "We won our match today 2-1",
    "My team lost 1-0",
    "We drew 1-1",
    "My striker scored a hat-trick",
  ];
  const playerChips = selectedPlayer ? [
    `Drills for ${selectedPlayer.profile?.user_name?.split(" ")[0] || "this player"}`,
    `How to develop their ${selectedPlayer.position || "position"}`,
    "Identify weaknesses from their stats",
    "Best feedback approach for them",
  ] : [];

  if (pageLoading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0f0c29", flexDirection:"column", gap:14 }}>
      <div className="cc-spin" style={{ width:36, height:36, borderWidth:3, borderTopColor:"#10b981" }} />
      <span style={{ fontFamily:"Inter", color:"rgba(255,255,255,.38)", fontSize:13 }}>Loading…</span>
    </div>
  );

  return (
    <div className="cc-root">
      <CoachNavbar />

      {/* Memory bar */}
      {(memoryStats || coachStats) && (
        <div className="cc-mem-bar">
          <span className="cc-mem-label">🧠 MAX remembers:</span>
          {memoryStats && <span>💬 <b style={{color:"#fff"}}>{memoryStats.history_count}</b> chats</span>}
          {memoryStats?.topics?.length > 0 && (
            <span>📚 <b style={{color:"#fff"}}>{memoryStats.topics.join(", ")}</b></span>
          )}
          {coachStats && (
            <span style={{ marginLeft: 10 }}>
              🏆 <b style={{color:"#10b981"}}>{coachStats.wins}W {coachStats.draws}D {coachStats.losses}L</b> (🔥 {coachStats.win_streak} streak)
            </span>
          )}
          <button onClick={clearMemory} style={{ marginLeft:"auto", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.09)", color:"rgba(255,255,255,.38)", borderRadius:5, padding:"1px 8px", cursor:"pointer", fontSize:10 }}>
            🗑️ Clear
          </button>
        </div>
      )}

      {/* Header */}
      <div className="cc-header">
        <div className="cc-hdr-icon">🏆</div>
        <div>
          <div className="cc-hdr-title">MAX — Coach AI</div>
          <div className="cc-hdr-sub">
            {ctxTeams.length > 0
              ? `${ctxTeams.length} team${ctxTeams.length > 1 ? "s" : ""} · ${ctxTeams.reduce((s,t) => s+(t.member_count||0), 0)} players`
              : "Add teams from sidebar"}
          </div>
        </div>
        {coach && (
          <div className="cc-hdr-right" style={{ display: "flex", alignItems: "center", gap: 15 }}>
            <button
              onClick={clearMemory}
              style={{
                background:"rgba(255,255,255,0.2)", border:"none", borderRadius:12,
                padding:"6px 12px", color:"#fff", cursor:"pointer",
                fontSize:11, fontWeight:700, whiteSpace:"nowrap",
              }}
            >🗑️ Clear Chat</button>
            <div>
              <div className="cc-hdr-name">🧑‍💼 {coach.full_name}</div>
              <div className="cc-hdr-club">{coach.club || "Independent"}</div>
            </div>
          </div>
        )}
      </div>

      {/* Success bar */}
      {successBar && (
        <div className="cc-success-strip" onClick={() => nav("/coach-training-plans")}>
          {successBar}
          <span style={{ marginLeft:"auto", fontSize:10, opacity:.65 }}>→ View Plans</span>
        </div>
      )}

      <div className="cc-main">
        {/* ── SIDEBAR ── */}
        <div className="cc-sidebar">
          {/* Context teams */}
          <div className="cc-sb-top">
            <div className="cc-sb-title">📌 Active Context</div>
            {ctxTeams.length === 0
              ? <div className="cc-empty-sb">No teams added yet.<br/>Add a team below.</div>
              : ctxTeams.map(ct => (
                <div key={ct.team_id} className="cc-ctx-chip">
                  <div className="cc-ctx-dot" style={{ background: ct.color || "#10b981" }} />
                  <div className="cc-ctx-info">
                    <div className="cc-ctx-name">{ct.name}</div>
                    <div className="cc-ctx-meta">{ct.member_count ?? "?"} players</div>
                  </div>
                  <button className="cc-ctx-rm" onClick={() => removeTeam(ct.team_id, ct.name)}>✕</button>
                </div>
              ))
            }
          </div>

          {/* Scrollable area */}
          <div className="cc-sb-scroll">
            {/* All teams */}
            <div style={{ marginBottom:14 }}>
              <div className="cc-sb-title">👥 Your Teams</div>
              {allTeams.length === 0
                ? <div className="cc-empty-sb">No teams yet.</div>
                : allTeams.map(t => {
                    const added = isInCtx(t.id);
                    return (
                      <div key={t.id} className={`cc-team-row${added ? " added" : ""}`}>
                        <div className="cc-team-dot" style={{ background: t.color || "#10b981" }} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div className="cc-team-name">{t.name}</div>
                          <div className="cc-team-count">👥 {t.member_count ?? 0}</div>
                        </div>
                        {added
                          ? <span className="cc-added-tag">✓</span>
                          : <button className="cc-add-btn" onClick={() => addTeam(t)}>+ Add</button>
                        }
                      </div>
                    );
                  })
              }
            </div>

            {/* Player picker */}
            {ctxTeams.length > 0 && (
              <div>
                <div className="cc-sb-title">🎯 Player Focus</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,.28)", marginBottom:7 }}>Click team → select player</div>
                {ctxTeams.map(ct => (
                  <div key={ct.team_id} style={{ marginBottom:9 }}>
                    <div
                      style={{ fontSize:10, fontWeight:700, color:"#10b981", marginBottom:4, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}
                      onClick={() => loadTeamPlayers({ id: ct.team_id, name: ct.name })}
                    >
                      <div style={{ width:6, height:6, borderRadius:"50%", background: ct.color || "#10b981" }} />
                      {ct.name} {selectedTeam?.id === ct.team_id ? "▲" : "▼"}
                    </div>
                    {selectedTeam?.id === ct.team_id && teamPlayers.map(m => {
                      const pname    = m.profile?.user_name || "?";
                      const isActive = selectedPlayer?.player_id === m.player_id;
                      return (
                        <div key={m.player_id} className={`cc-player-row${isActive ? " active" : ""}`} onClick={() => selectPlayer(m)}>
                          <div className="cc-p-avatar">{ini(pname)}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div className="cc-p-name">{pname}</div>
                            <div className="cc-p-meta">{m.role} · {m.position || m.profile?.position || "?"}</div>
                            <div className="cc-p-stats">⚽{m.stats?.goals_scored ?? 0} 🏆{m.stats?.wins ?? 0}W</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom nav */}
          <div className="cc-sb-nav">
            <button className="cc-nav-btn" onClick={() => nav("/coach-dashboard")}>🏠 Dashboard</button>
            <button className="cc-nav-btn" onClick={() => nav("/coach-training-plans")}>📋 Training Plans</button>
            <button className="cc-nav-btn" onClick={() => nav("/coach-team")}>👥 Team Management</button>
          </div>
        </div>

        {/* ── CHAT AREA ── */}
        <div className="cc-chat">
          {/* Mode bar */}
          <div className="cc-mode-bar">
            <button
              className={`cc-modebt${mode === "general" ? " on" : ""}`}
              onClick={() => { setMode("general"); setSelectedPlayer(null); }}
            >
              🏟️ General
            </button>
            <button
              className={`cc-modebt purple${mode === "player" ? " on" : ""}`}
              onClick={() => {
                if (!selectedPlayer) { showErr("Select a player from the sidebar first."); return; }
                setMode("player");
              }}
            >
              🎯 {selectedPlayer ? selectedPlayer.profile?.user_name?.split(" ")[0] || "Player" : "Player Mode"}
            </button>

            {/* ⚡ Plan ready badge — auto appears when scan finds content */}
            {scannedPlan && !showPlan && (
              <button
                className="cc-modebt amber pulse"
                onClick={openExtractModal}
                style={{ marginLeft:"auto" }}
              >
                ⚡ Plan Ready — View &amp; Save
              </button>
            )}
          </div>

          {/* Player bar */}
          {mode === "player" && selectedPlayer && (
            <div className="cc-player-bar">
              🎯 <strong>{selectedPlayer.profile?.user_name}</strong>
              &nbsp;·&nbsp;{selectedPlayer.position || selectedPlayer.profile?.position}
              &nbsp;·&nbsp;⚽{selectedPlayer.stats?.goals_scored ?? 0}
              &nbsp;·&nbsp;🏆{selectedPlayer.stats?.wins ?? 0}W
            </div>
          )}

          {error && <div className="cc-error">⚠️ {error}</div>}

          {/* Messages */}
          <div className="cc-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`cc-msg-row${msg.role === "user" ? " user" : ""}`}>
                {msg.role === "bot" && <div className="cc-bot-ico">⚽</div>}
                <div className={`cc-bubble ${msg.role === "user" ? "user" : msg.mode === "player" ? "player" : "bot"}`}>
                  {msg.role === "bot" && (
                    <div className="cc-msg-label">
                      {msg.mode === "player" ? "MAX · Player Coach" : "MAX · Coach AI"}
                    </div>
                  )}
                  {msg.text}
                </div>
                {msg.role === "user" && <div className="cc-user-ico">🧑‍💼</div>}
              </div>
            ))}

            {loading && (
              <div className="cc-msg-row">
                <div className="cc-bot-ico">⚽</div>
                <div className="cc-thinking">
                  MAX is thinking
                  <div className="cc-dots"><span>●</span><span>●</span><span>●</span></div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick chips */}
          {messages.length <= 2 && (
            <div className="cc-chips">
              {(mode === "player" ? playerChips : generalChips).map(c => (
                <button key={c} className={`cc-chip${mode === "player" ? " purple" : ""}`} onClick={() => setInput(c)}>
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Input bar — Quick Scan + Send only */}
          <div className="cc-input-bar">
            <textarea
              className="cc-textarea"
              rows={2}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={
                mode === "player" && selectedPlayer
                  ? `Ask about ${selectedPlayer.profile?.user_name || "this player"}…`
                  : ctxTeams.length === 0
                    ? "Add a team, then ask MAX…"
                    : "Ask MAX — formations, drills, tactics, training plans…"
              }
            />
            <button
              className="cc-btn grey"
              onClick={clearMemory}
              title="Clear memory"
              style={{ height:40, padding:"0 11px" }}
            >🗑️</button>

            <button
              className={`cc-btn ${listening ? "amber pulse" : "grey"}`}
              onClick={startListening}
              title={listening ? "Stop Recording" : "Use Voice Input"}
              style={{ height:40, padding:"0 11px", transition: "all 0.3s" }}
            >
              {listening ? "🛑" : "🎤"}
            </button>

            {/* ⚡ Quick Scan — only button for plan extraction */}
            <button
              className="cc-btn amber"
              onClick={openExtractModal}
              disabled={messages.length <= 2}
              title="Instantly scan & save a training plan from chat"
            >
              ⚡ Quick Scan
            </button>

            <button
              className="cc-btn green"
              onClick={send}
              disabled={loading || !input.trim()}
            >
              {loading ? <div className="cc-spin" /> : "Send ➤"}
            </button>
          </div>
        </div>
      </div>

      {/* ══ SELECT MESSAGES MODAL ══ */}
      {extractModalVisible && (
        <div className="cc-overlay" onClick={() => setExtractModalVisible(false)}>
          <div className="cc-modal" style={{ maxWidth: 650 }} onClick={e => e.stopPropagation()}>
            <div className="cc-modal-hdr">
              <div>
                <div className="cc-modal-title">📋 Select Chat to Scan</div>
                <div className="cc-modal-source">Choose which discussion & drills MAX should scan into your coaching plan:</div>
              </div>
              <button className="cc-modal-close" onClick={() => setExtractModalVisible(false)}>✕</button>
            </div>
            <div className="cc-modal-body">
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <button className="cc-btn amber" style={{ height: 32, fontSize: 12 }} onClick={selectAllMessages}>✅ Select All</button>
                <button className="cc-btn grey" style={{ height: 32, fontSize: 12 }} onClick={deselectAllMessages}>✕ Deselect All</button>
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
                        background: isSelected ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isSelected ? "#f59e0b" : "rgba(255,255,255,0.08)"}`,
                        cursor: "pointer",
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        border: `2px solid ${isSelected ? "#f59e0b" : "rgba(255,255,255,0.3)"}`,
                        background: isSelected ? "#f59e0b" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: 2
                      }}>
                        {isSelected ? "✓" : ""}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", marginBottom: 3 }}>
                          {msg.role === "user" ? "👤 You Asked:" : (revIdx === 0 ? "🔥 LATEST COACH DRILL:" : "🤖 MAX Coach Answer:")}
                        </div>
                        <div style={{ fontSize: 13, color: "#fff", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="cc-modal-ftr" style={{ justifyContent: "flex-end" }}>
              <button className="cc-btn grey" onClick={() => setExtractModalVisible(false)}>Cancel</button>
              <button
                className="cc-btn green"
                disabled={selectedIndices.length === 0 || loading}
                onClick={confirmExtractPlan}
                style={{ minWidth: 200 }}
              >
                {loading ? "Scanning with MAX..." : `⚡ Scan (${selectedIndices.length}) into Training Plan`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PLAN MODAL ══ */}
      {showPlan && scannedPlan && (
        <div className="cc-overlay" onClick={() => setShowPlan(false)}>
          <div className="cc-modal" onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="cc-modal-hdr">
              <div>
                <div className="cc-modal-title">📋 {scannedPlan.title}</div>
                <div className="cc-modal-source">⚡ Scanned instantly from your chat</div>
              </div>
              <button className="cc-modal-close" onClick={() => setShowPlan(false)}>✕</button>
            </div>

            {/* Modal body */}
            <div className="cc-modal-body">
              <div className="cc-scan-note">
                ⚡ Quick Scan plan — keywords detected from your MAX conversation. Save it below!
              </div>

              {/* Plan header card */}
              <div className="cc-plan-hdr-card">
                <div className="cc-plan-hdr-title">{scannedPlan.title}</div>
                {scannedPlan.summary && <div className="cc-plan-hdr-summary">{scannedPlan.summary}</div>}
                <div className="cc-plan-tags">
                  {scannedPlan.duration          && <span className="cc-plan-tag">⏱ {scannedPlan.duration}</span>}
                  {scannedPlan.difficulty        && <span className="cc-plan-tag">{scannedPlan.difficulty}</span>}
                  {scannedPlan.sessions_per_week && <span className="cc-plan-tag">🗓 {scannedPlan.sessions_per_week}x/week</span>}
                  {scannedPlan.days?.length > 0  && <span className="cc-plan-tag">📅 {scannedPlan.days.length} sessions</span>}
                </div>
              </div>

              {/* Focus areas */}
              {scannedPlan.key_focus_areas?.length > 0 && (
                <div className="cc-focus-row">
                  {scannedPlan.key_focus_areas.map((f, i) => (
                    <span key={i} className="cc-focus-chip">🎯 {f}</span>
                  ))}
                </div>
              )}

              {/* Training days */}
              {scannedPlan.days?.map((day, di) => (
                <div key={di} className="cc-day-card">
                  <div
                    className={`cc-day-hdr${expandedDay === di ? " open" : ""}`}
                    onClick={() => setExpandedDay(expandedDay === di ? -1 : di)}
                  >
                    <div style={{ display:"flex", alignItems:"center" }}>
                      <span className="cc-day-title">{day.day}</span>
                      <span className="cc-day-theme">— {day.theme}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      {day.intensity && (
                        <span className={`cc-intensity ${day.intensity}`}>{day.intensity}</span>
                      )}
                      <span style={{ color:"#10b981", fontWeight:700, fontSize:12 }}>
                        {expandedDay === di ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>
                  {expandedDay === di && (
                    <div className="cc-day-body">
                      {(day.exercises || day.drills || []).map((ex, ei) => (
                        <div key={ei} className="cc-exercise">
                          <div className="cc-ex-name">⚽ {ex.name}</div>
                          <div className="cc-ex-tags">
                            {ex.duration && <span className="cc-ex-tag t">⏱ {ex.duration}</span>}
                            {ex.sets     && <span className="cc-ex-tag s">Sets: {ex.sets}</span>}
                            {ex.reps     && <span className="cc-ex-tag r">Reps: {ex.reps}</span>}
                          </div>
                          {ex.description && <div className="cc-ex-desc">{ex.description}</div>}
                          {ex.coaching_cues?.length > 0 && (
                            <div className="cc-ex-cues">💡 {ex.coaching_cues.join(" · ")}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Nutrition */}
              {scannedPlan.nutrition_tips?.length > 0 && (
                <div className="cc-nutrition-box">
                  <div className="cc-nutrition-lbl">🥗 Nutrition Tips</div>
                  {scannedPlan.nutrition_tips.map((t, i) => (
                    <div key={i} className="cc-nutrition-tip">• {t}</div>
                  ))}
                </div>
              )}

              {/* Coach notes */}
              {scannedPlan.coach_notes && (
                <div className="cc-notes-box">
                  <div className="cc-notes-lbl">📝 Coach Notes</div>
                  <div className="cc-notes-txt">{scannedPlan.coach_notes}</div>
                </div>
              )}
            </div>

            {/* Modal footer — save controls */}
            <div className="cc-modal-ftr">
              {planSaved ? (
                <>
                  <div className="cc-saved-badge">✅ Saved to Database!</div>
                  <button
                    className="cc-btn green"
                    onClick={() => { setShowPlan(false); nav("/coach-training-plans"); }}
                  >
                    📋 View All Plans →
                  </button>
                </>
              ) : (
                <>
                  <div className="cc-save-row">
                    <span style={{ fontSize:11, color:"rgba(255,255,255,.42)", whiteSpace:"nowrap" }}>Save for:</span>
                    <select
                      className="cc-save-select"
                      value={saveTarget}
                      onChange={e => setSaveTarget(e.target.value)}
                    >
                      <option value="coach">🧑‍💼 My Coach Account</option>
                      {teamPlayers.map(m => (
                        <option key={m.player_id} value={m.player_id}>
                          👤 {m.profile?.user_name || m.player_id}
                        </option>
                      ))}
                      {teamPlayers.length === 0 && selectedPlayer && (
                        <option value={selectedPlayer.player_id}>
                          👤 {selectedPlayer.profile?.user_name || "Selected Player"}
                        </option>
                      )}
                    </select>
                  </div>
                  <button
                    className="cc-btn green"
                    onClick={savePlan}
                    disabled={saving}
                  >
                    {saving ? <><div className="cc-spin" /> Saving…</> : "💾 Save to Database"}
                  </button>
                </>
              )}
              <button className="cc-btn grey" onClick={() => setShowPlan(false)}>Close</button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}