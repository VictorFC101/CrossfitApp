// Lógica pura de benchmarks: detección, parseo de marcas, comparación e historial.
import { BENCHMARKS, BENCHMARK_ALIASES, getBenchmark } from './benchmarks';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Minúsculas, sin acentos y con espacios normalizados
const normalizar = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Palabra completa: no precedida ni seguida de letra/dígito
const reWord = (term) => new RegExp(`(^|[^a-z0-9])${escapar(normalizar(term))}($|[^a-z0-9])`);

const DETECTORES = BENCHMARKS.map(b => ({
  key: b.key,
  regs: [b.nombre, ...(BENCHMARK_ALIASES[b.key] || [])].map(reWord),
}));

/** Devuelve la key del benchmark nombrado en el texto, o null. Si hay varios, el primero que aparece. */
export function detectBenchmark(text) {
  const n = normalizar(text);
  if (!n) return null;
  let mejor = null;
  DETECTORES.forEach(({ key, regs }) => {
    regs.forEach(re => {
      const m = re.exec(n);
      if (m && (mejor === null || m.index < mejor.idx)) mejor = { key, idx: m.index };
    });
  });
  return mejor ? mejor.key : null;
}

/** Detecta el benchmark de un día de programa (nombre, formato y movimientos del WOD). */
export function detectDayBenchmark(day) {
  const w = day?.wod;
  if (!w) return null;
  const movs = Array.isArray(w.movements)
    ? w.movements.map(m => (typeof m === 'string' ? m : m?.name || '')).join(' ')
    : '';
  return detectBenchmark([w.name, w.format, movs].filter(Boolean).join(' '));
}

const RE_TIME = /^(\d{1,2}):(\d{2})$/;
const RE_TIME_H = /^(\d+):(\d{2}):(\d{2})$/;
const RE_ROUNDS = /^(\d+)\+(\d+)$/;
const RE_INT = /^\d+$/;

/**
 * Convierte el texto de resultado en un número comparable:
 * time -> segundos; rounds -> rondas*1000 + reps; reps -> reps. null si no se entiende.
 */
export function parseScore(resultado, scoring) {
  if (!resultado || typeof resultado !== 'string') return null;
  const partes = resultado.split(' · ').map(s => s.trim()).filter(Boolean);
  for (const p of partes) {
    if (scoring === 'time') {
      let m = RE_TIME_H.exec(p);
      if (m) return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]);
      m = RE_TIME.exec(p);
      if (m) return (+m[1]) * 60 + (+m[2]);
    } else if (scoring === 'rounds') {
      const m = RE_ROUNDS.exec(p);
      if (m) return (+m[1]) * 1000 + (+m[2]);
      if (RE_INT.test(p)) return parseInt(p, 10) * 1000; // solo rondas completas
    } else if (scoring === 'reps') {
      if (RE_INT.test(p)) return parseInt(p, 10);
    }
  }
  return null;
}

/** < 0 si `a` es mejor que `b`; > 0 si es peor; 0 si igual. */
export function compareScores(a, b, scoring) {
  return scoring === 'time' ? a - b : b - a;
}

const pad2 = (n) => String(n).padStart(2, '0');

export function formatScore(score, scoring) {
  if (score == null) return '—';
  if (scoring === 'time') {
    const h = Math.floor(score / 3600);
    const m = Math.floor((score % 3600) / 60);
    const s = score % 60;
    return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
  }
  if (scoring === 'rounds') return `${Math.floor(score / 1000)}+${score % 1000}`;
  return `${score} reps`;
}

/** Diferencia `aScore - bScore` en texto: "−33 s", "+12 s", "+1 ronda", "+5 reps". */
export function formatDelta(aScore, bScore, scoring) {
  const d = aScore - bScore;
  if (d === 0) return 'Igual';
  const signo = d < 0 ? '−' : '+';
  const abs = Math.abs(d);
  if (scoring === 'time') {
    return abs < 60 ? `${signo}${abs} s` : `${signo}${Math.floor(abs / 60)}:${pad2(abs % 60)} min`;
  }
  if (scoring === 'rounds') {
    const r = Math.floor(abs / 1000);
    const rep = abs % 1000;
    const partes = [];
    if (r) partes.push(`${r} ${r === 1 ? 'ronda' : 'rondas'}`);
    if (rep) partes.push(`${rep} ${rep === 1 ? 'rep' : 'reps'}`);
    return `${signo}${partes.join(' y ')}`;
  }
  return `${signo}${abs} ${abs === 1 ? 'rep' : 'reps'}`;
}

/** "12 mar" a partir de una fecha ISO. */
export function formatShortDate(fecha) {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

/**
 * Une resultados del programa (mapa por día) y WODs libres con benchmark_key === key.
 * opts.excludeDia omite el día indicado (para comparar contra lo anterior al guardar).
 */
export function getBenchmarkHistory(key, resultados, wodsLibres, opts = {}) {
  const out = [];
  Object.entries(resultados || {}).forEach(([dia, r]) => {
    if (r?.benchmark_key === key && r.resultado && dia !== opts.excludeDia) {
      out.push({ fecha: r.fecha, resultado: r.resultado, rx: r.rx !== false, source: 'programa', dia });
    }
  });
  (wodsLibres || []).forEach(w => {
    if (w?.benchmark_key === key && w.resultado) {
      out.push({ fecha: w.fecha, resultado: w.resultado, rx: w.rx !== false, source: 'libre' });
    }
  });
  const ts = (e) => { const t = new Date(e.fecha).getTime(); return isNaN(t) ? 0 : t; };
  return out.sort((a, b) => ts(b) - ts(a));
}

const mejorDe = (lista, scoring) => {
  let best = null;
  lista.forEach(e => {
    const score = parseScore(e.resultado, scoring);
    if (score == null) return;
    if (!best || compareScores(score, best.score, scoring) < 0) best = { ...e, score };
  });
  return best;
};

/**
 * Mejor marca. Criterio Rx vs scaled: una marca Rx siempre cuenta como mejor que una
 * scaled; solo se mira la mejor scaled si no hay ninguna Rx puntuable.
 */
export function bestOf(history, scoring) {
  const rx = mejorDe((history || []).filter(e => e.rx), scoring);
  return rx || mejorDe((history || []).filter(e => !e.rx), scoring);
}

/** Intento más reciente con marca puntuable (history ya viene ordenado desc). */
export function lastOf(history, scoring) {
  const lista = history || [];
  if (!scoring) return lista[0] || null;
  return lista.find(e => parseScore(e.resultado, scoring) != null) || null;
}

/**
 * Evalúa una marca recién guardada contra el historial previo (sin ella).
 * Devuelve { kind: 'first'|'pr'|'better'|'worse'|'equal', message } o null si no hay marca.
 * PR = mejora la mejor marca previa del mismo tipo (Rx con Rx, scaled con scaled).
 */
export function evaluateNewMark(newEntry, historyBefore, scoring) {
  const score = parseScore(newEntry?.resultado, scoring);
  if (score == null) return null;
  const previos = (historyBefore || []).filter(e => parseScore(e.resultado, scoring) != null);
  if (!previos.length) return { kind: 'first', message: 'Primera marca registrada' };
  const mismoTipo = previos.filter(e => !!e.rx === !!newEntry.rx);
  const bestSame = mejorDe(mismoTipo, scoring);
  if (bestSame && compareScores(score, bestSame.score, scoring) < 0) {
    return { kind: 'pr', message: `🔥 ¡Nuevo PR! ${formatDelta(score, bestSame.score, scoring)}` };
  }
  const last = lastOf(previos, scoring);
  const lastScore = parseScore(last.resultado, scoring);
  const cmp = compareScores(score, lastScore, scoring);
  if (cmp === 0) return { kind: 'equal', message: 'Igual que la última vez' };
  return { kind: cmp < 0 ? 'better' : 'worse', message: `${formatDelta(score, lastScore, scoring)} vs la última vez` };
}

export { getBenchmark };
