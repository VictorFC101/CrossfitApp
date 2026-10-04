import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';

const ThemeContext = createContext();

export const ACCENTS = [
  { key: 'red', name: 'Rojo', color: '#e63946' },
  { key: 'pink', name: 'Rosa', color: '#f72585' },
  { key: 'hotpink', name: 'Hot Pink', color: '#ff006e' },
  { key: 'coral', name: 'Coral', color: '#ff6b6b' },
  { key: 'orange', name: 'Naranja', color: '#fb5607' },
  { key: 'amber', name: 'Ámbar', color: '#ffbe0b' },
  { key: 'lime', name: 'Lima', color: '#8ac926' },
  { key: 'green', name: 'Verde', color: '#06d6a0' },
  { key: 'teal', name: 'Teal', color: '#0cb0a9' },
  { key: 'blue', name: 'Azul', color: '#4895ef' },
  { key: 'indigo', name: 'Índigo', color: '#4361ee' },
  { key: 'purple', name: 'Morado', color: '#7b2d8b' },
  { key: 'violet', name: 'Violeta', color: '#b5179e' },
  { key: 'rainbow', name: 'Arcoíris', color: '#f72585' },
];

export const FONT_SCALES = [
  { key: 'normal', label: 'A', scale: 1.0, desc: 'Normal' },
  { key: 'medium', label: 'A', scale: 1.2, desc: 'Mediana' },
  { key: 'large', label: 'A', scale: 1.4, desc: 'Grande' },
];

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(true);
  const [accentKey, setAccentKey] = useState('red');
  const [customColor, setCustomColor] = useState(null);
  const [fontScale, setFontScaleState] = useState(1.0);

  useEffect(() => {
    const load = async () => {
      try {
        const dm = await AsyncStorage.getItem(STORAGE_KEYS.THEME_DARK);
        const ak = await AsyncStorage.getItem(STORAGE_KEYS.THEME_ACCENT);
        const cc = await AsyncStorage.getItem(STORAGE_KEYS.THEME_CUSTOM);
        const fs = await AsyncStorage.getItem(STORAGE_KEYS.THEME_FONTSCALE);
        if (dm !== null) setDarkMode(dm === 'true');
        if (ak) setAccentKey(ak);
        if (cc) setCustomColor(cc);
        if (fs) setFontScaleState(parseFloat(fs));
      } catch (e) {}
    };
    load();
  }, []);

  const setDark = async (val) => {
    setDarkMode(val);
    await AsyncStorage.setItem(STORAGE_KEYS.THEME_DARK, String(val));
  };

  const setAccent = async (key) => {
    setAccentKey(key);
    setCustomColor(null);
    await AsyncStorage.setItem(STORAGE_KEYS.THEME_ACCENT, key);
    await AsyncStorage.removeItem(STORAGE_KEYS.THEME_CUSTOM);
  };

  const setCustom = async (color) => {
    setCustomColor(color);
    setAccentKey('custom');
    await AsyncStorage.setItem(STORAGE_KEYS.THEME_CUSTOM, color);
    await AsyncStorage.setItem(STORAGE_KEYS.THEME_ACCENT, 'custom');
  };

  const setFontScale = async (scale) => {
    setFontScaleState(scale);
    await AsyncStorage.setItem(STORAGE_KEYS.THEME_FONTSCALE, String(scale));
  };

  const accent = customColor || ACCENTS.find(a => a.key === accentKey)?.color || '#e63946';
  const fs = (size) => Math.round(size * fontScale);

  const theme = {
    dark: darkMode,
    accent,
    accentKey,
    customColor,
    fontScale,
    fs,
    bg: darkMode ? '#07070e' : '#f0f0f5',
    bg2: darkMode ? '#0c0c14' : '#e8e8f0',
    bg3: darkMode ? '#0b0b0b' : '#ffffff',
    bg4: darkMode ? '#0a0a0a' : '#f5f5fa',
    card: darkMode ? '#0e0e1a' : '#ffffff',
    border: darkMode ? '#1e1e2e' : '#dddde8',
    border2: darkMode ? '#252535' : '#ccccdd',
    text: darkMode ? '#f0f0f5' : '#0a0a14',
    text2: darkMode ? '#888899' : '#555566',
    text3: darkMode ? '#444455' : '#999aaa',
    header: darkMode ? '#0e0014' : '#ffffff',
    headerBorder: accent,
    setDark,
    setAccent,
    setCustom,
    setFontScale,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}