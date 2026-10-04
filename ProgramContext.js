import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';
import { plan as legacyDefaultPlan } from './data';
import { parseDateFromDay } from './dateUtils';
import { supabase } from './supabase';
import { getProgramDateRange, getActiveProgram, enrichProgram, isNetworkError, rowToProgram } from './programLogic';

const ProgramContext = createContext();

export function ProgramProvider({ children }) {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false); // último refresco falló por red
  const hydratedRef = useRef(false);
  const channelRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const appStateSubRef = useRef(null);

  useEffect(() => {
    loadPrograms();

    // AppState: recargar al volver al primer plano
    appStateSubRef.current = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current !== 'active' && nextState === 'active') {
        loadPrograms();
      }
      appStateRef.current = nextState;
    });

    // Realtime: esperar a que auth esté lista antes de suscribir
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        initRealtime(session.user.id);
      } else {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      }
    });

    // Intentar también con sesión actual (por si ya estaba autenticado)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) initRealtime(session.user.id);
    });

    return () => {
      authSub.unsubscribe();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (appStateSubRef.current) appStateSubRef.current.remove();
    };
  }, []);

  const initRealtime = (uid) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase
      .channel(`programas-realtime-${uid}`)
      // Cambio en cualquier programa público → recargar para todos
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'programas',
      }, () => { loadPrograms(); })
      // Nueva asignación específica para este usuario
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'asignaciones',
        filter: `user_id=eq.${uid}`,
      }, () => { loadPrograms(); })
      .subscribe();
  };

  const readCachedPrograms = async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROGRAMS);
    let allPrograms = stored ? JSON.parse(stored) : [];

    // Migración: eliminar el programa por defecto antiguo (Marzo 2026)
    if (allPrograms.some(p => p.id === 'default' && p.weeks?.[0]?.days?.[0]?.day?.includes('30 Mar'))) {
      allPrograms = allPrograms.filter(p => p.id !== 'default');
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROGRAMS, JSON.stringify(allPrograms));
    }
    return allPrograms;
  };

  const loadPrograms = async () => {
    // 1) Caché primero (solo la primera vez): el WOD se pinta al instante, sin esperar a la red
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      try {
        const cached = await readCachedPrograms();
        if (cached.length) {
          setPrograms(cached.map(enrichProgram));
          setLoading(false);
        }
      } catch (_) {}
    }

    // 2) Supabase como fuente de verdad: refresca en segundo plano
    try {
      const { data: remoteRows, error } = await supabase
        .from('programas')
        .select('id, name, data')
        .eq('publico', true);
      if (error) throw error;
      setOffline(false);

      if (remoteRows?.length) {
        const allPrograms = remoteRows.map(rowToProgram);
        await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROGRAMS, JSON.stringify(allPrograms));
        setPrograms(allPrograms.map(enrichProgram));
        return;
      }

      // Sin programas en Supabase aún: usar caché local
      setPrograms((await readCachedPrograms()).map(enrichProgram));
    } catch (e) {
      // Error de red — se mantiene lo que ya hay en pantalla (o la caché)
      if (isNetworkError(e)) setOffline(true);
      try {
        setPrograms((await readCachedPrograms()).map(enrichProgram));
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  };

  const addProgram = async (newProgram) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROGRAMS);
      const existing = stored ? JSON.parse(stored) : [];

      // Verificar que no solape con programas existentes
      const { start: newStart, end: newEnd } = getProgramDateRange(newProgram);
      const overlap = existing.find(p => {
        const { start, end } = getProgramDateRange(p);
        if (!start || !end || !newStart || !newEnd) return false;
        return newStart <= end && newEnd >= start;
      });

      if (overlap) {
        const { start, end } = getProgramDateRange(overlap);
        const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        throw new Error(
          `Conflicto con programa existente: ${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]}`
        );
      }

      const withId = { ...newProgram, id: Date.now().toString() };
      const { start, end } = getProgramDateRange(withId);

      // Guardar en Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from('programas').upsert({
          id: withId.id,
          name: withId.name || null,
          data: withId,
          start_date: start?.toISOString() || null,
          end_date: end?.toISOString() || null,
          status: 'activo',
          publico: true,
          coach_id: user.id,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      // Guardar en AsyncStorage como caché
      const updated = [...existing, withId];
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROGRAMS, JSON.stringify(updated));
      setPrograms(updated.map(enrichProgram));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const deleteProgram = async (id) => {
    if (id === 'default') return { success: false, error: 'No puedes eliminar el programa base.' };
    try {
      // Eliminar de Supabase
      await supabase.from('programas').delete().eq('id', id);

      // Eliminar de AsyncStorage
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROGRAMS);
      const existing = stored ? JSON.parse(stored) : [];
      const updated = existing.filter(p => p.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROGRAMS, JSON.stringify(updated));
      setPrograms(updated.map(enrichProgram));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const updateProgram = async (id, updatedProgram) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROGRAMS);
      const existing = stored ? JSON.parse(stored) : [];
      const updated = existing.map(p => p.id === id ? updatedProgram : p);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { start, end } = getProgramDateRange(updatedProgram);
        const { error } = await supabase.from('programas').update({
          data: updatedProgram,
          start_date: start?.toISOString() || null,
          end_date: end?.toISOString() || null,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
        if (error) throw error;
      }

      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROGRAMS, JSON.stringify(updated));
      setPrograms(updated.map(enrichProgram));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const replaceDefaultProgram = async (newPlan) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROGRAMS);
      const existing = stored ? JSON.parse(stored) : [];
      const updated = existing.map(p =>
        p.id === 'default' ? { ...newPlan, id: 'default' } : p
      );
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROGRAMS, JSON.stringify(updated));
      setPrograms(updated.map(enrichProgram));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  // Programa activo calculado automáticamente
  const activeProgram = programs.length > 0 ? getActiveProgram(programs) : null;

  // Programas ordenados por fecha
  const sortedPrograms = [...programs].sort((a, b) => {
    const aStart = a._meta?.start?.getTime() || 0;
    const bStart = b._meta?.start?.getTime() || 0;
    return bStart - aStart; // más reciente primero
  });

  return (
    <ProgramContext.Provider value={{
      programs: sortedPrograms,
      activeProgram,
      loading,
      offline,
      addProgram,
      deleteProgram,
      replaceDefaultProgram,
      reload: loadPrograms,
    }}>
      {children}
    </ProgramContext.Provider>
  );
}

export function useProgram() {
  return useContext(ProgramContext);
}

export { getProgramDateRange, enrichProgram };
