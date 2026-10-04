import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL = 'https://tswkswarcbvifiknsetn.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_fxRVwE-9FGx0XxNa2JjB5g_Vak9U7Q2';
// Clave por defecto con la que supabase-js guarda la sesión en AsyncStorage (no cambiarla: desloguearía a todos)
export const AUTH_STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

// Sin timeout, una petición colgada (wifi malo del box) deja la app en spinner para siempre.
// Storage (fotos) y Edge Functions (generación de programas con IA) quedan fuera: pueden tardar más.
const REQUEST_TIMEOUT_MS = 10000;
const NO_TIMEOUT_PATHS = ['/storage/v1/', '/functions/v1/'];
const fetchWithTimeout = (url, options = {}) => {
  if (options.signal || NO_TIMEOUT_PATHS.some(p => String(url).includes(p))) return fetch(url, options);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: { fetch: fetchWithTimeout },
});

// En React Native el refresco automático del token debe seguir al AppState:
// al volver del background se refresca antes de que las queries usen un token caducado.
if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
