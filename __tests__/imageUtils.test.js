const { urlVersionada } = require('../imageUtils');

describe('urlVersionada', () => {
  const base = 'https://x.supabase.co/storage/v1/object/public/avatars/u1/avatar.jpg';
  test('añade la versión a la URL', () => {
    expect(urlVersionada(base, 123)).toBe(`${base}?v=123`);
  });
  test('sustituye una versión anterior en vez de acumular parámetros', () => {
    expect(urlVersionada(`${base}?v=111`, 222)).toBe(`${base}?v=222`);
  });
  test('cada subida produce una URL distinta', () => {
    expect(urlVersionada(base, 1)).not.toBe(urlVersionada(base, 2));
  });
  test('sin URL devuelve lo mismo', () => {
    expect(urlVersionada(null)).toBeNull();
    expect(urlVersionada('')).toBe('');
  });
});
