// screens/SignUpScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Lock, Mail, User, ChevronLeft } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { validatePassword, validateEmail } from '../utils/validators';

export default function SignUpScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!email || !password || !confirmPassword) return Alert.alert('錯誤', '請填寫所有欄位');
    if (!validateEmail(email)) return Alert.alert('錯誤', 'Email 格式不正確');
    if (password !== confirmPassword) return Alert.alert('錯誤', '兩次密碼輸入不一致');
    if (!validatePassword(password)) return Alert.alert('密碼太弱', '密碼需至少 8 碼，並包含英文與數字');

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert('註冊失敗', error.message);
    } else {
      Alert.alert(
        '註冊成功！',
        '我們已發送驗證信到您的信箱，請點擊信中連結完成啟用。',
        [{ text: '好，去登入', onPress: () => navigation.navigate('Login') }]
      );
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ChevronLeft size={28} color="#1E293B" />
      </TouchableOpacity>

      <Text style={styles.title}>建立帳號</Text>
      <Text style={styles.subtitle}>加入 GIFTFLOW，開始紀錄美好時刻</Text>

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
            placeholder="設定密碼 (英數混合, 8碼以上)" 
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.inputContainer}>
          <Lock size={20} color="#94A3B8" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="再次確認密碼" 
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.btnSignup} onPress={handleSignUp} disabled={loading}>
          {loading ? <ActivityIndicator color="white"/> : <Text style={styles.signupText}>註冊帳號</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 24, paddingTop: 60 },
  backBtn: { marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '900', color: '#1E293B', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748B', marginBottom: 40 },
  form: { width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, marginBottom: 16, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: '#E2E8F0' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1E293B' },
  btnSignup: { backgroundColor: '#1E293B', padding: 18, borderRadius: 18, alignItems: 'center', marginTop: 10 },
  signupText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
});