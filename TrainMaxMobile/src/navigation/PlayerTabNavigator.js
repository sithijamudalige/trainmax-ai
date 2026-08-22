// src/navigation/PlayerTabNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { C } from '../utils/colors';

// Import Screens
import PlayerDashboardScreen     from '../screens/player/PlayerDashboardScreen';
import PlayerChatbotScreen       from '../screens/player/PlayerChatbotScreen';
import PlayerTrainingPlanScreen  from '../screens/player/PlayerTrainingPlanScreen';
import PlayerProfileScreen       from '../screens/player/PlayerProfileScreen';
import NotebookScreen            from '../screens/player/NotebookScreen';   // ← NEW

const Tab = createBottomTabNavigator();

export default function PlayerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#13102a',
          borderTopColor:  'rgba(255,255,255,0.07)',
          borderTopWidth:  1,
          height:          62,
          paddingBottom:   8,
          paddingTop:      6,
        },
        tabBarActiveTintColor:   C.purpleLight,
        tabBarInactiveTintColor: C.textFaint,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={PlayerDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
        }}
      />

      <Tab.Screen
        name="Chatbot"
        component={PlayerChatbotScreen}
        options={{
          tabBarLabel: 'Coach AI',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚽</Text>,
        }}
      />

      <Tab.Screen
        name="Notebook"
        component={NotebookScreen}
        options={{
          tabBarLabel: 'Notebook',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📓</Text>,
        }}
      />

      <Tab.Screen
        name="Plans"
        component={PlayerTrainingPlanScreen}
        options={{
          tabBarLabel: 'Plans',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text>,
        }}
      />

      <Tab.Screen
        name="Profile"
        component={PlayerProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}