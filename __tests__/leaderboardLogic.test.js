import { scoringForWod, rankLeaderboard, scoreOfRow, inferScoringFromResults } from '../leaderboardLogic';

describe('scoringForWod', () => {
  test('tipos reales', () => {
    expect(scoringForWod({ type: 'AMRAP', duration: '18 min', format: 'A REPARTIR LIBREMENTE' })).toBe('rounds');
    expect(scoringForWod({ type: 'FOR TIME', duration: 'Est. 22-25 min', format: 'YOU GO I GO' })).toBe('time');
    expect(scoringForWod({ type: 'For Time (Time Cap 12 min)' })).toBe('time');
    expect(scoringForWod({ type: 'Max reps' })).toBe('reps');
  });
  test('sin puntuación', () => {
    expect(scoringForWod(null)).toBeNull();
    expect(scoringForWod({ type: null, format: null })).toBeNull();
    expect(scoringForWod({ type: 'AMRAP', emomMinutes: 10 })).toBeNull();
    expect(scoringForWod({ type: 'Fuerza' })).toBeNull();
  });
  test('con partes manda la última', () => {
    expect(scoringForWod({ parts: [{ type: 'AMRAP' }, { type: 'FOR TIME' }] })).toBe('time');
  });
});

const r = (user_id, resultado, extra = {}) => ({ user_id, nombre: user_id, resultado, rx: true, es_yo: false, ...extra });

describe('rankLeaderboard', () => {
  test('time: menor es mejor', () => {
    const { rx } = rankLeaderboard([r('a', '12:30'), r('b', '10:05'), r('c', '15:00')], 'time');
    expect(rx.map(x => x.user_id)).toEqual(['b', 'a', 'c']);
    expect(rx.map(x => x.pos)).toEqual([1, 2, 3]);
  });
  test('AMRAP: más rondas y reps es mejor', () => {
    const { rx } = rankLeaderboard([r('a', '5+3'), r('b', '6+0'), r('c', '5+10')], 'rounds');
    expect(rx.map(x => x.user_id)).toEqual(['b', 'c', 'a']);
  });
  test('separa Rx y Scaled', () => {
    const { rx, scaled } = rankLeaderboard([r('a', '10:00'), r('b', '09:00', { rx: false }), r('c', '11:00')], 'time');
    expect(rx.map(x => x.user_id)).toEqual(['a', 'c']);
    expect(scaled.map(x => x.user_id)).toEqual(['b']);
    expect(scaled[0].pos).toBe(1);
  });
  test('empates comparten posición', () => {
    const { rx } = rankLeaderboard([r('a', '10:00'), r('b', '10:00'), r('c', '11:00')], 'time');
    expect(rx.map(x => x.pos)).toEqual([1, 1, 3]);
  });
  test('marcas ilegibles al final sin pos', () => {
    const { rx } = rankLeaderboard([r('a', 'fácil'), r('b', '10:00'), r('c', null)], 'time');
    expect(rx[0].user_id).toBe('b');
    expect(rx.slice(1).every(x => x.pos === null)).toBe(true);
  });
  test('conserva es_yo', () => {
    const { rx } = rankLeaderboard([r('a', '10:00', { es_yo: true }), r('b', '09:00')], 'time');
    expect(rx.find(x => x.user_id === 'a').es_yo).toBe(true);
  });
  test('varias partes: usa la última parte de WOD, ignora fuerza', () => {
    const row = r('a', 'FUERZA: 100 · WOD: 08:00', {
      partes: [{ key: 'strength', resultado: '100' }, { key: 'wod', resultado: '08:00' }],
    });
    expect(scoreOfRow(row, 'time')).toBe(480);
  });
  test('sin scoring ni marcas legibles no hay pos', () => {
    const { rx } = rankLeaderboard([r('a', 'bien')], null);
    expect(rx[0].pos).toBeNull();
  });
  test('sin scoring se infiere de los resultados', () => {
    const { rx } = rankLeaderboard([r('a', '12:00'), r('b', '09:00')], null);
    expect(rx.map(x => x.user_id)).toEqual(['b', 'a']);
  });
  test('fila real de intervalos: rondas inferidas', () => {
    const fila = (id, wod) => r(id, 'x', { partes: [{ key: 'strength', resultado: '10 / 20 / 30 / 40' }, { key: 'wod', resultado: wod }] });
    const { rx } = rankLeaderboard([fila('a', '2+0 · 10:00'), fila('b', '3+5 · 10:00'), fila('c', '2+4 · 10:00')], null);
    expect(rx.map(x => x.user_id)).toEqual(['b', 'c', 'a']);
    expect(rx.map(x => x.pos)).toEqual([1, 2, 3]);
  });
});

describe('scoringForWod: tipos reales', () => {
  const tipo = (type, extra = {}) => scoringForWod({ type, ...extra });
  test.each([
    ['AMRAP', 'rounds'], ['FOR TIME', 'time'], ['FOR_TIME', 'time'], ['ROUNDS FOR TIME', 'time'],
    ['4 ROUNDS FOR TIME', 'time'], ['5 ROUNDS FOR TIME', 'time'], ['CHIPPER FOR TIME', 'time'], ['CHIPPER', 'time'],
    ["3×7' AMRAP / 1' REST", 'rounds'], ["5×4' WORK / 1' REST", 'reps'], ["6×3' WORK / 1' REST", 'reps'],
    ['AMRAP_PAIRS', 'rounds'], ['AMRAP_PAIRS_BLOCKS', 'rounds'], ['DEATH_BY', 'rounds'],
    ['EMOM', null], ['EMOM_PAIRS', null], ['LADDER', null], ['LADDER_ASCENDING', null],
    ['YOU GO I GO', null], ['DOBLE WOD', null], [null, null],
  ])('%s -> %s', (type, esperado) => {
    expect(tipo(type)).toBe(esperado);
  });
  test('formatNote con el marcador total -> reps', () => {
    expect(tipo(null, { formatNote: 'En cada intervalo · el marcador es el total de burpees' })).toBe('reps');
  });
});

describe('inferScoringFromResults', () => {
  test('mayoría tiempo', () => expect(inferScoringFromResults([r('a', '10:00'), r('b', '11:00'), r('c', '5+2')])).toBe('time'));
  test('mayoría rondas', () => expect(inferScoringFromResults([r('a', '5+1'), r('b', '6+0'), r('c', '10:00')])).toBe('rounds'));
  test('mayoría reps', () => expect(inferScoringFromResults([r('a', '40'), r('b', '55'), r('c', '10:00')])).toBe('reps'));
  test('ambiguo o vacío -> null', () => {
    expect(inferScoringFromResults([r('a', '5+1'), r('b', '10:00')])).toBeNull();
    expect(inferScoringFromResults([r('a', 'bien')])).toBeNull();
    expect(inferScoringFromResults([])).toBeNull();
  });
});

describe('rankLeaderboard: scoring del tipo ilegible → inferencia', () => {
  const { rankLeaderboard, scoringForWod } = require('../leaderboardLogic');
  test('intervalos (reps) pero los atletas anotaron rondas+tiempo: se rankea por rondas', () => {
    const wod = { type: "5×4' WORK / 1' REST", format: 'SYNCHRO', formatNote: 'el marcador es el total de burpees' };
    const sc = scoringForWod(wod);
    expect(sc).toBe('reps');
    const rows = [
      { user_id: 'a', resultado: 'WOD: 2+0 · 10:00', rx: true, partes: [{ key: 'wod', resultado: '2+0 · 10:00' }] },
      { user_id: 'b', resultado: 'WOD: 3+5 · 10:00', rx: true, partes: [{ key: 'wod', resultado: '3+5 · 10:00' }] },
    ];
    const { rx } = rankLeaderboard(rows, sc);
    expect(rx.map(r => [r.user_id, r.pos])).toEqual([['b', 1], ['a', 2]]);
  });
  test('si el scoring del tipo sí lee algún resultado, se respeta', () => {
    const rows = [{ user_id: 'a', resultado: '120', rx: true }, { user_id: 'b', resultado: '95', rx: true }];
    const { rx } = rankLeaderboard(rows, 'reps');
    expect(rx[0].user_id).toBe('a');
  });
});
