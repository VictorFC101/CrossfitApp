// Lógica pura extraída de ProgramContext.js — sin dependencias de React/RN.
import { parseDateFromDay } from './dateUtils';
import { inferRmKeyFromText, inferRmKeysFromText, inferAllRmKeysFromText, parseLoad } from './wodLogic';
import { defaultScoreType } from './constants';

// Obtener fecha de inicio y fin de un programa
export function getProgramDateRange(program) {
  const allDays = program.weeks.flatMap(w => w.days);
  const dates = allDays.map(d => parseDateFromDay(d.day)).filter(Boolean);
  if (!dates.length) return { start: null, end: null };
  return {
    start: new Date(Math.min(...dates.map(d => d.getTime()))),
    end: new Date(Math.max(...dates.map(d => d.getTime())))
  };
}

// Determinar qué programa corresponde a hoy
export function getActiveProgram(programs) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  // 1. Buscar programa cuyo rango incluye hoy exactamente
  for (const p of programs) {
    const { start, end } = getProgramDateRange(p);
    if (start && end && today >= start && today <= end) return p;
  }

  // 2. Si no hay ninguno activo hoy, buscar el más reciente pasado
  let bestPast = null;
  let bestPastDiff = Infinity;
  for (const p of programs) {
    const { end } = getProgramDateRange(p);
    if (end && end < today) {
      const diff = today - end;
      if (diff < bestPastDiff) { bestPastDiff = diff; bestPast = p; }
    }
  }
  if (bestPast) return bestPast;

  // 3. Si no hay pasados, el próximo futuro
  let bestFuture = null;
  let bestFutureDiff = Infinity;
  for (const p of programs) {
    const { start } = getProgramDateRange(p);
    if (start && start > today) {
      const diff = start - today;
      if (diff < bestFutureDiff) { bestFutureDiff = diff; bestFuture = p; }
    }
  }
  return bestFuture || programs[0];
}

// Separador entre el título del bloque y la descripción de cada serie
const BLOCK_TITLE_SEP = ' · ';

// Formato nuevo de fuerza: strength.blocks[{title,note,rest,sets}] sin strength.sets.
// Aplana los bloques a strength.sets (formato que esperan las pantallas), conservando
// blocks. Con más de un bloque, antepone el título a cada serie. strength.title vacío
// pasa a ser el título del PRIMER bloque (no se unen títulos: evitaría falsos complejos).
// El RM del día sale del primer bloque si el día no trae rmKey/rmKeys: complejo real
// (2 movimientos) -> rmKeys; un movimiento -> rmKey + rmKeys:null (para que el label
// "BACK SQUAT + SNATCH" no se interprete como complejo). Cada serie lleva el rmKey de
// su bloque si se reconoce (s.rmKey). Idempotente: si ya hay sets devuelve el mismo día.
export function normalizeStrength(day) {
  const st = day?.strength;
  if (!st || Array.isArray(st.sets) || !Array.isArray(st.blocks) || !st.blocks.length) return day;
  const multi = st.blocks.length > 1;
  const sets = st.blocks.flatMap(b => {
    // en un bloque complejo (2 movimientos) la serie usa el RM del día (min de ambos)
    const rmKey = inferRmKeysFromText(b?.title) ? null : inferRmKeyFromText(b?.title);
    return (Array.isArray(b?.sets) ? b.sets : []).map(s => ({
      ...s,
      desc: multi && b.title ? `${b.title}${BLOCK_TITLE_SEP}${s?.desc || ''}` : (s?.desc || ''),
      ...(rmKey ? { rmKey } : {}),
    }));
  });
  const firstTitle = st.blocks[0]?.title || '';
  const out = { ...day, strength: { ...st, title: st.title || firstTitle, sets } };
  if (!day.rmKey && !day.rmKeys) {
    const pair = inferRmKeysFromText(firstTitle);
    const single = pair ? null : inferRmKeyFromText(firstTitle);
    if (pair) out.rmKeys = pair;
    else if (single) { out.rmKey = single; out.rmKeys = null; }
  }
  return out;
}

// ── Schema v2: bloques ─────────────────────────────────────────────────────
// Descripción legible de una prescripción cuando solo trae campos estructurados.
function buildPrescriptionDesc(p) {
  const parts = [];
  const hasComplex = Array.isArray(p.complex) && p.complex.length;
  const cx = hasComplex ? `(${p.complex.map(c => `${c.reps} ${c.movement}`).join(' + ')})` : '';
  if (hasComplex) parts.push(p.sets ? `${p.sets}×${cx}` : cx);
  else if (p.sets && p.reps) parts.push(`${p.sets}×${p.reps}`);
  else if (p.sets) parts.push(`${p.sets} series`);
  else if (p.reps) parts.push(`${p.reps} reps`);
  const l = p.load;
  if (l) {
    if (l.pct != null) parts.push(`@ ${l.pct}%`);
    else if (l.pctMin != null && l.pctMax != null) parts.push(`@ ${l.pctMin}-${l.pctMax}%`);
    else if (l.kg != null) parts.push(`@ ${l.kg}kg`);
    else if (l.rpe != null) parts.push(`RPE ${l.rpe}`);
  }
  return parts.join(' ');
}

function normalizePrescription(p) {
  if (!p || typeof p !== 'object') return p;
  const out = { ...p };
  if (!out.desc) out.desc = buildPrescriptionDesc(out);
  if (!out.load) {
    const load = parseLoad(out.desc);
    if (load) out.load = load;
  }
  return out;
}

function normalizeBlock(b, i) {
  if (!b || typeof b !== 'object') return b;
  const out = { ...b };
  if (!out.id) out.id = `${out.kind || 'bloque'}-${i + 1}`;
  if (!out.score || !out.score.type) out.score = { type: defaultScoreType(out.kind, out.wod) };
  if (Array.isArray(out.prescription)) {
    out.prescription = out.prescription.map(normalizePrescription);
    if (!out.rmKeys) {
      const keys = inferAllRmKeysFromText(out.title);
      if (keys.length) out.rmKeys = keys;
    }
  }
  return out;
}

function blocksFromLegacy(day) {
  const blocks = [];
  const add = b => blocks.push({ id: `${b.kind}-${blocks.length + 1}`, ...b, score: { type: defaultScoreType(b.kind, b.wod) } });
  if (Array.isArray(day.warmup) && day.warmup.length) {
    add({ kind: 'warmup', title: 'Calentamiento', items: day.warmup });
  }
  const st = day.strength;
  if (st && typeof st === 'object') {
    const toPresc = (sets, rmKey) => (Array.isArray(sets) ? sets : []).map(x => normalizePrescription({
      desc: x?.desc || '', ...(x?.note ? { note: x.note } : {}), ...((x?.rmKey || rmKey) ? { rmKey: x.rmKey || rmKey } : {}),
    }));
    if (Array.isArray(st.blocks) && st.blocks.length) {
      st.blocks.forEach(b => {
        const keys = inferAllRmKeysFromText(b?.title);
        add({
          kind: 'strength', title: b?.title || st.title || st.name || 'Fuerza',
          ...(b?.note ? { notes: b.note } : {}), ...(b?.rest ? { rest: b.rest } : {}),
          ...(keys.length ? { rmKeys: keys } : {}),
          prescription: toPresc(b?.sets),
        });
      });
    } else {
      const title = st.title || st.name || 'Fuerza';
      const keys = Array.isArray(day.rmKeys) && day.rmKeys.length ? day.rmKeys : (day.rmKey ? [day.rmKey] : inferAllRmKeysFromText(title));
      add({
        kind: 'strength', title,
        ...(st.note ? { notes: st.note } : {}), ...(st.rest ? { rest: st.rest } : {}),
        ...(keys.length ? { rmKeys: keys } : {}),
        prescription: toPresc(st.sets),
      });
    }
  }
  const w = day.wod;
  if (w && typeof w === 'object') {
    if (w.movements || w.parts || w.emomMinutes || w.type || w.format) {
      add({ kind: 'wod', title: 'WOD', wod: w });
    }
    if (w.freeContent) {
      add({ kind: 'free', title: 'Contenido libre', items: Array.isArray(w.freeContent) ? w.freeContent : [String(w.freeContent)] });
    }
  }
  const g = day.gymExtra;
  if (g && typeof g === 'object') {
    add({
      kind: 'accessory', title: g.title || 'Accesorios',
      ...(g.focus ? { notes: g.focus } : {}),
      items: (Array.isArray(g.blocks) ? g.blocks : []).map(x => (x?.detail ? `${x.label}: ${x.detail}` : String(x?.label || ''))),
    });
  }
  return blocks;
}

// Campos legacy (strength/wod/warmup) sintetizados desde blocks para que las
// pantallas actuales (que leen day.strength / day.wod) sigan funcionando.
function synthesizeLegacy(day, blocks) {
  const out = { ...day };
  const strengthBlocks = blocks.filter(b => b && (b.kind === 'strength' || b.kind === 'lift'));
  if (out.strength === undefined) {
    if (strengthBlocks.length) {
      const multi = strengthBlocks.length > 1;
      const first = strengthBlocks[0];
      const sets = strengthBlocks.flatMap(b => (Array.isArray(b.prescription) ? b.prescription : []).map(p => {
        const rmKey = p.rmKey || (b.rmKeys && b.rmKeys.length === 1 ? b.rmKeys[0] : undefined);
        return {
          desc: multi && b.title ? `${b.title}${BLOCK_TITLE_SEP}${p.desc || ''}` : (p.desc || ''),
          ...(p.note ? { note: p.note } : {}),
          ...(rmKey ? { rmKey } : {}),
        };
      }));
      out.strength = {
        title: first.title || 'Fuerza', name: first.title || 'Fuerza', sets,
        ...(first.rest ? { rest: first.rest } : {}), ...(first.notes ? { note: first.notes } : {}),
      };
    } else {
      out.strength = null;
    }
  }
  if (out.wod === undefined) {
    const wb = blocks.find(b => b && b.kind === 'wod' && b.wod);
    out.wod = wb ? wb.wod : null;
  }
  if (out.warmup === undefined) {
    out.warmup = blocks.filter(b => b && b.kind === 'warmup').flatMap(b => (Array.isArray(b.items) ? b.items : []));
  }
  const firstStrength = strengthBlocks[0];
  if (out.rmKey === undefined && out.rmKeys === undefined && firstStrength?.rmKeys?.length) {
    if (firstStrength.rmKeys.length === 2) out.rmKeys = firstStrength.rmKeys;
    else { out.rmKey = firstStrength.rmKeys[0]; out.rmKeys = null; }
  }
  if (!out.label) out.label = firstStrength?.title || blocks.find(b => b?.title)?.title || '';
  if (!out.type) {
    out.type = blocks.some(b => b?.kind === 'lift') ? 'Halterofilia' : strengthBlocks.length ? 'Fuerza' : 'Libre';
  }
  return out;
}

// Garantiza day.blocks (array). Con blocks (v2) rellena valores por defecto y
// sintetiza los campos legacy que falten; sin blocks los deriva de los legacy.
// Conserva todos los campos legacy intactos. Idempotente.
const derivedBlocks = new WeakSet(); // arrays de blocks derivados de legacy (para ser idempotente sin tocar los campos del día)

export function normalizeDay(day) {
  if (!day || typeof day !== 'object') return day;
  if (Array.isArray(day.blocks) && derivedBlocks.has(day.blocks)) return day;
  if (Array.isArray(day.blocks)) {
    const blocks = day.blocks.map(normalizeBlock);
    return synthesizeLegacy({ ...day, blocks }, blocks);
  }
  const base = normalizeStrength(day);
  const blocks = blocksFromLegacy(base);
  derivedBlocks.add(blocks);
  return { ...base, blocks };
}

// Normaliza todos los días de un programa (devuelve un programa nuevo)
export function normalizeProgramDays(program) {
  if (!Array.isArray(program?.weeks)) return program;
  return {
    ...program,
    weeks: program.weeks.map(w => (
      Array.isArray(w?.days) ? { ...w, days: w.days.map(normalizeDay) } : w
    )),
  };
}

// Enriquecer programa con metadata calculada
export function enrichProgram(rawProgram) {
  const program = normalizeProgramDays(rawProgram);
  const { start, end } = getProgramDateRange(program);
  const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  let status = 'futuro';
  if (start && end) {
    if (today >= start && today <= end) status = 'activo';
    else if (end < today) status = 'completado';
  }

  const title = program.name || (() => {
    if (!start) return 'Programa';
    const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    if (!end || start.getMonth() === end.getMonth()) {
      return `CrossFit ${MONTHS_FULL[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `CrossFit ${MONTHS[start.getMonth()]}–${MONTHS[end.getMonth()]} ${start.getFullYear()}`;
  })();

  const range = start && end
    ? `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`
    : '';

  return { ...program, _meta: { start, end, status, title, range } };
}

// Fallo de red o timeout (no errores de permisos/datos)
export function isNetworkError(e) {
  return /network|fetch|abort|timed? ?out/i.test(`${e?.name || ''} ${e?.message || ''}`);
}

// Convertir fila de Supabase a objeto de programa
export function rowToProgram(row) {
  return { ...row.data, id: row.id, name: row.name || row.data?.name };
}
