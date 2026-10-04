// Lógica pura extraída de ProgramContext.js — sin dependencias de React/RN.
import { parseDateFromDay } from './dateUtils';

// Obtener fecha de inicio y fin de un programa
export function getProgramDateRange(program) {
  const allDays = program.weeks.flatMap(w => w.days);
  const dates = allDays.map(d => parseDateFromDay(d.day)).filter(Boolean);
  if (!dates.length) return { start: null, end: null };
  return {
    start: new Date(Math.min(...dates.map(d => d.getTime()))),
    end: new Date(Math.max(...dates.map(d => d.getTime())))
  };
}

// Determinar qué programa corresponde a hoy
export function getActiveProgram(programs) {
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
export function enrichProgram(program) {
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

// Fallo de red o timeout (no errores de permisos/datos)
export function isNetworkError(e) {
  return /network|fetch|abort|timed? ?out/i.test(`${e?.name || ''} ${e?.message || ''}`);
}

// Convertir fila de Supabase a objeto de programa
export function rowToProgram(row) {
  return { ...row.data, id: row.id, name: row.name || row.data?.name };
}
