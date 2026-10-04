// Conversión de precios: el admin escribe euros, la BD guarda céntimos.
export function eurosACents(valor) {
  if (valor === null || valor === undefined) return null;
  const txt = String(valor).trim().replace(',', '.');
  if (txt === '') return null;
  const n = Number(txt);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function centsAEuros(cents) {
  if (cents === null || cents === undefined || cents === '') return '';
  const n = Number(cents);
  if (!Number.isFinite(n)) return '';
  return (n / 100).toFixed(2).replace('.', ',');
}

const SIMBOLOS = { EUR: '€', USD: '$', GBP: '£' };

export function formatear(cents, moneda = 'EUR') {
  if (cents === null || cents === undefined || cents === '') return '—';
  const n = Number(cents);
  if (!Number.isFinite(n)) return '—';
  const s = centsAEuros(n);
  const sim = SIMBOLOS[String(moneda || 'EUR').toUpperCase()] || moneda;
  return `${s} ${sim}`;
}
