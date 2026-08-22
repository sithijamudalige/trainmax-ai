import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal, FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabaseClient';
import { C } from '../../utils/colors';
import { COUNTRIES } from '../../utils/countries';

const POSITIONS = ['Goalkeeper','Defender','Midfielder','Forward','Winger','Striker'];

export default function PlayerSignupScreen({ navigation }) {
  const [step,     setStep]     = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showPw,   setShowPw]   = useState(false);

  const [email,    setEmail]    = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [name,     setName]     = useState('');
  const [position, setPosition] = useState('');
  const [club,     setClub]     = useState('');
  const [country,  setCountry]  = useState('');
  const [age,      setAge]      = useState('');
  const [birthDay, setBirthDay] = useState('');

  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return COUNTRIES;
    return COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()));
  }, [countrySearch]);

  const validate = () => {
    if (step === 0) {
      if (!email || !password || !confirm) return 'Fill in all fields.';
      if (password.length < 6) return 'Password must be 6+ characters.';
      if (password !== confirm) return 'Passwords do not match.';
    }
    if (step === 1) {
      if (!name.trim()) return 'Enter your name.';
      if (!position)    return 'Select your position.';
    }
    return '';
  };

  const handleNext = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    if (step < 1) { setStep(s => s+1); return; }

    setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signUp({ email, password });
      if (authErr) throw authErr;
      const userId = data.user?.id;
      if (userId) {
        await supabase.from('user_profiles').insert({
          id: userId, email,
          user_name: name,
          position, club, country,
          age: age ? parseInt(age, 10) : null,
          birth_day: birthDay || null,
        });
      }
      // RootNavigator detects session change automatically
    } catch (e) {
      const msg = e.message || '';
      setError(msg.includes('already') ? 'Email already registered. Please log in.' : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0f0c29','#302b63','#24243e']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <TouchableOpacity onPress={() => step > 0 ? setStep(s=>s-1) : navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.iconWrap}>
          <LinearGradient colors={['#6a11cb','#2575fc']} style={styles.iconCircle}>
            <Text style={{ fontSize:32 }}>👤</Text>
          </LinearGradient>
          <Text style={styles.title}>Create Player Account</Text>
          <Text style={styles.subtitle}>Step {step+1} of 2</Text>
          <View style={styles.stepRow}>
            {[0,1].map(i => (
              <View key={i} style={[styles.stepDot, step >= i && styles.stepDotActive]} />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          {error !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {step === 0 && (
            <>
              <Text style={styles.label}>EMAIL</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.inputIcon}>📧</Text>
                <TextInput style={styles.input} placeholder="player@example.com" placeholderTextColor={C.textFaint} value={email} onChangeText={(val) => {
                  setEmail(val);
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                    setEmailError("Please enter a valid email address");
                  } else {
                    setEmailError("");
                  }
                }} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
              </View>
              {emailError ? <Text style={{color: '#ef4444', fontSize: 12, marginTop: 4}}>{emailError}</Text> : null}

              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput style={[styles.input,{flex:1}]} placeholder="Min. 6 characters" placeholderTextColor={C.textFaint} value={password} onChangeText={(val) => {
                  setPassword(val);
                  if (val.length < 6) {
                    setPasswordError("Password must be at least 6 characters");
                  } else {
                    setPasswordError("");
                  }
                }} secureTextEntry={!showPw} autoCapitalize="none" />
                <TouchableOpacity onPress={() => setShowPw(v=>!v)} style={{padding:4}}>
                  <Text style={{fontSize:16}}>{showPw ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={{color: '#ef4444', fontSize: 12, marginTop: 4}}>{passwordError}</Text> : null}

              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput style={styles.input} placeholder="Re-enter password" placeholderTextColor={C.textFaint} value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" />
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <Text style={styles.label}>FULL NAME</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={C.textFaint} value={name} onChangeText={setName} />
              </View>

              <Text style={styles.label}>AGE</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.inputIcon}>🎂</Text>
                <TextInput style={styles.input} placeholder="e.g. 22" placeholderTextColor={C.textFaint} value={age} onChangeText={setAge} keyboardType="numeric" />
              </View>

              <Text style={styles.label}>BIRTHDAY (YYYY-MM-DD)</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.inputIcon}>📅</Text>
                <TextInput style={styles.input} placeholder="e.g. 2000-05-15" placeholderTextColor={C.textFaint} value={birthDay} onChangeText={(val) => {
                  setBirthDay(val);
                  if (val && val.length >= 4) {
                    const bDate = new Date(val);
                    if (!isNaN(bDate.getTime())) {
                      const today = new Date();
                      let calcAge = today.getFullYear() - bDate.getFullYear();
                      const m = today.getMonth() - bDate.getMonth();
                      if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) calcAge--;
                      setAge(calcAge.toString());
                    }
                  }
                }} />
              </View>

              <Text style={styles.label}>POSITION</Text>
              <View style={styles.posGrid}>
                {POSITIONS.map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.posChip, position === p && styles.posChipActive]}
                    onPress={() => setPosition(p)}
                  >
                    <Text style={[styles.posChipText, position === p && { color:'#fff' }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>CLUB (optional)</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.inputIcon}>🏟️</Text>
                <TextInput style={styles.input} placeholder="Your club" placeholderTextColor={C.textFaint} value={club} onChangeText={setClub} />
              </View>

              <Text style={styles.label}>COUNTRY (optional)</Text>
              <TouchableOpacity
                style={styles.inputWrap}
                onPress={() => setShowCountryModal(true)}
              >
                <Text style={styles.inputIcon}>🌍</Text>
                <Text style={[styles.input, !country && { color: C.textFaint }]}>
                  {country || 'Select your country'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <Modal visible={showCountryModal} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
              <View style={{ backgroundColor: '#24243e', borderRadius: 20, padding: 20, maxHeight: '80%' }}>
                <Text style={[styles.title, { fontSize: 18, marginBottom: 12 }]}>Select Country</Text>
                <TextInput
                  style={[styles.inputWrap, { backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', marginBottom: 10 }]}
                  placeholder="Search..."
                  placeholderTextColor={C.textFaint}
                  value={countrySearch}
                  onChangeText={setCountrySearch}
                />
                <FlatList
                  data={filteredCountries}
                  keyExtractor={item => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}
                      onPress={() => { setCountry(item); setShowCountryModal(false); setCountrySearch(''); }}
                    >
                      <Text style={{ color: '#fff', fontSize: 16 }}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity onPress={() => setShowCountryModal(false)} style={{ marginTop: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <TouchableOpacity onPress={handleNext} disabled={loading} activeOpacity={0.85} style={{ marginTop:16 }}>
            <LinearGradient colors={['#6a11cb','#2575fc']} style={styles.loginBtn} start={{x:0,y:0}} end={{x:1,y:0}}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>{step < 1 ? 'Continue →' : '🎉 Create Account'}</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divider} />
          <Text style={styles.switchText}>
            Already have an account?{' '}
            <Text style={styles.switchLink} onPress={() => navigation.navigate('PlayerLogin')}>Sign In</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll:          { flexGrow:1, paddingHorizontal:24, paddingBottom:40 },
  back:            { marginTop:56, marginBottom:8 },
  backText:        { color:C.textMid, fontSize:14 },
  iconWrap:        { alignItems:'center', marginVertical:20 },
  iconCircle:      { width:72, height:72, borderRadius:20, alignItems:'center', justifyContent:'center', marginBottom:14, elevation:10 },
  title:           { fontSize:24, fontWeight:'800', color:'#fff', marginBottom:4 },
  subtitle:        { fontSize:13, color:C.textMid, marginBottom:10 },
  stepRow:         { flexDirection:'row', gap:8, marginTop:4 },
  stepDot:         { width:28, height:6, borderRadius:3, backgroundColor:'rgba(255,255,255,0.15)' },
  stepDotActive:   { backgroundColor:'#818cf8' },
  card:            { backgroundColor:'rgba(255,255,255,0.06)', borderRadius:20, borderWidth:1, borderColor:C.border, padding:24 },
  errorBox:        { backgroundColor:C.redBg, borderWidth:1, borderColor:'rgba(239,68,68,0.3)', borderRadius:10, padding:12, marginBottom:16 },
  errorText:       { color:'#fca5a5', fontSize:13 },
  label:           { fontSize:11, fontWeight:'600', color:C.textMid, letterSpacing:0.8, marginBottom:8, marginTop:16 },
  inputWrap:       { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:C.border, borderRadius:12, paddingHorizontal:12, height:50 },
  inputIcon:       { fontSize:16, marginRight:10, opacity:0.6 },
  input:           { flex:1, color:'#fff', fontSize:14 },
  posGrid:         { flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:4 },
  posChip:         { paddingHorizontal:14, paddingVertical:8, borderRadius:20, borderWidth:1, borderColor:C.border, backgroundColor:'rgba(255,255,255,0.05)' },
  posChipActive:   { backgroundColor:'#6a11cb', borderColor:'#6a11cb' },
  posChipText:     { color:C.textMid, fontSize:12, fontWeight:'600' },
  loginBtn:        { borderRadius:12, height:50, alignItems:'center', justifyContent:'center' },
  loginBtnText:    { color:'#fff', fontWeight:'700', fontSize:15 },
  divider:         { height:1, backgroundColor:'rgba(255,255,255,0.08)', marginVertical:20 },
  switchText:      { textAlign:'center', color:C.textFaint, fontSize:13 },
  switchLink:      { color:'#818cf8', fontWeight:'600' },
});