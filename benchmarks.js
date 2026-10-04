// Catálogo de benchmarks de CrossFit (Girls + algunos Heroes).
// ÚNICA fuente de verdad: pantallas y lógica leen de aquí, no repiten literales.
// scoring: 'time' (menor es mejor) | 'rounds' (R+r, mayor es mejor) | 'reps' (mayor es mejor)
// rx: pesos Rx en kg (m = masculino, f = femenino), como texto para admitir casos especiales.

export const BENCHMARKS = [
  { key: 'fran', nombre: 'Fran', tipo: 'FOR TIME', scoring: 'time',
    descripcion: '21-15-9 de thrusters y dominadas. Sprint corto y muy intenso.',
    rx: { m: '43 kg', f: '29 kg' } },
  { key: 'grace', nombre: 'Grace', tipo: 'FOR TIME', scoring: 'time',
    descripcion: '30 clean & jerk lo más rápido posible.',
    rx: { m: '61 kg', f: '43 kg' } },
  { key: 'isabel', nombre: 'Isabel', tipo: 'FOR TIME', scoring: 'time',
    descripcion: '30 snatches lo más rápido posible.',
    rx: { m: '61 kg', f: '43 kg' } },
  { key: 'diane', nombre: 'Diane', tipo: 'FOR TIME', scoring: 'time',
    descripcion: '21-15-9 de peso muerto y handstand push-ups.',
    rx: { m: '102 kg', f: '70 kg' } },
  { key: 'elizabeth', nombre: 'Elizabeth', tipo: 'FOR TIME', scoring: 'time',
    descripcion: '21-15-9 de cleans y fondos en anillas.',
    rx: { m: '61 kg', f: '43 kg' } },
  { key: 'helen', nombre: 'Helen', tipo: 'FOR TIME', scoring: 'time',
    descripcion: '3 rondas: 400 m corriendo, 21 swings con kettlebell y 12 dominadas.',
    rx: { m: '24 kg', f: '16 kg' } },
  { key: 'annie', nombre: 'Annie', tipo: 'FOR TIME', scoring: 'time',
    descripcion: '50-40-30-20-10 de double unders y sit-ups.',
    rx: { m: 'Peso corporal', f: 'Peso corporal' } },
  { key: 'karen', nombre: 'Karen', tipo: 'FOR TIME', scoring: 'time',
    descripcion: '150 wall balls lo más rápido posible.',
    rx: { m: '9 kg a 3 m', f: '6 kg a 2,7 m' } },
  { key: 'cindy', nombre: 'Cindy', tipo: 'AMRAP', scoring: 'rounds',
    descripcion: 'AMRAP 20 min: 5 dominadas, 10 flexiones y 15 sentadillas.',
    rx: { m: 'Peso corporal', f: 'Peso corporal' } },
  { key: 'mary', nombre: 'Mary', tipo: 'AMRAP', scoring: 'rounds',
    descripcion: 'AMRAP 20 min: 5 handstand push-ups, 10 pistols y 15 dominadas.',
    rx: { m: 'Peso corporal', f: 'Peso corporal' } },
  { key: 'jackie', nombre: 'Jackie', tipo: 'FOR TIME', scoring: 'time',
    descripcion: '1000 m remo, 50 thrusters y 30 dominadas.',
    rx: { m: '20 kg', f: '15 kg' } },
  { key: 'nancy', nombre: 'Nancy', tipo: 'FOR TIME', scoring: 'time',
    descripcion: '5 rondas: 400 m corriendo y 15 overhead squats.',
    rx: { m: '43 kg', f: '29 kg' } },
  { key: 'kelly', nombre: 'Kelly', tipo: 'FOR TIME', scoring: 'time',
    descripcion: '5 rondas: 400 m corriendo, 30 box jumps y 30 wall balls.',
    rx: { m: 'Cajón 60 cm, balón 9 kg', f: 'Cajón 50 cm, balón 6 kg' } },
  { key: 'amanda', nombre: 'Amanda', tipo: 'FOR TIME', scoring: 'time',
    descripcion: '9-7-5 de muscle-ups y squat snatches.',
    rx: { m: '61 kg', f: '43 kg' } },
  { key: 'linda', nombre: 'Linda', tipo: 'FOR TIME', scoring: 'time',
    descripcion: '10 a 1 de peso muerto, press de banca y clean (las tres barras de la muerte).',
    rx: { m: '1,5 / 1 / 0,75 × peso corporal', f: '1,5 / 1 / 0,75 × peso corporal' } },
  { key: 'chelsea', nombre: 'Chelsea', tipo: 'EMOM', scoring: 'rounds',
    descripcion: 'EMOM 30 min: 5 dominadas, 10 flexiones y 15 sentadillas. Se puntúa por rondas completadas.',
    rx: { m: 'Peso corporal', f: 'Peso corporal' } },
  { key: 'murph', nombre: 'Murph', tipo: 'FOR TIME', scoring: 'time',
    descripcion: '1,6 km, 100 dominadas, 200 flexiones, 300 sentadillas y 1,6 km. Con chaleco.',
    rx: { m: 'Chaleco 9 kg', f: 'Chaleco 6 kg' } },
  { key: 'dt', nombre: 'DT', tipo: 'FOR TIME', scoring: 'time',
    descripcion: '5 rondas: 12 pesos muertos, 9 hang cleans y 6 push jerks con la misma barra.',
    rx: { m: '70 kg', f: '47,5 kg' } },
];

// Otros nombres con los que puede aparecer un benchmark en un WOD.
export const BENCHMARK_ALIASES = {
  linda: ['3 bars of death'],
  murph: ['lt dan murph'],
};

export const getBenchmark = (key) => BENCHMARKS.find(b => b.key === key) || null;
