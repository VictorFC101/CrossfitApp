import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mayo2026 as defaultPlan } from './assets/mayo2026';
import { parseDateFromDay } from './dateUtils';

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

export function ProgramProvider({ children }) {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      const stored = await AsyncStorage.getItem('all_programs');
      let allPrograms = stored ? JSON.parse(stored) : [];

      // Si no hay programas guardados, usar mayo2026 como base
      if (allPrograms.length === 0) {
        const base = { ...defaultPlan, id: 'default' };
        allPrograms = [base];
        await AsyncStorage.setItem('all_programs', JSON.stringify(allPrograms));
      }

      // Migración: reemplazar el programa por defecto antiguo (Marzo 2026) por mayo2026
      const hasOldMarch = allPrograms.some(
        p => p.id === 'default' && p.weeks?.[0]?.days?.[0]?.day?.includes('30 Mar')
      );
      const hasMayo = allPrograms.some(p => p.name?.toLowerCase().includes('mayo'));
      if (hasOldMarch && !hasMayo) {
        allPrograms = allPrograms.filter(p => p.id !== 'default');
        allPrograms = [...allPrograms, { ...defaultPlan, id: 'mayo2026-default' }];
        await AsyncStorage.setItem('all_programs', JSON.stringify(allPrograms));
      }

      setPrograms(allPrograms.map(enrichProgram));
    } catch (e) {
      console.error('Error loading programs:', e);
      setPrograms([enrichProgram({ ...defaultPlan, id: 'default' })]);
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