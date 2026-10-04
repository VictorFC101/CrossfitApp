// Lógica pura para compartir un resultado (día de programa o WOD libre).
// Normaliza ambas fuentes a un único objeto que consume la tarjeta de compartir.
import { parseDateFromDay } from './dateUtils';

export const CHIP = { RX: 'RX', SCALED: 'SCALED', LIBRE: 'LIBRE' };
export const HIDDEN_DURATION_TYPES = ['STRENGTH', 'LIBRE'];
export const MAX_SHARE_MOVEMENTS = 5;
const EMPTY_MOVEMENT_NAME = '—';
const RESULT_SEPARATOR = ' · ';
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const TIME_RE = /^\d{1,2}:\d{2}$/;
const ROUNDS_RE = /^\d+\+\d+$/;

// Solo acepta formatos estrictos: tiempo mm:ss y rondas N+M
export function parseResultParts(resultado) {
  const segs = (resultado || '').split(RESULT_SEPARATOR).map(s => s.trim());
  const time = segs.find(s => TIME_RE.test(s)) || '';
  const roundsSeg = segs.find(s => ROUNDS_RE.test(s)) || '';
  const [rounds, reps] = roundsSeg ? roundsSeg.split('+') : ['', ''];
  return { time, rounds, reps };
}

function formatDateLabel(date) {
  return `${date.getDate()} ${MESES[date.getMonth()]} ${date.getFullYear()}`;
}

const toMovement = m => ({ reps: m.reps, name: m.name, weight: m.weight });
const isRealMovement = m => m && m.name !== EMPTY_MOVEMENT_NAME;

function programMovements(wod) {
  if (wod?.movements) return wod.movements.filter(isRealMovement).slice(0, MAX_SHARE_MOVEMENTS).map(toMovement);
  if (wod?.parts) {
    return wod.parts
      .flatMap(p => p.movements?.filter(isRealMovement) || [])
      .slice(0, MAX_SHARE_MOVEMENTS)
      .map(toMovement);
  }
  if (wod?.emomMinutes) {
    return wod.emomMinutes.slice(0, MAX_SHARE_MOVEMENTS).map(m => ({ reps: m.min, name: m.work }));
  }
  return [];
}

export function fromProgramDay(day, result) {
  if (!day || !result?.resultado) return null;
  const date = parseDateFromDay(day.day);
  const typeLabel = [day.wod?.type, day.type?.toUpperCase()].filter(Boolean).join(RESULT_SEPARATOR);
  return {
    title: day.label || day.day || '',
    dateISO: date ? date.toISOString() : null,
    dateLabel: date ? formatDateLabel(date) : '',
    typeLabel,
    durationLabel: day.wod?.duration || '',
    movements: programMovements(day.wod),
    resultado: result.resultado,
    resultParts: parseResultParts(result.resultado),
    chip: result.rx ? CHIP.RX : CHIP.SCALED,
    notas: result.notas || '',
    breakdown: (result.partes || [])
      .filter(p => p.resultado)
      .map(p => ({ label: p.label || p.key || '', resultado: p.resultado })),
  };
}

export function fromWodLibre(wod) {
  if (!wod?.resultado) return null;
  const date = wod.fecha ? new Date(wod.fecha) : null;
  const validDate = date && !isNaN(date.getTime()) ? date : null;
  const tipo = wod.tipo || '';
  const hideDuration = HIDDEN_DURATION_TYPES.includes(tipo.toUpperCase());
  return {
    title: wod.nombre || '',
    dateISO: validDate ? wod.fecha : null,
    dateLabel: validDate ? formatDateLabel(validDate) : '',
    typeLabel: tipo,
    durationLabel: hideDuration ? '' : (wod.duracion || ''),
    movements: (wod.movimientos || []).filter(isRealMovement).slice(0, MAX_SHARE_MOVEMENTS).map(toMovement),
    resultado: wod.resultado,
    resultParts: parseResultParts(wod.resultado),
    chip: CHIP.LIBRE,
    notas: wod.notas || '',
    breakdown: [],
  };
}
