// Lógica pura extraída de screens/RMScreen.js — sin dependencias de React/RN.

// Fórmula Epley: 1RM = peso × (1 + reps / 30)
// Devuelve null si peso o reps no son válidos (peso > 0, reps entre 1 y 30),
// igual que la validación original en el componente.
export function estimateOneRepMax(peso, reps) {
  const p = parseFloat(peso);
  const r = parseInt(reps);
  const validP = p > 0;
  const validR = r >= 1 && r <= 30;
  if (!validP || !validR) return null;
  return Math.round(p * (1 + r / 30));
}

// Mensaje de advertencia según el número de reps usado en el cálculo,
// igual que en la UI original.
export function oneRepMaxWarning(reps) {
  const r = parseInt(reps);
  if (r > 12) return 'Con más de 12 reps la estimación es menos precisa';
  if (r === 1) return 'Con 1 rep ya tienes tu 1RM directo';
  return null;
}

// Genera la tabla de pesos (% de 1RM → kg) a partir del 1RM y la lista de
// porcentajes del movimiento (mv.pcts en RM_CATEGORIES).
export function buildWeightTable(oneRM, pcts) {
  if (!Array.isArray(pcts)) return [];
  return pcts.map(p => ({ pct: p, pctLabel: Math.round(p * 100), weight: Math.round(oneRM * p) }));
}

// Convierte filas de la tabla rms ({movimiento, peso, reps, fecha}) en
// { [movimiento]: { [reps]: 'peso' } }. Filas sin reps cuentan como 1RM.
// Si llegan ordenadas por fecha ascendente, la última gana.
export function buildRmsByReps(rows) {
  const out = {};
  if (!Array.isArray(rows)) return out;
  rows.forEach(r => {
    if (!r || !r.movimiento) return;
    const reps = parseInt(r.reps) || 1;
    if (!out[r.movimiento]) out[r.movimiento] = {};
    out[r.movimiento][reps] = String(r.peso);
  });
  return out;
}

// Mejor 1RM estimado (Epley) a partir de los nRM (reps > 1) de un movimiento.
// Usa la entrada con menos reps disponible (más fiable). null si no hay.
export function bestEstimated1RM(byReps) {
  if (!byReps) return null;
  const reps = Object.keys(byReps).map(Number).filter(r => r > 1).sort((a, b) => a - b);
  for (const r of reps) {
    const kg = estimateOneRepMax(byReps[r], r);
    if (kg) return { kg, fromReps: r };
  }
  return null;
}

// Etiqueta de marca: 1 -> '1RM', 3 -> '3RM'
export function formatRmLabel(reps) {
  return `${parseInt(reps) || 1}RM`;
}

// Valor de RM válido para guardar: número positivo y razonable (evita guardar "" o fragmentos sin sentido)
export const RM_MAX_KG = 500;
export function isValidRmInput(val) {
  if (val === null || val === undefined) return false;
  const s = String(val).trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(s)) return false;
  const n = parseFloat(s);
  return n > 0 && n <= RM_MAX_KG;
}
