import { normalizeStrength, normalizeProgramDays, enrichProgram } from '../programLogic';
import { getEffectiveRM } from '../wodLogic';

const twoBlocks = {
  label: 'CLEAN & JERK + PUSH PRESS',
  strength: {
    title: '',
    blocks: [
      { title: 'Clean & Jerk', note: 'n1', rest: '2 min', sets: [{ desc: '2×2 al 70%', note: 'a' }, { desc: '2×2 al 75%' }] },
      { title: 'Push Press', note: 'n2', rest: '2 min', sets: [{ desc: '3×5 al 60%', note: 'b' }] },
    ],
  },
};
const oneBlock = {
  strength: { title: 'Push Jerk', blocks: [{ title: 'Push Jerk', sets: [{ desc: '4×3 al 72%' }] }] },
};
const legacy = { strength: { title: 'Back Squat', sets: [{ desc: '5×5 al 75%' }] } };

describe('normalizeStrength', () => {
  it('añade strength.sets a un día con bloques y conserva blocks', () => {
    const out = normalizeStrength(oneBlock);
    expect(out.strength.sets).toEqual([{ desc: '4×3 al 72%', rmKey: 'pj' }]);
    expect(out.strength.blocks).toBe(oneBlock.strength.blocks);
    expect(oneBlock.strength.sets).toBeUndefined();
  });
  it('no cambia un día legacy', () => {
    expect(normalizeStrength(legacy)).toBe(legacy);
  });
  it('es idempotente', () => {
    const once = normalizeStrength(twoBlocks);
    expect(normalizeStrength(once)).toBe(once);
  });
  it('con varios bloques antepone el título y usa el del primer bloque como strength.title', () => {
    const out = normalizeStrength(twoBlocks);
    expect(out.strength.sets.map(s => s.desc)).toEqual([
      'Clean & Jerk · 2×2 al 70%', 'Clean & Jerk · 2×2 al 75%', 'Push Press · 3×5 al 60%',
    ]);
    expect(out.strength.sets[0].note).toBe('a');
    expect(out.strength.title).toBe('Clean & Jerk');
  });
  it('mantiene el % parseable y la inferencia de RM', () => {
    const out = normalizeStrength(twoBlocks);
    expect(out.strength.sets[0].desc.match(/(\d+)%/)[1]).toBe('70');
    expect(getEffectiveRM(out, { cj: 100, pp: 80 })).toMatchObject({ rmKey: 'cj', rmVal: 100, isComplex: false });
    const single = normalizeStrength({ strength: { title: '', blocks: [{ title: 'Back Squat', sets: [{ desc: '5×5 al 75%' }] }] } });
    expect(single.strength.title).toBe('Back Squat');
    expect(single.strength.sets[0].desc).toBe('5×5 al 75%');
  });
  it('días sin fuerza o malformados no fallan', () => {
    expect(normalizeStrength({})).toEqual({});
    expect(normalizeStrength(null)).toBeNull();
    expect(normalizeStrength({ strength: { blocks: [] } })).toEqual({ strength: { blocks: [] } });
  });
});

describe('RM por bloque', () => {
  const bsSnatch = {
    label: 'BACK SQUAT + SNATCH',
    strength: { title: '', blocks: [
      { title: 'Back Squat 5×5 ascendentes', sets: [{ desc: '5×5 al 75%' }] },
      { title: 'Técnica · Snatch — 5 sets', sets: [{ desc: '5×2 al 60%' }] },
      { title: 'Overhead Squat 4×4', sets: [{ desc: '4×4 al 70%' }] },
    ] },
  };
  it('usa el RM de back squat, no un complejo con el label', () => {
    const out = normalizeStrength(bsSnatch);
    expect(out.rmKey).toBe('bs');
    expect(out.rmKeys).toBeNull();
    expect(getEffectiveRM(out, { bs: 120, sn: 70 })).toMatchObject({ rmKey: 'bs', rmVal: 120, isComplex: false });
    expect(out.strength.title).toBe('Back Squat 5×5 ascendentes');
  });
  it('cada serie lleva el rmKey de su bloque', () => {
    expect(normalizeStrength(bsSnatch).strength.sets.map(s => s.rmKey)).toEqual(['bs', 'sn', 'ohs']);
  });
  it('un primer bloque con dos movimientos es un complejo', () => {
    const out = normalizeStrength({ strength: { blocks: [{ title: 'Power Clean + Push Jerk', sets: [{ desc: '5×2 al 70%' }] }] } });
    expect(out.rmKeys).toEqual(['pc', 'pj']);
    expect(out.strength.sets[0].rmKey).toBeUndefined();
  });
  it('Clean & Jerk Complex es un solo movimiento (cj)', () => {
    const out = normalizeStrength({ strength: { blocks: [{ title: 'Clean & Jerk Complex', sets: [{ desc: '3×1 al 80%' }] }] } });
    expect(out.rmKey).toBe('cj');
    expect(getEffectiveRM(out, { cj: 100 })).toMatchObject({ rmKey: 'cj', isComplex: false });
  });
  it('sin movimiento reconocido no fija rmKey y respeta el rmKey del día', () => {
    const out = normalizeStrength({ strength: { blocks: [{ title: 'Skill · HSW', sets: [{ desc: '5×10 m' }] }] } });
    expect(out.rmKey).toBeUndefined();
    expect(normalizeStrength({ rmKey: 'dl', strength: { blocks: [{ title: 'Back Squat', sets: [{ desc: 'x' }] }] } }).rmKey).toBe('dl');
  });
  it('días legacy sin rmKeys:null siguen infiriendo complejo del label', () => {
    expect(getEffectiveRM({ label: 'POWER CLEAN + PUSH JERK', strength: { sets: [] } }, { pc: 90, pj: 80 }).isComplex).toBe(true);
  });
});

describe('normalizeProgramDays / enrichProgram', () => {
  const program = { name: 'X', weeks: [{ days: [twoBlocks, legacy, { label: 'descanso' }] }] };
  it('normaliza todos los días sin mutar el original', () => {
    const out = normalizeProgramDays(program);
    expect(out.weeks[0].days[0].strength.sets).toHaveLength(3);
    const { blocks, blocksSource, ...rest } = out.weeks[0].days[1];
    expect(rest).toEqual(legacy); // campos legacy intactos; solo se añaden blocks y blocksSource
    expect(blocksSource).toBe('legacy');
    expect(Array.isArray(blocks)).toBe(true);
    expect(program.weeks[0].days[0].strength.sets).toBeUndefined();
  });
  it('enrichProgram devuelve días con sets y es idempotente', () => {
    const once = enrichProgram(program);
    const twice = enrichProgram(once);
    expect(once.weeks[0].days[0].strength.sets).toHaveLength(3);
    expect(twice.weeks[0].days).toEqual(once.weeks[0].days);
  });
});
