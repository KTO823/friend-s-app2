// screens/ForgotPasswordScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Mail, ChevronLeft } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!email) return Alert.alert('提示', '請輸入 Email');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);

    if (error) {
      Alert.alert('失敗', error.message);
    } else {
      Alert.alert('已發送', '重設密碼連結已寄至您的信箱，請查收。', [
        { text: '好', onPress: () => navigation.goBack() }
      ]);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ChevronLeft size={28} color="#1E293B" />
      </TouchableOpacity>
      
      <Text style={styles.title}>重設密碼</Text>
      <Text style={styles.subtitle}>輸入您的 Email，我們將寄送重設連結給您。</Text>

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

      <TouchableOpacity style={styles.btnReset} onPress={handleReset} disabled={loading}>
        {loading ? <ActivityIndicator color="white"/> : <Text style={styles.btnText}>發送重設信</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 24, paddingTop: 60 },
  backBtn: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '900', color: '#1E293B', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748B', marginBottom: 40 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, marginBottom: 24, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: '#E2E8F0' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1E293B' },
  btnReset: { backgroundColor: '#4F46E5', padding: 18, borderRadius: 18, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
});