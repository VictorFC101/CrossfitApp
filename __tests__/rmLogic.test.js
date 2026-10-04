import { estimateOneRepMax, oneRepMaxWarning, buildWeightTable } from '../rmLogic';

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
});
