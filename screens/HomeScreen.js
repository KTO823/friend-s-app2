import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, TextInput, Alert, SafeAreaView, Image, Clipboard } from 'react-native';
import { LayoutGrid, Gift, CreditCard, User, Plus, X, ArrowDownLeft, ArrowUpRight, Copy, UserPlus } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

const COLORS = { primary: '#4F46E5', bg: '#F8FAFC', text: '#334155', gray: '#94A3B8' };

export default function HomeScreen({ session }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [modalVisible, setModalVisible] = useState(false);
  const [addType, setAddType] = useState('wishlist');
  const [addFriendModal, setAddFriendModal] = useState(false); // 新增好友視窗
  const [friendCode, setFriendCode] = useState(''); // 輸入好友代碼
  
  const [profile, setProfile] = useState(null);
  const [dataList, setDataList] = useState([]);
  const [friends, setFriends] = useState([]); // 我的好友列表
  
  const [wishCount, setWishCount] = useState(0);
  const [receivable, setReceivable] = useState(0);

  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [selectedDebtor, setSelectedDebtor] = useState(null);

  useEffect(() => {
    if (session) {
      fetchProfile();
      fetchData();
      fetchStats();
      fetchFriends();
    }
  }, [activeTab, session]);

  // 1. 取得自己資料 (含邀請碼)
  async function fetchProfile() {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      
      // 如果沒有邀請碼，幫他產生一個並存入
      if (data && !data.invite_code) {
         const code = Math.random().toString(36).substring(2, 8).toUpperCase();
         await supabase.from('profiles').update({ invite_code: code }).eq('id', session.user.id);
         data.invite_code = code;
      }

      if (error && error.code === 'PGRST116') {
        // 新用戶初始化
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const newProfile = { id: session.user.id, username: session.user.email.split('@')[0], avatar_url: null, invite_code: code };
        await supabase.from('profiles').insert([newProfile]);
        setProfile(newProfile);
      } else if (data) {
        setProfile(data);
      }
    } catch (e) { console.log('Profile Error:', e); }
  }

  // 2. 取得好友列表 (雙向查詢：我加人 OR 人加我)
  async function fetchFriends() {
    // 找出所有跟我在 friendships 表有關聯的人
    const { data: relations } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`);
    
    if (!relations) return;

    // 整理出「對方的 ID」
    const friendIds = relations.map(r => r.user_id === session.user.id ? r.friend_id : r.user_id);
    
    if (friendIds.length > 0) {
        // 抓取對方的詳細資料
        const { data: friendsData } = await supabase.from('profiles').select('*').in('id', friendIds);
        setFriends(friendsData || []);
    } else {
        setFriends([]);
    }
  }

  // 3. 加好友功能
  async function handleAddFriend() {
      if (!friendCode) return Alert.alert("請輸入代碼");
      
      // A. 先找這個代碼是誰
      const { data: targetUser, error } = await supabase.from('profiles').select('id, username').eq('invite_code', friendCode).single();
      
      if (!targetUser) return Alert.alert("找不到此代碼", "請確認好友的邀請碼是否正確");
      if (targetUser.id === session.user.id) return Alert.alert("不能加自己 XD");

      // B. 建立好友關係
      // 這裡直接 insert，如果已經是好友(因為有 unique 限制)會報錯，我們就當作成功
      const { error: addError } = await supabase.from('friendships').insert([{
          user_id: session.user.id,
          friend_id: targetUser.id
      }]);

      if (addError) {
          if (addError.code === '23505') Alert.alert("已經是好友囉！");
          else Alert.alert("加入失敗", addError.message);
      } else {
          Alert.alert("成功", `已將 ${targetUser.username} 加為好友！`);
          setAddFriendModal(false);
          setFriendCode('');
          fetchFriends(); // 重新整理列表
      }
  }

  async function fetchStats() {
    const { count } = await supabase.from('gifts').select('*', { count: 'exact', head: true }).eq('creator_id', session.user.id);
    setWishCount(count || 0);
    const { data } = await supabase.from('ledgers').select('amount').eq('creditor_id', session.user.id).eq('status', 'pending');
    setReceivable(data?.reduce((acc, curr) => acc + curr.amount, 0) || 0);
  }

  async function fetchData() {
    if (activeTab === 'dashboard') return;

    if (activeTab === 'gifts') {
      const { data } = await supabase.from('gifts').select('*, profiles:creator_id(username)').order('created_at', { ascending: false });
      setDataList(data || []);
    } else if (activeTab === 'ledgers') {
      const { data } = await supabase.from('ledgers').select('*, creditor:profiles!creditor_id(username), debtor:profiles!debtor_id(username)').order('created_at', { ascending: false });
      setDataList(data || []);
    }
  }

  async function handleSubmit() {
    if (!formName) return Alert.alert('提示', '請輸入名稱');
    
    let error;
    if (addType === 'wishlist') {
      const { error: err } = await supabase.from('gifts').insert([{
        item_name: formName, 
        amount: parseInt(formAmount)||0, 
        creator_id: session.user.id
      }]);
      error = err;
    } else {
      if (!selectedDebtor) return Alert.alert('提示', '請選擇欠款人');
      const { error: err } = await supabase.from('ledgers').insert([{
        description: formName, 
        amount: parseInt(formAmount)||0, 
        creditor_id: session.user.id, 
        debtor_id: selectedDebtor
      }]);
      error = err;
    }

    if (error) Alert.alert('失敗', error.message);
    else {
      setModalVisible(false);
      setFormName(''); setFormAmount(''); setSelectedDebtor(null);
      fetchData(); fetchStats();
    }
  }

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
            
            {/* 顯示我的邀請碼 */}
            <TouchableOpacity onPress={()=>{Clipboard.setString(profile?.invite_code); Alert.alert("已複製", "邀請碼已複製到剪貼簿")}} style={{flexDirection:'row', alignItems:'center', marginTop: 4, marginBottom: 20}}>
                <Text style={styles.welcomeSub}>ID: {profile?.invite_code || '...'}</Text>
                <Copy size={14} color="rgba(255,255,255,0.8)" style={{marginLeft: 6}}/>
            </TouchableOpacity>

            <View style={styles.statRow}>
               <View style={styles.statBox}><Text style={styles.statLabel}>許願中</Text><Text style={styles.statValue}>{wishCount}</Text></View>
               <View style={styles.statBox}><Text style={styles.statLabel}>待收款</Text><Text style={[styles.statValue, {color: '#6EE7B7'}]}>${receivable}</Text></View>
            </View>
          </View>
          
          <View style={{marginTop: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={styles.sectionTitle}>我的好友 ({friends.length})</Text>
            <TouchableOpacity onPress={() => setAddFriendModal(true)} style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0E7FF', padding: 8, borderRadius: 12}}>
                <UserPlus size={16} color={COLORS.primary} style={{marginRight: 4}}/>
                <Text style={{color: COLORS.primary, fontWeight: 'bold', fontSize: 12}}>加好友</Text>
            </TouchableOpacity>
          </View>

          {friends.length === 0 ? (
              <View style={{padding: 20, alignItems: 'center', marginTop: 20, backgroundColor: 'white', borderRadius: 16}}>
                <Text style={{color: COLORS.gray, marginBottom: 10}}>還沒有好友喔</Text>
                <Text style={{color: COLORS.text, fontWeight: 'bold'}}>快把你的 ID 給朋友：{profile?.invite_code}</Text>
              </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 10}}>
                {friends.map(u => (
                    <View key={u.id} style={{alignItems: 'center', marginRight: 16, width: 70}}>
                        <View style={{width: 60, height: 60, borderRadius: 30, backgroundColor: '#E2E8F0', overflow: 'hidden', marginBottom: 8}}>
                             <Image source={{uri: `https://api.dicebear.com/9.x/avataaars/png?seed=${u.username}`}} style={{width: '100%', height: '100%'}} />
                        </View>
                        <Text numberOfLines={1} style={{fontSize: 12, color: COLORS.text, fontWeight: 'bold'}}>{u.username}</Text>
                    </View>
                ))}
            </ScrollView>
          )}
        </View>
      );
    } 
    
    // Gifts & Ledgers 的部分保持不變...
    if (activeTab === 'gifts') {
      return (
        <ScrollView contentContainerStyle={{paddingBottom: 100}}>
          <Text style={styles.pageTitle}>許願池</Text>
          {dataList.length === 0 ? <EmptyState message="還沒有人許願喔！" icon={Gift} /> : dataList.map(item => (
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
          }
        </ScrollView>
      );
    }

    if (activeTab === 'ledgers') {
      return (
        <ScrollView contentContainerStyle={{paddingBottom: 100}}>
          <Text style={styles.pageTitle}>帳務紀錄</Text>
          {dataList.length === 0 ? <EmptyState message="太棒了！沒有欠款" icon={CreditCard} /> : dataList.map(item => {
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
          }
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
        <NavBtn icon={LayoutGrid} label="首頁" active={activeTab==='dashboard'} onPress={()=>setActiveTab('dashboard')}/>
        <NavBtn icon={Gift} label="許願" active={activeTab==='gifts'} onPress={()=>setActiveTab('gifts')}/>
        
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Plus color="white" size={32} />
        </TouchableOpacity>

        <NavBtn icon={CreditCard} label="記帳" active={activeTab==='ledgers'} onPress={()=>setActiveTab('ledgers')}/>
        <NavBtn icon={User} label="我的" active={false} onPress={()=>{/*跳轉*/}}/>
      </View>

      {/* 新增項目 Modal */}
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

            {addType === 'debt' && (
              <>
                <Text style={{marginBottom: 5, fontSize: 12, color: '#F43F5E', fontWeight: 'bold'}}>誰欠你錢？ (只能選好友)</Text>
                {friends.length === 0 ? <Text style={{color:'#94A3B8', padding:10}}>請先去首頁加好友！</Text> : 
                <ScrollView horizontal style={{marginBottom: 20}} showsHorizontalScrollIndicator={false}>
                  {friends.map(u => (
                    <TouchableOpacity key={u.id} onPress={()=>setSelectedDebtor(u.id)} style={[styles.chip, selectedDebtor===u.id && {backgroundColor: '#F43F5E'}]}>
                      <Text style={{color: selectedDebtor===u.id?'white':'#64748B', fontWeight: 'bold'}}>{u.username}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>}
              </>
            )}

            <TouchableOpacity style={styles.btnPrimary} onPress={handleSubmit}>
              <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>發佈</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 加好友 Modal */}
      <Modal visible={addFriendModal} animationType="fade" transparent={true}>
         <View style={[styles.modalOverlay, {justifyContent: 'center', padding: 20}]}>
            <View style={[styles.modalContent, {borderRadius: 24, minHeight: 'auto'}]}>
                <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center'}}>輸入好友代碼</Text>
                <TextInput 
                   style={[styles.input, {textAlign: 'center', letterSpacing: 2}]} 
                   placeholder="例如: A1B2C3" 
                   value={friendCode} 
                   onChangeText={t => setFriendCode(t.toUpperCase())}
                   maxLength={6}
                />
                <TouchableOpacity style={styles.btnPrimary} onPress={handleAddFriend}>
                    <Text style={{color: 'white', fontWeight: 'bold'}}>確認加入</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=>setAddFriendModal(false)} style={{marginTop: 16, alignItems: 'center'}}>
                    <Text style={{color: '#94A3B8'}}>取消</Text>
                </TouchableOpacity>
            </View>
         </View>
      </Modal>

    </SafeAreaView>
  );
}

// ... 樣式組件保持不變 ...
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
  welcomeSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' },
  statRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
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
  btnPrimary: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' }
});