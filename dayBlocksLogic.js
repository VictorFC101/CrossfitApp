// Lógica pura de DayBlocks (render de day.blocks) — sin dependencias de React/RN.
import { normalizeDay } from './programLogic';
import { parseLoad, RM_KEY_NAMES } from './wodLogic';

// Bloques de un día (garantiza day.blocks aunque el día no venga normalizado)
export function getDayBlocks(day) {
  if (!day) return [];
  if (Array.isArray(day.blocks)) return day.blocks;
  const n = normalizeDay(day);
  return Array.isArray(n?.blocks) ? n.blocks : [];
}

export function hasWodContent(wod) {
  return !!(wod && (wod.movements?.length > 0 || wod.parts?.length > 0 || wod.emomMinutes?.length > 0));
}

// ¿Tiene el bloque algo que mostrar?
export function blockHasContent(block) {
  if (!block) return false;
  switch (block.kind) {
    case 'wod': return hasWodContent(block.wod);
    case 'strength':
    case 'lift': return (block.prescription?.length > 0) || !!block.notes || !!block.rest;
    default: return (block.items?.length > 0) || !!block.notes;
  }
}

// Bloques que se pintan, en orden. opts.hideKinds: tipos a omitir.
export function getVisibleBlocks(day, opts = {}) {
  const hide = opts.hideKinds || [];
  return getDayBlocks(day).filter(b => b && !hide.includes(b.kind) && blockHasContent(b));
}

// Carga de una serie: la explícita o la deducida del texto
export function getPrescriptionLoad(p) {
  return p?.load || parseLoad(p?.desc) || null;
}

const fmt = n => String(Math.round(n * 10) / 10).replace(/\.0$/, '');

// Etiqueta de carga: "75%", "70–80%", "100kg", "RPE 8"
export function formatLoadLabel(load) {
  if (!load) return null;
  if (load.pct != null) return `${fmt(load.pct)}%`;
  if (load.pctMin != null && load.pctMax != null) return `${fmt(load.pctMin)}–${fmt(load.pctMax)}%`;
  if (load.kg != null) return `${fmt(load.kg)}kg`;
  if (load.rpe != null) return `RPE ${fmt(load.rpe)}`;
  return null;
}

// ¿El texto de la serie ya muestra la carga? (entonces no hace falta insignia aparte)
export function descShowsLoad(p) {
  return !!parseLoad(p?.desc);
}

// kg de una serie para un RM dado: "70kg", "56–64kg" o null
export function computeSetKg(load, rm) {
  const r = parseFloat(rm);
  if (!load || !(r > 0)) return null;
  const round = x => Math.round(r * x / 100);
  if (load.pct != null) return `${round(load.pct)}kg`;
  if (load.pctMin != null && load.pctMax != null) return `${round(load.pctMin)}–${round(load.pctMax)}kg`;
  return null;
}

// Porcentaje para la barra de progreso (pct o el máximo del rango)
export function loadBarPercent(load) {
  if (!load) return null;
  if (load.pct != null) return load.pct;
  if (load.pctMax != null) return load.pctMax;
  return null;
}

// RM de un bloque con sus propios rmKeys (más bajo si hay varios = complejo).
// fallbackKey: clave del día para bloques sin rmKeys (días legacy).
export function resolveBlockRM(block, rms = {}, fallbackKey = null) {
  const keys = block?.rmKeys?.length ? block.rmKeys : (fallbackKey ? [fallbackKey] : []);
  if (!keys.length) return { rmKey: null, rmVal: NaN, hasRM: false, isComplex: false, limitName: null };
  const isComplex = keys.length > 1;
  const avail = keys.map(k => ({ k, v: parseFloat(rms[k]) })).filter(x => x.v > 0);
  if (!avail.length) return { rmKey: keys[0], rmVal: NaN, hasRM: false, isComplex, limitName: null };
  const low = avail.reduce((a, b) => (b.v < a.v ? b : a));
  return { rmKey: low.k, rmVal: low.v, hasRM: true, isComplex, limitName: isComplex ? RM_KEY_NAMES[low.k] : null };
}

// RM aplicable a una serie: el de su propio rmKey, o el del bloque
export function resolveSetRM(p, blockRM, rms = {}) {
  const own = parseFloat(rms?.[p?.rmKey]);
  if (own > 0) return own;
  return blockRM?.hasRM ? blockRM.rmVal : NaN;
}

// Resumen 65/72/78% de un RM
export function suggestedPercentLine(rmVal) {
  return [65, 72, 78].map(p => `${p}%→${Math.round(rmVal * p / 100)}kg`).join('  ·  ');
}

// Cabecera del bloque WOD: "DOBLE WOD" | "AMRAP 12'" | ''
export function wodHeaderSuffix(wod) {
  if (!wod) return '';
  if (wod.parts) return 'DOBLE WOD';
  if (wod.type) return `${wod.type}${wod.duration ? ` ${wod.duration}` : ''}`;
  return '';
}

// Primer wod del día (para adaptación/título)
export function getPrimaryWod(day) {
  const b = getDayBlocks(day).find(x => x?.kind === 'wod' && x.wod);
  return b ? b.wod : (day?.wod || null);
}
