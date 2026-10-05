import { normalizeDay, enrichProgram } from '../programLogic';
import { parseLoad, parsePercent, inferRmKeysFromText, inferAllRmKeysFromText, inferRmKeyFromText } from '../wodLogic';
import { validateProgram } from '../programValidation';
import { defaultScoreType } from '../constants';

const template = require('../docs/plantilla_halterofilia_v2.json');

const legacyDay = {
  day: 'Lunes 30 Mar', type: 'Fuerza', label: 'BACK SQUAT', rmKey: 'bs',
  warmup: ['Remo 5 min'],
  strength: { title: 'Back Squat', sets: [{ desc: '5×5 al 75%', rmKey: 'bs' }], rest: '2 min', note: 'ojo' },
  wod: { type: 'AMRAP', duration: '10 min', format: 'AMRAP', movements: [{ reps: '10', name: 'Burpees', weight: '' }] },
  gymExtra: { title: 'Extra', focus: 'Core', blocks: [{ label: 'Plank', detail: '3x30s' }] },
};

describe('normalizeDay', () => {
  it('deriva blocks de un día legacy y conserva los campos legacy', () => {
    const out = normalizeDay(legacyDay);
    expect(out.blocks.map(b => b.kind)).toEqual(['warmup', 'strength', 'wod', 'accessory']);
    expect(out.strength).toEqual(legacyDay.strength);
    expect(out.wod).toBe(legacyDay.wod);
    const wod = out.blocks.find(b => b.kind === 'wod');
    expect(wod.score.type).toBe('rounds_reps');
    expect(out.blocks[1].score.type).toBe('load');
    expect(out.blocks[1].prescription[0].load).toEqual({ pct: 75 });
    expect(out.blocks[1].title).toBe('Back Squat');
  });
  it('usa strength.name si no hay title y crea un bloque por strength.blocks', () => {
    const out = normalizeDay({ strength: { name: 'Press', sets: [{ desc: '3×5' }] } });
    expect(out.blocks[0].title).toBe('Press');
    const multi = normalizeDay({ strength: { title: '', blocks: [
      { title: 'Snatch', sets: [{ desc: '3×2 al 70%' }] }, { title: 'Back Squat', sets: [{ desc: '5×5 al 75%' }] }] } });
    expect(multi.blocks.filter(b => b.kind === 'strength')).toHaveLength(2);
  });
  it('v2: respeta blocks, rellena id/score/load', () => {
    const out = normalizeDay({ day: 'X', blocks: [
      { kind: 'lift', title: 'Snatch', prescription: [{ desc: '5×2 @ 70-75%' }] },
      { kind: 'wod', wod: { type: 'FOR TIME', movements: [] } },
    ] });
    expect(out.blocks[0].id).toBeTruthy();
    expect(out.blocks[0].score).toEqual({ type: 'load' });
    expect(out.blocks[0].prescription[0].load).toEqual({ pctMin: 70, pctMax: 75 });
    expect(out.blocks[1].score).toEqual({ type: 'time' });
  });
  it('v2: sintetiza strength/wod/warmup legacy', () => {
    const out = normalizeDay(template.weeks[0].days[0]);
    expect(out.strength.sets.length).toBeGreaterThan(0);
    expect(out.strength.title).toBeTruthy();
    expect(out.wod).toBeNull();
    expect(out.warmup.length).toBeGreaterThan(0);
    const tue = normalizeDay(template.weeks[0].days[1]);
    expect(tue.wod.type).toBe('FOR TIME');
  });
  it('v2: sin bloques de fuerza ni wod -> strength y wod null', () => {
    const out = normalizeDay({ day: 'X', blocks: [{ kind: 'free', items: ['a'] }] });
    expect(out.strength).toBeNull();
    expect(out.wod).toBeNull();
  });
  it('es idempotente y enrichProgram lo aplica', () => {
    const once = normalizeDay(legacyDay);
    expect(normalizeDay(once).blocks).toEqual(once.blocks);
    const p = enrichProgram({ weeks: [{ days: [legacyDay] }] });
    expect(Array.isArray(p.weeks[0].days[0].blocks)).toBe(true);
  });
});

describe('parseLoad', () => {
  it.each([
    ['75%', { pct: 75 }],
    ['5×3 al 72,5%', { pct: 72.5 }],
    ['70-80%', { pctMin: 70, pctMax: 80 }],
    ['@ 70–80 %', { pctMin: 70, pctMax: 80 }],
    ['100kg', { kg: 100 }],
    ['3×5 @ 60 kg', { kg: 60 }],
    ['RPE 8', { rpe: 8 }],
    ['@RPE 7.5', { rpe: 7.5 }],
    ['sin carga', null],
    [undefined, null],
  ])('%s', (input, expected) => expect(parseLoad(input)).toEqual(expected));
  it('parsePercent no cambia', () => expect(parsePercent('70-80%')).toBe(80));
});

describe('alias en español', () => {
  it.each([
    ['Arrancada', 'sn'], ['Dos tiempos', 'cj'], ['Envión', 'cj'], ['Cargada', 'clean'],
    ['Sentadilla frontal', 'fs'], ['Sentadilla trasera', 'bs'], ['Peso muerto', 'dl'],
    ['Peso muerto rumano', 'rmd'], ['Press militar', 'sp'], ['Press estricto', 'sp'],
  ])('%s -> %s', (txt, key) => expect(inferRmKeyFromText(txt)).toBe(key));
  it('inferRmKeysFromText mantiene el máximo de 2', () => {
    expect(inferRmKeysFromText('Arrancada + Sentadilla frontal')).toEqual(['sn', 'fs']);
    expect(inferRmKeysFromText('Arrancada, cargada, sentadilla frontal')).toHaveLength(2);
  });
  it('inferAllRmKeysFromText devuelve todos', () => {
    expect(inferAllRmKeysFromText('Arrancada + sentadilla frontal + peso muerto')).toEqual(['sn', 'fs', 'dl']);
    expect(inferAllRmKeysFromText('nada')).toEqual([]);
  });
});

describe('validateProgram', () => {
  it('la plantilla v2 pasa sin errores', () => {
    const r = validateProgram(template);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });
  it('acepta un día legacy', () => {
    expect(validateProgram({ weeks: [{ days: [legacyDay] }] }).ok).toBe(true);
  });
  it('rechaza un tipo de bloque desconocido con ruta en español', () => {
    const bad = { weeks: [{ days: [{ day: 'Lunes 5 Oct' }] }, { days: [{ day: 'Lunes', blocks: [{ kind: 'warmup' }, { kind: 'warmup' }, { kind: 'lifts' }] }] }] };
    const r = validateProgram(bad);
    expect(r.ok).toBe(false);
    expect(r.errors[0].path).toBe('Semana 2 › Lunes › bloque 3');
    expect(r.errors[0].msg).toBe("tipo de bloque desconocido 'lifts'");
  });
  it('valida score, rmKeys, fecha y estructura', () => {
    const r = validateProgram({ weeks: [{ days: [{ day: 'A', date: '2026-13-40', blocks: [
      { kind: 'lift', score: { type: 'xx' }, rmKeys: ['zz'], prescription: 'no' }] }] }] });
    expect(r.errors.length).toBe(4);
    expect(validateProgram({}).ok).toBe(false);
    expect(validateProgram({ weeks: [{}] }).ok).toBe(false);
  });
  it('tipo de día desconocido es solo aviso', () => {
    const r = validateProgram({ weeks: [{ days: [{ day: 'A', type: 'Yoga' }] }] });
    expect(r.ok).toBe(true);
    expect(r.warnings).toHaveLength(1);
  });
});

describe('defaultScoreType', () => {
  it('deriva del tipo de wod', () => {
    expect(defaultScoreType('wod', { type: 'AMRAP' })).toBe('rounds_reps');
    expect(defaultScoreType('wod', { type: 'EMOM' })).toBe('time');
    expect(defaultScoreType('lift')).toBe('load');
    expect(defaultScoreType('warmup')).toBe('none');
  });
});
