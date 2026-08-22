// services/api.js
import { supabase } from './supabaseClient';

// Your PC's current real WiFi IP, confirmed via `ipconfig` →
// "Wireless LAN adapter Wi-Fi" → IPv4 Address.
// If requests start failing again later, re-run `ipconfig` and update
// this — DHCP can reassign a different IP when you reconnect to WiFi
// or switch networks.
export const API_BASE = 'http://172.24.5.129:5000';

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}

export async function apiFetch(path, options = {}) {
  const token = await getToken();
  // Returns the raw fetch Response object (so res.ok / res.json() work
  // exactly as NotebookScreen.js — and any other screen — expects).
  // Previously this parsed the JSON internally and returned a plain
  // object, which broke every `res.json()` call site with
  // "res.json is not a function".
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}