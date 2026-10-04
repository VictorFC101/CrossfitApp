import {
  getProgramDateRange,
  getActiveProgram,
  enrichProgram,
  isNetworkError,
  rowToProgram,
} from '../programLogic';

function makeProgram({ name, days }) {
  return { name, weeks: [{ days }] };
}

describe('programLogic', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 4, 15, 10, 0, 0)); // 15 Mayo 2026
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getProgramDateRange', () => {
    it('calcula start/end a partir de los días del programa', () => {
      const p = makeProgram({ days: [{ day: 'Lunes 4 May' }, { day: 'Viernes 29 May' }] });
      const { start, end } = getProgramDateRange(p);
      expect(start.getDate()).toBe(4);
      expect(end.getDate()).toBe(29);
    });

    it('devuelve start/end null si no hay fechas parseables', () => {
      const p = makeProgram({ days: [{ day: 'no-date' }] });
      expect(getProgramDateRange(p)).toEqual({ start: null, end: null });
    });

    it('ignora días sin fecha mezclados con días válidos', () => {
      const p = makeProgram({ days: [{ day: 'no-date' }, { day: 'Lunes 4 May' }] });
      const { start, end } = getProgramDateRange(p);
      expect(start.getDate()).toBe(4);
      expect(end.getDate()).toBe(4);
    });
  });

  describe('getActiveProgram', () => {
    it('devuelve el programa activo (hoy dentro del rango)', () => {
      const activo = makeProgram({ name: 'activo', days: [{ day: 'Lunes 11 May' }, { day: 'Viernes 29 May' }] });
      const futuro = makeProgram({ name: 'futuro', days: [{ day: 'Lunes 1 Jun' }] });
      expect(getActiveProgram([futuro, activo]).name).toBe('activo');
    });

    it('devuelve el más reciente pasado si ninguno está activo', () => {
      const pasadoLejano = makeProgram({ name: 'lejano', days: [{ day: 'Lunes 2 Mar' }] });
      const pasadoCercano = makeProgram({ name: 'cercano', days: [{ day: 'Lunes 4 May' }] });
      expect(getActiveProgram([pasadoLejano, pasadoCercano]).name).toBe('cercano');
    });

    it('devuelve el próximo futuro si no hay activo ni pasado', () => {
      const futuroLejano = makeProgram({ name: 'lejano', days: [{ day: 'Lunes 1 Ago' }] });
      const futuroCercano = makeProgram({ name: 'cercano', days: [{ day: 'Lunes 1 Jun' }] });
      expect(getActiveProgram([futuroLejano, futuroCercano]).name).toBe('cercano');
    });

    it('cae al primer programa de la lista si ninguno tiene fechas', () => {
      const p1 = makeProgram({ name: 'p1', days: [{ day: 'no-date' }] });
      const p2 = makeProgram({ name: 'p2', days: [{ day: 'no-date' }] });
      expect(getActiveProgram([p1, p2]).name).toBe('p1');
    });
  });

  describe('enrichProgram', () => {
    it('marca status "activo" cuando hoy está en rango', () => {
      const p = makeProgram({ days: [{ day: 'Lunes 11 May' }, { day: 'Viernes 29 May' }] });
      expect(enrichProgram(p)._meta.status).toBe('activo');
    });

    it('marca status "completado" cuando el rango ya pasó', () => {
      const p = makeProgram({ days: [{ day: 'Lunes 2 Mar' }, { day: 'Viernes 6 Mar' }] });
      expect(enrichProgram(p)._meta.status).toBe('completado');
    });

    it('marca status "futuro" cuando el rango es posterior a hoy', () => {
      const p = makeProgram({ days: [{ day: 'Lunes 1 Jun' }, { day: 'Viernes 5 Jun' }] });
      expect(enrichProgram(p)._meta.status).toBe('futuro');
    });

    it('marca status "futuro" cuando no hay fechas parseables', () => {
      const p = makeProgram({ days: [{ day: 'no-date' }] });
      expect(enrichProgram(p)._meta.status).toBe('futuro');
    });

    it('usa program.name como título si existe', () => {
      const p = makeProgram({ name: 'Mi Programa', days: [{ day: 'Lunes 4 May' }] });
      expect(enrichProgram(p)._meta.title).toBe('Mi Programa');
    });

    it('genera título con mes único cuando start y end están en el mismo mes', () => {
      const p = makeProgram({ days: [{ day: 'Lunes 4 May' }, { day: 'Viernes 29 May' }] });
      expect(enrichProgram(p)._meta.title).toBe('CrossFit Mayo 2026');
    });

    it('genera título con rango de meses cuando start y end difieren', () => {
      const p = makeProgram({ days: [{ day: 'Lunes 25 May' }, { day: 'Viernes 5 Jun' }] });
      expect(enrichProgram(p)._meta.title).toBe('CrossFit May–Jun 2026');
    });

    it('título es "Programa" si no hay fecha de inicio', () => {
      const p = makeProgram({ days: [{ day: 'no-date' }] });
      expect(enrichProgram(p)._meta.title).toBe('Programa');
    });
  });

  describe('isNetworkError', () => {
    it('detecta errores de red por mensaje', () => {
      expect(isNetworkError({ message: 'Network request failed' })).toBe(true);
      expect(isNetworkError({ message: 'fetch failed' })).toBe(true);
      expect(isNetworkError({ name: 'AbortError' })).toBe(true);
      expect(isNetworkError({ message: 'operation timed out' })).toBe(true);
      expect(isNetworkError({ message: 'request timeout' })).toBe(true);
    });

    it('no detecta errores no relacionados con red', () => {
      expect(isNetworkError({ message: 'permission denied' })).toBe(false);
      expect(isNetworkError({})).toBe(false);
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
    });
  });

  describe('rowToProgram', () => {
    it('combina data, id y name de la fila de Supabase', () => {
      const row = { id: 42, name: 'Mi Programa', data: { weeks: [] } };
      expect(rowToProgram(row)).toEqual({ weeks: [], id: 42, name: 'Mi Programa' });
    });

    it('usa data.name si row.name es null', () => {
      const row = { id: 1, name: null, data: { name: 'Interno', weeks: [] } };
      expect(rowToProgram(row).name).toBe('Interno');
    });

    it('name queda undefined si no hay name en ningún lado', () => {
      const row = { id: 1, data: { weeks: [] } };
      expect(rowToProgram(row).name).toBeUndefined();
    });
  });
});
