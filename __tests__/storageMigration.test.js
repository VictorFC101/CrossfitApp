jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { migrateStorageKeys, LEGACY_KEY_MAP, MIGRATION_FLAG } from '../storageMigration';
import { STORAGE_KEYS } from '../constants';

const LEGACY_KEYS = [
  'user_rms', 'user_resultados', 'user_wods_libres',
  'user_foto', 'user_nombre', 'user_genero',
  'all_programs',
  'theme_dark', 'theme_accent', 'theme_custom', 'theme_fontscale',
  'admin_pin',
];

describe('migrateStorageKeys', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('cubre todas las claves antiguas y todas las nuevas llevan prefijo @crossfit_', () => {
    expect(Object.keys(LEGACY_KEY_MAP).sort()).toEqual([...LEGACY_KEYS].sort());
    for (const nueva of Object.values(LEGACY_KEY_MAP)) {
      expect(nueva.startsWith('@crossfit_')).toBe(true);
      expect(Object.values(STORAGE_KEYS)).toContain(nueva);
    }
  });

  it('todas las claves de STORAGE_KEYS llevan prefijo @crossfit_', () => {
    for (const k of Object.values(STORAGE_KEYS)) expect(k.startsWith('@crossfit_')).toBe(true);
  });

  it('copia el valor de cada clave antigua a la nueva y conserva la antigua', async () => {
    for (const k of LEGACY_KEYS) await AsyncStorage.setItem(k, `valor_${k}`);
    await migrateStorageKeys();
    for (const k of LEGACY_KEYS) {
      expect(await AsyncStorage.getItem(LEGACY_KEY_MAP[k])).toBe(`valor_${k}`);
      expect(await AsyncStorage.getItem(k)).toBe(`valor_${k}`);
    }
  });

  it('no sobrescribe una clave nueva que ya tiene valor', async () => {
    await AsyncStorage.setItem('user_rms', 'viejo');
    await AsyncStorage.setItem(LEGACY_KEY_MAP.user_rms, 'nuevo');
    await migrateStorageKeys();
    expect(await AsyncStorage.getItem(LEGACY_KEY_MAP.user_rms)).toBe('nuevo');
  });

  it('no crea claves nuevas si la antigua no existe', async () => {
    await migrateStorageKeys();
    for (const k of LEGACY_KEYS) expect(await AsyncStorage.getItem(LEGACY_KEY_MAP[k])).toBeNull();
  });

  it('se ejecuta una sola vez por dispositivo (flag de migración)', async () => {
    await migrateStorageKeys();
    expect(await AsyncStorage.getItem(MIGRATION_FLAG)).toBe('1');
    await AsyncStorage.setItem('user_rms', 'tras_migrar');
    await migrateStorageKeys();
    expect(await AsyncStorage.getItem(LEGACY_KEY_MAP.user_rms)).toBeNull();
  });
});
