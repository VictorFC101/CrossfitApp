// Lógica pura extraída de screens/WodScreen.js — sin dependencias de React/RN.
import { RM_CATEGORIES } from './constants';

// Mapa rmKey → nombre corto del movimiento (para mostrar "Limita: X" en complejos)
export const RM_KEY_NAMES = Object.values(RM_CATEGORIES)
  .flatMap(cat => cat.movements)
  .reduce((acc, m) => { acc[m.key] = m.name; return acc; }, {});

// Patrones de texto → rmKey, ordenados de más a menos específicos para
// detectar los 2 movimientos de un "complex" cuando el día no trae `rmKeys`
// explícito (p.ej. programas subidos por JSON). El orden evita falsos
// positivos: "squat clean" debe detectarse antes que el genérico "clean".
export const RM_NAME_PATTERNS = [
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

// Calcula el RM efectivo de un día de fuerza, teniendo en cuenta movimientos
// "complejo" (rmKeys: [k1, k2]) → se usa el RM más bajo de los dos disponibles.
// Si el día no trae `rmKeys` explícito (p.ej. programas subidos por JSON),
// se intenta inferir a partir del texto de `strength.title` o `label`.
export function getEffectiveRM(day, rms) {
  const rmKeys = (Array.isArray(day?.rmKeys) && day.rmKeys.length === 2)
    ? day.rmKeys
    : (inferRmKeysFromText(day?.strength?.title) || inferRmKeysFromText(day?.label));
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
