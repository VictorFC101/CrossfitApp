// Lógica pura de la clasificación del box: tipo de puntuación del WOD y ranking.
import { parseScore, compareScores } from './benchmarkLogic';

// Mayúsculas, "_" como espacio y espacios colapsados
const norm = (v) => String(v || '').toUpperCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
const RE_WORK_REST = /\d+\s*[×X]\s*\d+'?\s*WORK/;
const RE_NOTA_TOTAL = /TOTAL DE|MARCADOR ES/;

/**
 * Tipo de puntuación de un WOD: 'time' (menor es mejor), 'rounds' (AMRAP), 'reps' o null.
 * Si el WOD tiene partes, manda la última (es la que puntúa en la clasificación).
 * null = sin mapeo estático: EMOM, fuerza, halterofilia, libre... y también LADDER, YOU GO I GO,
 * DOBLE WOD o sin tipo, donde rankLeaderboard infiere el tipo a partir de los resultados.
 */
export function scoringForWod(wod) {
  if (!wod || wod.emomMinutes) return null;
  if (Array.isArray(wod.parts) && wod.parts.length) {
    return scoringForWod(wod.parts[wod.parts.length - 1]);
  }
  const txt = `${norm(wod.type)} ${norm(wod.format)}`;
  if (txt.includes('EMOM')) return null;
  if (txt.includes('AMRAP') || txt.includes('DEATH BY')) return 'rounds';
  if (txt.includes('FOR TIME') || txt.includes('CHIPPER') || txt.includes('TIME CAP') || txt.includes('TIEMPO')) return 'time';
  if (RE_WORK_REST.test(txt) || RE_NOTA_TOTAL.test(norm(wod.formatNote))) return 'reps';
  if (txt.includes('MAX')) return 'reps';
  return null;
}

const RE_S_ROUNDS = /^\d+\+\d+$/;
const RE_S_TIME = /^\d{1,2}:\d{2}(:\d{2})?$/;
const RE_S_INT = /^\d+$/;

// Texto de marca de la parte de WOD (la última con contenido); si no hay partes, el resultado
function wodScoreText(row) {
  if (Array.isArray(row.partes) && row.partes.length) {
    const wodParts = row.partes.filter(p => String(p.key || '').startsWith('wod') && p.resultado);
    if (wodParts.length) return wodParts[wodParts.length - 1].resultado;
  }
  return row.resultado;
}

/**
 * Deduce el tipo de puntuación mirando los resultados: gana el formato (R+r, mm:ss o entero)
 * que tenga mayoría estricta entre las filas legibles. Con R+r y tiempo a la vez cuenta como rondas.
 * null si no hay filas legibles o no hay mayoría.
 */
export function inferScoringFromResults(rows) {
  const cuenta = { rounds: 0, time: 0, reps: 0 };
  let total = 0;
  (Array.isArray(rows) ? rows : []).forEach(r => {
    const partes = String(wodScoreText(r) || '').split(' · ').map(x => x.trim()).filter(Boolean);
    let k = null;
    if (partes.some(x => RE_S_ROUNDS.test(x))) k = 'rounds';
    else if (partes.some(x => RE_S_TIME.test(x))) k = 'time';
    else if (partes.some(x => RE_S_INT.test(x))) k = 'reps';
    if (k) { cuenta[k]++; total++; }
  });
  if (!total) return null;
  const ganador = Object.keys(cuenta).find(k => cuenta[k] * 2 > total);
  return ganador || null;
}

/**
 * Puntuación comparable de una fila. Con varias partes (`partes`) se usa la última parte
 * de WOD (clave 'wod*') con marca legible; la fuerza no cuenta. Si no, se parsea `resultado`
 * (parseScore ya admite varias partes separadas por ' · ').
 */
export function scoreOfRow(row, scoring) {
  if (Array.isArray(row.partes) && row.partes.length) {
    const wodParts = row.partes.filter(p => String(p.key || '').startsWith('wod'));
    for (let i = wodParts.length - 1; i >= 0; i--) {
      const s = parseScore(wodParts[i].resultado, scoring);
      if (s != null) return s;
    }
  }
  return parseScore(row.resultado, scoring);
}

/** Ordena mejor primero y asigna `pos` (empates comparten posición: 1, 1, 3). Sin marca legible -> al final sin pos. */
function rankGroup(rows, scoring) {
  const scored = rows.map(r => ({ r, s: scoring ? scoreOfRow(r, scoring) : null }));
  const ok = scored.filter(x => x.s != null).sort((a, b) => compareScores(a.s, b.s, scoring));
  const bad = scored.filter(x => x.s == null);
  const out = [];
  ok.forEach((x, i) => {
    const pos = i > 0 && compareScores(ok[i - 1].s, x.s, scoring) === 0 ? out[i - 1].pos : i + 1;
    out.push({ ...x.r, pos });
  });
  bad.forEach(x => out.push({ ...x.r, pos: null }));
  return out;
}

/** Separa en Rx y Scaled; si `scoring` es null se infiere de los resultados. (rx !== false cuenta como Rx) y ordena cada grupo. */
export function rankLeaderboard(rows, scoring) {
  const list = Array.isArray(rows) ? rows : [];
  // Si el tipo del WOD no da scoring, o ningún resultado se puede leer con él (p.ej. intervalos
  // "total de reps" pero el atleta anotó rondas+tiempo), se infiere de los propios resultados.
  const legible = scoring != null && list.some(r => scoreOfRow(r, scoring) != null);
  const sc = legible ? scoring : (inferScoringFromResults(list) ?? scoring);
  return {
    rx: rankGroup(list.filter(r => r.rx !== false), sc),
    scaled: rankGroup(list.filter(r => r.rx === false), sc),
  };
}
