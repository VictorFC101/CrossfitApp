import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import SplashAnimated from './SplashAnimated';
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
import OnboardingScreen from './screens/OnboardingScreen';
import { useApp } from './AppContext';

const SCREENS = {
  PROGRAM: HomeScreen,
  WOD: WodScreen,
  TIMER: TimerScreen,
  RM: RMScreen,
  HISTORIAL: HistorialScreen,
  SOCIAL: SocialScreen,
  PERFIL: ProfileScreen,
};

const TAB_ICONS  = { PROGRAM:'🏠', WOD:'⚡', TIMER:'⏱', RM:'💪', HISTORIAL:'📋', SOCIAL:'👥', PERFIL:'👤' };
const TAB_LABELS = { PROGRAM:'PROG', WOD:'WOD', TIMER:'TIMER', RM:'1RM', HISTORIAL:'HIST', SOCIAL:'SOCIAL', PERFIL:'PERFIL' };

function AppInner() {
  const [active, setActive] = useState('PROGRAM');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { userProfile, loadingProfile, onboardingCompleted } = useApp();

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

  if (loading || (session && loadingProfile)) {
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

  if (userProfile && !onboardingCompleted) {
    return <OnboardingScreen onComplete={() => {}} />;
  }

  return (
    <SocialProvider>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <StatusBar style={t.dark ? 'light' : 'dark'} />

        {/* ── BARRA DE NAVEGACIÓN SUPERIOR ── */}
        <View style={{
          backgroundColor: t.header,
          paddingTop: insets.top,
          borderBottomWidth: 1,
          borderBottomColor: t.border,
          flexDirection: 'row',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: t.dark ? 0.4 : 0.08,
          shadowRadius: 6,
          elevation: 6,
          zIndex: 10,
        }}>
          {Object.keys(SCREENS).map(key => {
            const isActive = active === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setActive(key)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingTop: 10,
                  paddingBottom: 8,
                  borderBottomWidth: 2.5,
                  borderBottomColor: isActive ? t.accent : 'transparent',
                }}
              >
                <Text style={{ fontSize: 18, lineHeight: 22 }}>{TAB_ICONS[key]}</Text>
                <Text style={{
                  fontSize: 7,
                  fontWeight: '800',
                  letterSpacing: 0.3,
                  marginTop: 2,
                  color: isActive ? t.accent : t.text3,
                }}>
                  {TAB_LABELS[key]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── CONTENIDO ── */}
        <View style={{ flex: 1 }}>
          {Object.entries(SCREENS).map(([key, ScreenComp]) => (
            <View key={key} style={{ flex: 1, display: active === key ? 'flex' : 'none' }}>
              <ScreenComp navigate={setActive} session={session} />
            </View>
          ))}
        </View>
      </View>
    </SocialProvider>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <ThemeProvider>
          <ProgramProvider>
            <NotificationProvider>
              <AppProvider>
                <AppInner />
              </AppProvider>
            </NotificationProvider>
          </ProgramProvider>
        </ThemeProvider>

        {showSplash && (
          <SplashAnimated onFinish={() => setShowSplash(false)} />
        )}
      </View>
    </SafeAreaProvider>
  );
}
