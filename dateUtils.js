const MONTH_MAP = {
  'Ene': 0, 'Feb': 1, 'Mar': 2, 'Abr': 3, 'May': 4, 'Jun': 5,
  'Jul': 6, 'Ago': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dic': 11
};

const MONTH_MAP_EN = {
  'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
  'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
};

// Extrae día, mes y año de un string como "Lunes 30 Mar" o "Miércoles 1 Abr"
// El año lo infiere comparando con la fecha real del dispositivo
function extractFromDayStr(dayStr) {
  const parts = dayStr.trim().split(' ');
  let dayNum = null;
  let monthIdx = null;

  for (const part of parts) {
    const n = parseInt(part);
    if (!isNaN(n) && n >= 1 && n <= 31 && dayNum === null) {
      dayNum = n;
    }
    const key = part.substring(0, 3);
    if (MONTH_MAP[key] !== undefined && monthIdx === null) {
      monthIdx = MONTH_MAP[key];
    }
  }

  if (dayNum === null || monthIdx === null) return null;
  return { dayNum, monthIdx };
}

// Infiere el año correcto comparando con la fecha real del dispositivo
// Prueba el año actual, el siguiente y el anterior — coge el más cercano
function inferYear(dayNum, monthIdx) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const candidates = [currentYear - 1, currentYear, currentYear + 1];

  let bestYear = currentYear;
  let bestDiff = Infinity;

  for (const year of candidates) {
    const candidate = new Date(year, monthIdx, dayNum, 12, 0, 0);
    const diff = Math.abs(candidate.getTime() - now.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      bestYear = year;
    }
  }

  return bestYear;
}

export function getToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
}

export function parseDateFromDay(dayStr) {
  const extracted = extractFromDayStr(dayStr);
  if (!extracted) return null;
  const year = inferYear(extracted.dayNum, extracted.monthIdx);
  return new Date(year, extracted.monthIdx, extracted.dayNum, 12, 0, 0);
}

export function isToday(dayStr) {
  const extracted = extractFromDayStr(dayStr);
  if (!extracted) return false;
  const today = getToday();
  const year = inferYear(extracted.dayNum, extracted.monthIdx);
  return (
    extracted.dayNum === today.getDate() &&
    extracted.monthIdx === today.getMonth() &&
    year === today.getFullYear()
  );
}

export function isPast(dayStr) {
  const date = parseDateFromDay(dayStr);
  if (!date) return false;
  return date.getTime() < getToday().getTime();
}

export function isFuture(dayStr) {
  const date = parseDateFromDay(dayStr);
  if (!date) return false;
  return date.getTime() > getToday().getTime();
}

export function getTodayIdx(allDays) {
  const today = getToday();
  return allDays.findIndex(d => {
    const extracted = extractFromDayStr(d.day);
    if (!extracted) return false;
    const year = inferYear(extracted.dayNum, extracted.monthIdx);
    return (
      extracted.dayNum === today.getDate() &&
      extracted.monthIdx === today.getMonth() &&
      year === today.getFullYear()
    );
  });
}

export function getTodayDay(allDays) {
  const idx = getTodayIdx(allDays);
  return idx >= 0 ? allDays[idx] : null;
}

export function isTodayInProgram(allDays) {
  return getTodayIdx(allDays) >= 0;
}

export function getInitialIdx(allDays) {
  const today = getToday();
  const todayTime = today.getTime();

  // 1. Día exacto de hoy
  const exactIdx = getTodayIdx(allDays);
  if (exactIdx >= 0) return exactIdx;

  // 2. Buscar en la semana actual (lunes a domingo)
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  let weekBestIdx = -1;
  let weekBestDiff = Infinity;
  allDays.forEach((d, idx) => {
    const date = parseDateFromDay(d.day);
    if (!date) return;
    if (date >= monday && date <= sunday) {
      const diff = Math.abs(date.getTime() - todayTime);
      if (diff < weekBestDiff) {
        weekBestDiff = diff;
        weekBestIdx = idx;
      }
    }
  });
  if (weekBestIdx >= 0) return weekBestIdx;

  // 3. Día pasado más reciente
  let pastBestIdx = 0;
  let pastBestDiff = Infinity;
  allDays.forEach((d, idx) => {
    const date = parseDateFromDay(d.day);
    if (!date) return;
    const diff = todayTime - date.getTime();
    if (diff > 0 && diff < pastBestDiff) {
      pastBestDiff = diff;
      pastBestIdx = idx;
    }
  });
  if (pastBestDiff !== Infinity) return pastBestIdx;

  // 4. Primer día futuro
  let futureBestIdx = 0;
  let futureBestDiff = Infinity;
  allDays.forEach((d, idx) => {
    const date = parseDateFromDay(d.day);
    if (!date) return;
    const diff = date.getTime() - todayTime;
    if (diff > 0 && diff < futureBestDiff) {
      futureBestDiff = diff;
      futureBestIdx = idx;
    }
  });
  return futureBestIdx;
}

export function formatDateShort(date) {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}