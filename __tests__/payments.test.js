import {
  formatPrecio, cartTotal, cartCount, addToCart, removeFromCart, setQty,
  estadoMembresia, etiquetaPlan, unirSuscripciones,
} from '../lib/payments';

const camiseta = { producto_id: 'p1', variante_id: 'v1', precio_cents: 2500, cantidad: 1 };

describe('formatPrecio', () => {
  test('formatea EUR en es-ES', () => {
    const s = formatPrecio(2550, 'EUR').replace(/\s/g, ' ');
    expect(s).toMatch(/25,50/);
    expect(s).toMatch(/€/);
  });
  test('tolera valores inválidos', () => {
    expect(formatPrecio(undefined, 'EUR')).toMatch(/0,00/);
    expect(formatPrecio(100, 'XXXX9')).toMatch(/1,00/);
  });
});

describe('carrito', () => {
  test('addToCart agrega y suma la misma línea sin mutar', () => {
    const c0 = [];
    const c1 = addToCart(c0, camiseta);
    const c2 = addToCart(c1, camiseta);
    expect(c0).toEqual([]);
    expect(c1[0].cantidad).toBe(1);
    expect(c2).toHaveLength(1);
    expect(c2[0].cantidad).toBe(2);
  });
  test('variantes distintas son líneas distintas', () => {
    const c = addToCart(addToCart([], camiseta), { ...camiseta, variante_id: 'v2' });
    expect(c).toHaveLength(2);
  });
  test('cartTotal y cartCount', () => {
    const c = addToCart(addToCart([], camiseta), { ...camiseta, variante_id: 'v2', precio_cents: 1000, cantidad: 3 });
    expect(cartTotal(c)).toBe(2500 + 3000);
    expect(cartCount(c)).toBe(4);
    expect(cartTotal(null)).toBe(0);
  });
  test('removeFromCart', () => {
    const c = addToCart([], camiseta);
    expect(removeFromCart(c, 'p1', 'v1')).toEqual([]);
    expect(removeFromCart(c, 'p1', 'v9')).toHaveLength(1);
    expect(c).toHaveLength(1);
  });
  test('setQty actualiza y elimina con <= 0', () => {
    const c = addToCart([], camiseta);
    expect(setQty(c, 'p1', 'v1', 5)[0].cantidad).toBe(5);
    expect(setQty(c, 'p1', 'v1', 0)).toEqual([]);
    expect(c[0].cantidad).toBe(1);
  });
});

describe('estadoMembresia', () => {
  const now = new Date('2026-01-10T00:00:00Z');
  test('sin suscripción', () => {
    expect(estadoMembresia(null, now)).toEqual({ activa: false, diasRestantes: 0, etiqueta: 'Sin membresía' });
  });
  test('activa con días restantes', () => {
    const r = estadoMembresia({ estado: 'activa', periodo_fin: '2026-01-20T00:00:00Z' }, now);
    expect(r).toEqual({ activa: true, diasRestantes: 10, etiqueta: 'Activa' });
  });
  test('activa que se cancela al final', () => {
    const r = estadoMembresia({ estado: 'activa', periodo_fin: '2026-01-11T00:00:00Z', cancelar_al_final: true }, now);
    expect(r.activa).toBe(true);
    expect(r.etiqueta).toMatch(/1 día/);
  });
  test('activa con periodo pasado se considera vencida', () => {
    const r = estadoMembresia({ estado: 'activa', periodo_fin: '2026-01-01T00:00:00Z' }, now);
    expect(r.activa).toBe(false);
    expect(r.etiqueta).toBe('Vencida');
  });
  test('activa sin fecha de fin válida no se considera activa', () => {
    const sinFin = estadoMembresia({ estado: 'activa', periodo_fin: null }, now);
    expect(sinFin.activa).toBe(false);
    expect(sinFin.etiqueta).toBe('Vencida');
    expect(estadoMembresia({ estado: 'activa', periodo_fin: 'no-es-fecha' }, now).activa).toBe(false);
  });
  test('impago y cancelada no están activas', () => {
    expect(estadoMembresia({ estado: 'impago', periodo_fin: '2026-02-01' }, now).activa).toBe(false);
    expect(estadoMembresia({ estado: 'cancelada' }, now).etiqueta).toBe('Cancelada');
  });
});

describe('etiquetaPlan', () => {
  test('etiquetas', () => {
    expect(etiquetaPlan({ tipo: 'recurrente', meses: 1 })).toBe('Mensual');
    expect(etiquetaPlan({ tipo: 'prepago', meses: 3 })).toBe('3 meses');
    expect(etiquetaPlan({ tipo: 'prepago', meses: 12 })).toBe('Anual');
    expect(etiquetaPlan({ tipo: 'prepago', meses: 1 })).toBe('1 mes');
    expect(etiquetaPlan(null)).toBe('');
  });
});

describe('unirSuscripciones', () => {
  const activa = { id: 'a', estado: 'activa', periodo_fin: '2026-11-09T00:00:00Z' };
  const pendientes = ['p1', 'p2', 'p3', 'p4', 'p5'].map(id => ({ id, estado: 'pendiente' }));

  test('una membresía activa no se pierde tras cinco intentos pendientes más recientes', () => {
    const r = unirSuscripciones([activa], pendientes);
    expect(r[0]).toBe(activa);
    expect(r).toHaveLength(6);
    expect(estadoMembresia(r.find(s => estadoMembresia(s, new Date('2026-10-10')).activa), new Date('2026-10-10')).activa).toBe(true);
  });
  test('sin duplicados si la activa también está entre las recientes', () => {
    const r = unirSuscripciones([activa], [activa, ...pendientes.slice(0, 2)]);
    expect(r.map(s => s.id)).toEqual(['a', 'p1', 'p2']);
  });
  test('tolera listas vacías o nulas', () => {
    expect(unirSuscripciones(null, undefined)).toEqual([]);
    expect(unirSuscripciones([], pendientes.slice(0, 1))).toHaveLength(1);
  });
});
