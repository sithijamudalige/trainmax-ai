import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, StatusBar, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../../utils/colors';

const { width, height } = Dimensions.get('window');

function Ball({ size, left, delay, duration }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue:1, duration, useNativeDriver:true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange:[0,1], outputRange:[height+size, -size*2] });
  const rotate     = anim.interpolate({ inputRange:[0,1], outputRange:['0deg','720deg'] });
  return (
    <Animated.View style={[
      styles.ball,
      { width:size, height:size, borderRadius:size/2, left, transform:[{translateY},{rotate}] }
    ]} />
  );
}

const BALLS = [
  { size:60,  left:20,        delay:0,    duration:12000 },
  { size:40,  left:width*.3,  delay:2000, duration:9000  },
  { size:80,  left:width*.55, delay:1000, duration:14000 },
  { size:35,  left:width*.75, delay:3000, duration:10000 },
  { size:55,  left:width*.15, delay:4000, duration:11000 },
  { size:45,  left:width*.85, delay:1500, duration:13000 },
];

export default function WelcomeScreen({ navigation }) {
  const logoAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;
  const btnAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.spring(logoAnim, { toValue:1, tension:60, friction:8, useNativeDriver:true }),
      Animated.spring(textAnim, { toValue:1, tension:60, friction:8, useNativeDriver:true }),
      Animated.spring(btnAnim,  { toValue:1, tension:60, friction:8, useNativeDriver:true }),
    ]).start();
  }, []);

  const fadeUp = (anim) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange:[0,1], outputRange:[40,0] }) }],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <LinearGradient
        colors={['#0f0c29','#302b63','#24243e']}
        style={StyleSheet.absoluteFill}
        start={{ x:0, y:0 }} end={{ x:1, y:1 }}
      />
      {BALLS.map((b,i) => <Ball key={i} {...b} />)}

      <View style={styles.content}>

        {/* Logo */}
        <Animated.View style={[styles.logoBlock, fadeUp(logoAnim)]}>
          <Image source={require('../../../assets/logo.png')} style={{ width: 140, height: 140, borderRadius: 36, marginBottom: 14 }} resizeMode="contain" />
          <Text style={styles.appName}>Train Max AI</Text>
          <Text style={styles.tagline}>Your AI Football Coaching Partner</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>AI-Powered · Real Stats · Live Coaching</Text>
          </View>
        </Animated.View>

        {/* Features */}
        <Animated.View style={[styles.featRow, fadeUp(textAnim)]}>
          {[
            { icon:'🏆', label:'Coaching AI'    },
            { icon:'📋', label:'Training Plans' },
            { icon:'📊', label:'Live Stats'     },
            { icon:'👥', label:'Team Tools'     },
          ].map((f,i) => (
            <View key={i} style={styles.featItem}>
              <Text style={{ fontSize:22, marginBottom:4 }}>{f.icon}</Text>
              <Text style={styles.featLabel}>{f.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Buttons */}
        <Animated.View style={fadeUp(btnAnim)}>

          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('PlayerLogin')}>
            <LinearGradient colors={['#6a11cb','#2575fc']} style={styles.btnBig} start={{x:0,y:0}} end={{x:1,y:0}}>
              <Text style={{ fontSize:26 }}>👤</Text>
              <View style={{ flex:1 }}>
                <Text style={styles.btnBigTitle}>Player Login</Text>
                <Text style={styles.btnBigSub}>Track stats · Get coached by MAX</Text>
              </View>
              <Text style={{ color:'rgba(255,255,255,0.6)', fontSize:20 }}>→</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('CoachLogin')} style={{ marginTop:12 }}>
            <LinearGradient colors={[C.greenDark,C.green]} style={styles.btnBig} start={{x:0,y:0}} end={{x:1,y:0}}>
              <Text style={{ fontSize:26 }}>🧑‍💼</Text>
              <View style={{ flex:1 }}>
                <Text style={styles.btnBigTitle}>Coach Login</Text>
                <Text style={styles.btnBigSub}>Manage teams · Assign training plans</Text>
              </View>
              <Text style={{ color:'rgba(255,255,255,0.6)', fontSize:20 }}>→</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divRow}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>New here?</Text>
            <View style={styles.divLine} />
          </View>

          <View style={{ flexDirection:'row', gap:10 }}>
            <TouchableOpacity style={styles.signupBtn} onPress={() => navigation.navigate('PlayerSignup')} activeOpacity={0.8}>
              <Text style={styles.signupBtnText}>👤 Player Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.signupBtn, styles.signupBtnCoach]} onPress={() => navigation.navigate('CoachSignup')} activeOpacity={0.8}>
              <Text style={styles.signupBtnText}>🧑‍💼 Coach Sign Up</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Text style={styles.footer}>Train Max AI · Powered by Groq + Supabase</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex:1, backgroundColor:C.bg },
  ball:         { position:'absolute', backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.1)' },
  content:      { flex:1, paddingHorizontal:24, paddingTop:60, paddingBottom:28, justifyContent:'space-between' },
  logoBlock:    { alignItems:'center' },
  logoCircle:   { width:88, height:88, borderRadius:24, alignItems:'center', justifyContent:'center', marginBottom:14, elevation:10 },
  appName:      { fontSize:30, fontWeight:'800', color:'#fff', letterSpacing:0.5 },
  tagline:      { fontSize:13, color:C.textMid, marginTop:5, textAlign:'center' },
  liveBadge:    { flexDirection:'row', alignItems:'center', gap:6, marginTop:10, backgroundColor:C.greenBg, borderWidth:1, borderColor:C.greenBorder, borderRadius:20, paddingHorizontal:14, paddingVertical:5 },
  liveDot:      { width:7, height:7, borderRadius:4, backgroundColor:C.green },
  liveText:     { fontSize:11, color:C.green, fontWeight:'600' },
  featRow:      { flexDirection:'row', justifyContent:'space-between', backgroundColor:'rgba(255,255,255,0.05)', borderRadius:16, borderWidth:1, borderColor:C.border, padding:14 },
  featItem:     { alignItems:'center', flex:1 },
  featLabel:    { fontSize:10, color:C.textMid, fontWeight:'600', textAlign:'center' },
  btnBig:       { flexDirection:'row', alignItems:'center', gap:14, borderRadius:16, padding:18, elevation:6 },
  btnBigTitle:  { color:'#fff', fontWeight:'800', fontSize:16, marginBottom:2 },
  btnBigSub:    { color:'rgba(255,255,255,0.7)', fontSize:11 },
  divRow:       { flexDirection:'row', alignItems:'center', gap:10, marginVertical:18 },
  divLine:      { flex:1, height:1, backgroundColor:'rgba(255,255,255,0.1)' },
  divText:      { color:C.textFaint, fontSize:12 },
  signupBtn:    { flex:1, backgroundColor:'rgba(101,16,203,0.15)', borderWidth:1, borderColor:'rgba(101,16,203,0.3)', borderRadius:12, paddingVertical:12, alignItems:'center' },
  signupBtnCoach:{ backgroundColor:C.greenBg, borderColor:C.greenBorder },
  signupBtnText:{ color:'#fff', fontWeight:'700', fontSize:13 },
  footer:       { textAlign:'center', color:C.textFaint, fontSize:11 },
});