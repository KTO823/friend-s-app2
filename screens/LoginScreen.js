import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Gift } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAuth(type) {
    if (!email || !password) return Alert.alert('錯誤', '請輸入 Email 與密碼');
    setLoading(true);
    
    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) Alert.alert('登入失敗', error.message);
    else if (type === 'signup') Alert.alert('成功', '註冊成功！');
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <Gift size={40} color="#4F46E5" />
        </View>
        <Text style={styles.title}>GIFTFLOW</Text>
        <Text style={styles.subtitle}>好友禮物與分帳助手</Text>

        <TextInput 
          style={styles.input} 
          placeholder="Email" 
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <TextInput 
          style={styles.input} 
          placeholder="Password" 
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <View style={styles.btnGroup}>
          <TouchableOpacity style={styles.btnLogin} onPress={() => handleAuth('login')}>
            {loading ? <ActivityIndicator color="white"/> : <Text style={styles.loginText}>登入</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSignup} onPress={() => handleAuth('signup')}>
            <Text style={styles.signupText}>註冊</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: 'white', borderRadius: 30, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20 },
  iconBox: { padding: 15, backgroundColor: '#EEF2FF', borderRadius: 25, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '900', color: '#1E293B', marginBottom: 5 },
  subtitle: { fontSize: 12, color: '#94A3B8', fontWeight: 'bold', marginBottom: 30 },
  input: { width: '100%', backgroundColor: '#F1F5F9', padding: 16, borderRadius: 16, marginBottom: 12, fontSize: 16 },
  btnGroup: { flexDirection: 'row', gap: 10, marginTop: 10, width: '100%' },
  btnLogin: { flex: 1, backgroundColor: '#4F46E5', padding: 16, borderRadius: 18, alignItems: 'center' },
  btnSignup: { flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', padding: 16, borderRadius: 18, alignItems: 'center' },
  loginText: { color: 'white', fontWeight: 'bold' },
  signupText: { color: '#64748B', fontWeight: 'bold' }
});