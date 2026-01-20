import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { User, CreditCard, Save, LogOut, Building } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

// 台灣常見銀行代碼表
const BANK_MAP = {
  '004': '臺灣銀行', '005': '土地銀行', '006': '合作金庫', '007': '第一銀行',
  '008': '華南銀行', '009': '彰化銀行', '010': '華泰銀行', '011': '上海商銀',
  '012': '台北富邦', '013': '國泰世華', '016': '高雄銀行', '017': '兆豐銀行',
  '021': '花旗銀行', '048': '王道銀行', '050': '臺灣企銀', '052': '渣打銀行',
  '053': '台中銀行', '054': '京城銀行', '081': '匯豐銀行', '102': '華泰銀行',
  '103': '新光銀行', '108': '陽信銀行', '118': '板信銀行', '147': '三信商銀',
  '803': '聯邦銀行', '805': '遠東商銀', '806': '元大銀行', '807': '永豐銀行',
  '808': '玉山銀行', '809': '凱基銀行', '810': '星展銀行', '812': '台新銀行',
  '816': '安泰銀行', '822': '中國信託', '700': '中華郵政'
};

export default function ProfileScreen({ session }) {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankAccount, setBankAccount] = useState('');

  // 載入資料
  useEffect(() => {
    if (session) getProfile();
  }, [session]);

  async function getProfile() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('username, bank_code, bank_account')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setUsername(data.username || '');
        setBankCode(data.bank_code || '');
        setBankAccount(data.bank_account || '');
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  // 儲存資料
  async function updateProfile() {
    try {
      setLoading(true);
      const updates = {
        id: session.user.id,
        username,
        bank_code: bankCode,
        bank_account: bankAccount,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      
      Alert.alert('成功', '個人資料已更新！');
    } catch (error) {
      Alert.alert('更新失敗', error.message);
    } finally {
      setLoading(false);
    }
  }

  const getBankName = (code) => {
    if (!code) return '';
    return BANK_MAP[code] || '未知銀行';
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        
        <View style={styles.header}>
          <Text style={styles.title}>個人檔案</Text>
          <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.logoutBtn}>
             <LogOut size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', marginBottom: 24 }}>
           <View style={{width: 100, height: 100, borderRadius: 50, backgroundColor: '#E2E8F0', overflow: 'hidden', marginBottom: 12}}>
              <Image source={{uri: `https://api.dicebear.com/9.x/avataaars/png?seed=${username}`}} style={{width: '100%', height: '100%'}} />
           </View>
           <Text style={styles.emailText}>{session.user.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>基本資料</Text>
          <View style={styles.inputGroup}>
            <View style={{flexDirection:'row', alignItems:'center', marginBottom: 8}}>
                <User size={16} color="#64748B" style={{marginRight:8}}/>
                <Text style={styles.label}>顯示暱稱</Text>
            </View>
            <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="請輸入暱稱" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>收款帳戶</Text>
          <Text style={styles.hint}>當朋友要還你錢時，會顯示此資訊。</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
              <View style={{flexDirection:'row', alignItems:'center', marginBottom: 8}}>
                  <Building size={16} color="#64748B" style={{marginRight:8}}/>
                  <Text style={styles.label}>銀行代碼</Text>
              </View>
              <TextInput style={styles.input} value={bankCode} onChangeText={setBankCode} placeholder="808" keyboardType="numeric" maxLength={3} />
            </View>
            
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={[styles.label, {marginBottom: 8}]}>銀行名稱</Text>
              <View style={[styles.input, { backgroundColor: '#F1F5F9', justifyContent: 'center' }]}>
                <Text style={{ color: bankCode ? '#1E293B' : '#94A3B8', fontWeight: 'bold' }}>
                  {getBankName(bankCode) || '-'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={{flexDirection:'row', alignItems:'center', marginBottom: 8}}>
                <CreditCard size={16} color="#64748B" style={{marginRight:8}}/>
                <Text style={styles.label}>銀行帳號</Text>
            </View>
            <TextInput style={styles.input} value={bankAccount} onChangeText={setBankAccount} placeholder="請輸入帳號" keyboardType="numeric" />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={updateProfile} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : (
            <>
              <Save size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.saveText}>儲存變更</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '900', color: '#1E293B' },
  logoutBtn: { padding: 10, backgroundColor: '#FEF2F2', borderRadius: 12 },
  emailText: { color: '#94A3B8', marginTop: 12, fontSize: 14 },
  section: { backgroundColor: 'white', padding: 20, borderRadius: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, shadowOffset: {height: 4} },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
  hint: { fontSize: 12, color: '#94A3B8', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 16, color: '#1E293B', fontWeight: '500' },
  row: { flexDirection: 'row' },
  saveBtn: { backgroundColor: '#4F46E5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 20, shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: {height: 4} },
  saveText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});