import { render, screen } from '@testing-library/react-native';
import { ShareResultCard } from '../ShareResultCard';

const base = {
  title: 'Lunes 5',
  dateISO: '2026-10-05T00:00:00.000Z',
  dateLabel: '5 Oct 2026',
  typeLabel: 'AMRAP · WOD',
  durationLabel: '12 min',
  movements: [
    { reps: '10', name: 'Thruster', weight: '40kg' },
    { reps: '15', name: 'Pull-up' },
  ],
  resultado: '5+12',
  resultParts: { time: '', rounds: '5', reps: '12' },
  chip: 'RX',
  notas: '',
  breakdown: [],
};

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
});
afterEach(() => jest.useRealTimers());

describe('ShareResultCard', () => {
  it('muestra título en mayúsculas y la fecha del WOD, no la de hoy', async () => {
    await render(<ShareResultCard shareable={base} acento="#e63946" />);
    expect(screen.getByText('LUNES 5')).toBeTruthy();
    expect(screen.getByText('5 Oct 2026')).toBeTruthy();
    expect(screen.queryByText(/15 Ene 2026/)).toBeNull();
  });

  it('une tipo y duración en una línea', async () => {
    await render(<ShareResultCard shareable={base} acento="#e63946" />);
    expect(screen.getByText('AMRAP · WOD · 12 min')).toBeTruthy();
  });

  it('muestra los nombres de los movimientos', async () => {
    await render(<ShareResultCard shareable={base} acento="#e63946" />);
    expect(screen.getByText('Thruster')).toBeTruthy();
    expect(screen.getByText('Pull-up')).toBeTruthy();
  });

  it('muestra el chip RX', async () => {
    await render(<ShareResultCard shareable={base} acento="#e63946" />);
    expect(screen.getByText(/Rx/)).toBeTruthy();
  });

  it('muestra el chip LIBRE', async () => {
    await render(<ShareResultCard shareable={{ ...base, chip: 'LIBRE' }} acento="#e63946" />);
    expect(screen.getByText('LIBRE')).toBeTruthy();
  });

  it('no muestra chip si es null', async () => {
    await render(<ShareResultCard shareable={{ ...base, chip: null }} acento="#e63946" />);
    expect(screen.queryByText(/Rx|Scaled|LIBRE/)).toBeNull();
  });

  it('lista los bloques cuando hay 2 o más', async () => {
    const shareable = {
      ...base,
      breakdown: [
        { label: 'Fuerza', resultado: '100kg' },
        { label: 'WOD', resultado: '10:30' },
      ],
    };
    await render(<ShareResultCard shareable={shareable} acento="#e63946" />);
    expect(screen.getByText('FUERZA')).toBeTruthy();
    expect(screen.getByText('100kg')).toBeTruthy();
    expect(screen.getByText('WOD')).toBeTruthy();
    expect(screen.getByText('10:30')).toBeTruthy();
    expect(screen.queryByText('TIEMPO')).toBeNull();
  });

  it('muestra el resultado crudo si no es tiempo ni rondas', async () => {
    const shareable = { ...base, resultado: '100kg', resultParts: { time: '', rounds: '', reps: '' } };
    await render(<ShareResultCard shareable={shareable} acento="#e63946" />);
    expect(screen.getByText('100kg')).toBeTruthy();
  });

  it('no renderiza nada sin shareable', async () => {
    await render(<ShareResultCard shareable={null} acento="#e63946" />);
    expect(screen.queryByText('WODLY')).toBeNull();
  });
});
