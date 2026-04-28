import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [rms, setRms] = useState({});
  const [resultados, setResultados] = useState({});
  const [wodsLibres, setWodsLibres] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [partnerResultados, setPartnerResultados] = useState({});
  const [partnerRequest, setPartnerRequest] = useState(null);     // solicitud recibida pendiente
  const [sentPartnerRequest, setSentPartnerRequest] = useState(null); // solicitud enviada pendiente

  const appStateRef = useRef(AppState.currentState);
  const partnerChannelRef = useRef(null);

  useEffect(() => {
    loadLocalData();
    loadUserProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) loadUserProfile(session.user.id);
      else setUserProfile(null);
    });

    // Refrescar perfil (y pareja) cuando la app vuelve al primer plano
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current !== 'active' && nextState === 'active') {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) loadUserProfile(user.id);
        });
      }
      appStateRef.current = nextState;
    });

    return () => {
      subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  const loadLocalData = async () => {
    try {
      const storedRms = await AsyncStorage.getItem('user_rms');
      const storedResultados = await AsyncStorage.getItem('user_resultados');
      const storedWods = await AsyncStorage.getItem('user_wods_libres');
      const storedOnboarding = await AsyncStorage.getItem('@crossfit_onboarding_done');
      if (storedRms) setRms(JSON.parse(storedRms));
      if (storedResultados) setResultados(JSON.parse(storedResultados));
      if (storedWods) setWodsLibres(JSON.parse(storedWods));
      if (storedOnboarding === '1') setOnboardingCompleted(true);
    } catch (e) {}
  };

  const loadUserProfile = async (userId) => {
    setLoadingProfile(true);
    try {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id;
      }
      if (!uid) { setLoadingProfile(false); return; }

      const { data } = await supabase
        .from('usuarios_publicos')
        .select('*')
        .eq('id', uid)
        .single();

      // Traer campos privados que la vista pública no expone
      const { data: privateData } = await supabase
        .from('usuarios')
        .select('onboarding_completed, genero, push_token, box_id, partner_id')
        .eq('id', uid)
        .single();

      // Si Supabase no tiene onboarding_completed, usar AsyncStorage como fuente de verdad local
      let onboardingDone = privateData?.onboarding_completed;
      if (!onboardingDone) {
        const local = await AsyncStorage.getItem('@crossfit_onboarding_done');
        if (local === '1') {
          onboardingDone = true;
          // Reparar en Supabase en background
          if (uid) supabase.from('usuarios').update({ onboarding_completed: true }).eq('id', uid).then(() => {});
        }
      }
      if (data) setUserProfile({ ...data, ...(privateData || {}), onboarding_completed: onboardingDone });

      // Cargar perfil y resultados del partner
      const partnerId = privateData?.partner_id;
      if (partnerId) {
        const { data: pData } = await supabase.rpc('get_user_public_info', { p_user_id: partnerId });
        const pProfile = pData?.[0] || null;
        if (pProfile) setPartnerProfile(pProfile);

        const { data: pRes } = await supabase
          .from('resultados')
          .select('dia, resultado, notas, rx')
          .eq('user_id', partnerId);
        if (pRes?.length) {
          const pMap = {};
          pRes.forEach(r => { pMap[r.dia] = { resultado: r.resultado, notas: r.notas, rx: r.rx !== false }; });
          setPartnerResultados(pMap);
        } else {
          setPartnerResultados({});
        }
      } else if (privateData !== null) {
        // Solo limpiar si el SELECT de usuarios tuvo éxito y partner_id es explícitamente null
        setPartnerProfile(null);
        setPartnerResultados({});
      }

      // Cargar solicitudes de pareja pendientes
      const { data: solicitudes } = await supabase
        .from('solicitudes_partner')
        .select('*, solicitante:solicitante_id(id, nombre), receptor:receptor_id(id, nombre)')
        .or(`solicitante_id.eq.${uid},receptor_id.eq.${uid}`)
        .eq('status', 'pendiente');
      if (solicitudes?.length) {
        const recibida = solicitudes.find(s => s.receptor_id === uid);
        const enviada  = solicitudes.find(s => s.solicitante_id === uid);
        setPartnerRequest(recibida || null);
        setSentPartnerRequest(enviada || null);
      } else {
        setPartnerRequest(null);
        setSentPartnerRequest(null);
      }

      // Cargar RMs desde Supabase (fuente de verdad)
      const { data: rmsData } = await supabase
        .from('rms')
        .select('movimiento, peso')
        .eq('user_id', uid);
      if (rmsData?.length) {
        const rmsMap = {};
        rmsData.forEach(r => { rmsMap[r.movimiento] = String(r.peso); });
        setRms(prev => ({ ...prev, ...rmsMap }));
        await AsyncStorage.setItem('user_rms', JSON.stringify({ ...rmsMap }));
      }

      // Cargar resultados desde Supabase (fuente de verdad)
      const { data: resData } = await supabase
        .from('resultados')
        .select('dia, resultado, notas, fecha, rx, adaptacion')
        .eq('user_id', uid);
      if (resData?.length) {
        const resMap = {};
        resData.forEach(r => { resMap[r.dia] = { resultado: r.resultado, notas: r.notas, fecha: r.fecha, rx: r.rx !== false, adaptacion: r.adaptacion || null }; });
        setResultados(prev => ({ ...prev, ...resMap }));
        await AsyncStorage.setItem('user_resultados', JSON.stringify({ ...resMap }));
      }

      // Canal Realtime: detectar cuando la solicitud enviada es aceptada
      if (partnerChannelRef.current) {
        supabase.removeChannel(partnerChannelRef.current);
        partnerChannelRef.current = null;
      }
      const channel = supabase
        .channel(`solicitud-partner-${uid}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'solicitudes_partner',
          filter: `solicitante_id=eq.${uid}`,
        }, (payload) => {
          if (payload.new?.status === 'aceptada') {
            loadUserProfile(uid);
          }
        })
        .subscribe();
      partnerChannelRef.current = channel;
    } catch (e) {}
    finally { setLoadingProfile(false); }
  };

  const sendPartnerRequest = async (friendId, friendName) => {
    try {
      if (!userProfile?.id || friendId === userProfile.id) return { success: false };
      const { data: inserted, error } = await supabase
        .from('solicitudes_partner')
        .insert({ solicitante_id: userProfile.id, receptor_id: friendId })
        .select()
        .single();
      if (error) throw error;
      // Actualización optimista — UI cambia de inmediato
      setSentPartnerRequest({
        id: inserted.id,
        receptor: { id: friendId, nombre: friendName || 'Tu solicitud' },
        status: 'pendiente',
      });
      // Notificación in-app (background)
      supabase.from('notificaciones').insert({
        user_id: friendId,
        tipo: 'solicitud_partner',
        titulo: '🤝 Solicitud de pareja',
        mensaje: `${userProfile.nombre || 'Alguien'} quiere entrenar contigo como pareja`,
        data: { from_user_id: userProfile.id },
      }).then(() => {});
      // Push notification (background)
      supabase.from('usuarios').select('push_token').eq('id', friendId).single().then(({ data: dest }) => {
        if (dest?.push_token) {
          fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: dest.push_token,
              title: '🤝 Solicitud de pareja',
              body: `${userProfile.nombre || 'Alguien'} quiere entrenar contigo como pareja`,
              data: { type: 'partner_request', from: userProfile.id },
            }),
          });
        }
      });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const acceptPartnerRequest = async (requestId) => {
    // Optimista: limpiar ambas solicitudes y mostrar pareja inmediatamente
    const solicitante = partnerRequest?.solicitante;
    setPartnerRequest(null);
    setSentPartnerRequest(null);
    if (solicitante) setPartnerProfile({ id: solicitante.id, nombre: solicitante.nombre, avatar_url: null });
    try {
      const { error } = await supabase.rpc('accept_partner_request', { p_request_id: requestId });
      if (error) throw error;
      await loadUserProfile(userProfile.id); // sincronizar con el estado real
      return { success: true };
    } catch (e) {
      setPartnerProfile(null);
      await loadUserProfile(userProfile.id);
      return { success: false, error: e.message };
    }
  };

  const rejectPartnerRequest = async (requestId) => {
    setPartnerRequest(null); // optimista
    try {
      await supabase.from('solicitudes_partner').update({ status: 'rechazada' }).eq('id', requestId);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const cancelPartnerRequest = async (requestId) => {
    setSentPartnerRequest(null); // optimista
    try {
      await supabase.from('solicitudes_partner').update({ status: 'rechazada' }).eq('id', requestId);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const removePartner = async () => {
    try {
      await supabase.rpc('remove_partner');
      setPartnerProfile(null);
      setPartnerResultados({});
      setUserProfile(prev => ({ ...prev, partner_id: null }));
    } catch (e) {}
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('@crossfit_onboarding_done', '1').catch(() => {});
    setOnboardingCompleted(true);
    setUserProfile(prev => prev ? { ...prev, onboarding_completed: true } : prev);
    try {
      if (userProfile?.id) {
        await supabase.from('usuarios').update({ onboarding_completed: true }).eq('id', userProfile.id);
      }
    } catch (e) {}
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setRms({});
      setResultados({});
      setWodsLibres([]);
      setUserProfile(null);
      setPartnerProfile(null);
      setPartnerResultados({});
      setPartnerRequest(null);
      setSentPartnerRequest(null);
      await AsyncStorage.multiRemove(['user_rms', 'user_resultados', 'user_wods_libres', 'user_nombre', 'user_genero']);
    } catch (e) {}
  };

  const saveRM = async (key, val) => {
    const updated = { ...rms, [key]: val };
    setRms(updated);
    try {
      await AsyncStorage.setItem('user_rms', JSON.stringify(updated));
      // Sincronizar con Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const pesoNum = parseFloat(val);
        const fechaISO = new Date().toISOString();
        await supabase.from('rms').upsert({
          user_id: user.id,
          movimiento: key,
          peso: pesoNum,
          fecha: fechaISO,
        });
        // Historial acumulativo (nunca se sobreescribe)
        await supabase.from('rms_historial').insert({
          user_id: user.id,
          movimiento: key,
          peso: pesoNum,
          fecha: fechaISO,
        });
        // Feed social — reemplazar entrada anterior del mismo movimiento
        await supabase.from('feed_actividad')
          .delete()
          .eq('user_id', user.id)
          .eq('tipo', 'rm_nuevo')
          .filter('data->>movimiento', 'eq', key);
        await supabase.from('feed_actividad').insert({
          user_id: user.id,
          tipo: 'rm_nuevo',
          data: { movimiento: key, peso: pesoNum },
        });
      }
    } catch (e) {}
  };

  const saveResultado = async (key, data) => {
    const updated = { ...resultados, [key]: data };
    setResultados(updated);
    try {
      await AsyncStorage.setItem('user_resultados', JSON.stringify(updated));
      // Sincronizar con Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('resultados').upsert({
          user_id: user.id,
          dia: key,
          resultado: data.resultado,
          notas: data.notas,
          fecha: data.fecha,
          rx: data.rx !== false,
          adaptacion: data.adaptacion || null,
        });
        // Publicar en feed social — eliminar entrada anterior del mismo día antes de insertar
        await supabase.from('feed_actividad')
          .delete()
          .eq('user_id', user.id)
          .eq('tipo', 'wod_completado')
          .filter('data->>dia', 'eq', key);
        await supabase.from('feed_actividad').insert({
          user_id: user.id,
          tipo: 'wod_completado',
          data: { dia: key, resultado: data.resultado, notas: data.notas, rx: data.rx !== false },
        });
      }
    } catch (e) {}
  };

  const saveWodLibre = async (wod) => {
    const updated = [wod, ...wodsLibres];
    setWodsLibres(updated);
    try {
      await AsyncStorage.setItem('user_wods_libres', JSON.stringify(updated));
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('wods_libres').upsert({
          id: wod.id,
          user_id: user.id,
          nombre: wod.nombre,
          tipo: wod.tipo,
          duracion: wod.duracion,
          movimientos: wod.movimientos,
          resultado: wod.resultado,
          notas: wod.notas,
          publico: true,
          fecha: wod.fecha,
        });
        await supabase.from('feed_actividad').insert({
          user_id: user.id,
          tipo: 'wod_libre_completado',
          data: { wod_id: wod.id, nombre: wod.nombre, resultado: wod.resultado },
        });
      }
    } catch (e) {}
  };

  const deleteWodLibre = async (id) => {
    const updated = wodsLibres.filter(w => w.id !== id);
    setWodsLibres(updated);
    try {
      await AsyncStorage.setItem('user_wods_libres', JSON.stringify(updated));
      await supabase.from('wods_libres').delete().eq('id', id);
    } catch (e) {}
  };

  // Helpers de rol
  const isAdmin = userProfile?.rol === 'admin';
  const isCoach = userProfile?.rol === 'coach' || userProfile?.rol === 'admin';
  const isAtleta = userProfile?.rol === 'atleta';

  return (
    <AppContext.Provider value={{
      rms, saveRM,
      resultados, saveResultado,
      wodsLibres, saveWodLibre, deleteWodLibre,
      userProfile, loadingProfile, loadUserProfile, onboardingCompleted,
      partnerProfile, partnerResultados,
      partnerRequest, sentPartnerRequest,
      sendPartnerRequest, acceptPartnerRequest, rejectPartnerRequest, cancelPartnerRequest, removePartner,
      isAdmin, isCoach, isAtleta,
      logout, completeOnboarding,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}