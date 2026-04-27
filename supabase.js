import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL = 'https://tswkswarcbvifiknsetn.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_fxRVwE-9FGx0XxNa2JjB5g_Vak9U7Q2';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
