import {
  parsePrescriptionLine, parsePrescriptionText, assembleDay, newFormBlock, blockToForm, formToBlock,
  dayToBuilderBlocks, summarizeBlock, formatProgramSummary, ensureUniqueIds, nextBlockId,
} from '../builderLogic';
import { getScorableParts } from '../resultLogic';
import { validateProgram } from '../programValidation';

describe('parsePrescriptionLine', () => {
  it('parsea series x reps y carga', () => {
    expect(parsePrescriptionLine('5×3 @ 80%')).toMatchObject({ desc: '5×3 @ 80%', sets: 5, reps: 3, load: { pct: 80 } });
    expect(parsePrescriptionLine('5x3')).toMatchObject({ sets: 5, reps: 3 });
    expect(parsePrescriptionLine('4x2 @ 70%')).toMatchObject({ sets: 4, reps: 2, load: { pct: 70 } });
  });
  it('parsea complejos y notas', () => {
    expect(parsePrescriptionLine('6×(1+1) @ 70-75% | tirón completo')).toMatchObject({
      sets: 6, reps: '1+1', load: { pctMin: 70, pctMax: 75 }, note: 'tirón completo',
    });
  });
  it('ignora líneas vacías y aplica tempo / rmKey', () => {
    expect(parsePrescriptionText('\n  \n3x5 @ 60%', { tempo: '21X1', rmKey: 'fs' })).toEqual([
      expect.objectContaining({ sets: 3, reps: 5, tempo: '21X1', rmKey: 'fs' }),
    ]);
  });
  it('texto libre sin series: solo desc', () => {
    const p = parsePrescriptionLine('Hasta un 3RM técnico');
    expect(p.sets).toBeUndefined();
    expect(p.desc).toBe('Hasta un 3RM técnico');
  });
});

describe('bloques del editor', () => {
  it('ids estables y únicos', () => {
    expect(nextBlockId([{ id: 'b1' }, { id: 'b3' }])).toBe('b2');
    expect(ensureUniqueIds([{ id: 'b1' }, { id: 'b1' }, {}]).map(b => b.id)).toEqual(['b1', 'b2', 'b3']);
  });
  it('ensambla un día v2 sin WOD y valida', () => {
    const lift = { ...newFormBlock('lift', []), title: 'Snatch', rmKeys: ['sn'], prescText: '5×3 @ 80%\n3x2 @ 85% | rápido' };
    const warm = { ...newFormBlock('warmup', [lift]), itemsText: '5 min remo\nmovilidad' };
    const day = assembleDay({ day: 'Lunes 12 Oct', date: '2026-10-12', type: 'Halterofilia', label: 'snatch' }, [warm, lift]);
    expect(new Set(day.blocks.map(b => b.id)).size).toBe(2);
    expect(day.blocks[0].score).toBeUndefined();
    expect(day.blocks[1].prescription[1]).toMatchObject({ sets: 3, reps: 2, load: { pct: 85 }, note: 'rápido', rmKey: 'sn' });
    expect(day.label).toBe('SNATCH');
    expect(validateProgram({ weeks: [{ days: [day] }] }).ok).toBe(true);
  });
  it('ida y vuelta formulario <-> bloque conserva el id', () => {
    const f = { ...newFormBlock('wod', []), id: 'w9', wod: { type: 'AMRAP', duration: '10 min', format: 'INDIVIDUAL', formatNote: '', gymNote: '', movementsText: '10|Burpees|BW' } };
    const b = formToBlock(f);
    expect(b.id).toBe('w9');
    expect(blockToForm(b).id).toBe('w9');
    expect(b.wod.movements).toEqual([{ reps: '10', name: 'Burpees', weight: 'BW' }]);
    expect(b.score.type).toBe('rounds_reps');
  });
  it('resume bloques', () => {
    const b = formToBlock({ ...newFormBlock('strength', []), title: 'Front Squat', rmKeys: ['fs'], prescText: '5×3 @ 80%' });
    expect(summarizeBlock(b)).toBe('5×3 @ 80% · RM: Front Squat');
  });
});

describe('día legacy -> editor: claves de resultados idénticas', () => {
  const keys = d => getScorableParts(d).map(p => p.key);
  const legacy = {
    day: 'Martes 6 Oct', type: 'Halterofilia', label: 'SNATCH + BACK SQUAT',
    warmup: ['5 min remo'],
    strength: {
      blocks: [
        { title: 'Snatch', sets: [{ desc: '5×2 @ 70%' }] },
        { title: 'Back Squat', rest: '3 min', sets: [{ desc: '5×5 @ 75%' }] },
      ],
    },
    wod: { type: 'AMRAP', duration: '12 min', movements: [{ reps: '10', name: 'Burpees', weight: 'BW' }] },
    gymExtra: { title: 'Core', blocks: [{ label: 'Plancha', detail: '3x45s' }] },
  };

  it('fuerza múltiple + wod: mismas claves tras guardar', () => {
    const converted = dayToBuilderBlocks(legacy);
    expect(converted.filter(b => b.kind === 'strength')).toHaveLength(1);
    expect(converted.find(b => b.kind === 'strength').id).toBe('strength');
    expect(converted.find(b => b.kind === 'strength').prescription.map(p => p.desc))
      .toEqual(['Snatch · 5×2 @ 70%', 'Back Squat · 5×5 @ 75%']);
    expect(converted.find(b => b.kind === 'wod').id).toBe('wod');
    const saved = assembleDay(legacy, converted.map(blockToForm));
    expect(keys(saved)).toEqual(keys(legacy));
    expect(keys(saved)).toEqual(['strength', 'wod']);
    expect(new Set(saved.blocks.map(b => b.id)).size).toBe(saved.blocks.length);
  });

  it('wod con partes: claves wod_0, wod_1 conservadas', () => {
    const d = {
      day: 'Jueves 8 Oct', type: 'Fuerza', label: 'X',
      strength: { title: 'DL', sets: [{ desc: '3×5' }] },
      wod: { type: 'FOR TIME', parts: [{ label: 'A', type: 'AMRAP', movements: [{ reps: '5', name: 'x' }] }, { label: 'B', type: 'FOR TIME', movements: [{ reps: '5', name: 'y' }] }] },
    };
    const saved = assembleDay(d, dayToBuilderBlocks(d).map(blockToForm));
    expect(keys(d)).toEqual(['strength', 'wod_0', 'wod_1']);
    expect(keys(saved)).toEqual(keys(d));
  });

  it('día v2 conserva los ids al editar', () => {
    const v2 = { day: 'Lunes', type: 'Fuerza', label: 'A', blocks: [{ id: 'x1', kind: 'strength', title: 'FS', prescription: [{ desc: '5x3' }] }] };
    const saved = assembleDay(v2, dayToBuilderBlocks(v2).map(blockToForm));
    expect(saved.blocks[0].id).toBe('x1');
    expect(keys(saved)).toEqual(keys(v2));
  });
});

describe('formatProgramSummary', () => {
  it('cuenta bloques por tipo y días sin wod', () => {
    const txt = formatProgramSummary({
      name: 'P', weeks: [{ days: [
        { day: 'L', blocks: [{ id: 'a', kind: 'lift', prescription: [{ desc: '5x3' }] }, { id: 'b', kind: 'wod', wod: { movements: [] } }] },
        { day: 'M', blocks: [{ id: 'a', kind: 'free', items: ['x'] }] },
      ] }],
    }, [{ path: 'p', msg: 'm' }]);
    expect(txt).toContain('1 semanas · 2 días');
    expect(txt).toContain('Halterofilia: 1');
    expect(txt).toContain('Días sin WOD: 1');
    expect(txt).toContain('Avisos: 1');
  });
});
