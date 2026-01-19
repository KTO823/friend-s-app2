import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Image } from 'react-native';
import { supabase } from '../supabase';
import AvatarUploader from '../components/AvatarUploader';

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);

  async function load() {
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from('profiles').upsert({ id: user.id });
    const { data } = await supabase.from('profiles').select('*').single();
    setProfile(data);
  }

  useEffect(() => { load(); }, []);

  if (!profile) return null;

  return (
    <View>
      {profile.avatar_url && <Image source={{ uri: profile.avatar_url }} style={{ width: 80, height: 80 }} />}
      <AvatarUploader onUploaded={load} />
      <TextInput
        value={profile.username}
        onChangeText={v => setProfile({ ...profile, username: v })}
      />
      <Button
        title="Save"
        onPress={() => supabase.from('profiles').update(profile).eq('id', profile.id)}
      />
    </View>
  );
}
