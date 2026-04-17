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
