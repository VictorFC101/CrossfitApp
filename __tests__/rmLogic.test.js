import { estimateOneRepMax, oneRepMaxWarning, buildWeightTable, buildRmsByReps, bestEstimated1RM, formatRmLabel } from '../rmLogic';

describe('rmLogic', () => {
  describe('estimateOneRepMax (Epley)', () => {
    it('calcula el 1RM estimado con peso y reps válidos', () => {
      // 80 * (1 + 5/30) = 93.33 -> 93
      expect(estimateOneRepMax('80', '5')).toBe(93);
    });

    it('con 1 rep el estimado es igual (redondeado) al peso', () => {
      expect(estimateOneRepMax('100', '1')).toBe(103);
    });

    it('devuelve null si el peso no es válido (<=0)', () => {
      expect(estimateOneRepMax('0', '5')).toBeNull();
      expect(estimateOneRepMax('-10', '5')).toBeNull();
      expect(estimateOneRepMax('', '5')).toBeNull();
    });

    it('devuelve null si las reps están fuera de rango (1-30)', () => {
      expect(estimateOneRepMax('80', '0')).toBeNull();
      expect(estimateOneRepMax('80', '31')).toBeNull();
    });

    it('devuelve null para inputs vacíos/null', () => {
      expect(estimateOneRepMax(null, null)).toBeNull();
      expect(estimateOneRepMax(undefined, undefined)).toBeNull();
    });
  });

  describe('oneRepMaxWarning', () => {
    it('avisa cuando hay más de 12 reps', () => {
      expect(oneRepMaxWarning('13')).toBe('Con más de 12 reps la estimación es menos precisa');
    });

    it('avisa cuando hay exactamente 1 rep', () => {
      expect(oneRepMaxWarning('1')).toBe('Con 1 rep ya tienes tu 1RM directo');
    });

    it('no avisa para reps entre 2 y 12', () => {
      expect(oneRepMaxWarning('5')).toBeNull();
      expect(oneRepMaxWarning('12')).toBeNull();
    });
  });

  describe('buildWeightTable', () => {
    it('genera filas con % y peso redondeado', () => {
      const table = buildWeightTable(100, [0.7, 0.8, 0.9]);
      expect(table).toEqual([
        { pct: 0.7, pctLabel: 70, weight: 70 },
        { pct: 0.8, pctLabel: 80, weight: 80 },
        { pct: 0.9, pctLabel: 90, weight: 90 },
      ]);
    });

    it('redondea pesos no enteros', () => {
      const table = buildWeightTable(93, [0.65]);
      // 93 * 0.65 = 60.45 -> 60
      expect(table[0].weight).toBe(60);
    });

    it('devuelve [] si pcts no es un array', () => {
      expect(buildWeightTable(100, null)).toEqual([]);
      expect(buildWeightTable(100, undefined)).toEqual([]);
    });
  });
  describe('buildRmsByReps', () => {
    it('agrupa por movimiento y reps, y trata filas sin reps como 1RM', () => {
      const rows = [
        { movimiento: 'squat', peso: 100, reps: 1 },
        { movimiento: 'squat', peso: 85, reps: 3 },
        { movimiento: 'squat', peso: 90 },
        { movimiento: 'press', peso: 60, reps: 5 },
      ];
      expect(buildRmsByReps(rows)).toEqual({
        squat: { 1: '90', 3: '85' },
        press: { 5: '60' },
      });
    });

    it('regresion: las filas de 1RM siguen presentes en reps 1', () => {
      const map = buildRmsByReps([{ movimiento: 'deadlift', peso: 140, reps: 1 }]);
      expect(map.deadlift[1]).toBe('140');
    });

    it('devuelve objeto vacio con entrada vacia o invalida', () => {
      expect(buildRmsByReps([])).toEqual({});
      expect(buildRmsByReps(null)).toEqual({});
    });
  });

  describe('bestEstimated1RM', () => {
    it('prefiere el 3RM sobre el 5RM', () => {
      const r = bestEstimated1RM({ 5: '80', 3: '90' });
      expect(r).toEqual({ kg: estimateOneRepMax('90', 3), fromReps: 3 });
      expect(r.kg).toBe(99);
    });
    it('usa Epley con el nRM disponible', () => {
      expect(bestEstimated1RM({ 5: '80' })).toEqual({ kg: 93, fromReps: 5 });
    });
    it('devuelve null si no hay datos', () => {
      expect(bestEstimated1RM({})).toBeNull();
      expect(bestEstimated1RM(undefined)).toBeNull();
    });
    it('ignora el 1RM (solo estima desde nRM)', () => {
      expect(bestEstimated1RM({ 1: '100' })).toBeNull();
    });
  });

  describe('formatRmLabel', () => {
    it('formatea las reps', () => {
      expect(formatRmLabel(1)).toBe('1RM');
      expect(formatRmLabel(3)).toBe('3RM');
      expect(formatRmLabel('10')).toBe('10RM');
    });
  });
});

describe('isValidRmInput', () => {
  const { isValidRmInput } = require('../rmLogic');
  test('acepta enteros y decimales con coma o punto', () => {
    expect(isValidRmInput('90')).toBe(true);
    expect(isValidRmInput('92,5')).toBe(true);
    expect(isValidRmInput(' 102.5 ')).toBe(true);
  });
  test('rechaza vacío, cero, texto y valores absurdos', () => {
    ['', '0', 'abc', '9a', '-5', '600', null, undefined].forEach(v => expect(isValidRmInput(v)).toBe(false));
  });
});
