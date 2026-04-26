import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
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
  const { userProfile, loadingProfile } = useApp();

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

  if (userProfile && !userProfile.onboarding_completed) {
    return <OnboardingScreen onComplete={() => {}} />;
  }
  return (
    <SocialProvider>
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>
        {Screen ? <Screen navigate={setActive} session={session} /> : null}
      </View>
      <View style={{ backgroundColor: t.dark ? '#07070e' : '#ffffff', borderTopWidth: 1, borderTopColor: t.border }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 24 }}
        >
          {Object.keys(SCREENS).map(key => (
            <TouchableOpacity
              key={key}
              onPress={() => setActive(key)}
              style={{
                paddingHorizontal: 20,
                paddingTop: 10,
                paddingBottom: 6,
                alignItems: 'center',
                borderBottomWidth: 2.5,
                borderBottomColor: active === key ? t.accent : 'transparent',
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: active === key ? t.accent : t.text3,
                  fontSize: t.fs(12),
                  fontWeight: '700',
                  letterSpacing: 1,
                }}
              >
                {TAB_LABELS[key]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
    </SocialProvider>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
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
  );
}