// Constantes compartidas entre pantallas

export const RM_NAMES = {
  cj:    'Clean & Jerk',
  sn:    'Snatch',
  bs:    'Back Squat',
  dl:    'Deadlift',
  fs:    'Front Squat',
  sp:    'Strict Press',
  pc:    'Power Clean',
  ps:    'Power Snatch',
  clean: 'Clean',
  hpc:   'Hang Power Clean',
  hps:   'Hang Power Snatch',
  pj:    'Push Jerk',
  ohs:   'Overhead Squat',
  hc:    'Hang Clean',
  bp:    'Bench Press',
  pp:    'Push Press',
  thr:   'Thruster',
  psq:   'Pause Squat',
  rmd:   'Romanian DL',
  ht:    'Hip Thrust',
};

export const RM_MOVEMENTS = [
  { key: 'cj',  name: 'C&J',  color: '#e63946' },
  { key: 'sn',  name: 'SNT',  color: '#e63946' },
  { key: 'bs',  name: 'BSQ',  color: '#9b5de5' },
  { key: 'dl',  name: 'DL',   color: '#9b5de5' },
  { key: 'fs',  name: 'FSQ',  color: '#9b5de5' },
  { key: 'sp',  name: 'SP',   color: '#9b5de5' },
];

// Categorías completas para RMScreen
export const RM_CATEGORIES = {
  Halterofilia: {
    color: '#e63946',
    movements: [
      { key: 'cj',    name: 'CLEAN & JERK',      short: 'C&J',  pcts: [0.65, 0.72, 0.78, 0.82, 0.87, 0.92] },
      { key: 'sn',    name: 'SNATCH',             short: 'SNT',  pcts: [0.60, 0.68, 0.75, 0.80, 0.85, 0.90] },
      { key: 'pc',    name: 'POWER CLEAN',        short: 'PC',   pcts: [0.65, 0.72, 0.78, 0.82, 0.87, 0.92] },
      { key: 'ps',    name: 'POWER SNATCH',       short: 'PS',   pcts: [0.60, 0.68, 0.75, 0.80, 0.85, 0.90] },
      { key: 'clean', name: 'CLEAN',              short: 'CLN',  pcts: [0.65, 0.72, 0.78, 0.82, 0.87, 0.92] },
      { key: 'hpc',   name: 'HANG POWER CLEAN',   short: 'HPC',  pcts: [0.65, 0.72, 0.78, 0.82, 0.87, 0.92] },
      { key: 'hps',   name: 'HANG POWER SNATCH',  short: 'HPS',  pcts: [0.60, 0.68, 0.75, 0.80, 0.85, 0.90] },
      { key: 'hc',    name: 'HANG CLEAN',         short: 'HC',   pcts: [0.65, 0.72, 0.78, 0.82, 0.87, 0.92] },
      { key: 'pj',    name: 'PUSH JERK',          short: 'PJ',   pcts: [0.65, 0.72, 0.78, 0.82, 0.87, 0.92] },
      { key: 'ohs',   name: 'OVERHEAD SQUAT',     short: 'OHS',  pcts: [0.60, 0.68, 0.75, 0.80, 0.85, 0.90] },
    ],
  },
  Powerlifting: {
    color: '#9b5de5',
    movements: [
      { key: 'bs',  name: 'BACK SQUAT',    short: 'BSQ',  pcts: [0.70, 0.78, 0.83, 0.85, 0.90, 0.95] },
      { key: 'fs',  name: 'FRONT SQUAT',   short: 'FSQ',  pcts: [0.70, 0.78, 0.82, 0.85, 0.90, 0.95] },
      { key: 'dl',  name: 'DEADLIFT',      short: 'DL',   pcts: [0.72, 0.80, 0.85, 0.88, 0.92, 0.95] },
      { key: 'bp',  name: 'BENCH PRESS',   short: 'BP',   pcts: [0.70, 0.78, 0.83, 0.85, 0.90, 0.95] },
      { key: 'sp',  name: 'STRICT PRESS',  short: 'SP',   pcts: [0.70, 0.75, 0.80, 0.82, 0.85, 0.90] },
      { key: 'pp',  name: 'PUSH PRESS',    short: 'PP',   pcts: [0.72, 0.78, 0.83, 0.87, 0.90, 0.95] },
      { key: 'thr', name: 'THRUSTER',      short: 'THR',  pcts: [0.65, 0.72, 0.78, 0.82, 0.87, 0.92] },
      { key: 'psq', name: 'PAUSE SQUAT',   short: 'PSQ',  pcts: [0.65, 0.72, 0.78, 0.82, 0.87, 0.90] },
      { key: 'rmd', name: 'ROMANIAN DL',   short: 'RDL',  pcts: [0.65, 0.72, 0.78, 0.82, 0.87, 0.90] },
      { key: 'ht',  name: 'HIP THRUST',    short: 'HT',   pcts: [0.70, 0.78, 0.83, 0.87, 0.92, 0.95] },
    ],
  },
};

export const TYPE_COLORS = {
  Halterofilia: '#e63946',
  Powerlifting:  '#9b5de5',
  Fuerza:        '#4895ef',
  Libre:         '#f4a261',
  Gimnásticos:   '#52b788',
};

// Tipos de día permitidos (formato de programa). Mantener aquí: no repetir literales.
export const DAY_TYPES = ['Halterofilia', 'Fuerza', 'Powerlifting', 'Gimnásticos', 'Libre'];

// Tipos de bloque de un día (schema v2)
export const BLOCK_KINDS = ['warmup', 'strength', 'lift', 'wod', 'accessory', 'skill', 'free'];

// Tipos de marcador (cómo se registra el resultado de un bloque)
export const SCORE_TYPES = ['time', 'rounds_reps', 'load', 'reps', 'none'];

// Nombres de los tipos de marcador (evita literales repetidos)
export const SCORE = { TIME: 'time', ROUNDS_REPS: 'rounds_reps', LOAD: 'load', REPS: 'reps', NONE: 'none' };

// Claves legacy de las partes guardadas en resultados.partes (resultados antiguos)
export const LEGACY_PART_KEYS = { STRENGTH: 'strength', WOD: 'wod', WOD_PART_PREFIX: 'wod_' };

// Colores del selector Rx / Scaled
export const RX_COLORS = { RX: '#52b788', SCALED: '#f4a261' };

// Separador entre fragmentos de un resultado de texto ("5+12 · 14:30")
export const RESULT_SEPARATOR = ' · ';

// Marcador por defecto según el tipo de bloque (el wod se deriva de wod.type)
export const DEFAULT_SCORE_BY_KIND = {
  warmup: 'none',
  strength: 'load',
  lift: 'load',
  wod: 'time',
  accessory: 'none',
  skill: 'none',
  free: 'none',
};

export function defaultScoreType(kind, wod) {
  if (kind === 'wod') {
    const t = String(wod?.type || '').toUpperCase();
    if (t.includes('AMRAP')) return 'rounds_reps';
    if (t.includes('FOR TIME')) return 'time';
    // Tipos desconocidos (EMOM, intervalos...): rondas+reps y tiempo opcional, como antes
    return 'rounds_reps';
  }
  return DEFAULT_SCORE_BY_KIND[kind] || 'none';
}

// Alias en español para detectar movimientos en texto libre → rmKey existente.
// De más a menos específico (se evalúan en orden). Texto en minúsculas.
export const RM_ALIASES_ES = [
  [/cargada\s*(&|y)\s*(env[ií][oó]n|dos tiempos)/, 'cj'],
  [/(env[ií][oó]n|dos tiempos)/, 'cj'],
  [/sentadilla\s+(frontal|delantera)/, 'fs'],
  [/sentadilla\s+(trasera|atr[aá]s)/, 'bs'],
  [/sentadilla\s+(overhead|por encima de la cabeza)/, 'ohs'],
  [/cargada\s+de\s+potencia/, 'pc'],
  [/arrancada\s+de\s+potencia/, 'ps'],
  [/cargada\s+colgante/, 'hc'],
  [/press\s+(militar|estricto)/, 'sp'],
  [/press\s+(de\s+)?banca/, 'bp'],
  [/press\s+de\s+empuje/, 'pp'],
  [/peso\s+muerto\s+rumano/, 'rmd'],
  [/peso\s+muerto/, 'dl'],
  [/empuje\s+de\s+cadera/, 'ht'],
  [/arrancada/, 'sn'],
  [/cargada/, 'clean'],
];

// Claves de caché offline (F1). Se borran al cerrar sesión para no filtrar datos entre usuarios.
export const CACHE_KEYS = {
  USER_PROFILE: '@crossfit_user_profile',
  HAS_ASIGNACION: '@crossfit_has_asignacion',
};

// Todas las claves de AsyncStorage de la app (siempre con prefijo @crossfit_).
// No incluye la clave de sesión de Supabase (AUTH_STORAGE_KEY), que no debe cambiar.
// Repeticiones permitidas para registrar una marca (1RM, 3RM, 5RM, 10RM)
export const RM_REPS = [1, 3, 5, 10];

export const STORAGE_KEYS = {
  USER_RMS: '@crossfit_user_rms',
  USER_RMS_BY_REPS: '@crossfit_user_rms_by_reps',
  USER_RESULTADOS: '@crossfit_user_resultados',
  USER_WODS_LIBRES: '@crossfit_user_wods_libres',
  USER_FOTO: '@crossfit_user_foto',
  USER_NOMBRE: '@crossfit_user_nombre',
  USER_GENERO: '@crossfit_user_genero',
  ALL_PROGRAMS: '@crossfit_all_programs',
  THEME_DARK: '@crossfit_theme_dark',
  THEME_ACCENT: '@crossfit_theme_accent',
  THEME_CUSTOM: '@crossfit_theme_custom',
  THEME_FONTSCALE: '@crossfit_theme_fontscale',
  ADMIN_PIN: '@crossfit_admin_pin',
  ONBOARDING_DONE: '@crossfit_onboarding_done',
  REMINDER_ENABLED: '@crossfit_reminder_enabled',
  REMINDER_HOUR: '@crossfit_reminder_hour',
  CARRITO: '@crossfit_carrito',
  USER_PROFILE: CACHE_KEYS.USER_PROFILE,
  HAS_ASIGNACION: CACHE_KEYS.HAS_ASIGNACION,
};

// Tipos de WOD y formatos de equipo del constructor de programas (no repetir literales)
export const WOD_TYPES = ['AMRAP', 'FOR TIME', 'EMOM', 'INTERVALOS', 'STRENGTH', 'LIBRE'];
export const WOD_FORMATS = ['YOU GO I GO', 'A REPARTIR LIBREMENTE', 'SYNCHRO', 'INDIVIDUAL', 'EQUIPOS'];

// Etiquetas en español de los tipos de bloque y de marcador (UI del constructor)
export const BLOCK_KIND_LABELS = {
  warmup: 'Calentamiento', strength: 'Fuerza', lift: 'Halterofilia', wod: 'WOD',
  accessory: 'Accesorios', skill: 'Técnica', free: 'Libre',
};
export const SCORE_TYPE_LABELS = {
  time: 'Tiempo', rounds_reps: 'Rondas + reps', load: 'Carga', reps: 'Repeticiones', none: 'Sin marcador',
};
