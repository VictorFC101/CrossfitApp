import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { AppProvider } from './AppContext';
import { ThemeProvider, useTheme } from './ThemeContext';
import { ProgramProvider } from './ProgramContext';
import { NotificationProvider } from './NotificationContext';
import { SocialProvider } from './SocialContext';
import { supabase } from './supabase';

import HomeScreen from './screens/HomeScreen';
import WodScreen from './screens/WodScreen';
import TimerScreen from './screens/TimerScreen';
import RMScreen from './screens/RMScreen';
import ProfileScreen from './screens/ProfileScreen';
import HistorialScreen from './screens/HistorialScreen';
import SocialScreen from './screens/SocialScreen';
import AuthScreen from './screens/AuthScreen';

const SCREENS = {
  PROGRAM: HomeScreen,
  WOD: WodScreen,
  TIMER: TimerScreen,
  RM: RMScreen,
  HISTORIAL: HistorialScreen,
  SOCIAL: SocialScreen,
  PERFIL: ProfileScreen,
};

const TAB_LABELS = {
  PROGRAM: 'PROGRAM',
  WOD: 'WOD',
  TIMER: 'TIMER',
  RM: '1RM',
  HISTORIAL: 'HISTORIAL',
  SOCIAL: 'SOCIAL',
  PERFIL: 'PERFIL',
};

function AppInner() {
  const [active, setActive] = useState('PROGRAM');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const Screen = SCREENS[active];
  const t = useTheme();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.accent} size="large" />
        <Text style={{ color: t.text3, marginTop: 16, fontSize: t.fs(12), letterSpacing: 2 }}>CARGANDO...</Text>
      </View>
    );
  }

  if (!session) {
    return <AuthScreen onAuth={() => {}} />;
  }
  return (
    <SocialProvider>
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>
        {Screen ? <Screen navigate={setActive} session={session} /> : null}
      </View>
      <View style={{ flexDirection: 'row', backgroundColor: t.dark ? '#07070e' : '#ffffff', borderTopWidth: 1, borderTopColor: t.border, paddingBottom: 24, paddingTop: 10 }}>
        {Object.keys(SCREENS).map(key => (
          <TouchableOpacity key={key} onPress={() => setActive(key)}
            style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: active === key ? t.accent : t.text3, fontSize: t.fs(8), fontWeight: '700', letterSpacing: 0.3 }}>
              {TAB_LABELS[key]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
    </SocialProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ProgramProvider>
        <NotificationProvider>
          <AppProvider>
            <AppInner />
          </AppProvider>
        </NotificationProvider>
      </ProgramProvider>
    </ThemeProvider>
  );
}