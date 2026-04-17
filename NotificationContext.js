import { createContext, useContext, useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const NotificationContext = createContext();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const REMINDER_ID = 'wod-daily-reminder';
export const REMINDER_HOURS = [6, 7, 8, 9, 17, 18, 19];

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingProgram, setPendingProgram] = useState(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(7);
  const [pushToken, setPushToken] = useState(null);

  useEffect(() => {
    registerForPushNotifications();
    loadReminderSettings();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        loadNotifications(session.user.id);
        subscribeToNotifications(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const registerForPushNotifications = async () => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Wodly',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      }
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;
      setPushToken(token);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('usuarios').update({ push_token: token }).eq('id', user.id);
      }
    } catch (e) {}
  };

  const loadReminderSettings = async () => {
    try {
      const enabled = await AsyncStorage.getItem('@crossfit_reminder_enabled');
      const hour = await AsyncStorage.getItem('@crossfit_reminder_hour');
      if (enabled === 'true') setReminderEnabled(true);
      if (hour) setReminderHour(parseInt(hour));
    } catch (e) {}
  };

  const scheduleWodReminder = async (hour) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
      await Notifications.scheduleNotificationAsync({
        identifier: REMINDER_ID,
        content: {
          title: '⚡ WOD del día',
          body: 'Tu entrenamiento de hoy te está esperando. ¡Vamos!',
          sound: true,
        },
        trigger: { hour, minute: 0, repeats: true },
      });
      setReminderEnabled(true);
      setReminderHour(hour);
      await AsyncStorage.setItem('@crossfit_reminder_enabled', 'true');
      await AsyncStorage.setItem('@crossfit_reminder_hour', String(hour));
    } catch (e) {}
  };

  const cancelWodReminder = async () => {
    try {
      await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
      setReminderEnabled(false);
      await AsyncStorage.setItem('@crossfit_reminder_enabled', 'false');
    } catch (e) {}
  };

  let realtimeSub = null;

  const subscribeToNotifications = (userId) => {
    if (realtimeSub) realtimeSub.unsubscribe();
    realtimeSub = supabase
      .channel('notificaciones_' + userId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones',
        filter: `user_id=eq.${userId}`,
      }, payload => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
        if (payload.new.tipo === 'programa_asignado') {
          setPendingProgram(payload.new.data);
        }
      })
      .subscribe();
  };

  const loadNotifications = async (userId) => {
    try {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id;
      }
      if (!uid) return;

      const { data } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.leida).length);
        const pending = data.find(n => n.tipo === 'programa_asignado' && !n.leida);
        if (pending) setPendingProgram(pending.data);
      }
    } catch (e) {}
  };

  const markAsRead = async (id) => {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notificaciones').update({ leida: true }).eq('user_id', user.id);
    setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
    setUnreadCount(0);
  };

  const clearPendingProgram = () => setPendingProgram(null);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, pendingProgram,
      loadNotifications, markAsRead, markAllAsRead, clearPendingProgram,
      reminderEnabled, reminderHour, scheduleWodReminder, cancelWodReminder,
      pushToken, REMINDER_HOURS,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
