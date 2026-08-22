import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabaseClient';
import { API_BASE } from '../../services/api';
import { C } from '../../utils/colors';
import ForgotPasswordModal from '../../components/ForgotPasswordModal';

export default function CoachLoginScreen({ navigation }) {
  const [email,setEmail]       = useState('');
  const [password,setPassword] = useState('');
  const [showPw,setShowPw]     = useState(false);
  const [loading,setLoading]   = useState(false);
  const [error,setError]       = useState('');
  const [showForgot, setShowForgot] = useState(false);

  const handleLogin = async () => {
    if (!email||!password) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError('');
    try {
      const { data, error: ae } = await supabase.auth.signInWithPassword({ email, password });
      if (ae) throw ae;

      // Ask backend (service_role, bypasses RLS) what role this user is
      const res = await fetch(`${API_BASE}/api/auth/check-role`, {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      const json = res.ok ? await res.json() : {};

      if (json.role !== 'coach') {
        await supabase.auth.signOut();
        setError('👤 This is a Player account. Please use the Player Login instead.');
        return;
      }
      // genuine coach — RootNavigator will route to CoachApp
    } catch (e) {
      setError(e.message||'Login failed.');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
      <StatusBar barStyle="light-content"/>
      <LinearGradient colors={['#0f0c29','#302b63','#24243e']} style={StyleSheet.absoluteFill}/>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        <TouchableOpacity onPress={()=>navigation.navigate('Welcome')} style={s.back}>
          <Text style={s.backText}>← Back to Welcome</Text>
        </TouchableOpacity>

        <View style={s.top}>
          <LinearGradient colors={[C.greenDark,C.green]} style={s.circle}>
            <Text style={{fontSize:32}}>🧑‍💼</Text>
          </LinearGradient>
          <Text style={s.title}>Coach Login</Text>
          <Text style={s.sub}>Train Max AI — Coach Portal</Text>
          <View style={[s.badge,{backgroundColor:C.greenBg,borderColor:C.greenBorder}]}>
            <View style={[s.dot,{backgroundColor:C.green}]}/>
            <Text style={[s.badgeTxt,{color:C.green}]}>Coach Access</Text>
          </View>
        </View>

        <View style={s.card}>
          {!!error&&<View style={s.err}><Text style={s.errTxt}>⚠️ {error}</Text></View>}

          <Text style={s.lbl}>EMAIL ADDRESS</Text>
          <View style={s.row}><Text style={s.ico}>📧</Text><TextInput style={s.inp} placeholder="coach@example.com" placeholderTextColor={C.textFaint} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false}/></View>

          <Text style={s.lbl}>PASSWORD</Text>
          <View style={s.row}><Text style={s.ico}>🔒</Text><TextInput style={[s.inp,{flex:1}]} placeholder="Enter your password" placeholderTextColor={C.textFaint} value={password} onChangeText={setPassword} secureTextEntry={!showPw} autoCapitalize="none"/><TouchableOpacity onPress={()=>setShowPw(v=>!v)} style={{padding:4}}><Text style={{fontSize:16}}>{showPw?'🙈':'👁️'}</Text></TouchableOpacity></View>

          <TouchableOpacity onPress={() => setShowForgot(true)} style={{ alignSelf: 'flex-end', marginTop: 10, marginBottom: 4 }}>
            <Text style={{ color: C.green, fontSize: 13, fontWeight: '600' }}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85} style={{marginTop:14}}>
            <LinearGradient colors={[C.greenDark,C.green]} style={s.btn} start={{x:0,y:0}} end={{x:1,y:0}}>
              {loading?<ActivityIndicator color="#fff"/>:<Text style={s.btnTxt}>🏆 Sign In as Coach</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={s.div}/>
          <Text style={s.sw}>Don't have a coach account?{' '}<Text style={s.lnk} onPress={()=>navigation.navigate('CoachSignup')}>Sign Up</Text></Text>
          <Text style={[s.sw,{marginTop:8}]}>Are you a player?{' '}<Text style={[s.lnk,{color:'#818cf8'}]} onPress={()=>navigation.navigate('PlayerLogin')}>Player Login</Text></Text>

          <TouchableOpacity onPress={() => navigation.navigate('Welcome')} style={{marginTop: 20, padding: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, alignItems: 'center'}}>
            <Text style={{color: '#fff', fontWeight: '600'}}>← Back to Welcome Page</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ForgotPasswordModal
        visible={showForgot}
        onClose={() => setShowForgot(false)}
        defaultRole="coach"
        defaultEmail={email}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll:   {flexGrow:1,paddingHorizontal:24,paddingBottom:40},
  back:     {marginTop:56,marginBottom:8},
  backText: {color:C.textMid,fontSize:14},
  top:      {alignItems:'center',marginVertical:24},
  circle:   {width:72,height:72,borderRadius:20,alignItems:'center',justifyContent:'center',marginBottom:14,elevation:10},
  title:    {fontSize:26,fontWeight:'800',color:'#fff',marginBottom:4},
  sub:      {fontSize:13,color:C.textMid,marginBottom:10},
  badge:    {flexDirection:'row',alignItems:'center',gap:6,borderWidth:1,borderRadius:20,paddingHorizontal:14,paddingVertical:4},
  dot:      {width:6,height:6,borderRadius:3},
  badgeTxt: {fontSize:11,fontWeight:'600'},
  card:     {backgroundColor:'rgba(255,255,255,0.06)',borderRadius:20,borderWidth:1,borderColor:C.border,padding:22},
  err:      {backgroundColor:C.redBg,borderWidth:1,borderColor:'rgba(239,68,68,0.3)',borderRadius:10,padding:12,marginBottom:14},
  errTxt:   {color:'#fca5a5',fontSize:13},
  lbl:      {fontSize:11,fontWeight:'600',color:C.textMid,letterSpacing:0.8,marginBottom:8,marginTop:16},
  row:      {flexDirection:'row',alignItems:'center',backgroundColor:'rgba(255,255,255,0.07)',borderWidth:1,borderColor:C.border,borderRadius:12,paddingHorizontal:12,height:50},
  ico:      {fontSize:16,marginRight:10,opacity:0.6},
  inp:      {flex:1,color:'#fff',fontSize:14},
  btn:      {borderRadius:12,height:50,alignItems:'center',justifyContent:'center'},
  btnTxt:   {color:'#fff',fontWeight:'700',fontSize:15},
  div:      {height:1,backgroundColor:'rgba(255,255,255,0.08)',marginVertical:20},
  sw:       {textAlign:'center',color:C.textFaint,fontSize:13,marginTop:4},
  lnk:      {color:'#818cf8',fontWeight:'600'},
});