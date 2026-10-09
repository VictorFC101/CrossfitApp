// Lógica pura de la vista de coach (actividad y adherencia de atletas).
import { COACH_ACTIVO_DIAS, COACH_INACTIVO_DIAS, COACH_ADHERENCIA_DIAS } from './constants';
import { parseDateFromDay } from './dateUtils';

const MS_DIA = 86400000;
const inicioDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
// Diferencia en días naturales (DST-safe)
const diffDias = (a, b) => Math.round((inicioDia(a) - inicioDia(b)) / MS_DIA);

// Días desde el último resultado (null si no hay o la fecha no es válida)
export function diasSinRegistrar(ultimo, now = new Date()) {
  if (!ultimo) return null;
  const d = new Date(ultimo);
  if (isNaN(d.getTime())) return null;
  return Math.max(0, diffDias(now, d));
}

// 'activo' (<= 3 días), 'irregular' (4–7), 'inactivo' (> 7 o nunca)
export function estadoActividad(row, now = new Date()) {
  const dias = diasSinRegistrar(row?.ultimo_resultado, now);
  if (dias === null || dias > COACH_INACTIVO_DIAS) return 'inactivo';
  if (dias <= COACH_ACTIVO_DIAS) return 'activo';
  return 'irregular';
}

// Días del programa en la última semana vs cuántos tienen resultado.
// programDays: [{ day }] — resultadosDias: [dia]. null si no hay programa.
export function adherenciaSemana(programDays, resultadosDias, now = new Date()) {
  if (!Array.isArray(programDays) || programDays.length === 0) return null;
  const hechosSet = new Set(resultadosDias || []);
  let hechos = 0, programados = 0;
  programDays.forEach(d => {
    const fecha = parseDateFromDay(d?.day);
    if (!fecha) return;
    const atras = diffDias(now, fecha);
    if (atras < 0 || atras >= COACH_ADHERENCIA_DIAS) return;
    programados++;
    if (hechosSet.has(d.day)) hechos++;
  });
  return { hechos, programados };
}

// Lunes (local) de la semana de una fecha
function lunesDe(d) {
  const x = inicioDia(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

// Clave de semana ISO 'YYYY-Www'
function claveIso(d) {
  const x = inicioDia(d);
  x.setDate(x.getDate() + 3 - ((x.getDay() + 6) % 7)); // jueves de esa semana
  const año = x.getFullYear();
  const enero4 = new Date(año, 0, 4);
  const semana = 1 + Math.round(((x - enero4) / MS_DIA - 3 + ((enero4.getDay() + 6) % 7)) / 7);
  return `${año}-W${String(semana).padStart(2, '0')}`;
}

// Agrupa resultados por semana ISO, la más reciente primero: [{ clave, lunes, items }]
export function agruparPorSemana(resultados) {
  if (!Array.isArray(resultados)) return [];
  const grupos = new Map();
  const ts = (r) => { const t = new Date(r.fecha).getTime(); return isNaN(t) ? 0 : t; };
  [...resultados].sort((a, b) => ts(b) - ts(a)).forEach(r => {
    const f = new Date(r.fecha);
    if (isNaN(f.getTime())) return;
    const clave = claveIso(f);
    if (!grupos.has(clave)) grupos.set(clave, { clave, lunes: lunesDe(f), items: [] });
    grupos.get(clave).items.push(r);
  });
  return [...grupos.values()];
}
