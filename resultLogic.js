// Lógica pura de resultados tipados por bloque (sin dependencias de React/RN).
// Cada parte puntuable de un día guarda { key, label, scoreType, value, resultado, notas, rx }.
//   value: load -> { kg, reps|null } · time -> { seconds, rounds?, reps? }
//          rounds_reps -> { rounds, reps, seconds|null } · reps -> { reps }
// `resultado` es siempre el texto formateado (compatible con los resultados antiguos).
import { SCORE, LEGACY_PART_KEYS, RESULT_SEPARATOR, defaultScoreType } from './constants';
import { getDayBlocks, blockHasContent } from './dayBlocksLogic';
import { isLegacyDay } from './programLogic';

const KG_SUFFIX = 'kg';
const TIMES = '×';

const RE_TIME = /^(\d{1,3}):(\d{2})$/;
const RE_ROUNDS = /^(\d+)\+(\d+)$/;
const RE_INT = /^\d+$/;
const NUM = '(\\d+(?:[.,]\\d+)?)';

const pad2 = n => String(n).padStart(2, '0');
const toNum = s => {
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const fmtKg = n => String(Math.round(n * 100) / 100).replace('.', ',');

// ── Partes puntuables de un día ───────────────────────────────
export function getScorableParts(day) {
  const blocks = getDayBlocks(day).filter(b => b && blockHasContent(b));
  const scored = blocks.map(b => ({ b, type: b.score?.type || defaultScoreType(b.kind, b.wod) }))
    .filter(x => x.type !== SCORE.NONE);
  const liftLike = scored.filter(x => x.b.kind === 'strength' || x.b.kind === 'lift').length;
  const legacy = isLegacyDay(day);
  const parts = [];
  let strengthSeen = false;
  let wodSeen = false;
  scored.forEach(({ b, type }) => {
    if (b.kind === 'wod' && b.wod) {
      const first = !wodSeen;
      wodSeen = true;
      if (b.wod.parts?.length >= 1) {
        const useDefault = type === defaultScoreType('wod', b.wod);
        b.wod.parts.forEach((p, i) => {
          parts.push({
            key: first ? `${LEGACY_PART_KEYS.WOD_PART_PREFIX}${i}` : `${b.id}_${i}`,
            label: p.label || `WOD ${i + 1}`,
            scoreType: useDefault ? defaultScoreType('wod', p) : type,
            blockKind: b.kind, rmKeys: [], wodType: p.type, duration: p.duration,
          });
        });
      } else {
        parts.push({
          key: first ? LEGACY_PART_KEYS.WOD : b.id,
          label: first ? 'WOD' : String(b.title || 'WOD').toUpperCase(),
          scoreType: type, blockKind: b.kind, rmKeys: [], wodType: b.wod.type, duration: b.wod.duration,
        });
      }
      return;
    }
    const legacyStrength = b.kind === 'strength' && !strengthSeen;
    // Día legacy: una única parte FUERZA aunque haya varios strength.blocks
    if (legacy && (b.kind === 'strength' || b.kind === 'lift')) {
      if (strengthSeen) return;
      strengthSeen = true;
      parts.push({ key: LEGACY_PART_KEYS.STRENGTH, label: 'FUERZA', scoreType: SCORE.LOAD, blockKind: b.kind, rmKeys: Array.isArray(b.rmKeys) ? b.rmKeys : [] });
      return;
    }
    if (b.kind === 'strength') strengthSeen = true;
    const label = b.kind === 'strength' && liftLike === 1
      ? 'FUERZA'
      : String(b.title || (b.kind === 'lift' ? 'LIFT' : 'FUERZA')).toUpperCase();
    parts.push({
      key: legacyStrength ? LEGACY_PART_KEYS.STRENGTH : b.id,
      label, scoreType: type, blockKind: b.kind, rmKeys: Array.isArray(b.rmKeys) ? b.rmKeys : [],
    });
  });
  return parts;
}

// ¿Es el único bloque un WOD legacy (se usa el formulario único TIEMPO + RONDAS)?
export function isSingleLegacyWod(parts) {
  return !!parts && parts.length === 1 && parts[0].key === LEGACY_PART_KEYS.WOD
    && (parts[0].scoreType === SCORE.TIME || parts[0].scoreType === SCORE.ROUNDS_REPS);
}

// ── Formato / parseo ─────────────────────────────────────────
function fmtTime(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}

export function formatPartResult(scoreType, value) {
  if (!value || typeof value !== 'object') return '';
  switch (scoreType) {
    case SCORE.LOAD: {
      if (!(value.kg > 0)) return '';
      const base = `${fmtKg(value.kg)} ${KG_SUFFIX}`;
      return value.reps > 0 ? `${base} ${TIMES} ${value.reps}` : base;
    }
    case SCORE.REPS:
      return value.reps > 0 ? `${value.reps} reps` : '';
    case SCORE.TIME:
    case SCORE.ROUNDS_REPS: {
      const rp = value.rounds > 0 ? `${value.rounds}+${value.reps || 0}` : '';
      const tp = value.seconds > 0 ? fmtTime(value.seconds) : '';
      return [rp, tp].filter(Boolean).join(RESULT_SEPARATOR);
    }
    default:
      return '';
  }
}

function parseLoad(text) {
  const s = text.trim().toLowerCase();
  if (!s) return null;
  // Lista de pesos por serie ("10 / 20 / 30") -> el máximo, sin reps
  if (s.includes('/')) {
    const kgs = s.split('/').map(x => toNum(x.replace(KG_SUFFIX, '').trim())).filter(n => n != null && n > 0);
    return kgs.length ? { kg: Math.max(...kgs), reps: null } : null;
  }
  let m = new RegExp(`^${NUM}\\s*(?:${KG_SUFFIX})?$`).exec(s);
  if (m) return { kg: toNum(m[1]), reps: null };
  // "100 kg × 3" / "100kg x3" -> kg primero (hay kg junto al primer número)
  m = new RegExp(`^${NUM}\\s*${KG_SUFFIX}\\s*[×x*]\\s*(\\d+)$`).exec(s);
  if (m) return { kg: toNum(m[1]), reps: parseInt(m[2], 10) };
  // "5×80kg" -> reps × kg (kg tras el segundo número)
  m = new RegExp(`^(\\d+)\\s*[×x*]\\s*${NUM}\\s*${KG_SUFFIX}$`).exec(s);
  if (m) return { kg: toNum(m[2]), reps: parseInt(m[1], 10) };
  // "5x94" / "100x3" sin unidad -> el número mayor es el peso
  m = new RegExp(`^${NUM}\\s*[×x*]\\s*${NUM}$`).exec(s);
  if (m) {
    const a = toNum(m[1]);
    const b = toNum(m[2]);
    const [kg, reps] = a >= b ? [a, b] : [b, a];
    return { kg, reps: Number.isInteger(reps) ? reps : null };
  }
  return null;
}

function parseTimeAndRounds(text) {
  const segs = text.split(RESULT_SEPARATOR).map(x => x.trim());
  const tm = segs.map(x => RE_TIME.exec(x)).find(Boolean);
  const rm = segs.map(x => RE_ROUNDS.exec(x)).find(Boolean);
  return {
    seconds: tm ? parseInt(tm[1], 10) * 60 + parseInt(tm[2], 10) : null,
    rounds: rm ? parseInt(rm[1], 10) : null,
    reps: rm ? parseInt(rm[2], 10) : null,
  };
}

// Texto -> value, o null si no se entiende (el llamador conserva el texto)
export function parsePartResult(scoreType, text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  switch (scoreType) {
    case SCORE.LOAD: {
      const v = parseLoad(text);
      return v && v.kg > 0 ? v : null;
    }
    case SCORE.REPS: {
      const m = /^(\d+)\s*(?:reps?)?$/i.exec(text.trim());
      return m ? { reps: parseInt(m[1], 10) } : null;
    }
    case SCORE.TIME:
    case SCORE.ROUNDS_REPS: {
      const { seconds, rounds, reps } = parseTimeAndRounds(text);
      if (seconds == null && rounds == null) return null;
      const value = {};
      if (seconds != null) value.seconds = seconds;
      if (rounds != null) { value.rounds = rounds; value.reps = reps; }
      if (scoreType === SCORE.ROUNDS_REPS) {
        return { rounds: value.rounds ?? null, reps: value.reps ?? null, seconds: value.seconds ?? null };
      }
      return value;
    }
    default:
      return null;
  }
}

export const hasPartValue = value => !!value && typeof value === 'object';

// ── Borrador de formulario (strings) <-> value ───────────────
export const emptyDraft = () => ({ kg: '', reps: '', minutos: '', segundos: '', rondas: '', repsExtra: '' });

export function valueToDraft(scoreType, value) {
  const d = emptyDraft();
  if (!value) return d;
  if (value.seconds > 0) { d.minutos = String(Math.floor(value.seconds / 60)); d.segundos = pad2(value.seconds % 60); }
  if (scoreType === SCORE.LOAD) {
    d.kg = value.kg > 0 ? fmtKg(value.kg) : '';
    d.reps = value.reps > 0 ? String(value.reps) : '';
  } else if (scoreType === SCORE.REPS) {
    d.reps = value.reps > 0 ? String(value.reps) : '';
  }
  if (scoreType !== SCORE.LOAD && scoreType !== SCORE.REPS) {
    d.rondas = value.rounds > 0 ? String(value.rounds) : '';
    d.repsExtra = value.rounds > 0 ? String(value.reps || 0) : '';
  }
  return d;
}

export function draftToValue(scoreType, draft) {
  const d = draft || {};
  const int = s => { const n = parseInt(s, 10); return Number.isFinite(n) ? n : 0; };
  const hasTime = !!(String(d.minutos || '').trim() || String(d.segundos || '').trim());
  const seconds = hasTime ? int(d.minutos) * 60 + int(d.segundos) : 0;
  const rounds = int(d.rondas);
  switch (scoreType) {
    case SCORE.LOAD: {
      const kg = toNum(d.kg || '');
      if (!(kg > 0)) return null;
      const reps = int(d.reps);
      return { kg, reps: reps > 0 ? reps : null };
    }
    case SCORE.REPS: {
      const reps = int(d.reps);
      return reps > 0 ? { reps } : null;
    }
    case SCORE.TIME:
    case SCORE.ROUNDS_REPS: {
      if (!(seconds > 0) && !(rounds > 0)) return null;
      if (scoreType === SCORE.ROUNDS_REPS) {
        return { rounds: rounds > 0 ? rounds : null, reps: rounds > 0 ? int(d.repsExtra) : null, seconds: seconds > 0 ? seconds : null };
      }
      const v = {};
      if (seconds > 0) v.seconds = seconds;
      if (rounds > 0) { v.rounds = rounds; v.reps = int(d.repsExtra); }
      return v;
    }
    default:
      return null;
  }
}

// ── Estado de una parte a partir de lo guardado ──────────────
// Devuelve { draft, notas, rx, legacyText }. legacyText: texto previo que no se
// pudo interpretar con el tipo actual (se muestra y se conserva si no se edita).
export function partStateFromSaved(part, saved) {
  if (!saved) return { draft: emptyDraft(), notas: '', rx: true, legacyText: '' };
  let value = null;
  if (saved.value && saved.scoreType === part.scoreType) value = saved.value;
  if (!value) value = parsePartResult(part.scoreType, saved.resultado || '');
  const legacyText = !value && saved.resultado ? String(saved.resultado) : '';
  return { draft: valueToDraft(part.scoreType, value), notas: saved.notas || '', rx: saved.rx !== false, legacyText };
}

// Estado -> item de resultados.partes
export function buildPartItem(part, state) {
  const s = state || {};
  const value = draftToValue(part.scoreType, s.draft);
  const resultado = value ? formatPartResult(part.scoreType, value) : (s.legacyText || '');
  return {
    key: part.key, label: part.label, scoreType: part.scoreType,
    value, resultado, notas: s.notas || '', rx: s.rx !== false,
  };
}

export function summarizeParts(partes) {
  return (partes || []).map(p => `${p.label}: ${p.resultado || '—'}`).join(RESULT_SEPARATOR);
}

// ¿Tiene la parte algún dato (valor o texto previo conservado)?
export function partHasData(part, state) {
  const s = state || {};
  return !!draftToValue(part.scoreType, s.draft) || !!s.legacyText;
}

// Mejor serie (kg × reps) de un resultado guardado: de partes con tipo load o la
// parte legacy 'strength'; sin partes intenta interpretar el texto completo.
export function bestLoadOfResultado(res) {
  if (!res) return null;
  const cands = [];
  (res.partes || []).forEach(p => {
    const isLoad = p.scoreType === SCORE.LOAD || (!p.scoreType && p.key === LEGACY_PART_KEYS.STRENGTH);
    if (!isLoad) return;
    const v = p.scoreType === SCORE.LOAD && p.value?.kg > 0 ? p.value : parsePartResult(SCORE.LOAD, p.resultado || '');
    if (v) cands.push(v);
  });
  if (!cands.length && !(res.partes || []).length) {
    const v = parsePartResult(SCORE.LOAD, res.resultado || '');
    if (v) cands.push(v);
  }
  if (!cands.length) return null;
  const best = cands.reduce((a, b) => (b.kg > a.kg || (b.kg === a.kg && (b.reps || 0) > (a.reps || 0)) ? b : a));
  return { kg: best.kg, reps: best.reps, text: formatPartResult(SCORE.LOAD, best) };
}
