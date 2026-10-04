import {
  fromProgramDay, fromWodLibre, parseResultParts,
  CHIP, HIDDEN_DURATION_TYPES, MAX_SHARE_MOVEMENTS,
} from '../shareResultLogic';

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 4, 12, 0, 0)); // 4 Oct 2026
});
afterEach(() => jest.useRealTimers());

const mov = (n, extra = {}) => ({ reps: '10', name: n, ...extra });

describe('parseResultParts', () => {
  it('extrae el tiempo mm:ss', () => {
    expect(parseResultParts('12:30')).toEqual({ time: '12:30', rounds: '', reps: '' });
  });
  it('extrae rondas y reps N+M', () => {
    expect(parseResultParts('5+12')).toEqual({ time: '', rounds: '5', reps: '12' });
  });
  it('extrae ambos unidos por " · "', () => {
    expect(parseResultParts('5+12 · 08:45')).toEqual({ time: '08:45', rounds: '5', reps: '12' });
  });
  it('devuelve vacío con undefined o cadena vacía', () => {
    const vacio = { time: '', rounds: '', reps: '' };
    expect(parseResultParts(undefined)).toEqual(vacio);
    expect(parseResultParts('')).toEqual(vacio);
  });
  it('ignora formatos no estrictos', () => {
    expect(parseResultParts('abc · 5x5')).toEqual({ time: '', rounds: '', reps: '' });
  });
});

describe('fromProgramDay', () => {
  const base = (wod, extra = {}) => ({ day: 'Lunes 14 Sep', label: 'Fran', type: 'metcon', wod, ...extra });
  const res = { resultado: '5+3 · 10:00', notas: 'bien', fecha: new Date(2026, 9, 4).toISOString(), rx: true };

  it('devuelve null sin resultado', () => {
    expect(fromProgramDay(base({ movements: [] }), null)).toBeNull();
    expect(fromProgramDay(base({ movements: [] }), { resultado: '' })).toBeNull();
    expect(fromProgramDay(null, res)).toBeNull();
  });

  it('usa movements y filtra "—"', () => {
    const n = fromProgramDay(base({ type: 'AMRAP', duration: '12 min', movements: [mov('Thruster', { weight: '43kg' }), mov('—'), mov('Pull-up')] }), res);
    expect(n.movements.map(m => m.name)).toEqual(['Thruster', 'Pull-up']);
    expect(n.movements[0]).toEqual({ reps: '10', name: 'Thruster', weight: '43kg' });
  });

  it('limita el número máximo de movimientos', () => {
    const many = Array.from({ length: 9 }, (_, i) => mov('M' + i));
    const n = fromProgramDay(base({ movements: many }), res);
    expect(MAX_SHARE_MOVEMENTS).toBe(5);
    expect(n.movements).toHaveLength(5);
  });

  it('aplana parts y filtra "—"', () => {
    const wod = { parts: [{ movements: [mov('A'), mov('—')] }, { movements: [mov('B')] }, {}] };
    const n = fromProgramDay(base(wod), res);
    expect(n.movements.map(m => m.name)).toEqual(['A', 'B']);
  });

  it('usa emomMinutes como reps=min y name=work', () => {
    const wod = { emomMinutes: [{ min: '1', work: 'Burpees' }, { min: '2', work: 'Remo' }] };
    const n = fromProgramDay(base(wod), res);
    expect(n.movements).toEqual([{ reps: '1', name: 'Burpees', weight: undefined }, { reps: '2', name: 'Remo', weight: undefined }]);
  });

  it('sin wod devuelve movimientos vacíos', () => {
    expect(fromProgramDay(base(undefined), res).movements).toEqual([]);
  });

  it('la fecha es la del día del WOD, no hoy ni la de guardado', () => {
    const n = fromProgramDay(base({ movements: [] }), res);
    expect(n.dateISO.slice(0, 10)).not.toBe('2026-10-04');
    expect(new Date(n.dateISO).getMonth()).toBe(8);
    expect(new Date(n.dateISO).getDate()).toBe(14);
    expect(n.dateLabel).toBe('14 Sep 2026');
  });

  it('construye título, tipo y duración', () => {
    const n = fromProgramDay(base({ type: 'AMRAP', duration: '12 min', movements: [] }), res);
    expect(n.title).toBe('Fran');
    expect(n.typeLabel).toBe('AMRAP · METCON');
    expect(n.durationLabel).toBe('12 min');
    expect(n.notas).toBe('bien');
    expect(n.resultado).toBe('5+3 · 10:00');
    expect(n.resultParts).toEqual({ time: '10:00', rounds: '5', reps: '3' });
  });

  it('el título cae a day.day si no hay label', () => {
    expect(fromProgramDay({ day: 'Lunes 14 Sep', wod: {} }, res).title).toBe('Lunes 14 Sep');
  });

  it('chip RX / SCALED según rx', () => {
    expect(fromProgramDay(base({}), { ...res, rx: true }).chip).toBe(CHIP.RX);
    expect(fromProgramDay(base({}), { ...res, rx: false }).chip).toBe(CHIP.SCALED);
    expect(CHIP.RX).toBe('RX');
    expect(CHIP.SCALED).toBe('SCALED');
  });

  it('construye el desglose desde partes con sus etiquetas', () => {
    const r = {
      resultado: 'FUERZA: 5x5 · WOD: 10:00', rx: true,
      partes: [
        { key: 'strength', label: 'FUERZA', resultado: '5x5 80kg' },
        { key: 'wod_0', label: 'WOD', resultado: '10:00' },
        { key: 'wod_1', label: 'Finisher', resultado: '' },
      ],
    };
    const n = fromProgramDay(base({}), r);
    expect(n.breakdown).toEqual([
      { label: 'FUERZA', resultado: '5x5 80kg' },
      { label: 'WOD', resultado: '10:00' },
    ]);
  });

  it('desglose vacío si no hay partes', () => {
    expect(fromProgramDay(base({}), res).breakdown).toEqual([]);
  });
});

describe('fromWodLibre', () => {
  const wod = {
    id: '1', nombre: 'Mi WOD', tipo: 'AMRAP', duracion: '15 min',
    movimientos: [{ reps: '10', name: 'Squat', weight: '20kg', category: 'x' }, { reps: '5', name: '—' }],
    resultado: '4+2', notas: 'duro', fecha: '2026-08-20T10:00:00.000Z', libre: true,
  };

  it('devuelve null sin resultado', () => {
    expect(fromWodLibre({ ...wod, resultado: '' })).toBeNull();
    expect(fromWodLibre({ ...wod, resultado: undefined })).toBeNull();
    expect(fromWodLibre(null)).toBeNull();
  });

  it('chip LIBRE y datos básicos', () => {
    const n = fromWodLibre(wod);
    expect(n.chip).toBe(CHIP.LIBRE);
    expect(CHIP.LIBRE).toBe('LIBRE');
    expect(n.title).toBe('Mi WOD');
    expect(n.typeLabel).toBe('AMRAP');
    expect(n.durationLabel).toBe('15 min');
    expect(n.resultParts).toEqual({ time: '', rounds: '4', reps: '2' });
    expect(n.breakdown).toEqual([]);
    expect(n.movements).toEqual([{ reps: '10', name: 'Squat', weight: '20kg' }]);
  });

  it('oculta la duración para tipos STRENGTH y LIBRE', () => {
    expect(HIDDEN_DURATION_TYPES).toEqual(expect.arrayContaining(['STRENGTH', 'LIBRE']));
    expect(fromWodLibre({ ...wod, tipo: 'STRENGTH' }).durationLabel).toBe('');
    expect(fromWodLibre({ ...wod, tipo: 'Libre' }).durationLabel).toBe('');
  });

  it('movimientos vacíos o ausentes', () => {
    expect(fromWodLibre({ ...wod, movimientos: [] }).movements).toEqual([]);
    expect(fromWodLibre({ ...wod, movimientos: undefined }).movements).toEqual([]);
  });

  it('la fecha viene de fecha, no de hoy', () => {
    const n = fromWodLibre(wod);
    expect(n.dateISO).toBe('2026-08-20T10:00:00.000Z');
    expect(n.dateLabel).toBe('20 Ago 2026');
  });
});
