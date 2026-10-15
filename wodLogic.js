// Lógica pura extraída de screens/WodScreen.js — sin dependencias de React/RN.
import { RM_CATEGORIES, RM_ALIASES_ES } from './constants';

// Mapa rmKey → nombre corto del movimiento (para mostrar "Limita: X" en complejos)
export const RM_KEY_NAMES = Object.values(RM_CATEGORIES)
  .flatMap(cat => cat.movements)
  .reduce((acc, m) => { acc[m.key] = m.name; return acc; }, {});

// Patrones de texto → rmKey, ordenados de más a menos específicos para
// detectar los 2 movimientos de un "complex" cuando el día no trae `rmKeys`
// explícito (p.ej. programas subidos por JSON). El orden evita falsos
// positivos: "squat clean" debe detectarse antes que el genérico "clean".
export const RM_NAME_PATTERNS = [
  ...RM_ALIASES_ES,
  [/front squat/, 'fs'],
  [/back squat/, 'bs'],
  [/overhead squat/, 'ohs'],
  [/hang power clean/, 'hpc'],
  [/hang power snatch/, 'hps'],
  [/hang clean/, 'hc'],
  [/power clean/, 'pc'],
  [/power snatch/, 'ps'],
  [/squat clean/, 'clean'],
  [/squat snatch/, 'sn'],
  [/clean\s*(&|and|y)\s*jerk/, 'cj'],
  [/push press/, 'pp'],
  [/push jerk/, 'pj'],
  [/strict press/, 'sp'],
  [/bench press/, 'bp'],
  [/romanian deadlift/, 'rmd'],
  [/deadlift/, 'dl'],
  [/hip thrust/, 'ht'],
  [/pause squat/, 'psq'],
  [/\bohs\b/, 'ohs'],
  [/thruster/, 'thr'],
  [/snatch/, 'sn'],
  [/clean/, 'clean'],
];

// Busca 2 movimientos distintos en un texto libre (título/label del día) y
// devuelve sus rmKeys en el orden en que aparecen, o null si no hay 2.
export function inferRmKeysFromText(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  const consumed = [];
  const overlaps = (s, e) => consumed.some(([cs, ce]) => s < ce && e > cs);
  const found = [];
  for (const [pattern, key] of RM_NAME_PATTERNS) {
    if (found.some(f => f.key === key)) continue;
    const m = lower.match(pattern);
    if (m && !overlaps(m.index, m.index + m[0].length)) {
      found.push({ key, idx: m.index });
      consumed.push([m.index, m.index + m[0].length]);
    }
  }
  if (found.length < 2) return null;
  found.sort((a, b) => a.idx - b.idx);
  return [found[0].key, found[1].key];
}

// Como inferRmKeysFromText pero devuelve TODOS los movimientos distintos
// (sin límite de 2) en orden de aparición; [] si no hay ninguno.
export function inferAllRmKeysFromText(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const consumed = [];
  const overlaps = (s, e) => consumed.some(([cs, ce]) => s < ce && e > cs);
  const found = [];
  for (const [pattern, key] of RM_NAME_PATTERNS) {
    if (found.some(f => f.key === key)) continue;
    const m = lower.match(pattern);
    if (m && !overlaps(m.index, m.index + m[0].length)) {
      found.push({ key, idx: m.index });
      consumed.push([m.index, m.index + m[0].length]);
    }
  }
  return found.sort((a, b) => a.idx - b.idx).map(f => f.key);
}

// Busca UN movimiento en un texto libre (título de bloque) y devuelve su rmKey,
// o null si no se reconoce ninguno. Usa el orden de RM_NAME_PATTERNS (más
// específicos primero), así "Clean & Jerk" no se confunde con "clean".
export function inferRmKeyFromText(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [pattern, key] of RM_NAME_PATTERNS) {
    if (pattern.test(lower)) return key;
  }
  return null;
}

// Primer porcentaje de la descripción de una serie, como número ("5 reps al 72,5%" → 72.5).
// Acepta decimales con coma o punto; null si no hay porcentaje.
export function parsePercent(desc) {
  const m = desc?.match(/(\d+(?:[.,]\d+)?)\s*%/);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

// Carga de una descripción: {pct} | {pctMin,pctMax} | {kg} | {rpe} | null.
// "75%", "70-80%", "@ 70–80 %", "100kg", "RPE 8".
export function parseLoad(desc) {
  if (!desc || typeof desc !== 'string') return null;
  const num = x => parseFloat(String(x).replace(',', '.'));
  let m = desc.match(/(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*%/);
  if (m) {
    const a = num(m[1]); const b = num(m[2]);
    return { pctMin: Math.min(a, b), pctMax: Math.max(a, b) };
  }
  m = desc.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (m) return { pct: num(m[1]) };
  m = desc.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i);
  if (m) return { kg: num(m[1]) };
  m = desc.match(/\brpe\s*@?\s*(\d+(?:[.,]\d+)?)/i);
  if (m) return { rpe: num(m[1]) };
  return null;
}

// Calcula el RM efectivo de un día de fuerza, teniendo en cuenta movimientos
// "complejo" (rmKeys: [k1, k2]) → se usa el RM más bajo de los dos disponibles.
// Si el día no trae `rmKeys` explícito (p.ej. programas subidos por JSON),
// se intenta inferir a partir del texto de `strength.title` o `label`.
export function getEffectiveRM(day, rms) {
  // rmKeys === null (explícito) = día de un solo movimiento: no inferir complejo del texto
  const rmKeys = (Array.isArray(day?.rmKeys) && day.rmKeys.length === 2)
    ? day.rmKeys
    : day?.rmKeys === null ? null : (inferRmKeysFromText(day?.strength?.title) || inferRmKeysFromText(day?.label));
  if (Array.isArray(rmKeys) && rmKeys.length === 2) {
    const [k1, k2] = rmKeys;
    const v1 = parseFloat(rms[k1]);
    const v2 = parseFloat(rms[k2]);
    const has1 = v1 > 0;
    const has2 = v2 > 0;
    if (has1 && has2) {
      const limitKey = v1 <= v2 ? k1 : k2;
      return { rmKey: limitKey, rmVal: Math.min(v1, v2), hasRM: true, isComplex: true, limitName: RM_KEY_NAMES[limitKey] };
    }
    if (has1) return { rmKey: k1, rmVal: v1, hasRM: true, isComplex: true, limitName: RM_KEY_NAMES[k1] };
    if (has2) return { rmKey: k2, rmVal: v2, hasRM: true, isComplex: true, limitName: RM_KEY_NAMES[k2] };
    return { rmKey: k1, rmVal: NaN, hasRM: false, isComplex: true, limitName: null };
  }
  const k = day?.rmKey || 'cj';
  const v = parseFloat(rms[k]);
  return { rmKey: k, rmVal: v, hasRM: v > 0, isComplex: false, limitName: null };
}
