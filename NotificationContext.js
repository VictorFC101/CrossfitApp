import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingProgram, setPendingProgram] = useState(null);

  useEffect(() => {
    loadNotifications();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        loadNotifications(session.user.id);
        subscribeToNotifications(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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
      notifications,
      unreadCount,
      pendingProgram,
      loadNotifications,
      markAsRead,
      markAllAsRead,
      clearPendingProgram,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}