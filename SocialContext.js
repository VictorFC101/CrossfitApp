import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

const SocialContext = createContext();

const TIPO_ICONS = {
  wod_completado: '⚡',
  rm_nuevo: '🏋️',
  programa_iniciado: '📋',
  racha: '🔥',
  wod_libre_completado: '🔓',
};

const TIPO_LABELS = {
  wod_completado: 'completó un WOD',
  rm_nuevo: 'marcó un nuevo 1RM',
  programa_iniciado: 'inició un programa',
  racha: 'lleva días consecutivos',
  wod_libre_completado: 'completó un WOD libre',
};

export function SocialProvider({ children }) {
  const [feed, setFeed] = useState([]);
  const [amistades, setAmistades] = useState([]);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [solicitudesEnviadas, setSolicitudesEnviadas] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [myUserId, setMyUserId] = useState(null);
  const [myBoxId, setMyBoxId] = useState(null);
  const realtimeSub = useRef(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setMyUserId(session.user.id);
        try {
          const { data: profile } = await supabase
            .from('usuarios')
            .select('box_id')
            .eq('id', session.user.id)
            .single();
          if (profile?.box_id) setMyBoxId(profile.box_id);
        } catch (e) {}
        await loadFeed();
        await loadAmistades(session.user.id);
      }
    };
    init();
    return () => {
      if (realtimeSub.current) realtimeSub.current.unsubscribe();
    };
  }, []);

  const loadFeed = async () => {
    setLoadingFeed(true);
    try {
      const { data } = await supabase
        .from('feed_social')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        const ids = data.map(f => f.id);
        const [{ data: reacciones }, { data: comentarios }] = await Promise.all([
          supabase.from('reacciones').select('*').in('target_id', ids).eq('target_tipo', 'feed'),
          supabase.from('comentarios').select('*, autor:user_id(id, nombre)').in('target_id', ids).eq('target_tipo', 'feed').order('created_at', { ascending: true }),
        ]);
        const feedEnriquecido = data.map(item => ({
          ...item,
          reacciones: reacciones?.filter(r => r.target_id === item.id) || [],
          comentarios: comentarios?.filter(c => c.target_id === item.id) || [],
        }));
        setFeed(feedEnriquecido);
      }
    } catch (e) {}
    finally { setLoadingFeed(false); }
  };

  const loadAmistades = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('amistades')
        .select('*, solicitante:user_id(id, nombre, email), receptor:friend_id(id, nombre, email)')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
      if (error) throw error;
      if (data) {
        setAmistades(data.filter(a => a.status === 'aceptada'));
        setSolicitudesPendientes(data.filter(a =>
          a.status === 'pendiente' && a.friend_id === userId
        ));
        setSolicitudesEnviadas(data.filter(a =>
          a.status === 'pendiente' && a.user_id === userId
        ).map(a => a.friend_id));
      }
    } catch (e) { console.log('loadAmistades ERROR:', e.message); }
  };

  const enviarSolicitud = async (friendId) => {
    if (!myUserId || friendId === myUserId) return { success: false, error: 'No válido' };
    if (solicitudesEnviadas.includes(friendId)) return { success: false, error: 'Solicitud ya enviada' };
    if (esAmigo(friendId)) return { success: false, error: 'Ya sois amigos' };
    try {
      const { error } = await supabase.from('amistades').insert({
        user_id: myUserId,
        friend_id: friendId,
        status: 'pendiente',
      });
      if (error) throw error;
      setSolicitudesEnviadas(prev => [...prev, friendId]);
      await supabase.from('notificaciones').insert({
        user_id: friendId,
        tipo: 'solicitud_amistad',
        titulo: '👋 Nueva solicitud de amistad',
        mensaje: 'Alguien quiere conectar contigo',
        data: { from_user_id: myUserId },
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const aceptarSolicitud = async (id) => {
    try {
      const { error } = await supabase.from('amistades').update({ status: 'aceptada' }).eq('id', id);
      if (error) throw error;
      await loadAmistades(myUserId);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const rechazarSolicitud = async (id) => {
    try {
      const { error } = await supabase.from('amistades').update({ status: 'rechazada' }).eq('id', id);
      if (error) throw error;
      await loadAmistades(myUserId);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const eliminarAmistad = async (id) => {
    try {
      await supabase.from('amistades').delete().eq('id', id);
      await loadAmistades(myUserId);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const esAmigo = (userId) => amistades.some(a =>
    (a.user_id === myUserId && a.friend_id === userId) ||
    (a.friend_id === myUserId && a.user_id === userId)
  );

  const getAmigoData = (feedItem) => {
    const esAmigo_ = esAmigo(feedItem.user_id);
    const isMe = feedItem.user_id === myUserId;
    return {
      nombre: isMe || esAmigo_
        ? feedItem.user_nombre || 'Sin nombre'
        : 'Atleta Anónimo',
      box: feedItem.box_nombre || '',
      esAmigo: esAmigo_,
      mismoBox: feedItem.user_box_id && feedItem.user_box_id === myBoxId,
      isMe,
    };
  };

  const publicarActividad = async (tipo, data) => {
    if (!myUserId) return;
    try {
      await supabase.from('feed_actividad').insert({ user_id: myUserId, tipo, data });
      if (tipo === 'wod_completado' || tipo === 'wod_libre_completado') {
        await checkAndUpdateRacha();
      }
    } catch (e) {}
  };

  const checkAndUpdateRacha = async () => {
    try {
      const { data } = await supabase
        .from('feed_actividad')
        .select('created_at')
        .eq('user_id', myUserId)
        .in('tipo', ['wod_completado', 'wod_libre_completado'])
        .order('created_at', { ascending: false })
        .limit(30);
      if (!data?.length) return;
      let racha = 1;
      let lastDate = new Date(data[0].created_at);
      lastDate.setHours(0, 0, 0, 0);
      for (let i = 1; i < data.length; i++) {
        const d = new Date(data[i].created_at);
        d.setHours(0, 0, 0, 0);
        const diff = (lastDate - d) / (1000 * 60 * 60 * 24);
        if (diff === 1) { racha++; lastDate = d; }
        else break;
      }
      if (racha > 1 && (racha % 5 === 0 || racha === 3 || racha === 7)) {
        await supabase.from('feed_actividad').insert({
          user_id: myUserId,
          tipo: 'racha',
          data: { dias: racha },
        });
      }
    } catch (e) {}
  };

  const refreshFeed = () => loadFeed();

  return (
    <SocialContext.Provider value={{
      feed, loadingFeed, refreshFeed,
      amistades, solicitudesPendientes, solicitudesEnviadas,
      myUserId, myBoxId,
      enviarSolicitud, aceptarSolicitud,
      rechazarSolicitud, eliminarAmistad,
      esAmigo, getAmigoData,
      publicarActividad,
      TIPO_ICONS, TIPO_LABELS,
    }}>
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial() {
  return useContext(SocialContext);
}