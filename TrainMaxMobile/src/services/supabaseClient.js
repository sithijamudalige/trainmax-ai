// src/services/supabaseClient.js
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://qxigaljxogeniodatidk.supabase.co';
const SUPABASE_ANON = 'sb_publishable_xsIOd6eP-w_dH7u-Q5iUHg_SU0gDvf7'; // paste from your .env
export const API_BASE = 'http://10.131.192.129:5000';  // ← keep in sync with api.js
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage:          AsyncStorage,
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: false,
  },
  
});
