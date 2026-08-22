import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Text } from 'react-native';
import { supabase } from '../services/supabaseClient';
import { API_BASE } from '../services/api';
import { C } from '../utils/colors';
import AuthStack from './AuthStack';
import PlayerTabNavigator from './PlayerTabNavigator';
import CoachTabNavigator from './CoachTabNavigator';

const Root = createNativeStackNavigator();

/**
 * Ask the BACKEND (which uses service_role key, bypasses RLS) what role
 * this user is.  Returns 'coach' | 'player'.
 *
 * Falls back to 'player' if the backend is unreachable, so the app
 * still works — the login screens will catch the wrong role anyway.
 */
async function resolveRoleFromBackend(accessToken) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/check-role`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const json = await res.json();
      console.log('[resolveRole] backend says role =', json.role);
      return json.role || 'player';
    }
    console.warn('[resolveRole] backend responded with status', res.status);
  } catch (e) {
    console.warn('[resolveRole] backend unreachable:', e.message);
  }
  return 'player';
}

export default function RootNavigator() {
  const [session, setSession] = useState(null);
  const [role,    setRole]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        handleSessionChange(newSession);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  async function handleSessionChange(newSession) {
    setLoading(true);
    try {
      setSession(newSession);
      if (newSession?.user && newSession?.access_token) {
        const r = await resolveRoleFromBackend(newSession.access_token);
        setRole(r);
      } else {
        setRole(null);
      }
    } catch (e) {
      console.warn('[handleSessionChange] error:', e.message);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }

  async function checkSession() {
    setLoading(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      if (s?.user && s?.access_token) {
        const r = await resolveRoleFromBackend(s.access_token);
        setRole(r);
      } else {
        setRole(null);
      }
    } catch (e) {
      console.warn('[checkSession] error:', e.message);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <View style={{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor: C.bg }}>
      <ActivityIndicator size="large" color={C.green} />
      <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: 13 }}>
        Checking login…
      </Text>
    </View>
  );

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Root.Screen name="Auth"      component={AuthStack} />
        ) : role === 'coach' ? (
          <Root.Screen name="CoachApp"  component={CoachTabNavigator} />
        ) : (
          <Root.Screen name="PlayerApp" component={PlayerTabNavigator} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}