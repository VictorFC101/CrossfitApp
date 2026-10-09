// Lógica pura del constructor de programas (días por bloques, schema v2) — sin React/RN.
import { RM_NAMES, BLOCK_KINDS, BLOCK_KIND_LABELS, SCORE_TYPE_LABELS, WOD_TYPES, WOD_FORMATS, defaultScoreType, LEGACY_PART_KEYS } from './constants';
import { parseLoad } from './wodLogic';
import { normalizeDay, isLegacyDay } from './programLogic';

export const STRENGTH_KINDS = ['strength', 'lift'];
const NOTE_SEP = '|';
const DESC_SEP = ' · ';

// ── Líneas de prescripción ─────────────────────────────────────────────────
// "5×3 @ 80% | nota", "5x3", "6×(1+1)", "4x2 @ 70%" -> {desc, sets, reps, load, note?, tempo?, rmKey?}
export function parsePrescriptionLine(line, opts = {}) {
  const raw = String(line || '');
  const idx = raw.indexOf(NOTE_SEP);
  const desc = (idx >= 0 ? raw.slice(0, idx) : raw).trim();
  const note = idx >= 0 ? raw.slice(idx + 1).trim() : '';
  if (!desc) return null;
  const out = { desc };
  let m = desc.match(/^(\d+)\s*[x×X]\s*\(\s*(\d+(?:\s*\+\s*\d+)*)\s*\)/);
  if (m) { out.sets = Number(m[1]); out.reps = m[2].replace(/\s+/g, ''); }
  else {
    m = desc.match(/^(\d+)\s*[x×X]\s*(\d+)(?!\s*[\d%])/);
    if (m) { out.sets = Number(m[1]); out.reps = Number(m[2]); }
  }
  const load = parseLoad(desc);
  if (load) out.load = load;
  if (opts.tempo) out.tempo = opts.tempo;
  if (opts.rmKey) out.rmKey = opts.rmKey;
  if (note) out.note = note;
  return out;
}

export function parsePrescriptionText(text, opts = {}) {
  return String(text || '').split('\n').map(l => parsePrescriptionLine(l, opts)).filter(Boolean);
}

export function prescriptionToLine(p) {
  if (!p) return '';
  const desc = p.desc || '';
  return p.note ? `${desc} ${NOTE_SEP} ${p.note}` : desc;
}

const splitLines = text => String(text || '').split('\n').map(s => s.trim()).filter(Boolean);

// "reps|nombre|peso" por línea
export function parseMovementsText(text) {
  return splitLines(text).map(line => {
    const [reps, name, weight] = line.split(NOTE_SEP);
    return { reps: reps?.trim() || '', name: name?.trim() || '', weight: weight?.trim() || 'BW' };
  });
}
export const movementsToText = movs => (Array.isArray(movs) ? movs : []).map(m => `${m.reps}${NOTE_SEP}${m.name}${NOTE_SEP}${m.weight || ''}`).join('\n');

// ── Formulario de bloque <-> bloque v2 ─────────────────────────────────────
export function nextBlockId(blocks) {
  const used = new Set((blocks || []).map(b => b?.id));
  let n = 1;
  while (used.has(`b${n}`)) n++;
  return `b${n}`;
}

export function newFormBlock(kind, blocks) {
  const wod = kind === 'wod' ? { type: WOD_TYPES[0], duration: '20 min', format: WOD_FORMATS[0], formatNote: '', gymNote: '', movementsText: '' } : null;
  return {
    id: nextBlockId(blocks), kind, title: BLOCK_KIND_LABELS[kind] || '', notes: '', rest: '',
    rmKeys: [], itemsText: '', prescText: '', tempo: '', wod,
    scoreType: defaultScoreType(kind, wod), base: null,
  };
}

export function blockToForm(b) {
  const wod = b.wod ? {
    type: b.wod.type || WOD_TYPES[0], duration: b.wod.duration || '', format: b.wod.format || WOD_FORMATS[0],
    formatNote: b.wod.formatNote || '', gymNote: b.wod.gymNote || '', movementsText: movementsToText(b.wod.movements),
  } : null;
  return {
    id: b.id, kind: b.kind, title: b.title || '', notes: b.notes || '', rest: b.rest || '',
    rmKeys: Array.isArray(b.rmKeys) ? [...b.rmKeys] : [],
    itemsText: (b.items || []).join('\n'),
    prescText: (b.prescription || []).map(prescriptionToLine).join('\n'),
    tempo: (b.prescription || []).find(p => p?.tempo)?.tempo || '',
    wod, scoreType: b.score?.type || defaultScoreType(b.kind, b.wod), base: b,
  };
}

export function formToBlock(f) {
  const base = f.base || {};
  const out = { ...base, id: f.id, kind: f.kind, title: f.title.trim() };
  const setOrDrop = (k, v) => { if (v) out[k] = v; else delete out[k]; };
  setOrDrop('notes', f.notes.trim());
  if (STRENGTH_KINDS.includes(f.kind)) {
    setOrDrop('rest', f.rest.trim());
    if (f.rmKeys.length) out.rmKeys = [...f.rmKeys]; else delete out.rmKeys;
    out.prescription = parsePrescriptionText(f.prescText, { tempo: f.tempo.trim(), rmKey: f.rmKeys.length === 1 ? f.rmKeys[0] : undefined });
    delete out.items; delete out.wod;
  } else if (f.kind === 'wod') {
    const w = f.wod || {};
    out.wod = {
      ...(base.wod || {}),
      type: w.type, duration: w.duration, format: w.format, formatNote: w.formatNote, gymNote: w.gymNote,
      movements: parseMovementsText(w.movementsText),
    };
    delete out.items; delete out.prescription; delete out.rmKeys; delete out.rest;
  } else {
    out.items = splitLines(f.itemsText);
    delete out.prescription; delete out.wod; delete out.rmKeys; delete out.rest;
  }
  if (f.kind === 'warmup') delete out.score;
  else out.score = { type: f.scoreType || defaultScoreType(f.kind, out.wod) };
  return out;
}

// Ids únicos por día (conserva los existentes; regenera duplicados/vacíos como b1, b2…)
export function ensureUniqueIds(blocks) {
  const used = new Set();
  const fixed = blocks.map(b => {
    if (b.id && !used.has(b.id)) { used.add(b.id); return b; }
    return { ...b, id: null };
  });
  return fixed.map(b => {
    if (b.id) return b;
    let n = 1;
    while (used.has(`b${n}`)) n++;
    used.add(`b${n}`);
    return { ...b, id: `b${n}` };
  });
}

// Día v2 listo para guardar. head: {day, date?, type, label}
export function assembleDay(head, formBlocks) {
  const blocks = ensureUniqueIds(formBlocks.map(formToBlock));
  const day = { day: head.day, type: head.type, label: String(head.label || '').toUpperCase(), blocks };
  if (head.date) day.date = head.date;
  return day;
}

// ── Día existente -> bloques del editor ────────────────────────────────────
// Día v2: bloques tal cual (ids conservados). Día legacy: se convierte con normalizeDay y los ids se
// asignan para que getScorableParts devuelva las mismas claves que el día legacy:
//   todos los strength -> UN bloque id 'strength' (series con el título del bloque como prefijo),
//   primer wod -> id 'wod' (sus partes dan 'wod_0', 'wod_1'… como en legacy), resto -> b1, b2…
export function dayToBuilderBlocks(day) {
  if (!day) return [];
  const legacy = isLegacyDay(day);
  const blocks = (normalizeDay(day).blocks || []).filter(Boolean);
  if (!legacy) return blocks.map(b => ({ ...b }));
  const strength = blocks.filter(b => b.kind === 'strength');
  const out = [];
  let strengthDone = false;
  let wodDone = false;
  blocks.forEach(b => {
    if (b.kind === 'strength') {
      if (strengthDone) return;
      strengthDone = true;
      const multi = strength.length > 1;
      const keys = [...new Set(strength.flatMap(s => s.rmKeys || []))];
      const notes = strength.map(s => s.notes).filter(Boolean).join(DESC_SEP);
      out.push({
        ...b, id: LEGACY_PART_KEYS.STRENGTH,
        ...(keys.length ? { rmKeys: keys } : {}),
        ...(notes ? { notes } : {}),
        prescription: strength.flatMap(s => (s.prescription || []).map(p => (
          multi && s.title ? { ...p, desc: `${s.title}${DESC_SEP}${p.desc || ''}` } : { ...p }
        ))),
      });
    } else if (b.kind === 'wod' && !wodDone) {
      wodDone = true;
      out.push({ ...b, id: LEGACY_PART_KEYS.WOD });
    } else {
      out.push({ ...b });
    }
  });
  const reserved = new Set([LEGACY_PART_KEYS.STRENGTH, LEGACY_PART_KEYS.WOD]);
  let n = 1;
  return out.map(b => {
    const keepsId = (b.id === LEGACY_PART_KEYS.STRENGTH && b.kind === 'strength') || (b.id === LEGACY_PART_KEYS.WOD && b.kind === 'wod');
    if (keepsId) return b;
    while (reserved.has(`b${n}`)) n++;
    return { ...b, id: `b${n++}` };
  });
}

// ── Resúmenes ──────────────────────────────────────────────────────────────
export function rmNames(keys) {
  return (keys || []).map(k => RM_NAMES[k] || k).join(' + ');
}

export function summarizeBlock(b) {
  if (!b) return '';
  const parts = [];
  if (STRENGTH_KINDS.includes(b.kind)) {
    const pres = b.prescription || [];
    if (pres.length) {
      const shown = pres.slice(0, 2).map(p => p.desc || '').filter(Boolean).join(' / ');
      parts.push(shown + (pres.length > 2 ? ` (+${pres.length - 2})` : ''));
    } else parts.push('Sin series');
    if (b.rmKeys?.length) parts.push(`RM: ${rmNames(b.rmKeys)}`);
    if (b.rest) parts.push(`descanso ${b.rest}`);
  } else if (b.kind === 'wod') {
    const w = b.wod || {};
    const nm = (w.movements || []).length;
    parts.push([w.type, w.duration].filter(Boolean).join(' ') || 'WOD');
    parts.push(nm ? `${nm} movimiento${nm === 1 ? '' : 's'}` : (w.parts?.length ? `${w.parts.length} partes` : 'Sin movimientos'));
  } else {
    const n = (b.items || []).length;
    parts.push(n ? `${n} línea${n === 1 ? '' : 's'}` : 'Vacío');
  }
  return parts.filter(Boolean).join(' · ');
}

// Resumen de un programa (para confirmar una subida): semanas, días, bloques por tipo, días sin WOD
export function summarizeProgram(program) {
  const weeks = Array.isArray(program?.weeks) ? program.weeks : [];
  const byKind = {};
  let days = 0;
  let noWod = 0;
  weeks.forEach(w => (w?.days || []).forEach(d => {
    days++;
    const blocks = (normalizeDay(d).blocks || []).filter(Boolean);
    if (!blocks.some(b => b.kind === 'wod')) noWod++;
    blocks.forEach(b => { byKind[b.kind] = (byKind[b.kind] || 0) + 1; });
  }));
  return { name: program?.name || '', weeks: weeks.length, days, byKind, daysWithoutWod: noWod };
}

export function formatProgramSummary(program, warnings = []) {
  const s = summarizeProgram(program);
  const kinds = BLOCK_KINDS.filter(k => s.byKind[k]).map(k => `${BLOCK_KIND_LABELS[k]}: ${s.byKind[k]}`).join(', ');
  const lines = [
    `Programa: ${s.name || '(sin nombre)'}`,
    `${s.weeks} semanas · ${s.days} días`,
    `Bloques: ${kinds || 'ninguno'}`,
    `Días sin WOD: ${s.daysWithoutWod}`,
  ];
  if (warnings.length) lines.push(`Avisos: ${warnings.length}`);
  return lines.join('\n');
}

export const scoreLabel = type => SCORE_TYPE_LABELS[type] || type;
