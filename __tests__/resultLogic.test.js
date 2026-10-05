import {
  getScorableParts, isSingleLegacyWod, formatPartResult, parsePartResult, summarizeParts,
  valueToDraft, draftToValue, partStateFromSaved, buildPartItem, partHasData, bestLoadOfResultado,
} from '../resultLogic';
import { normalizeDay } from '../programLogic';

const amrap = { type: 'AMRAP', duration: "12'", movements: [{ reps: 10, name: 'Burpees' }] };
const strength = { title: 'Back Squat', sets: [{ desc: '5×5 al 75%' }] };

describe('getScorableParts', () => {
  it('día legacy fuerza + WOD: claves legacy strength y wod', () => {
    const parts = getScorableParts({ strength, wod: amrap });
    expect(parts.map(p => p.key)).toEqual(['strength', 'wod']);
    expect(parts.map(p => p.scoreType)).toEqual(['load', 'rounds_reps']);
    expect(parts[0].label).toBe('FUERZA');
  });
  it('WOD con partes: wod_0, wod_1 con tipo por parte', () => {
    const wod = { parts: [{ label: 'A', type: 'AMRAP 8', movements: [] }, { label: 'B', type: 'FOR TIME', movements: [] }] };
    const parts = getScorableParts(normalizeDay({ wod }));
    expect(parts.map(p => p.key)).toEqual(['wod_0', 'wod_1']);
    expect(parts.map(p => p.scoreType)).toEqual(['rounds_reps', 'time']);
  });
  it('legacy solo WOD es el WOD único', () => {
    const parts = getScorableParts({ wod: amrap });
    expect(isSingleLegacyWod(parts)).toBe(true);
    expect(isSingleLegacyWod(getScorableParts({ strength, wod: amrap }))).toBe(false);
  });
  it('día v2 solo de lift: una parte load con el título del lift', () => {
    const day = { blocks: [
      { id: 'w', kind: 'warmup', items: ['x'] },
      { id: 'l1', kind: 'lift', title: 'Snatch', rmKeys: ['sn'], prescription: [{ desc: '3×2' }] },
    ] };
    const parts = getScorableParts(day);
    expect(parts).toHaveLength(1);
    expect(parts[0]).toMatchObject({ key: 'l1', label: 'SNATCH', scoreType: 'load', blockKind: 'lift', rmKeys: ['sn'] });
  });
  it('ignora bloques con score none', () => {
    const day = { blocks: [{ id: 'l1', kind: 'lift', title: 'Snatch', prescription: [{ desc: '3×2' }], score: { type: 'none' } }] };
    expect(getScorableParts(day)).toEqual([]);
    expect(getScorableParts(null)).toEqual([]);
  });
});

describe('formatPartResult', () => {
  it('formatos por tipo', () => {
    expect(formatPartResult('load', { kg: 100, reps: 3 })).toBe('100 kg × 3');
    expect(formatPartResult('load', { kg: 82.5, reps: null })).toBe('82,5 kg');
    expect(formatPartResult('time', { seconds: 888 })).toBe('14:48');
    expect(formatPartResult('rounds_reps', { rounds: 5, reps: 12, seconds: 870 })).toBe('5+12 · 14:30');
    expect(formatPartResult('rounds_reps', { rounds: 5, reps: 0, seconds: null })).toBe('5+0');
    expect(formatPartResult('reps', { reps: 45 })).toBe('45 reps');
    expect(formatPartResult('load', null)).toBe('');
  });
});

describe('parsePartResult', () => {
  it('lift en varios formatos', () => {
    expect(parsePartResult('load', '100 kg × 3')).toEqual({ kg: 100, reps: 3 });
    expect(parsePartResult('load', '100kg x3')).toEqual({ kg: 100, reps: 3 });
    expect(parsePartResult('load', '5x94')).toEqual({ kg: 94, reps: 5 });
    expect(parsePartResult('load', '5×80kg')).toEqual({ kg: 80, reps: 5 });
    expect(parsePartResult('load', '82,5 kg')).toEqual({ kg: 82.5, reps: null });
    expect(parsePartResult('load', '10 / 20 / 30 / 40')).toEqual({ kg: 40, reps: null });
    expect(parsePartResult('load', 'pesado pero bien')).toBeNull();
    expect(parsePartResult('load', '')).toBeNull();
  });
  it('WOD legacy', () => {
    expect(parsePartResult('rounds_reps', '5+12 · 14:30')).toEqual({ rounds: 5, reps: 12, seconds: 870 });
    expect(parsePartResult('rounds_reps', '14:48')).toEqual({ rounds: null, reps: null, seconds: 888 });
    expect(parsePartResult('time', '14:48')).toEqual({ seconds: 888 });
    expect(parsePartResult('time', '5+12 · 14:30')).toEqual({ seconds: 870, rounds: 5, reps: 12 });
    expect(parsePartResult('time', 'abc')).toBeNull();
  });
  it('reps', () => {
    expect(parsePartResult('reps', '45')).toEqual({ reps: 45 });
    expect(parsePartResult('reps', '45 reps')).toEqual({ reps: 45 });
  });
  it('ida y vuelta formato -> parseo', () => {
    ['5+12 · 14:30', '14:48', '5+0'].forEach(txt => {
      const v = parsePartResult('rounds_reps', txt);
      expect(formatPartResult('rounds_reps', v)).toBe(txt);
    });
    const v = { kg: 100, reps: 3 };
    expect(parsePartResult('load', formatPartResult('load', v))).toEqual(v);
  });
});

describe('borrador', () => {
  it('draftToValue / valueToDraft', () => {
    expect(draftToValue('load', { kg: '82,5', reps: '3' })).toEqual({ kg: 82.5, reps: 3 });
    expect(draftToValue('load', { kg: '', reps: '3' })).toBeNull();
    expect(draftToValue('time', { minutos: '14', segundos: '48' })).toEqual({ seconds: 888 });
    expect(draftToValue('rounds_reps', { rondas: '5', repsExtra: '', minutos: '14', segundos: '30' }))
      .toEqual({ rounds: 5, reps: 0, seconds: 870 });
    expect(valueToDraft('load', { kg: 100, reps: 3 })).toMatchObject({ kg: '100', reps: '3' });
    expect(valueToDraft('time', { seconds: 65 })).toMatchObject({ minutos: '1', segundos: '05' });
  });
});

describe('partes guardadas', () => {
  const loadPart = { key: 'strength', label: 'FUERZA', scoreType: 'load' };
  const wodPart = { key: 'wod_0', label: 'A', scoreType: 'rounds_reps' };

  it('item nuevo con value y resultado formateado', () => {
    const st = { draft: valueToDraft('load', { kg: 100, reps: 3 }), notas: 'ok', rx: false, legacyText: '' };
    expect(buildPartItem(loadPart, st)).toEqual({
      key: 'strength', label: 'FUERZA', scoreType: 'load', value: { kg: 100, reps: 3 }, resultado: '100 kg × 3', notas: 'ok', rx: false,
    });
  });
  it('carga items antiguos sin scoreType/value parseando el texto', () => {
    const s = partStateFromSaved(wodPart, { key: 'wod_0', label: 'A', resultado: '5+12 · 14:30', notas: 'n', rx: true });
    expect(draftToValue('rounds_reps', s.draft)).toEqual({ rounds: 5, reps: 12, seconds: 870 });
    expect(s.legacyText).toBe('');
    const l = partStateFromSaved(loadPart, { key: 'strength', resultado: '5×80kg' });
    expect(buildPartItem(loadPart, l).resultado).toBe('80 kg × 5');
  });
  it('texto no interpretable no se pierde', () => {
    const s = partStateFromSaved(loadPart, { key: 'strength', resultado: '5 series pesadas' });
    expect(s.legacyText).toBe('5 series pesadas');
    expect(partHasData(loadPart, s)).toBe(true);
    const item = buildPartItem(loadPart, s);
    expect(item.value).toBeNull();
    expect(item.resultado).toBe('5 series pesadas');
  });
  it('per-set legacy "80 / 90 / 100" -> mejor serie', () => {
    const s = partStateFromSaved(loadPart, { key: 'strength', resultado: '80 / 90 / 100' });
    expect(buildPartItem(loadPart, s).resultado).toBe('100 kg');
  });
  it('sin guardado: estado vacío', () => {
    const s = partStateFromSaved(loadPart, undefined);
    expect(partHasData(loadPart, s)).toBe(false);
  });
});

describe('summarizeParts', () => {
  it('mantiene el formato LABEL: x · LABEL: y', () => {
    expect(summarizeParts([
      { label: 'FUERZA', resultado: '100 kg × 3' }, { label: 'WOD', resultado: '' },
    ])).toBe('FUERZA: 100 kg × 3 · WOD: —');
  });
});

describe('bestLoadOfResultado', () => {
  it('mejor kg entre partes load y legacy strength', () => {
    const r = { partes: [
      { key: 'strength', resultado: '90 / 100' },
      { key: 'l2', scoreType: 'load', value: { kg: 110, reps: 2 }, resultado: '110 kg × 2' },
      { key: 'wod', resultado: '14:30' },
    ] };
    expect(bestLoadOfResultado(r)).toEqual({ kg: 110, reps: 2, text: '110 kg × 2' });
  });
  it('sin partes interpreta el texto; un WOD no es carga', () => {
    expect(bestLoadOfResultado({ resultado: '100 kg × 3' }).kg).toBe(100);
    expect(bestLoadOfResultado({ resultado: '5+12 · 14:30' })).toBeNull();
    expect(bestLoadOfResultado(null)).toBeNull();
  });
});

describe('regresión F3: día legacy 28 Jul (Halterofilia con 2 strength.blocks)', () => {
  const day = normalizeDay({
    day: 'Martes 28 Jul', type: 'Halterofilia', label: 'CLEAN & JERK',
    strength: { blocks: [
      { title: 'Clean & Jerk Complex — 6 sets', rest: "2'–2'30", note: null, sets: [
        { desc: '1 Squat Clean + 1 Front Squat + 1 Push Jerk + 1 Split Jerk — Sets 1–2: 70%', note: '63 kg' },
        { desc: 'Sets 3–4: 75%', note: '67,5 kg' }, { desc: 'Sets 5–6: 80%', note: '72 kg' }] },
      { title: 'Skill · HSW — 8 min', rest: null, note: null, sets: [{ desc: '5–6 intentos de 10–20 m', note: 'Descanso completo · no llegar al fallo técnico' }] },
    ] },
    wod: { type: "5×4' WORK / 1' REST", duration: '25 min', movements: [{ reps: 10, name: 'Burpees' }] },
  });
  const saved = {
    resultado: 'FUERZA: 10 / 20 / 30 / 40 · WOD: 2+0 · 10:00',
    partes: [
      { key: 'strength', label: 'FUERZA', resultado: '10 / 20 / 30 / 40', rx: true, notas: '' },
      { key: 'wod', label: 'WOD', resultado: '2+0 · 10:00', rx: true, notas: '' },
    ],
  };

  it('B2: exactamente 2 partes con claves legacy; WOD desconocido -> rondas+tiempo', () => {
    const parts = getScorableParts(day);
    expect(parts.map(p => p.key)).toEqual(['strength', 'wod']);
    expect(parts[0]).toMatchObject({ label: 'FUERZA', scoreType: 'load' });
    expect(parts[1].scoreType).toBe('rounds_reps');
  });
  it('B2: un día v2 (blocks propios) sigue dando una parte por bloque puntuable', () => {
    const v2 = normalizeDay({ blocks: [
      { id: 'a', kind: 'strength', title: 'Back Squat', prescription: [{ desc: '5x5' }] },
      { id: 'b', kind: 'lift', title: 'Snatch', prescription: [{ desc: '3x2' }] },
      { id: 'c', kind: 'skill', title: 'HSW', items: ['x'] },
    ] });
    const keys = getScorableParts(v2).map(p => p.key);
    expect(keys).toEqual(['strength', 'b']);
  });
  it('B3: tipos de WOD', () => {
    const t = type => getScorableParts(normalizeDay({ wod: { type, movements: [{ name: 'x', reps: 1 }] } }))[0].scoreType;
    expect(t('FOR TIME')).toBe('time');
    expect(t('AMRAP 12')).toBe('rounds_reps');
    expect(t('EMOM 10')).toBe('rounds_reps');
  });
  it('B1: partStateFromSaved precarga FUERZA 40 kg y WOD 2+0 · 10:00', () => {
    const [ps, pw] = getScorableParts(day);
    const s = partStateFromSaved(ps, saved.partes[0]);
    expect(s.draft.kg).toBe('40');
    expect(s.draft.reps).toBe('');
    expect(s.legacyText).toBe('');
    const w = partStateFromSaved(pw, saved.partes[1]);
    expect(w.draft).toMatchObject({ rondas: '2', repsExtra: '0', minutos: '10', segundos: '00' });
  });
  it('B1: WOD tipo time con rondas guardadas también precarga rondas', () => {
    const d = valueToDraft('time', { rounds: 2, reps: 0, seconds: 600 });
    expect(d).toMatchObject({ rondas: '2', repsExtra: '0', minutos: '10' });
  });
  it('B4: decimales con coma en texto, número en value, parser acepta ambos', () => {
    expect(formatPartResult('load', { kg: 57.5, reps: 2 })).toBe('57,5 kg × 2');
    expect(parsePartResult('load', '57.5 kg × 2')).toEqual({ kg: 57.5, reps: 2 });
    expect(parsePartResult('load', '57,5 kg × 2')).toEqual({ kg: 57.5, reps: 2 });
    expect(valueToDraft('load', { kg: 57.5, reps: null }).kg).toBe('57,5');
    const it = buildPartItem({ key: 'strength', label: 'FUERZA', scoreType: 'load' }, { draft: { ...valueToDraft('load', null), kg: '57,5', reps: '2' } });
    expect(it.value.kg).toBe(57.5);
    expect(it.resultado).toBe('57,5 kg × 2');
  });
});
