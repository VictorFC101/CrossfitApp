import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';

// Claves antiguas (sin prefijo) -> claves nuevas con prefijo @crossfit_
export const LEGACY_KEY_MAP = {
  user_rms: STORAGE_KEYS.USER_RMS,
  user_resultados: STORAGE_KEYS.USER_RESULTADOS,
  user_wods_libres: STORAGE_KEYS.USER_WODS_LIBRES,
  user_foto: STORAGE_KEYS.USER_FOTO,
  user_nombre: STORAGE_KEYS.USER_NOMBRE,
  user_genero: STORAGE_KEYS.USER_GENERO,
  all_programs: STORAGE_KEYS.ALL_PROGRAMS,
  theme_dark: STORAGE_KEYS.THEME_DARK,
  theme_accent: STORAGE_KEYS.THEME_ACCENT,
  theme_custom: STORAGE_KEYS.THEME_CUSTOM,
  theme_fontscale: STORAGE_KEYS.THEME_FONTSCALE,
  admin_pin: STORAGE_KEYS.ADMIN_PIN,
};

export const MIGRATION_FLAG = '@crossfit_storage_v2';

// Copia (no mueve) los valores de las claves antiguas a las nuevas, una sola vez.
// Las claves antiguas se conservan por seguridad y se borrarán en una versión futura.
export async function migrateStorageKeys() {
  try {
    if ((await AsyncStorage.getItem(MIGRATION_FLAG)) === '1') return;
    for (const [oldKey, newKey] of Object.entries(LEGACY_KEY_MAP)) {
      const oldVal = await AsyncStorage.getItem(oldKey);
      if (oldVal == null) continue;
      const newVal = await AsyncStorage.getItem(newKey);
      if (newVal == null) await AsyncStorage.setItem(newKey, oldVal);
    }
    await AsyncStorage.setItem(MIGRATION_FLAG, '1');
  } catch (e) {
    // Nunca bloquear la app; se reintentará en el próximo arranque
  }
}
