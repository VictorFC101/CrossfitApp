import {
  getVisibleBlocks, getDayBlocks, formatLoadLabel, computeSetKg, resolveBlockRM, resolveSetRM,
  getPrescriptionLoad, descShowsLoad, wodHeaderSuffix, loadBarPercent, suggestedPercentLine, getPrimaryWod,
} from '../dayBlocksLogic';

const wod = { type: 'AMRAP', duration: "12'", movements: [{ reps: 10, name: 'Burpees' }] };

describe('getVisibleBlocks', () => {
  it('día v2 solo de halterofilia: sin bloque wod', () => {
    const day = { blocks: [
      { id: 'a', kind: 'warmup', items: ['x'] },
      { id: 'b', kind: 'lift', title: 'Snatch', prescription: [{ desc: '3×2 @ 70%' }] },
    ] };
    expect(getVisibleBlocks(day).map(b => b.kind)).toEqual(['warmup', 'lift']);
  });
  it('oculta wod vacío, bloques sin contenido y kinds indicados', () => {
    const day = { blocks: [
      { id: 'a', kind: 'warmup', items: ['x'] },
      { id: 'b', kind: 'wod', wod: { type: 'AMRAP' } },
      { id: 'c', kind: 'accessory', items: [] },
      { id: 'd', kind: 'wod', wod },
    ] };
    expect(getVisibleBlocks(day).map(b => b.id)).toEqual(['a', 'd']);
    expect(getVisibleBlocks(day, { hideKinds: ['warmup'] }).map(b => b.id)).toEqual(['d']);
  });
  it('normaliza un día legacy sin blocks', () => {
    const day = { strength: { title: 'Back Squat', sets: [{ desc: '5×5 al 75%' }] }, wod };
    expect(getDayBlocks(day).map(b => b.kind)).toEqual(['strength', 'wod']);
    expect(getPrimaryWod(day)).toBe(wod);
  });
});

describe('carga', () => {
  it('formatLoadLabel', () => {
    expect(formatLoadLabel({ pct: 75 })).toBe('75%');
    expect(formatLoadLabel({ pctMin: 70, pctMax: 80 })).toBe('70–80%');
    expect(formatLoadLabel({ kg: 100 })).toBe('100kg');
    expect(formatLoadLabel({ rpe: 8 })).toBe('RPE 8');
    expect(formatLoadLabel(null)).toBeNull();
  });
  it('computeSetKg', () => {
    expect(computeSetKg({ pct: 70 }, 100)).toBe('70kg');
    expect(computeSetKg({ pctMin: 70, pctMax: 80 }, 100)).toBe('70–80kg');
    expect(computeSetKg({ kg: 50 }, 100)).toBeNull();
    expect(computeSetKg({ pct: 70 }, NaN)).toBeNull();
  });
  it('getPrescriptionLoad / descShowsLoad / loadBarPercent', () => {
    expect(getPrescriptionLoad({ desc: '5×5 al 75%' })).toEqual({ pct: 75 });
    expect(getPrescriptionLoad({ desc: 'x', load: { kg: 5 } })).toEqual({ kg: 5 });
    expect(descShowsLoad({ desc: '3×2' })).toBe(false);
    expect(descShowsLoad({ desc: '3×2 @ 70%' })).toBe(true);
    expect(loadBarPercent({ pctMin: 70, pctMax: 80 })).toBe(80);
    expect(loadBarPercent({ rpe: 8 })).toBeNull();
  });
  it('suggestedPercentLine', () => {
    expect(suggestedPercentLine(100)).toBe('65%→65kg  ·  72%→72kg  ·  78%→78kg');
  });
});

describe('RM por bloque', () => {
  const rms = { sn: '80', cj: '100', bs: '120' };
  it('usa los rmKeys del propio bloque', () => {
    const r = resolveBlockRM({ rmKeys: ['bs'] }, rms, 'cj');
    expect(r).toMatchObject({ rmKey: 'bs', rmVal: 120, hasRM: true, isComplex: false });
  });
  it('complejo: el RM más bajo', () => {
    const r = resolveBlockRM({ rmKeys: ['sn', 'cj'] }, rms);
    expect(r).toMatchObject({ rmKey: 'sn', rmVal: 80, isComplex: true });
  });
  it('sin rmKeys usa el del día; sin nada no hay RM', () => {
    expect(resolveBlockRM({}, rms, 'cj').rmVal).toBe(100);
    expect(resolveBlockRM({}, rms).hasRM).toBe(false);
    expect(resolveBlockRM({ rmKeys: ['fs'] }, rms).hasRM).toBe(false);
  });
  it('resolveSetRM prefiere el rmKey de la serie', () => {
    const b = resolveBlockRM({ rmKeys: ['bs'] }, rms);
    expect(resolveSetRM({ rmKey: 'sn' }, b, rms)).toBe(80);
    expect(resolveSetRM({}, b, rms)).toBe(120);
  });
});

describe('wodHeaderSuffix', () => {
  it('doble wod, tipo+duración, vacío', () => {
    expect(wodHeaderSuffix({ parts: [] })).toBe('DOBLE WOD');
    expect(wodHeaderSuffix(wod)).toBe("AMRAP 12'");
    expect(wodHeaderSuffix({ type: 'EMOM' })).toBe('EMOM');
    expect(wodHeaderSuffix(null)).toBe('');
  });
});
