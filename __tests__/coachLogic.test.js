import { diasSinRegistrar, estadoActividad, adherenciaSemana, agruparPorSemana, resultadosComoMapa, libresParaBenchmarks, libresComoResultados } from '../coachLogic';
import { getBenchmarkHistory } from '../benchmarkLogic';

const NOW = new Date(2026, 9, 9, 10, 0, 0); // 9 oct 2026 (viernes)

describe('coachLogic', () => {
  describe('diasSinRegistrar', () => {
    it('devuelve null sin registro o fecha inválida', () => {
      expect(diasSinRegistrar(null, NOW)).toBeNull();
      expect(diasSinRegistrar('xx', NOW)).toBeNull();
    });
    it('cuenta días naturales', () => {
      expect(diasSinRegistrar(new Date(2026, 9, 9, 8).toISOString(), NOW)).toBe(0);
      expect(diasSinRegistrar(new Date(2026, 9, 8, 23).toISOString(), NOW)).toBe(1);
      expect(diasSinRegistrar(new Date(2026, 9, 2, 12).toISOString(), NOW)).toBe(7);
    });
  });

  describe('estadoActividad', () => {
    const f = (d) => ({ ultimo_resultado: new Date(2026, 9, 9 - d, 12).toISOString() });
    it('activo hasta 3 días', () => {
      expect(estadoActividad(f(0), NOW)).toBe('activo');
      expect(estadoActividad(f(3), NOW)).toBe('activo');
    });
    it('irregular de 4 a 7 días', () => {
      expect(estadoActividad(f(4), NOW)).toBe('irregular');
      expect(estadoActividad(f(7), NOW)).toBe('irregular');
    });
    it('inactivo con más de 7 días o sin registros', () => {
      expect(estadoActividad(f(8), NOW)).toBe('inactivo');
      expect(estadoActividad({ ultimo_resultado: null }, NOW)).toBe('inactivo');
      expect(estadoActividad(null, NOW)).toBe('inactivo');
    });
  });

  describe('adherenciaSemana', () => {
    const dias = [
      { day: 'Viernes 9 Oct' }, { day: 'Jueves 8 Oct' }, { day: 'Martes 6 Oct' },
      { day: 'Jueves 1 Oct' }, { day: 'Sábado 10 Oct' },
    ];
    it('null sin programa', () => {
      expect(adherenciaSemana(null, [], NOW)).toBeNull();
      expect(adherenciaSemana([], [], NOW)).toBeNull();
    });
    it('cuenta solo días de los últimos 7 días', () => {
      expect(adherenciaSemana(dias, ['Jueves 8 Oct', 'Jueves 1 Oct'], NOW)).toEqual({ hechos: 1, programados: 3 });
    });
    it('0 programados si ningún día cae en la ventana', () => {
      expect(adherenciaSemana([{ day: 'Jueves 1 Oct' }], [], NOW)).toEqual({ hechos: 0, programados: 0 });
    });
  });

  describe('agruparPorSemana', () => {
    it('agrupa por semana ISO, la más reciente primero', () => {
      const rs = [
        { dia: 'a', fecha: new Date(2026, 9, 5, 12).toISOString() },  // lunes 5 oct
        { dia: 'b', fecha: new Date(2026, 9, 9, 12).toISOString() },  // viernes 9 oct (misma semana)
        { dia: 'c', fecha: new Date(2026, 9, 2, 12).toISOString() },  // semana anterior
      ];
      const g = agruparPorSemana(rs);
      expect(g).toHaveLength(2);
      expect(g[0].items.map(r => r.dia)).toEqual(['b', 'a']);
      expect(g[1].items.map(r => r.dia)).toEqual(['c']);
      expect(g[0].clave).toBe('2026-W41');
      expect(g[0].lunes.getDate()).toBe(5);
    });
    it('lista vacía o inválida', () => {
      expect(agruparPorSemana([])).toEqual([]);
      expect(agruparPorSemana(null)).toEqual([]);
    });
  });

  describe('wods libres y benchmarks', () => {
    const libres = [
      { nombre: 'Fran casero', resultado: '4:10', fecha: '2026-10-03T10:00:00Z', benchmark_key: 'fran' },
      { nombre: 'Mi WOD', resultado: '12 rondas', fecha: '2026-10-04T10:00:00Z', benchmark_key: null, notas: 'duro' },
    ];
    it('fusiona programa y libres en el historial, libres como Rx', () => {
      const prog = [{ dia: 'Lunes 5 Oct', programa_id: 'p', resultado: '5:00', rx: false, fecha: '2026-10-05T10:00:00Z', benchmark_key: 'fran' }];
      const h = getBenchmarkHistory('fran', resultadosComoMapa(prog), libresParaBenchmarks(libres));
      expect(h).toHaveLength(2);
      expect(h.find(e => e.source === 'libre').rx).toBe(true);
      expect(h.find(e => e.source === 'programa').rx).toBe(false);
    });
    it('libres sin benchmark pasan a la lista de resultados', () => {
      const r = libresComoResultados(libres);
      expect(r).toHaveLength(1);
      expect(r[0].dia).toBe('WOD libre · Mi WOD');
    });
  });
});
