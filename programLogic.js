// Lógica pura extraída de ProgramContext.js — sin dependencias de React/RN.
import { parseDateFromDay } from './dateUtils';
import { inferRmKeyFromText, inferRmKeysFromText } from './wodLogic';

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

// Separador entre el título del bloque y la descripción de cada serie
const BLOCK_TITLE_SEP = ' · ';

// Formato nuevo de fuerza: strength.blocks[{title,note,rest,sets}] sin strength.sets.
// Aplana los bloques a strength.sets (formato que esperan las pantallas), conservando
// blocks. Con más de un bloque, antepone el título a cada serie. strength.title vacío
// pasa a ser el título del PRIMER bloque (no se unen títulos: evitaría falsos complejos).
// El RM del día sale del primer bloque si el día no trae rmKey/rmKeys: complejo real
// (2 movimientos) -> rmKeys; un movimiento -> rmKey + rmKeys:null (para que el label
// "BACK SQUAT + SNATCH" no se interprete como complejo). Cada serie lleva el rmKey de
// su bloque si se reconoce (s.rmKey). Idempotente: si ya hay sets devuelve el mismo día.
export function normalizeStrength(day) {
  const st = day?.strength;
  if (!st || Array.isArray(st.sets) || !Array.isArray(st.blocks) || !st.blocks.length) return day;
  const multi = st.blocks.length > 1;
  const sets = st.blocks.flatMap(b => {
    // en un bloque complejo (2 movimientos) la serie usa el RM del día (min de ambos)
    const rmKey = inferRmKeysFromText(b?.title) ? null : inferRmKeyFromText(b?.title);
    return (Array.isArray(b?.sets) ? b.sets : []).map(s => ({
      ...s,
      desc: multi && b.title ? `${b.title}${BLOCK_TITLE_SEP}${s?.desc || ''}` : (s?.desc || ''),
      ...(rmKey ? { rmKey } : {}),
    }));
  });
  const firstTitle = st.blocks[0]?.title || '';
  const out = { ...day, strength: { ...st, title: st.title || firstTitle, sets } };
  if (!day.rmKey && !day.rmKeys) {
    const pair = inferRmKeysFromText(firstTitle);
    const single = pair ? null : inferRmKeyFromText(firstTitle);
    if (pair) out.rmKeys = pair;
    else if (single) { out.rmKey = single; out.rmKeys = null; }
  }
  return out;
}

// Normaliza todos los días de un programa (devuelve un programa nuevo)
export function normalizeProgramDays(program) {
  if (!Array.isArray(program?.weeks)) return program;
  return {
    ...program,
    weeks: program.weeks.map(w => (
      Array.isArray(w?.days) ? { ...w, days: w.days.map(normalizeStrength) } : w
    )),
  };
}

// Enriquecer programa con metadata calculada
export function enrichProgram(rawProgram) {
  const program = normalizeProgramDays(rawProgram);
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
