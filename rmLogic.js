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
