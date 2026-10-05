import { isEmailQuery, sanitizeNameQuery } from '../userSearchLogic';

describe('isEmailQuery', () => {
  it('detecta emails', () => {
    expect(isEmailQuery('a@b.com')).toBe(true);
    expect(isEmailQuery('  a@b.com ')).toBe(true);
  });
  it('rechaza nombres y valores no string', () => {
    expect(isEmailQuery('Victor')).toBe(false);
    expect(isEmailQuery('')).toBe(false);
    expect(isEmailQuery(null)).toBe(false);
  });
});

describe('sanitizeNameQuery', () => {
  it('quita comodines y separadores', () => {
    expect(sanitizeNameQuery(' Vic%tor_,(x) ')).toBe('Vic tor x');
  });
  it('tolera vacío', () => {
    expect(sanitizeNameQuery(undefined)).toBe('');
  });
});
