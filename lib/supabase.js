import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://kzzxyyykpiquanxtfkwr.supabase.co';
const supabaseKey = 'sb_publishable_K0ThQ9_ZqPPYk0sxxWgLhg_qwzuMNeG';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});