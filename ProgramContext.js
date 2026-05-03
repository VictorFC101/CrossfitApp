import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { plan as legacyDefaultPlan } from './data';
import { parseDateFromDay } from './dateUtils';
import { supabase } from './supabase';

const ProgramContext = createContext();

// Obtener fecha de inicio y fin de un programa
function getProgramDateRange(program) {
  const allDays = program.weeks.flatMap(w => w.days);
  const dates = allDays.map(d => parseDateFromDay(d.day)).filter(Boolean);
  if (!dates.length) return { start: null, end: null };
  return {
    start: new Date(Math.min(...dates.map(d => d.getTime()))),
    end: new Date(Math.max(...dates.map(d => d.getTime())))
  };
}

// Determinar qué programa corresponde a hoy
function getActiveProgram(programs) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  // 1. Buscar programa cuyo rango incluye hoy exactamente
  for (const p of programs) {
    const { start, end } = getProgramDateRange(p);
    if (start && end && today >= start && today <= end) return p;
  }

  // 2. Si no hay ninguno activo hoy, buscar el más reciente pasado
  let bestPast = null;
  let bestPastDiff = Infinity;
  for (const p of programs) {
    const { end } = getProgramDateRange(p);
    if (end && end < today) {
      const diff = today - end;
      if (diff < bestPastDiff) { bestPastDiff = diff; bestPast = p; }
    }
  }
  if (bestPast) return bestPast;

  // 3. Si no hay pasados, el próximo futuro
  let bestFuture = null;
  let bestFutureDiff = Infinity;
  for (const p of programs) {
    const { start } = getProgramDateRange(p);
    if (start && start > today) {
      const diff = start - today;
      if (diff < bestFutureDiff) { bestFutureDiff = diff; bestFuture = p; }
    }
  }
  return bestFuture || programs[0];
}

// Enriquecer programa con metadata calculada
function enrichProgram(program) {
  const { start, end } = getProgramDateRange(program);
  const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  let status = 'futuro';
  if (start && end) {
    if (today >= start && today <= end) status = 'activo';
    else if (end < today) status = 'completado';
  }

  const title = program.name || (() => {
    if (!start) return 'Programa';
    const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    if (!end || start.getMonth() === end.getMonth()) {
      return `CrossFit ${MONTHS_FULL[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `CrossFit ${MONTHS[start.getMonth()]}–${MONTHS[end.getMonth()]} ${start.getFullYear()}`;
  })();

  const range = start && end
    ? `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`
    : '';

  return { ...program, _meta: { start, end, status, title, range } };
}

// Convertir fila de Supabase a objeto de programa
function rowToProgram(row) {
  return { ...row.data, id: row.id, name: row.name || row.data?.name };
}

export function ProgramProvider({ children }) {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const loadPrograms = async () => {
    try {
      // Supabase como fuente de verdad
      const { data: remoteRows } = await supabase
        .from('programas')
        .select('id, name, data')
        .eq('publico', true);

      if (remoteRows?.length) {
        const allPrograms = remoteRows.map(rowToProgram);
        await AsyncStorage.setItem('all_programs', JSON.stringify(allPrograms));
        setPrograms(allPrograms.map(enrichProgram));
        setLoading(false);
        return;
      }

      // Fallback: AsyncStorage (offline o sin programas en Supabase aún)
      const stored = await AsyncStorage.getItem('all_programs');
      let allPrograms = stored ? JSON.parse(stored) : [];

      // Migración: eliminar el programa por defecto antiguo (Marzo 2026)
      if (allPrograms.some(p => p.id === 'default' && p.weeks?.[0]?.days?.[0]?.day?.includes('30 Mar'))) {
        allPrograms = allPrograms.filter(p => p.id !== 'default');
        await AsyncStorage.setItem('all_programs', JSON.stringify(allPrograms));
      }

      setPrograms(allPrograms.map(enrichProgram));
    } catch (e) {
      // Error de red — usar caché local
      try {
        const stored = await AsyncStorage.getItem('all_programs');
        const allPrograms = stored ? JSON.parse(stored) : [];
        setPrograms(allPrograms.map(enrichProgram));
      } catch (_) {
        setPrograms([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const addProgram = async (newProgram) => {
    try {
      const stored = await AsyncStorage.getItem('all_programs');
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
      await AsyncStorage.setItem('all_programs', JSON.stringify(updated));
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
      const stored = await AsyncStorage.getItem('all_programs');
      const existing = stored ? JSON.parse(stored) : [];
      const updated = existing.filter(p => p.id !== id);
      await AsyncStorage.setItem('all_programs', JSON.stringify(updated));
      setPrograms(updated.map(enrichProgram));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const replaceDefaultProgram = async (newPlan) => {
    try {
      const stored = await AsyncStorage.getItem('all_programs');
      const existing = stored ? JSON.parse(stored) : [];
      const updated = existing.map(p =>
        p.id === 'default' ? { ...newPlan, id: 'default' } : p
      );
      await AsyncStorage.setItem('all_programs', JSON.stringify(updated));
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
