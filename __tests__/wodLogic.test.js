import { inferRmKeysFromText, getEffectiveRM, RM_KEY_NAMES } from '../wodLogic';

describe('wodLogic', () => {
  describe('inferRmKeysFromText', () => {
    it('infiere 2 movimientos de un complex (power clean + push press)', () => {
      expect(inferRmKeysFromText('Power Clean + Push Press')).toEqual(['pc', 'pp']);
    });

    it('respeta el orden de aparición en el texto', () => {
      expect(inferRmKeysFromText('Push Press + Power Clean')).toEqual(['pp', 'pc']);
    });

    it('prioriza patrones específicos sobre genéricos (squat clean vs clean)', () => {
      expect(inferRmKeysFromText('Squat Clean + Strict Press')).toEqual(['clean', 'sp']);
    });

    it('no detecta el mismo movimiento dos veces', () => {
      expect(inferRmKeysFromText('Clean + Clean')).toBeNull();
    });

    it('devuelve null si solo hay un movimiento', () => {
      expect(inferRmKeysFromText('Back Squat')).toBeNull();
    });

    it('devuelve null si no hay movimientos reconocidos', () => {
      expect(inferRmKeysFromText('Carrera continua 20 min')).toBeNull();
    });

    it('devuelve null para texto vacío o null', () => {
      expect(inferRmKeysFromText('')).toBeNull();
      expect(inferRmKeysFromText(null)).toBeNull();
      expect(inferRmKeysFromText(undefined)).toBeNull();
    });

    it('es insensible a mayúsculas/minúsculas', () => {
      expect(inferRmKeysFromText('SNATCH + overhead squat')).toEqual(['sn', 'ohs']);
    });
  });

  describe('getEffectiveRM', () => {
    it('usa rmKeys explícitos cuando ambos RMs están disponibles (usa el más bajo)', () => {
      const day = { rmKeys: ['pc', 'pp'] };
      const rms = { pc: '80', pp: '60' };
      const result = getEffectiveRM(day, rms);
      expect(result).toMatchObject({ rmKey: 'pp', rmVal: 60, hasRM: true, isComplex: true });
      expect(result.limitName).toBe(RM_KEY_NAMES['pp']);
    });

    it('usa el único RM disponible cuando falta el otro (complex, un solo RM)', () => {
      const day = { rmKeys: ['pc', 'pp'] };
      const rms = { pc: '80' };
      const result = getEffectiveRM(day, rms);
      expect(result).toMatchObject({ rmKey: 'pc', rmVal: 80, hasRM: true, isComplex: true });
    });

    it('devuelve hasRM false cuando no hay ningún RM disponible (complex, ninguno)', () => {
      const day = { rmKeys: ['pc', 'pp'] };
      const rms = {};
      const result = getEffectiveRM(day, rms);
      expect(result.hasRM).toBe(false);
      expect(result.isComplex).toBe(true);
      expect(Number.isNaN(result.rmVal)).toBe(true);
    });

    it('infiere rmKeys del texto de strength.title cuando no hay rmKeys explícito', () => {
      const day = { strength: { title: 'Power Clean + Push Press' } };
      const rms = { pc: '80', pp: '60' };
      const result = getEffectiveRM(day, rms);
      expect(result.isComplex).toBe(true);
      expect(result.rmKey).toBe('pp');
    });

    it('infiere rmKeys del label cuando no hay strength.title', () => {
      const day = { label: 'Back Squat + Front Squat' };
      const rms = { bs: '100', fs: '90' };
      const result = getEffectiveRM(day, rms);
      expect(result.isComplex).toBe(true);
      expect(result.rmKey).toBe('fs');
    });

    it('usa rmKey simple cuando no es complex y hay rmKey explícito', () => {
      const day = { rmKey: 'bs' };
      const rms = { bs: '120' };
      const result = getEffectiveRM(day, rms);
      expect(result).toEqual({ rmKey: 'bs', rmVal: 120, hasRM: true, isComplex: false, limitName: null });
    });

    it('usa "cj" por defecto si no hay rmKey ni se puede inferir', () => {
      const day = {};
      const rms = { cj: '100' };
      const result = getEffectiveRM(day, rms);
      expect(result).toEqual({ rmKey: 'cj', rmVal: 100, hasRM: true, isComplex: false, limitName: null });
    });

    it('hasRM es false si el RM simple es 0 o no numérico', () => {
      const day = { rmKey: 'bs' };
      expect(getEffectiveRM(day, { bs: '0' }).hasRM).toBe(false);
      expect(getEffectiveRM(day, {}).hasRM).toBe(false);
    });
  });
});
