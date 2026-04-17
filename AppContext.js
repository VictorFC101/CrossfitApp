import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [rms, setRms] = useState({});
  const [resultados, setResultados] = useState({});
  const [wodsLibres, setWodsLibres] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    loadLocalData();
    loadUserProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) loadUserProfile(session.user.id);
      else setUserProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadLocalData = async () => {
    try {
      const storedRms = await AsyncStorage.getItem('user_rms');
      const storedResultados = await AsyncStorage.getItem('user_resultados');
      const storedWods = await AsyncStorage.getItem('user_wods_libres');
      if (storedRms) setRms(JSON.parse(storedRms));
      if (storedResultados) setResultados(JSON.parse(storedResultados));
      if (storedWods) setWodsLibres(JSON.parse(storedWods));
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
        .select('onboarding_completed, genero, push_token, box_id')
        .eq('id', uid)
        .single();

      if (data) setUserProfile({ ...data, ...(privateData || {}) });

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
        .select('dia, resultado, notas, fecha')
        .eq('user_id', uid);
      if (resData?.length) {
        const resMap = {};
        resData.forEach(r => { resMap[r.dia] = { resultado: r.resultado, notas: r.notas, fecha: r.fecha }; });
        setResultados(prev => ({ ...prev, ...resMap }));
        await AsyncStorage.setItem('user_resultados', JSON.stringify({ ...resMap }));
      }
    } catch (e) {}
    finally { setLoadingProfile(false); }
  };

  const completeOnboarding = async () => {
    try {
      if (userProfile?.id) {
        await supabase.from('usuarios').update({ onboarding_completed: true }).eq('id', userProfile.id);
        setUserProfile(prev => ({ ...prev, onboarding_completed: true }));
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
        await supabase.from('rms').upsert({
          user_id: user.id,
          movimiento: key,
          peso: parseFloat(val),
          fecha: new Date().toISOString(),
        });
        // Feed social
        await supabase.from('feed_actividad').insert({
          user_id: user.id,
          tipo: 'rm_nuevo',
          data: { movimiento: key, peso: parseFloat(val) },
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
        });
        // Publicar en feed social
        await supabase.from('feed_actividad').insert({
          user_id: user.id,
          tipo: 'wod_completado',
          data: { dia: key, resultado: data.resultado, notas: data.notas },
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
      userProfile, loadingProfile, loadUserProfile,
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