import * as ImagePicker from 'expo-image-picker';
import { Button } from 'react-native';
import { supabase } from '../supabase';

export default function AvatarUploader({ onUploaded }) {
  async function pick() {
    const img = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6
    });
    if (img.canceled) return;

    const user = (await supabase.auth.getUser()).data.user;
    const path = `${user.id}/avatar.png`;

    const res = await fetch(img.assets[0].uri);
    const blob = await res.blob();

    await supabase.storage.from('avatars').upload(path, blob, { upsert: true });
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);

    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
    onUploaded();
  }

  return <Button title="Upload Avatar" onPress={pick} />;
}
