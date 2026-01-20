import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, TextInput, Alert, SafeAreaView, Platform, Image } from 'react-native';
import { LayoutGrid, Gift, CreditCard, User, Plus, X, ArrowDownLeft, ArrowUpRight, Smile } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

const COLORS = { primary: '#4F46E5', bg: '#F8FAFC', text: '#334155', gray: '#94A3B8' };

export default function HomeScreen({ session }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [modalVisible, setModalVisible] = useState(false);
  const [addType, setAddType] = useState('wishlist');
  
  const [profile, setProfile] = useState(null);
  const [dataList, setDataList] = useState([]);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  
  const [wishCount, setWishCount] = useState(0);
  const [receivable, setReceivable] = useState(0);

  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    if (session) {
      fetchProfile();
      fetchData();
      fetchGroups();
      fetchStats();
    }
  }, [activeTab, session]);

  // 1. Profile 防呆機制
  async function fetchProfile() {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (error && error.code === 'PGRST116') {
        const newProfile = { id: session.user.id, username: session.user.email.split('@')[0], avatar_url: null };
        await supabase.from('profiles').insert([newProfile]);
        setProfile(newProfile);
      } else if (data) {
        setProfile(data);
      }
    } catch (e) { console.log('Profile Error:', e); }
  }

  async function fetchStats() {
    const { count } = await supabase.from('gifts').select('*', { count: 'exact', head: true }).eq('creator_id', session.user.id);
    setWishCount(count || 0);
    const { data } = await supabase.from('ledgers').select('amount').eq('creditor_id', session.user.id).eq('status', 'pending');
    setReceivable(data?.reduce((acc, curr) => acc + curr.amount, 0) || 0);
  }

  async function fetchData() {
    if (activeTab === 'gifts') {
      const { data } = await supabase.from('gifts').select('*, profiles:creator_id(username)').order('created_at', { ascending: false });
      setDataList(data || []);
    } else if (activeTab === 'ledgers') {
      const { data } = await supabase.from('ledgers').select('*, creditor:profiles!creditor_id(username), debtor:profiles!debtor_id(username)').order('created_at', { ascending: false });
      setDataList(data || []);
    } else if (activeTab === 'settings') {
      const { data } = await supabase.from('group_members').select('*, groups(*)').eq('user_id', session.user.id);
      setDataList(data || []);
    }
  }

  async function fetchGroups() {
    const { data } = await supabase.from('group_members').select('group_id, groups(id, name)').eq('user_id', session.user.id);
    setGroups(data?.map(i => i.groups) || []);
  }

  // ★ 關鍵修改：使用 RPC 抓取成員，避開 RLS 無限迴圈
  async function fetchMembers(gid) {
    try {
      // 呼叫我們剛剛在 SQL 建立的 "VIP 通道" 函數
      const { data, error } = await supabase.rpc('get_group_members', { lookup_group_id: gid });
      
      if (error) {
        console.log('Fetch Members Error:', error);
        return;
      }
      // 過濾掉自己
      setMembers(data?.filter(m => m.user_id !== session.user.id) || []);
    } catch (e) {
      console.log('RPC Error:', e);
    }
  }

  // 建立群組
  async function handleCreateGroup() {
      if (Platform.OS === 'web') {
          const name = prompt("請輸入群組名稱");
          if (!name) return;
          const code = Math.random().toString(36).substring(2, 8).toUpperCase();
          
          // ★ 修改重點：改用 rpc 呼叫，一次完成建群+加人，絕對不會錯
          const { data: newGroupId, error } = await supabase.rpc('create_group_with_admin', { 
            group_name: name, 
            invite_code: code 
          });

          if (error) {
            alert("失敗: " + error.message);
          } else {
            alert("建立成功！邀請碼: " + code);
            fetchData(); 
            fetchGroups();
          }
      } else {
          Alert.alert("提示", "目前手機版建立群組功能開發中");
      }
  }
  
  // 加入群組
  async function handleJoinGroup() {
      if (Platform.OS === 'web') {
          const code = prompt("請輸入邀請碼");
          if (!code) return;
          const { data: g } = await supabase.from('groups').select('id, name').eq('invite_code', code).single();
          if(!g) return alert("邀請碼無效");
          
          // 加入 (使用簡單 RLS)
          const { error } = await supabase.from('group_members').insert([{ group_id: g.id, user_id: session.user.id }]);
          if(error) alert("加入失敗或已在群組"); else { alert("加入成功"); fetchData(); fetchGroups(); }
      } else {
          Alert.alert("提示", "目前手機版加入群組功能開發中");
      }
  }

  async function handleSubmit() {
    if (!formName || !selectedGroup) return Alert.alert('提示', '請填寫完整');
    
    let error;
    if (addType === 'wishlist') {
      const { error: err } = await supabase.from('gifts').insert([{
        item_name: formName, amount: parseInt(formAmount)||0, group_id: selectedGroup, creator_id: session.user.id
      }]);
      error = err;
    } else {
      if (!selectedMember) return Alert.alert('提示', '請選擇欠款人');
      const { error: err } = await supabase.from('ledgers').insert([{
        description: formName, amount: parseInt(formAmount)||0, group_id: selectedGroup, creditor_id: session.user.id, debtor_id: selectedMember
      }]);
      error = err;
    }

    if (error) Alert.alert('失敗', error.message);
    else {
      setModalVisible(false);
      setFormName(''); setFormAmount(''); setSelectedGroup(null);
      fetchData(); fetchStats();
    }
  }

  // 空白狀態
  const EmptyState = ({ message, icon: Icon }) => (
    <View style={{ alignItems: 'center', marginTop: 80, opacity: 0.6 }}>
      <Icon size={60} color={COLORS.gray} />
      <Text style={{ marginTop: 16, color: COLORS.gray, fontSize: 16, fontWeight: 'bold' }}>{message}</Text>
    </View>
  );

  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return (
        <View>
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeLabel}>WELCOME BACK</Text>
            <Text style={styles.welcomeTitle}>{profile?.username || 'User'}</Text>
            <Text style={styles.welcomeSub}>{session.user.email}</Text>
            <View style={styles.statRow}>
               <View style={styles.statBox}><Text style={styles.statLabel}>許願中</Text><Text style={styles.statValue}>{wishCount}</Text></View>
               <View style={styles.statBox}><Text style={styles.statLabel}>待收款</Text><Text style={[styles.statValue, {color: '#6EE7B7'}]}>${receivable}</Text></View>
            </View>
          </View>
          
          <View style={{marginTop: 30}}>
            <Text style={styles.sectionTitle}>我的群組</Text>
            {groups.length === 0 ? (
              <View style={{backgroundColor: 'white', padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 10}}>
                <Smile size={40} color={COLORS.primary} style={{marginBottom: 10}}/>
                <Text style={{color: COLORS.text, fontWeight: 'bold'}}>快拉朋友進來吧！</Text>
                <Text style={{color: COLORS.gray, fontSize: 12, marginTop: 4}}>目前還沒有任何群組喔</Text>
              </View>
            ) : (
              groups.map(g => (
                <View key={g.id} style={styles.groupCard}>
                  <Text style={styles.groupName}>{g.name}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      );
    } 
    
    if (activeTab === 'gifts') {
      return (
        <ScrollView contentContainerStyle={{paddingBottom: 100}}>
          <Text style={styles.pageTitle}>許願池</Text>
          {dataList.length === 0 ? (
            <EmptyState message="還沒有人許願喔！" icon={Gift} />
          ) : (
            dataList.map(item => (
              <View key={item.id} style={styles.listItem}>
                <View style={[styles.iconBox, {backgroundColor: item.is_reserved ? '#F1F5F9' : '#EEF2FF'}]}>
                  <Gift size={24} color={item.is_reserved ? '#94A3B8' : '#4F46E5'} />
                </View>
                <View style={{flex: 1, marginLeft: 12}}>
                  <Text style={styles.itemTitle}>{item.item_name}</Text>
                  <Text style={styles.itemSub}>${item.amount} · {item.profiles?.username}</Text>
                </View>
                <TouchableOpacity onPress={async() => { await supabase.from('gifts').update({is_reserved: !item.is_reserved}).eq('id', item.id); fetchData(); }} style={[styles.btnSmall, {backgroundColor: item.is_reserved ? '#F1F5F9' : '#4F46E5'}]}>
                  <Text style={{color: item.is_reserved ? '#94A3B8' : 'white', fontWeight: 'bold', fontSize: 12}}>{item.is_reserved ? '已認領' : '認領'}</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      );
    }

    if (activeTab === 'ledgers') {
      return (
        <ScrollView contentContainerStyle={{paddingBottom: 100}}>
          <Text style={styles.pageTitle}>帳務紀錄</Text>
          {dataList.length === 0 ? (
            <EmptyState message="太棒了！沒有欠款" icon={CreditCard} />
          ) : (
            dataList.map(item => {
              const isMeCred = item.creditor_id === session.user.id;
              return (
                <View key={item.id} style={styles.listItem}>
                  <View style={[styles.iconBox, {backgroundColor: isMeCred ? '#ECFDF5' : '#FFF1F2'}]}>
                    {isMeCred ? <ArrowDownLeft color="#10B981" /> : <ArrowUpRight color="#F43F5E" />}
                  </View>
                  <View style={{flex: 1, marginLeft: 12}}>
                    <Text style={styles.itemTitle}>{item.description}</Text>
                    <Text style={styles.itemSub}>{item.creditor?.username} ➜ {item.debtor?.username}</Text>
                  </View>
                  <View style={{alignItems: 'flex-end'}}>
                    <Text style={styles.amountText}>${item.amount}</Text>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                </View>
              )
            })
          )}
        </ScrollView>
      );
    }
    
    if (activeTab === 'settings') {
      return (
        <ScrollView contentContainerStyle={{paddingBottom: 100}}>
          <View style={{alignItems: 'center', marginBottom: 30}}>
            <View style={{width: 80, height: 80, borderRadius: 40, backgroundColor: '#E2E8F0', marginBottom: 10, overflow: 'hidden'}}>
               <Image source={{uri: `https://api.dicebear.com/9.x/avataaars/png?seed=${profile?.username}`}} style={{width: '100%', height: '100%'}} />
            </View>
            <Text style={styles.pageTitle}>{profile?.username}</Text>
            <TouchableOpacity onPress={() => supabase.auth.signOut()} style={{marginTop: 10, padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20}}>
               <Text style={{fontSize: 12, fontWeight: 'bold', color: '#94A3B8'}}>登出帳號</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.sectionBox}>
              <Text style={{fontSize: 12, color: '#94A3B8', fontWeight: 'bold', marginBottom: 10}}>MY GROUPS</Text>
              {groups.length === 0 ? (
                  <View style={{padding: 20, alignItems: 'center'}}>
                    <Text style={{color: COLORS.gray}}>尚無群組</Text>
                  </View>
              ) : (
                dataList.map(item => (
                    <View key={item.id} style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F1F5F9'}}>
                        <Text style={{fontWeight: 'bold', color: '#334155'}}>{item.groups.name}</Text>
                        <Text style={{fontSize: 12, color: '#94A3B8'}}>Code: {item.groups.invite_code}</Text>
                    </View>
                ))
              )}
              
              <View style={{flexDirection: 'row', gap: 10, marginTop: 20}}>
                  <TouchableOpacity onPress={handleCreateGroup} style={[styles.btnPrimary, {marginTop: 0, flex: 1, backgroundColor: '#1E293B'}]}><Text style={{color: 'white', fontWeight: 'bold'}}>建群組</Text></TouchableOpacity>
                  <TouchableOpacity onPress={handleJoinGroup} style={[styles.btnPrimary, {marginTop: 0, flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0'}]}><Text style={{color: '#64748B', fontWeight: 'bold'}}>加群組</Text></TouchableOpacity>
              </View>
          </View>
        </ScrollView>
      );
    }
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: COLORS.bg}}>
      <View style={{flex: 1, padding: 20}}>
        {renderContent()}
      </View>

      <View style={styles.navBar}>
        <NavBtn icon={LayoutGrid} label="總覽" active={activeTab==='dashboard'} onPress={()=>setActiveTab('dashboard')}/>
        <NavBtn icon={Gift} label="禮物" active={activeTab==='gifts'} onPress={()=>setActiveTab('gifts')}/>
        
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Plus color="white" size={32} />
        </TouchableOpacity>

        <NavBtn icon={CreditCard} label="帳務" active={activeTab==='ledgers'} onPress={()=>setActiveTab('ledgers')}/>
        <NavBtn icon={User} label="我的" active={activeTab==='settings'} onPress={()=>setActiveTab('settings')}/>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20}}>
              <Text style={{fontSize: 20, fontWeight: '900'}}>新增項目</Text>
              <TouchableOpacity onPress={()=>setModalVisible(false)}><X color="#94A3B8"/></TouchableOpacity>
            </View>

            <View style={{flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 20}}>
              <TypeBtn label="🎁 願望" active={addType==='wishlist'} onPress={()=>setAddType('wishlist')}/>
              <TypeBtn label="💸 記帳" active={addType==='debt'} onPress={()=>setAddType('debt')}/>
            </View>

            <TextInput style={styles.input} placeholder="名稱" value={formName} onChangeText={setFormName} />
            <TextInput style={styles.input} placeholder="金額" keyboardType="numeric" value={formAmount} onChangeText={setFormAmount} />

            <Text style={{marginBottom: 5, fontSize: 12, color: '#94A3B8', fontWeight: 'bold'}}>選擇群組</Text>
            <ScrollView horizontal style={{marginBottom: 15}} showsHorizontalScrollIndicator={false}>
              {groups.map(g => (
                <TouchableOpacity key={g.id} onPress={()=>{setSelectedGroup(g.id); fetchMembers(g.id);}} style={[styles.chip, selectedGroup===g.id && styles.chipActive]}>
                  <Text style={{color: selectedGroup===g.id?'white':'#64748B', fontWeight: 'bold'}}>{g.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {addType === 'debt' && (
              <>
                <Text style={{marginBottom: 5, fontSize: 12, color: '#F43F5E', fontWeight: 'bold'}}>誰欠你錢？</Text>
                <ScrollView horizontal style={{marginBottom: 20}} showsHorizontalScrollIndicator={false}>
                  {members.map(m => (
                    <TouchableOpacity key={m.user_id} onPress={()=>setSelectedMember(m.user_id)} style={[styles.chip, selectedMember===m.user_id && {backgroundColor: '#F43F5E'}]}>
                      <Text style={{color: selectedMember===m.user_id?'white':'#64748B', fontWeight: 'bold'}}>{m.username}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <TouchableOpacity style={styles.btnPrimary} onPress={handleSubmit}>
              <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>發佈</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const NavBtn = ({icon: Icon, label, active, onPress}) => (
  <TouchableOpacity onPress={onPress} style={{alignItems: 'center', width: 50}}>
    <Icon color={active ? COLORS.primary : '#CBD5E1'} size={24} />
    <Text style={{fontSize: 10, fontWeight: 'bold', color: active ? COLORS.primary : '#CBD5E1', marginTop: 4}}>{label}</Text>
  </TouchableOpacity>
);

const TypeBtn = ({label, active, onPress}) => (
  <TouchableOpacity onPress={onPress} style={{flex: 1, padding: 10, alignItems: 'center', backgroundColor: active ? 'white' : 'transparent', borderRadius: 10, shadowOpacity: active?0.05:0}}>
    <Text style={{fontWeight: 'bold', color: active ? COLORS.primary : '#94A3B8'}}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 20, paddingBottom: 30, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#F1F5F9' },
  fab: { top: -25, width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: {height: 8} },
  welcomeCard: { backgroundColor: COLORS.primary, borderRadius: 32, padding: 24, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 20 },
  welcomeLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  welcomeTitle: { color: 'white', fontSize: 28, fontWeight: '900' },
  welcomeSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500', marginBottom: 20 },
  statRow: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)', padding: 12, borderRadius: 16 },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 'bold' },
  statValue: { color: 'white', fontSize: 18, fontWeight: '900', marginTop: 4 },
  listItem: { flexDirection: 'row', backgroundColor: 'white', padding: 16, borderRadius: 24, marginBottom: 12, alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  itemSub: { fontSize: 12, color: '#94A3B8', fontWeight: 'bold', marginTop: 2 },
  btnSmall: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  amountText: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  statusText: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8' },
  pageTitle: { fontSize: 24, fontWeight: '900', color: '#1E293B', marginBottom: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, minHeight: 500 },
  input: { backgroundColor: '#F1F5F9', padding: 16, borderRadius: 16, marginBottom: 12, fontSize: 16, fontWeight: 'bold' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8 },
  chipActive: { backgroundColor: COLORS.primary },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 10 },
  sectionBox: { backgroundColor: 'white', padding: 20, borderRadius: 30, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginBottom: 10 },
  groupCard: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 10 },
  groupName: { fontWeight: 'bold', fontSize: 16, color: '#334155' }
});