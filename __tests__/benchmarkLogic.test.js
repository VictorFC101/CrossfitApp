import {
  detectBenchmark, detectDayBenchmark, parseScore, compareScores, formatScore, formatDelta,
  getBenchmarkHistory, bestOf, lastOf, evaluateNewMark,
} from '../benchmarkLogic';
import { BENCHMARKS } from '../benchmarks';

describe('benchmarks catálogo', () => {
  it('tiene keys únicas y campos obligatorios', () => {
    const keys = BENCHMARKS.map(b => b.key);
    expect(new Set(keys).size).toBe(keys.length);
    BENCHMARKS.forEach(b => {
      expect(['time', 'rounds', 'reps']).toContain(b.scoring);
      expect(b.rx.m && b.rx.f && b.descripcion).toBeTruthy();
    });
  });
});

describe('detectBenchmark', () => {
  it('detecta por nombre', () => {
    expect(detectBenchmark('Fran')).toBe('fran');
    expect(detectBenchmark('Fran: 21-15-9 Thrusters + Pull-ups')).toBe('fran');
    expect(detectBenchmark('WOD de hoy: Murph')).toBe('murph');
    expect(detectBenchmark('DT')).toBe('dt');
  });
  it('ignora mayúsculas y acentos', () => {
    expect(detectBenchmark('CINDY')).toBe('cindy');
    expect(detectBenchmark('  grace  ')).toBe('grace');
    expect(detectBenchmark('Fran,')).toBe('fran');
  });
  it('no da falsos positivos', () => {
    expect(detectBenchmark('Gracefully')).toBeNull();
    expect(detectBenchmark('Francisco')).toBeNull();
    expect(detectBenchmark('Disgrace')).toBeNull();
    expect(detectBenchmark('Thrusters y dominadas')).toBeNull();
  });
  it('devuelve null con texto vacío o inválido', () => {
    expect(detectBenchmark('')).toBeNull();
    expect(detectBenchmark(null)).toBeNull();
    expect(detectBenchmark(undefined)).toBeNull();
  });
  it('detecta alias y el primero que aparece', () => {
    expect(detectBenchmark('3 bars of death')).toBe('linda');
    expect(detectBenchmark('Cindy y luego Fran')).toBe('cindy');
  });
  it('detecta en un día del programa', () => {
    const day = { wod: { name: 'Fran', format: 'FOR TIME', movements: [{ name: 'Thruster' }] } };
    expect(detectDayBenchmark(day)).toBe('fran');
    expect(detectDayBenchmark({ wod: { movements: [{ name: 'Murph' }] } })).toBe('murph');
    expect(detectDayBenchmark({ wod: { format: 'AMRAP', movements: [{ name: 'TTB' }] } })).toBeNull();
    expect(detectDayBenchmark(null)).toBeNull();
  });
});

describe('parseScore', () => {
  it('tiempo mm:ss y h:mm:ss', () => {
    expect(parseScore('07:45', 'time')).toBe(465);
    expect(parseScore('7:12', 'time')).toBe(432);
    expect(parseScore('1:02:03', 'time')).toBe(3723);
  });
  it('rondas + reps', () => {
    expect(parseScore('12+5', 'rounds')).toBe(12005);
    expect(parseScore('20+0', 'rounds')).toBe(20000);
    expect(parseScore('25', 'rounds')).toBe(25000);
  });
  it('reps', () => {
    expect(parseScore('150', 'reps')).toBe(150);
  });
  it('varias partes: toma la que corresponde', () => {
    expect(parseScore('12+5 · 18:30', 'time')).toBe(1110);
    expect(parseScore('12+5 · 18:30', 'rounds')).toBe(12005);
  });
  it('basura devuelve null', () => {
    expect(parseScore('', 'time')).toBeNull();
    expect(parseScore(null, 'time')).toBeNull();
    expect(parseScore('rápido', 'time')).toBeNull();
    expect(parseScore('12+5', 'time')).toBeNull();
    expect(parseScore('7:45', 'rounds')).toBeNull();
    expect(parseScore('abc', 'reps')).toBeNull();
  });
});

describe('compareScores', () => {
  it('tiempo: menor es mejor', () => {
    expect(compareScores(400, 450, 'time')).toBeLessThan(0);
    expect(compareScores(450, 400, 'time')).toBeGreaterThan(0);
  });
  it('rondas y reps: mayor es mejor', () => {
    expect(compareScores(12005, 11000, 'rounds')).toBeLessThan(0);
    expect(compareScores(11000, 12005, 'rounds')).toBeGreaterThan(0);
    expect(compareScores(160, 150, 'reps')).toBeLessThan(0);
  });
  it('igual da 0', () => {
    expect(compareScores(5, 5, 'time')).toBe(0);
  });
});

describe('formatScore / formatDelta', () => {
  it('formatScore', () => {
    expect(formatScore(465, 'time')).toBe('7:45');
    expect(formatScore(3723, 'time')).toBe('1:02:03');
    expect(formatScore(12005, 'rounds')).toBe('12+5');
    expect(formatScore(150, 'reps')).toBe('150 reps');
    expect(formatScore(null, 'time')).toBe('—');
  });
  it('formatDelta tiempo', () => {
    expect(formatDelta(432, 465, 'time')).toBe('−33 s');
    expect(formatDelta(477, 465, 'time')).toBe('+12 s');
    expect(formatDelta(300, 465, 'time')).toBe('−2:45 min');
    expect(formatDelta(465, 465, 'time')).toBe('Igual');
  });
  it('formatDelta rondas y reps', () => {
    expect(formatDelta(13000, 12000, 'rounds')).toBe('+1 ronda');
    expect(formatDelta(15000, 12000, 'rounds')).toBe('+3 rondas');
    expect(formatDelta(12005, 12000, 'rounds')).toBe('+5 reps');
    expect(formatDelta(155, 150, 'reps')).toBe('+5 reps');
    expect(formatDelta(149, 150, 'reps')).toBe('−1 rep');
  });
});

describe('getBenchmarkHistory', () => {
  const resultados = {
    'Lun 3 Mar': { resultado: '08:00', fecha: '2026-03-03T10:00:00Z', rx: true, benchmark_key: 'fran' },
    'Lun 10 Mar': { resultado: '07:45', fecha: '2026-03-10T10:00:00Z', rx: false, benchmark_key: 'fran' },
    'Mar 11 Mar': { resultado: '20+1', fecha: '2026-03-11T10:00:00Z', benchmark_key: 'cindy' },
    'Mie 12 Mar': { resultado: '100', fecha: '2026-03-12T10:00:00Z' },
  };
  const wodsLibres = [
    { id: '1', resultado: '07:20', fecha: '2026-03-20T10:00:00Z', benchmark_key: 'fran' },
    { id: '2', resultado: '09:00', fecha: '2026-03-21T10:00:00Z', benchmark_key: 'grace' },
  ];
  it('une ambas fuentes ordenadas por fecha desc', () => {
    const h = getBenchmarkHistory('fran', resultados, wodsLibres);
    expect(h.map(e => e.resultado)).toEqual(['07:20', '07:45', '08:00']);
    expect(h.map(e => e.source)).toEqual(['libre', 'programa', 'programa']);
    expect(h[1].rx).toBe(false);
    expect(h[0].rx).toBe(true);
  });
  it('filtra por key y soporta entradas vacías', () => {
    expect(getBenchmarkHistory('cindy', resultados, wodsLibres)).toHaveLength(1);
    expect(getBenchmarkHistory('murph', resultados, wodsLibres)).toEqual([]);
    expect(getBenchmarkHistory('fran', undefined, undefined)).toEqual([]);
  });
  it('excludeDia omite el día indicado', () => {
    const h = getBenchmarkHistory('fran', resultados, wodsLibres, { excludeDia: 'Lun 10 Mar' });
    expect(h).toHaveLength(2);
  });
});

describe('bestOf / lastOf', () => {
  const h = [
    { fecha: '2026-03-20', resultado: '06:00', rx: false, source: 'libre' },
    { fecha: '2026-03-10', resultado: '07:45', rx: true, source: 'programa' },
    { fecha: '2026-03-03', resultado: '07:12', rx: true, source: 'programa' },
  ];
  it('la mejor Rx gana aunque haya una scaled más rápida', () => {
    const b = bestOf(h, 'time');
    expect(b.resultado).toBe('07:12');
    expect(b.score).toBe(432);
  });
  it('si solo hay scaled, usa la mejor scaled', () => {
    const b = bestOf([h[0], { ...h[0], resultado: '05:50' }], 'time');
    expect(b.resultado).toBe('05:50');
  });
  it('rondas: mayor es mejor', () => {
    const b = bestOf([{ resultado: '12+5', rx: true }, { resultado: '13+0', rx: true }], 'rounds');
    expect(b.resultado).toBe('13+0');
  });
  it('vacío o sin marcas puntuables da null', () => {
    expect(bestOf([], 'time')).toBeNull();
    expect(bestOf([{ resultado: 'rápido', rx: true }], 'time')).toBeNull();
  });
  it('lastOf devuelve la más reciente puntuable', () => {
    expect(lastOf(h, 'time').resultado).toBe('06:00');
    expect(lastOf([{ resultado: 'x', rx: true }, h[1]], 'time').resultado).toBe('07:45');
    expect(lastOf([], 'time')).toBeNull();
  });
});

describe('evaluateNewMark', () => {
  const prev = [
    { fecha: '2026-03-10', resultado: '07:45', rx: true },
    { fecha: '2026-03-03', resultado: '07:12', rx: true },
  ];
  it('PR: mejora la mejor marca Rx', () => {
    const r = evaluateNewMark({ resultado: '06:39', rx: true }, prev, 'time');
    expect(r.kind).toBe('pr');
    expect(r.message).toBe('🔥 ¡Nuevo PR! −33 s');
  });
  it('peor que la última', () => {
    const r = evaluateNewMark({ resultado: '07:57', rx: true }, prev, 'time');
    expect(r.kind).toBe('worse');
    expect(r.message).toBe('+12 s vs la última vez');
  });
  it('mejor que la última pero sin PR', () => {
    const r = evaluateNewMark({ resultado: '07:30', rx: true }, prev, 'time');
    expect(r.kind).toBe('better');
    expect(r.message).toBe('−15 s vs la última vez');
  });
  it('scaled no compite con el PR Rx', () => {
    const r = evaluateNewMark({ resultado: '05:00', rx: false }, prev, 'time');
    expect(r.kind).toBe('better');
  });
  it('primera marca y sin marca', () => {
    expect(evaluateNewMark({ resultado: '07:00', rx: true }, [], 'time').kind).toBe('first');
    expect(evaluateNewMark({ resultado: '', rx: true }, prev, 'time')).toBeNull();
  });
});
