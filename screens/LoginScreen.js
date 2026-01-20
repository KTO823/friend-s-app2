import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false); // 控制顯示登入還是註冊

  async function handleAuth() {
    setLoading(true);
    try {
      if (isRegister) {
        // === 註冊邏輯 ===
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        Alert.alert('註冊成功', '請使用剛註冊的帳號登入！');
        setIsRegister(false); // ★ 關鍵：註冊完自動切換回登入模式
      } else {
        // === 登入邏輯 ===
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      Alert.alert('錯誤', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{isRegister ? '註冊帳號' : '歡迎回來'}</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="密碼"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.btn} onPress={handleAuth} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : (
            <Text style={styles.btnText}>{isRegister ? '註冊' : '登入'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsRegister(!isRegister)} style={{ marginTop: 20 }}>
          <Text style={styles.switchText}>
            {isRegister ? '已有帳號？點此登入' : '還沒帳號？點此註冊'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#F8FAFC' },
  card: { backgroundColor: 'white', padding: 30, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20 },
  title: { fontSize: 28, fontWeight: '900', color: '#1E293B', marginBottom: 24, textAlign: 'center' },
  input: { backgroundColor: '#F1F5F9', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 16 },
  btn: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  switchText: { color: '#64748B', textAlign: 'center', fontWeight: 'bold' }
});