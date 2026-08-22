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

const SPECS = ['Goalkeeper','Defender','Midfielder','Forward','Fitness','Tactics','Youth','Set Pieces'];
const EXP   = [
  {value:'beginner',label:'🌱 Just Starting'},
  {value:'junior',  label:'📈 1–3 Years'},
  {value:'mid',     label:'⚽ 3–7 Years'},
  {value:'senior',  label:'🏆 7+ Years'},
];

export default function CoachSignupScreen({ navigation }) {
  const [step,setStep]         = useState(0);
  const [loading,setLoading]   = useState(false);
  const [error,setError]       = useState('');
  const [showPw,setShowPw]     = useState(false);
  const [email,setEmail]       = useState('');
  const [emailError,setEmailError] = useState('');
  const [password,setPassword] = useState('');
  const [passwordError,setPasswordError] = useState('');
  const [confirm,setConfirm]   = useState('');
  const [name,setName]         = useState('');
  const [club,setClub]         = useState('');
  const [country,setCountry]   = useState('');
  const [exp,setExp]           = useState('');
  const [specs,setSpecs]       = useState([]);

  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return COUNTRIES;
    return COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()));
  }, [countrySearch]);

  const toggle = v => setSpecs(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v]);

  const validate = () => {
    if (step===0) {
      if (!email||!password||!confirm) return 'Fill in all fields.';
      if (password.length<6) return 'Password must be 6+ characters.';
      if (password!==confirm) return 'Passwords do not match.';
    }
    if (step===1) { if (!name.trim()) return 'Enter your full name.'; if (!country.trim()) return 'Enter your country.'; }
    if (step===2) { if (!exp) return 'Select experience level.'; if (!specs.length) return 'Select at least one specialization.'; }
    return '';
  };

  const handleNext = async () => {
    const e = validate();
    if (e) { setError(e); return; }
    setError('');
    if (step<2) { setStep(p=>p+1); return; }
    setLoading(true);
    try {
      const { data, error: ae } = await supabase.auth.signUp({ email, password });
      if (ae) throw ae;
      if (data.user?.id) {
        await supabase.from('coach_profiles').insert({
          id:data.user.id, email, full_name:name, club, country,
          experience_level:exp, specializations:specs, is_verified:false,
        });
      }
    } catch (e) {
      setError(e.message.includes('already')?'Email already registered.':e.message);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
      <StatusBar barStyle="light-content"/>
      <LinearGradient colors={['#0f0c29','#302b63','#24243e']} style={StyleSheet.absoluteFill}/>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        <TouchableOpacity onPress={()=>step>0?setStep(p=>p-1):navigation.goBack()} style={s.back}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={s.top}>
          <LinearGradient colors={[C.greenDark,C.green]} style={s.circle}>
            <Text style={{fontSize:32}}>🧑‍💼</Text>
          </LinearGradient>
          <Text style={s.title}>Register as Coach</Text>
          <Text style={s.sub}>Step {step+1} of 3</Text>
          <View style={s.steps}>
            {[0,1,2].map(i=><View key={i} style={[s.dot,step>=i&&s.dotActive]}/>)}
          </View>
        </View>

        <View style={s.card}>
          {!!error&&<View style={s.err}><Text style={s.errTxt}>⚠️ {error}</Text></View>}

          {step===0&&<>
            <Text style={s.lbl}>EMAIL</Text>
            <View style={s.row}>
              <Text style={s.ico}>📧</Text>
              <TextInput style={s.inp} placeholder="coach@example.com" placeholderTextColor={C.textFaint} value={email} onChangeText={(val) => {
                setEmail(val);
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                  setEmailError("Please enter a valid email address");
                } else {
                  setEmailError("");
                }
              }} autoCapitalize="none" keyboardType="email-address" autoCorrect={false}/>
            </View>
            {emailError ? <Text style={{color: '#ef4444', fontSize: 12, marginTop: 4}}>{emailError}</Text> : null}
            <Text style={s.lbl}>PASSWORD</Text>
            <View style={s.row}>
              <Text style={s.ico}>🔒</Text>
              <TextInput style={[s.inp,{flex:1}]} placeholder="Min. 6 characters" placeholderTextColor={C.textFaint} value={password} onChangeText={(val) => {
                setPassword(val);
                if (val.length < 6) {
                  setPasswordError("Password must be at least 6 characters");
                } else {
                  setPasswordError("");
                }
              }} secureTextEntry={!showPw} autoCapitalize="none"/>
              <TouchableOpacity onPress={()=>setShowPw(v=>!v)} style={{padding:4}}>
                <Text style={{fontSize:16}}>{showPw?'🙈':'👁️'}</Text>
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={{color: '#ef4444', fontSize: 12, marginTop: 4}}>{passwordError}</Text> : null}
            <Text style={s.lbl}>CONFIRM PASSWORD</Text>
            <View style={s.row}><Text style={s.ico}>🔒</Text><TextInput style={s.inp} placeholder="Re-enter password" placeholderTextColor={C.textFaint} value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none"/></View>
          </>}

          {step===1&&<>
            <Text style={s.lbl}>FULL NAME</Text>
            <View style={s.row}><Text style={s.ico}>👤</Text><TextInput style={s.inp} placeholder="Coach John Smith" placeholderTextColor={C.textFaint} value={name} onChangeText={setName}/></View>
            <Text style={s.lbl}>CLUB / ACADEMY (optional)</Text>
            <View style={s.row}><Text style={s.ico}>🏟️</Text><TextInput style={s.inp} placeholder="Your club" placeholderTextColor={C.textFaint} value={club} onChangeText={setClub}/></View>
            <Text style={s.lbl}>COUNTRY</Text>
            <TouchableOpacity style={s.row} onPress={() => setShowCountryModal(true)}>
              <Text style={s.ico}>🌍</Text>
              <Text style={[s.inp, !country && { color: C.textFaint }]}>
                {country || "Your country"}
              </Text>
            </TouchableOpacity>
          </>}

          {step===2&&<>
            <Text style={s.lbl}>EXPERIENCE LEVEL</Text>
            <View style={s.expGrid}>
              {EXP.map(e=>(
                <TouchableOpacity key={e.value} style={[s.expCard,exp===e.value&&s.expOn]} onPress={()=>setExp(e.value)}>
                  <Text style={[s.expTxt,exp===e.value&&{color:'#fff'}]}>{e.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.lbl}>SPECIALIZATIONS</Text>
            <View style={s.chips}>
              {SPECS.map(v=>(
                <TouchableOpacity key={v} style={[s.chip,specs.includes(v)&&s.chipOn]} onPress={()=>toggle(v)}>
                  <Text style={[s.chipTxt,specs.includes(v)&&{color:'#fff'}]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>}

          <Modal visible={showCountryModal} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
              <View style={{ backgroundColor: '#24243e', borderRadius: 20, padding: 20, maxHeight: '80%' }}>
                <Text style={[s.title, { fontSize: 18, marginBottom: 12 }]}>Select Country</Text>
                <TextInput
                  style={[s.row, { backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', marginBottom: 10 }]}
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

          <TouchableOpacity onPress={handleNext} disabled={loading} activeOpacity={0.85} style={{marginTop:20}}>
            <LinearGradient colors={[C.greenDark,C.green]} style={s.btn} start={{x:0,y:0}} end={{x:1,y:0}}>
              {loading?<ActivityIndicator color="#fff"/>:<Text style={s.btnTxt}>{step<2?'Continue →':'🎉 Create Coach Account'}</Text>}
            </LinearGradient>
          </TouchableOpacity>
          <View style={s.div}/>
          <Text style={s.sw}>Already have an account?{' '}<Text style={[s.lnk,{color:C.green}]} onPress={()=>navigation.navigate('CoachLogin')}>Sign In</Text></Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll:   {flexGrow:1,paddingHorizontal:24,paddingBottom:40},
  back:     {marginTop:56,marginBottom:8},
  backText: {color:C.textMid,fontSize:14},
  top:      {alignItems:'center',marginVertical:20},
  circle:   {width:72,height:72,borderRadius:20,alignItems:'center',justifyContent:'center',marginBottom:14,elevation:10},
  title:    {fontSize:24,fontWeight:'800',color:'#fff',marginBottom:4},
  sub:      {fontSize:13,color:C.textMid,marginBottom:8},
  steps:    {flexDirection:'row',gap:8,marginTop:4},
  dot:      {width:28,height:6,borderRadius:3,backgroundColor:'rgba(255,255,255,0.15)'},
  dotActive:{backgroundColor:C.green},
  card:     {backgroundColor:'rgba(255,255,255,0.06)',borderRadius:20,borderWidth:1,borderColor:C.border,padding:22},
  err:      {backgroundColor:C.redBg,borderWidth:1,borderColor:'rgba(239,68,68,0.3)',borderRadius:10,padding:12,marginBottom:14},
  errTxt:   {color:'#fca5a5',fontSize:13},
  lbl:      {fontSize:11,fontWeight:'600',color:C.textMid,letterSpacing:0.8,marginBottom:8,marginTop:16},
  row:      {flexDirection:'row',alignItems:'center',backgroundColor:'rgba(255,255,255,0.07)',borderWidth:1,borderColor:C.border,borderRadius:12,paddingHorizontal:12,height:50},
  ico:      {fontSize:16,marginRight:10,opacity:0.6},
  inp:      {flex:1,color:'#fff',fontSize:14},
  expGrid:  {flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:4},
  expCard:  {flex:1,minWidth:'45%',backgroundColor:'rgba(255,255,255,0.05)',borderWidth:1,borderColor:C.border,borderRadius:12,padding:14,alignItems:'center'},
  expOn:    {backgroundColor:C.greenDark,borderColor:C.green},
  expTxt:   {color:C.textMid,fontSize:13,fontWeight:'600'},
  chips:    {flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:4},
  chip:     {paddingHorizontal:14,paddingVertical:8,borderRadius:20,borderWidth:1,borderColor:C.border,backgroundColor:'rgba(255,255,255,0.05)'},
  chipOn:   {backgroundColor:C.greenDark,borderColor:C.green},
  chipTxt:  {color:C.textMid,fontSize:12,fontWeight:'600'},
  btn:      {borderRadius:12,height:50,alignItems:'center',justifyContent:'center'},
  btnTxt:   {color:'#fff',fontWeight:'700',fontSize:15},
  div:      {height:1,backgroundColor:'rgba(255,255,255,0.08)',marginVertical:20},
  sw:       {textAlign:'center',color:C.textFaint,fontSize:13},
  lnk:      {color:'#818cf8',fontWeight:'600'},
});