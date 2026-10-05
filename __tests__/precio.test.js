import { eurosACents, centsAEuros, formatear } from '../screens/admin/precio';

describe('precio', () => {
  it('convierte euros a céntimos', () => {
    expect(eurosACents('12,50')).toBe(1250);
    expect(eurosACents('12.5')).toBe(1250);
    expect(eurosACents('0.29')).toBe(29);
    expect(eurosACents('19.99')).toBe(1999);
    expect(eurosACents('')).toBe(null);
    expect(eurosACents('abc')).toBe(null);
    expect(eurosACents('-3')).toBe(null);
  });
  it('convierte céntimos a euros', () => {
    expect(centsAEuros(1250)).toBe('12,50');
    expect(centsAEuros(5)).toBe('0,05');
    expect(centsAEuros(null)).toBe('');
  });
  it('formatea', () => {
    expect(formatear(4500)).toBe('45,00 €');
    expect(formatear(undefined)).toBe('—');
  });
});
