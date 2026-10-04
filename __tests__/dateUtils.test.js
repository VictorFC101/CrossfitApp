import {
  getToday,
  parseDateFromDay,
  isToday,
  isPast,
  isFuture,
  getTodayIdx,
  getTodayDay,
  isTodayInProgram,
  getInitialIdx,
  assignDatesFromStart,
  formatDateShort,
} from '../dateUtils';

describe('dateUtils', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 4, 15, 10, 0, 0)); // 15 Mayo 2026
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('parseDateFromDay', () => {
    it('parsea un día válido con número y mes', () => {
      const d = parseDateFromDay('Lunes 4 Mayo');
      expect(d).not.toBeNull();
      expect(d.getDate()).toBe(4);
      expect(d.getMonth()).toBe(4);
    });

    it('devuelve null si falta el número de día', () => {
      expect(parseDateFromDay('Lunes')).toBeNull();
    });

    it('devuelve null si falta el mes', () => {
      expect(parseDateFromDay('Lunes 4')).toBeNull();
    });

    it('devuelve null para input vacío', () => {
      expect(parseDateFromDay('')).toBeNull();
    });

    it('devuelve null con input vacío, null o no-string', () => {
      expect(parseDateFromDay(null)).toBeNull();
      expect(parseDateFromDay(undefined)).toBeNull();
      expect(parseDateFromDay('')).toBeNull();
      expect(parseDateFromDay('   ')).toBeNull();
      expect(parseDateFromDay(42)).toBeNull();
    });

    it('infiere el año más cercano a hoy', () => {
      const d = parseDateFromDay('Lunes 4 May');
      expect(d.getFullYear()).toBe(2026);
    });
  });

  describe('isToday / isPast / isFuture', () => {
    it('detecta el día de hoy', () => {
      expect(isToday('Viernes 15 May')).toBe(true);
    });

    it('detecta un día pasado', () => {
      expect(isPast('Lunes 4 May')).toBe(true);
      expect(isFuture('Lunes 4 May')).toBe(false);
    });

    it('detecta un día futuro', () => {
      expect(isFuture('Lunes 25 May')).toBe(true);
      expect(isPast('Lunes 25 May')).toBe(false);
    });

    it('devuelve false para strings no parseables', () => {
      expect(isPast('no-date')).toBe(false);
      expect(isFuture('no-date')).toBe(false);
      expect(isToday('no-date')).toBe(false);
    });
  });

  describe('getTodayIdx / getTodayDay / isTodayInProgram', () => {
    const days = [
      { day: 'Lunes 11 May' },
      { day: 'Viernes 15 May' },
      { day: 'Lunes 18 May' },
    ];

    it('encuentra el índice de hoy', () => {
      expect(getTodayIdx(days)).toBe(1);
    });

    it('getTodayDay devuelve el día correcto', () => {
      expect(getTodayDay(days)).toBe(days[1]);
    });

    it('isTodayInProgram es true cuando hoy está en la lista', () => {
      expect(isTodayInProgram(days)).toBe(true);
    });

    it('isTodayInProgram es false cuando hoy no está', () => {
      expect(isTodayInProgram([{ day: 'Lunes 1 Ene' }])).toBe(false);
    });
  });

  describe('getInitialIdx', () => {
    it('devuelve el día exacto de hoy si existe', () => {
      const days = [{ day: 'Lunes 11 May' }, { day: 'Viernes 15 May' }];
      expect(getInitialIdx(days)).toBe(1);
    });

    it('cae al día pasado más reciente si hoy no está en el programa', () => {
      const days = [{ day: 'Lunes 4 May' }, { day: 'Lunes 11 May' }];
      // ninguno cae en la semana actual (11-17 May) salvo Lunes 11 May,
      // que sí cae en la semana actual → se espera ese índice
      expect(getInitialIdx(days)).toBe(1);
    });

    it('cae al primer día futuro si no hay pasado ni semana actual', () => {
      const days = [{ day: 'Lunes 25 May' }, { day: 'Lunes 1 Jun' }];
      expect(getInitialIdx(days)).toBe(0);
    });

    it('ignora días no parseables', () => {
      const days = [{ day: 'no-date' }, { day: 'Viernes 15 May' }];
      expect(getInitialIdx(days)).toBe(1);
    });
  });

  describe('assignDatesFromStart', () => {
    it('asigna fechas reales partiendo de startDate', () => {
      const plan = {
        weeks: [
          { days: [{ day: 'Lunes' }, { day: 'Miércoles' }, { day: 'Viernes' }] },
        ],
      };
      const result = assignDatesFromStart(plan, '2026-05-04'); // Lunes 4 Mayo 2026
      expect(result.weeks[0].days[0].day).toBe('Lunes 4 May');
      expect(result.weeks[0].days[1].day).toBe('Miércoles 6 May');
      expect(result.weeks[0].days[2].day).toBe('Viernes 8 May');
    });

    it('devuelve el plan tal cual si startDateStr es inválido', () => {
      const plan = { weeks: [{ days: [{ day: 'Lunes' }] }] };
      const result = assignDatesFromStart(plan, '');
      expect(result).toBe(plan);
    });

    it('deja el día sin cambios si el nombre no coincide con un día de la semana', () => {
      const plan = { weeks: [{ days: [{ day: 'DíaRaro' }] }] };
      const result = assignDatesFromStart(plan, '2026-05-04');
      expect(result.weeks[0].days[0].day).toBe('DíaRaro');
    });
  });

  describe('formatDateShort', () => {
    it('formatea una fecha con día de semana y mes abreviados', () => {
      const d = new Date(2026, 4, 15, 12, 0, 0); // Viernes 15 Mayo 2026
      expect(formatDateShort(d)).toBe('Vie 15 May');
    });
  });

  describe('getToday', () => {
    it('devuelve la fecha actual a mediodía', () => {
      const t = getToday();
      expect(t.getHours()).toBe(12);
      expect(t.getDate()).toBe(15);
      expect(t.getMonth()).toBe(4);
      expect(t.getFullYear()).toBe(2026);
    });
  });
});
