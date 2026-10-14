// Lógica pura de la clasificación del box: tipo de puntuación del WOD y ranking.
import { parseScore, compareScores, formatScore } from './benchmarkLogic';

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

/**
 * Tipo de puntuación efectivo: si el del WOD es null o ningún resultado se puede leer con él
 * (p.ej. intervalos "total de reps" pero el atleta anotó rondas+tiempo), se infiere de los resultados.
 */
export function effectiveScoring(rows, scoring) {
  const list = Array.isArray(rows) ? rows : [];
  const legible = scoring != null && list.some(r => scoreOfRow(r, scoring) != null);
  return legible ? scoring : (inferScoringFromResults(list) ?? scoring);
}

/** Separa en Rx y Scaled; si `scoring` es null se infiere de los resultados. (rx !== false cuenta como Rx) y ordena cada grupo. */
export function rankLeaderboard(rows, scoring) {
  const list = Array.isArray(rows) ? rows : [];
  const sc = effectiveScoring(list, scoring);
  return {
    rx: rankGroup(list.filter(r => r.rx !== false), sc),
    scaled: rankGroup(list.filter(r => r.rx === false), sc),
  };
}

// Parte que da la marca: índice en `partes` (o -1)
function markPartIndex(row, scoring) {
  if (Array.isArray(row.partes) && row.partes.length) {
    for (let i = row.partes.length - 1; i >= 0; i--) {
      const p = row.partes[i];
      if (String(p.key || '').startsWith('wod') && parseScore(p.resultado, scoring) != null) return i;
    }
  }
  return -1;
}

const NO_MARK = { main: 'Ver detalle', sub: '', short: '—' };

/**
 * Marca en formato visual: `main` (valor grande), `sub` (secundario) y `short` (compacto para el podio).
 * rounds -> "8 rondas" / "+ 12 reps"; time -> "8:45" / "tiempo"; reps -> "152" / "reps".
 */
export function formatMark(row, scoring) {
  if (!row || !scoring) return NO_MARK;
  const score = scoreOfRow(row, scoring);
  if (score == null) return NO_MARK;
  if (scoring === 'time') {
    const t = formatScore(score, 'time');
    return { main: t, sub: 'tiempo', short: t };
  }
  if (scoring === 'rounds') {
    const r = Math.floor(score / 1000);
    const reps = score % 1000;
    return {
      main: `${r} ${r === 1 ? 'ronda' : 'rondas'}`,
      sub: reps ? `+ ${reps} ${reps === 1 ? 'rep' : 'reps'}` : '',
      short: `${r}+${reps}`,
    };
  }
  return { main: String(score), sub: 'reps', short: String(score) };
}

/** Distancia al primero en texto ("a 1 ronda del 1º", "a 0:35 del 1º", "a 12 reps del 1º"); null si no aplica. */
export function gapToFirst(row, first, scoring) {
  if (!row || !first || !scoring || row === first) return null;
  const a = scoreOfRow(row, scoring);
  const b = scoreOfRow(first, scoring);
  if (a == null || b == null) return null;
  const d = Math.abs(a - b);
  if (d === 0) return null;
  if (scoring === 'time') return `a ${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')} del 1º`;
  if (scoring === 'rounds') {
    const r = Math.floor(d / 1000);
    const reps = d % 1000;
    const partes = [];
    if (r) partes.push(`${r} ${r === 1 ? 'ronda' : 'rondas'}`);
    if (reps) partes.push(`${reps} ${reps === 1 ? 'rep' : 'reps'}`);
    return `a ${partes.join(' y ')} del 1º`;
  }
  return `a ${d} ${d === 1 ? 'rep' : 'reps'} del 1º`;
}

/**
 * Detalle desplegable: las demás partes del resultado (sin la que da la marca principal).
 * Sin partes, el texto completo de `resultado`. Nunca incluye notas.
 */
export function detailParts(row, scoring) {
  if (!row) return [];
  if (Array.isArray(row.partes) && row.partes.length) {
    const idx = markPartIndex(row, scoring);
    return row.partes
      .filter((p, i) => i !== idx && p.resultado)
      .map(p => ({ label: p.label || '', text: String(p.resultado) }));
  }
  return row.resultado ? [{ label: '', text: String(row.resultado) }] : [];
}

/** "hace N min/h", "ayer" o "hace N días" respecto a `now`; '' si la fecha no es válida. */
export function relativeTime(fecha, now = new Date()) {
  const d = new Date(fecha);
  if (!fecha || isNaN(d.getTime())) return '';
  const min = Math.max(0, Math.floor((new Date(now).getTime() - d.getTime()) / 60000));
  if (min < 60) return `hace ${Math.max(1, min)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  return dias === 1 ? 'ayer' : `hace ${dias} días`;
}
