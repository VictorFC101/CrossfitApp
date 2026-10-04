import { getTodayKey, msUntilNextMidnight, daySyncKey, MIDNIGHT_BUFFER_MS } from '../dateUtils';

describe('getTodayKey', () => {
  test('formatea YYYY-MM-DD con ceros a la izquierda', () => {
    expect(getTodayKey(new Date(2026, 0, 5, 9, 3))).toBe('2026-01-05');
    expect(getTodayKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
  test('sin argumentos devuelve un formato válido', () => {
    expect(getTodayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('msUntilNextMidnight', () => {
  test('a las 23:59:59 es un valor pequeño y positivo', () => {
    const now = new Date(2026, 5, 10, 23, 59, 59);
    expect(msUntilNextMidnight(now)).toBe(1000 + MIDNIGHT_BUFFER_MS);
  });
  test('a las 00:00:01 son ~24h', () => {
    const now = new Date(2026, 5, 10, 0, 0, 1);
    expect(msUntilNextMidnight(now)).toBe(24 * 3600 * 1000 - 1000 + MIDNIGHT_BUFFER_MS);
  });
  test('en día de cambio horario usa medianoche local de mañana', () => {
    // 29 marzo 2026 (cambio DST en Europa; en otras zonas es un día normal)
    const now = new Date(2026, 2, 29, 12, 0, 0);
    const tomorrow = new Date(2026, 2, 30, 0, 0, 0);
    expect(msUntilNextMidnight(now)).toBe(tomorrow.getTime() - now.getTime() + MIDNIGHT_BUFFER_MS);
  });
});

describe('daySyncKey', () => {
  test('estable con los mismos datos', () => {
    expect(daySyncKey('2026-06-10', 'p1', 20)).toBe(daySyncKey('2026-06-10', 'p1', 20));
  });
  test('cambia con fecha, programa o longitud', () => {
    const base = daySyncKey('2026-06-10', 'p1', 20);
    expect(daySyncKey('2026-06-11', 'p1', 20)).not.toBe(base);
    expect(daySyncKey('2026-06-10', 'p2', 20)).not.toBe(base);
    expect(daySyncKey('2026-06-10', 'p1', 21)).not.toBe(base);
  });
  test('sin programa no rompe', () => {
    expect(daySyncKey('2026-06-10', undefined, 0)).toBe('2026-06-10|none|0');
  });
});
