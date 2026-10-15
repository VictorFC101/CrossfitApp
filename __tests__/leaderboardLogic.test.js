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

describe('vista del ranking: formatMark, gapToFirst, detailParts, relativeTime', () => {
  const { formatMark, gapToFirst, detailParts, relativeTime, effectiveScoring } = require('../leaderboardLogic');
  test('formatMark rondas con y sin reps', () => {
    expect(formatMark(r('a', '8+12'), 'rounds')).toEqual({ main: '8 rondas', sub: '+ 12 reps', short: '8+12' });
    expect(formatMark(r('a', '8+0'), 'rounds')).toEqual({ main: '8 rondas', sub: '', short: '8+0' });
    expect(formatMark(r('a', '1+1'), 'rounds')).toEqual({ main: '1 ronda', sub: '+ 1 rep', short: '1+1' });
  });
  test('formatMark tiempo y reps', () => {
    expect(formatMark(r('a', '08:45'), 'time')).toEqual({ main: '8:45', sub: 'tiempo', short: '8:45' });
    expect(formatMark(r('a', '152'), 'reps')).toEqual({ main: '152', sub: 'reps', short: '152' });
  });
  test('formatMark ilegible', () => {
    const nada = { main: 'Ver detalle', sub: '', short: '—' };
    expect(formatMark(r('a', 'bien'), 'time')).toEqual(nada);
    expect(formatMark(r('a', '10:00'), null)).toEqual(nada);
  });
  const partes = [{ key: 'strength', label: 'FUERZA', resultado: '10 / 20 / 30 / 40' }, { key: 'wod', label: 'WOD', resultado: '2+0 · 10:00' }];
  test('formatMark con partes reales usa la parte de WOD', () => {
    expect(formatMark(r('a', 'x', { partes }), 'rounds').short).toBe('2+0');
  });
  test('gapToFirst', () => {
    expect(gapToFirst(r('b', '9+0'), r('a', '10+0'), 'rounds')).toBe('a 1 ronda del 1º');
    expect(gapToFirst(r('b', '9+0'), r('a', '12+5'), 'rounds')).toBe('a 3 rondas y 5 reps del 1º');
    expect(gapToFirst(r('b', '9+3'), r('a', '9+4'), 'rounds')).toBe('a 1 rep del 1º');
    expect(gapToFirst(r('b', '09:20'), r('a', '08:45'), 'time')).toBe('a 0:35 del 1º');
    expect(gapToFirst(r('b', '140'), r('a', '152'), 'reps')).toBe('a 12 reps del 1º');
  });
  test('gapToFirst null', () => {
    const a = r('a', '10:00');
    expect(gapToFirst(a, a, 'time')).toBeNull();
    expect(gapToFirst(r('b', '10:00'), a, 'time')).toBeNull();
    expect(gapToFirst(r('b', 'bien'), a, 'time')).toBeNull();
    expect(gapToFirst(r('b', '11:00'), null, 'time')).toBeNull();
  });
  test('detailParts excluye la parte de la marca', () => {
    expect(detailParts(r('a', 'x', { partes }), 'rounds')).toEqual([{ label: 'FUERZA', text: '10 / 20 / 30 / 40' }]);
  });
  test('detailParts sin partes: resultado completo', () => {
    expect(detailParts(r('a', '08:45'), 'time')).toEqual([{ label: '', text: '08:45' }]);
    expect(detailParts(r('a', ''), 'time')).toEqual([]);
  });
  test('detailParts con marca ilegible muestra todas las partes', () => {
    expect(detailParts(r('a', 'x', { partes }), 'reps')).toHaveLength(2);
  });
  test('relativeTime límites', () => {
    const now = new Date('2026-05-10T12:00:00Z');
    const hace = (min) => new Date(now.getTime() - min * 60000).toISOString();
    expect(relativeTime(hace(0), now)).toBe('hace 1 min');
    expect(relativeTime(hace(59), now)).toBe('hace 59 min');
    expect(relativeTime(hace(60), now)).toBe('hace 1 h');
    expect(relativeTime(hace(23 * 60 + 59), now)).toBe('hace 23 h');
    expect(relativeTime(hace(24 * 60), now)).toBe('ayer');
    expect(relativeTime(hace(48 * 60), now)).toBe('hace 2 días');
    expect(relativeTime(null, now)).toBe('');
    expect(relativeTime('nope', now)).toBe('');
  });
  test('effectiveScoring infiere cuando el tipo no lee nada', () => {
    expect(effectiveScoring([r('a', '5+1'), r('b', '6+0')], 'reps')).toBe('rounds');
    expect(effectiveScoring([r('a', '10:00')], 'time')).toBe('time');
  });
});
