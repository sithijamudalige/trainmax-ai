import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen      from '../screens/auth/WelcomeScreen';
import PlayerLoginScreen  from '../screens/auth/PlayerLoginScreen';
import PlayerSignupScreen from '../screens/auth/PlayerSignupScreen';
import CoachLoginScreen   from '../screens/auth/CoachLoginScreen';
import CoachSignupScreen  from '../screens/auth/CoachSignupScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome"      component={WelcomeScreen} />
      <Stack.Screen name="PlayerLogin"  component={PlayerLoginScreen} />
      <Stack.Screen name="PlayerSignup" component={PlayerSignupScreen} />
      <Stack.Screen name="CoachLogin"   component={CoachLoginScreen} />
      <Stack.Screen name="CoachSignup"  component={CoachSignupScreen} />
    </Stack.Navigator>
  );
}