import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Gift, Lock, Mail } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return Alert.alert('提示', '請輸入 Email 與密碼');
    
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        Alert.alert('無法登入', '您的 Email 尚未驗證，請去信箱收取驗證信。');
      } else if (error.message.includes('Invalid login')) {
        Alert.alert('登入失敗', '帳號或密碼錯誤');
      } else {
        Alert.alert('錯誤', error.message);
      }
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Gift size={40} color="#4F46E5" />
        </View>
        <Text style={styles.title}>歡迎回來</Text>
        <Text style={styles.subtitle}>登入以繼續管理您的禮物清單</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Mail size={20} color="#94A3B8" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="Email" 
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <Lock size={20} color="#94A3B8" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="密碼" 
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={styles.forgotBtn} 
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.forgotText}>忘記密碼？</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnLogin} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="white"/> : <Text style={styles.loginText}>登入</Text>}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>還沒有帳號？ </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.linkText}>立即註冊</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  iconBox: { padding: 15, backgroundColor: '#EEF2FF', borderRadius: 25, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '900', color: '#1E293B', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748B' },
  form: { width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, marginBottom: 16, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: '#E2E8F0' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1E293B' },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotText: { color: '#4F46E5', fontWeight: '600' },
  btnLogin: { backgroundColor: '#4F46E5', padding: 18, borderRadius: 18, alignItems: 'center', shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  loginText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  footerText: { color: '#64748B', fontSize: 16 },
  linkText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 16 }
});