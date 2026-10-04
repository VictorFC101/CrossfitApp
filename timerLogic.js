// Lógica pura extraída de screens/TimerScreen.js — sin dependencias de React/RN.

export const parseMins = (str) => {
  const m = str?.match(/(\d+)\s*min/i);
  return m ? parseInt(m[1]) : null;
};

export const parseEmom = (str) => {
  const m = str?.match(/(\d+)[''´']?\s*[×xX]\s*(\d+)/i);
  return m ? { interval: m[1], rounds: m[2] } : null;
};

// Detecta el modo de timer (AMRAP / EMOM / FOR TIME) y los valores iniciales
// a partir del `wod` del día del programa. Devuelve null si el tipo no se
// reconoce (el componente debe entonces dejar el estado como está).
// Extraído del efecto de auto-sincronización en TimerScreen (antes inline).
export function detectTimerConfig(wod) {
  if (!wod?.type) return null;
  const { type, duration } = wod;
  const typeUpper = (type || '').toUpperCase();

  if (typeUpper.includes('AMRAP')) {
    const mins = parseMins(duration);
    return { mode: 'AMRAP', mins };
  }
  if (typeUpper.includes('EMOM')) {
    const emom = parseEmom(duration);
    if (emom) {
      return { mode: 'EMOM', emomMins: emom.interval, emomRounds: emom.rounds };
    }
    const mins = parseMins(duration);
    if (mins) {
      return { mode: 'EMOM', emomMins: '1', emomRounds: String(mins) };
    }
    return { mode: 'EMOM', emomMins: null, emomRounds: null };
  }
  if (typeUpper.includes('FOR TIME') || typeUpper.includes('TIMECAP') || typeUpper.includes('TIME CAP')) {
    const mins = parseMins(duration);
    return { mode: 'FOR TIME', mins };
  }
  return null;
}
