import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../pages/supabaseClient";

const API_BASE = "http://127.0.0.1:5000";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      if (!open) return;
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function loadNotifications() {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/notifications/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      if (res.ok) setNotifications(d.notifications || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function markAsRead(id) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return;
    
    await fetch(`${API_BASE}/api/notifications/read/${id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ position: "relative" }} ref={boxRef}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 22,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "6px"
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: 2, right: 2,
            background: "#e53e3e",
            color: "white",
            fontSize: 10,
            fontWeight: "bold",
            borderRadius: "50%",
            width: 16, height: 16,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          right: 0,
          top: "120%",
          width: 320,
          background: "white",
          border: "1px solid #ddd",
          borderRadius: 8,
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          zIndex: 9999,
          maxHeight: 400,
          overflowY: "auto"
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: "bold", display: "flex", justifyContent: "space-between" }}>
            <span>Notifications</span>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#888" }}>No notifications</div>
          ) : (
            notifications.map(n => (
              <div 
                key={n.id} 
                onClick={() => { if (!n.is_read) markAsRead(n.id); }}
                style={{ 
                  padding: "12px 16px", 
                  borderBottom: "1px solid #f5f5f5",
                  background: n.is_read ? "#fff" : "#eff6ff",
                  cursor: "pointer"
                }}
              >
                <div style={{ fontWeight: n.is_read ? "500" : "700", fontSize: 14, color: "#1e293b", marginBottom: 4 }}>
                  {n.title}
                </div>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  {n.message}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
