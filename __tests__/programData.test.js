import { mayo2026 } from '../assets/mayo2026';
import { junio2026 } from '../assets/junio2026';
import { assignDatesFromStart, parseDateFromDay } from '../dateUtils';
import { RM_KEY_NAMES } from '../wodLogic';

// Los programas se guardan como plantillas (day: "Lunes", sin fecha concreta);
// las fechas reales se asignan en runtime con assignDatesFromStart cuando el
// admin asigna un programa a un alumno. Simulamos esa asignación aquí con una
// fecha de inicio arbitraria (un lunes) para poder validar que cada día
// resultante tiene una fecha parseable.
const START_DATE = '2026-05-04'; // Lunes 4 Mayo 2026

describe.each([
  ['mayo2026', mayo2026],
  ['junio2026', junio2026],
])('programData: %s', (name, program) => {
  const withDates = assignDatesFromStart(program, START_DATE);
  const allDays = withDates.weeks.flatMap(w => w.days);

  it('tiene al menos un día', () => {
    expect(allDays.length).toBeGreaterThan(0);
  });

  it('cada día tiene una fecha parseable tras assignDatesFromStart', () => {
    const failing = allDays
      .map((d, idx) => ({ idx, day: d.day, date: parseDateFromDay(d.day) }))
      .filter(r => !r.date);
    if (failing.length) {
      // eslint-disable-next-line no-console
      console.error(`${name}: días sin fecha parseable:`, failing);
    }
    expect(failing).toEqual([]);
  });

  it('cada día de fuerza con complex (rmKeys) resuelve a 2 rmKeys válidos', () => {
    const originalDays = program.weeks.flatMap(w => w.days);
    const failing = [];
    originalDays.forEach((d, idx) => {
      if (!Array.isArray(d.rmKeys)) return;
      const valid = d.rmKeys.length === 2 && d.rmKeys.every(k => RM_KEY_NAMES[k] !== undefined);
      if (!valid) failing.push({ idx, day: d.day, rmKeys: d.rmKeys });
    });
    if (failing.length) {
      // eslint-disable-next-line no-console
      console.error(`${name}: días con rmKeys inválidos:`, failing);
    }
    expect(failing).toEqual([]);
  });

  it('cada día de fuerza tiene un rmKey base válido', () => {
    const originalDays = program.weeks.flatMap(w => w.days);
    const failing = [];
    originalDays.forEach((d, idx) => {
      if (!d.rmKey) return;
      if (RM_KEY_NAMES[d.rmKey] === undefined) failing.push({ idx, day: d.day, rmKey: d.rmKey });
    });
    if (failing.length) {
      // eslint-disable-next-line no-console
      console.error(`${name}: días con rmKey base inválido:`, failing);
    }
    expect(failing).toEqual([]);
  });
});
