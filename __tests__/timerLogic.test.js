import { parseMins, parseEmom, detectTimerConfig } from '../timerLogic';

describe('timerLogic', () => {
  describe('parseMins', () => {
    it('extrae minutos de un string "20 min"', () => {
      expect(parseMins('20 min')).toBe(20);
    });

    it('es insensible a mayúsculas y espacios', () => {
      expect(parseMins('15MIN')).toBe(15);
      expect(parseMins('12  min')).toBe(12);
    });

    it('devuelve null si no hay coincidencia', () => {
      expect(parseMins('sin tiempo')).toBeNull();
    });

    it('devuelve null para input null/undefined', () => {
      expect(parseMins(null)).toBeNull();
      expect(parseMins(undefined)).toBeNull();
    });
  });

  describe('parseEmom', () => {
    it('parsea formato "1x10"', () => {
      expect(parseEmom('1x10')).toEqual({ interval: '1', rounds: '10' });
    });

    it('parsea formato con comilla "2\' x 8"', () => {
      expect(parseEmom("2' x 8")).toEqual({ interval: '2', rounds: '8' });
    });

    it('parsea con X mayúscula', () => {
      expect(parseEmom('1X12')).toEqual({ interval: '1', rounds: '12' });
    });

    it('devuelve null si no hay formato EMOM reconocible', () => {
      expect(parseEmom('20 min')).toBeNull();
    });

    it('devuelve null para input null/undefined', () => {
      expect(parseEmom(null)).toBeNull();
      expect(parseEmom(undefined)).toBeNull();
    });
  });

  describe('detectTimerConfig', () => {
    it('devuelve null si wod no tiene type', () => {
      expect(detectTimerConfig({})).toBeNull();
      expect(detectTimerConfig(null)).toBeNull();
    });

    it('detecta AMRAP con duración en minutos', () => {
      const cfg = detectTimerConfig({ type: 'AMRAP', duration: '20 min' });
      expect(cfg).toEqual({ mode: 'AMRAP', mins: 20 });
    });

    it('detecta AMRAP sin minutos parseables', () => {
      const cfg = detectTimerConfig({ type: 'AMRAP', duration: 'sin tiempo' });
      expect(cfg).toEqual({ mode: 'AMRAP', mins: null });
    });

    it('detecta EMOM con formato "interval x rounds"', () => {
      const cfg = detectTimerConfig({ type: 'EMOM', duration: '1x10' });
      expect(cfg).toEqual({ mode: 'EMOM', emomMins: '1', emomRounds: '10' });
    });

    it('detecta EMOM con solo minutos totales (fallback a 1min x N rondas)', () => {
      const cfg = detectTimerConfig({ type: 'EMOM', duration: '15 min' });
      expect(cfg).toEqual({ mode: 'EMOM', emomMins: '1', emomRounds: '15' });
    });

    it('detecta EMOM sin datos parseables', () => {
      const cfg = detectTimerConfig({ type: 'EMOM', duration: 'sin datos' });
      expect(cfg).toEqual({ mode: 'EMOM', emomMins: null, emomRounds: null });
    });

    it('detecta FOR TIME', () => {
      const cfg = detectTimerConfig({ type: 'FOR TIME', duration: '12 min' });
      expect(cfg).toEqual({ mode: 'FOR TIME', mins: 12 });
    });

    it('detecta TIME CAP / TIMECAP como FOR TIME', () => {
      expect(detectTimerConfig({ type: 'TIME CAP', duration: '10 min' })).toEqual({ mode: 'FOR TIME', mins: 10 });
      expect(detectTimerConfig({ type: 'TIMECAP', duration: '10 min' })).toEqual({ mode: 'FOR TIME', mins: 10 });
    });

    it('devuelve null para un tipo no reconocido', () => {
      expect(detectTimerConfig({ type: 'DESCANSO', duration: '' })).toBeNull();
    });

    it('es insensible a mayúsculas/minúsculas en el type', () => {
      expect(detectTimerConfig({ type: 'amrap', duration: '20 min' })).toEqual({ mode: 'AMRAP', mins: 20 });
    });
  });
});
