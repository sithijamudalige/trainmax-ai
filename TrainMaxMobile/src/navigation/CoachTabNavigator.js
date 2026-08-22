// navigation/CoachTabNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';

import CoachDashboardScreen from '../screens/coach/CoachDashboardScreen';
import CoachChatbotScreen   from '../screens/coach/CoachChatbotScreen';
import CoachTeamScreen      from '../screens/coach/CoachTeamScreen';
import CoachNotebookScreen  from '../screens/coach/CoachNotebookScreen';
import CoachProfileScreen   from '../screens/coach/CoachProfileScreen';

// ── Placeholder screens — replace each one as you build them out ────────────
function PlaceholderScreen({ label }) {
  return (
    <View style={{ flex:1, backgroundColor:'#0f0c29', alignItems:'center', justifyContent:'center' }}>
      <Text style={{ fontSize:36, marginBottom:12 }}>🚧</Text>
      <Text style={{ color:'#fff', fontWeight:'700', fontSize:18, marginBottom:6 }}>{label}</Text>
      <Text style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>Coming soon</Text>
    </View>
  );
}

const CoachPlansScreen   = () => <PlaceholderScreen label="Training Plans" />;

// ── Stack wrappers ──────────────────────────────────────────────────────────
const DashStack  = createNativeStackNavigator();
const ChatStack  = createNativeStackNavigator();
const TeamStack  = createNativeStackNavigator();
const PlansStack = createNativeStackNavigator();
const ProfStack  = createNativeStackNavigator();
const NoteStack  = createNativeStackNavigator();

function CoachNoteStack() {
  return (
    <NoteStack.Navigator screenOptions={{ headerShown: false }}>
      <NoteStack.Screen name="CoachNotebook" component={CoachNotebookScreen} />
    </NoteStack.Navigator>
  );
}

function CoachDashStack() {
  return (
    <DashStack.Navigator screenOptions={{ headerShown: false }}>
      <DashStack.Screen name="CoachDashboard" component={CoachDashboardScreen} />
    </DashStack.Navigator>
  );
}

function CoachChatStack() {
  return (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen name="CoachChatbot" component={CoachChatbotScreen} />
    </ChatStack.Navigator>
  );
}

function CoachTeamStack() {
  return (
    <TeamStack.Navigator screenOptions={{ headerShown: false }}>
      <TeamStack.Screen name="CoachTeam" component={CoachTeamScreen} />
    </TeamStack.Navigator>
  );
}

function CoachPlansStack() {
  return (
    <PlansStack.Navigator screenOptions={{ headerShown: false }}>
      <PlansStack.Screen name="CoachPlans" component={CoachPlansScreen} />
    </PlansStack.Navigator>
  );
}

function CoachProfStack() {
  return (
    <ProfStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfStack.Screen name="CoachProfile" component={CoachProfileScreen} />
    </ProfStack.Navigator>
  );
}

// ── Tab navigator ───────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

export default function CoachTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1e1b4b',
          borderTopColor:  'rgba(255,255,255,0.08)',
          borderTopWidth:  1,
          paddingBottom:   4,
          height:          60,
        },
        tabBarActiveTintColor:   '#10b981',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 3 },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Dashboard:  '🏠',
            'Coach AI': '⚽',
            Team:       '👥',
            Plans:      '📋',
            Notebook:   '📝',
            Profile:    '👤',
          };
          return (
            <Text style={{ fontSize: size - 4 }}>
              {icons[route.name] || '●'}
            </Text>
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={CoachDashStack}  />
      <Tab.Screen name="Coach AI"  component={CoachChatStack}  />
      <Tab.Screen name="Team"      component={CoachTeamStack}  />
      <Tab.Screen name="Plans"     component={CoachPlansStack} />
      <Tab.Screen name="Notebook"  component={CoachNoteStack}  />
      <Tab.Screen name="Profile"   component={CoachProfStack}  />
    </Tab.Navigator>
  );
}