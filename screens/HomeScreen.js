import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { typeColors } from '../data';
import { useTheme } from '../ThemeContext';
import { useProgram } from '../ProgramContext';
import { parseDateFromDay, isToday, isPast, getInitialIdx, isTodayInProgram, getToday } from '../dateUtils';

const DIAS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

function formatDayTab(dayStr) {
  const parts = dayStr.split(' ');
  if (parts.length >= 3) {
    const d = parseInt(parts[1]);
    const months = { 'Ene': 0, 'Feb': 1, 'Mar': 2, 'Abr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Ago': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dic': 11 };
    const m = months[parts[2].substring(0, 3)];
    if (!isNaN(d) && m !== undefined) {
      const date = new Date(new Date().getFullYear(), m, d, 12, 0, 0);
      const dayName = DIAS[date.getDay()];
      const dayNum = String(d).padStart(2, '0');
      const monthNum = String(m + 1).padStart(2, '0');
      return `${dayName}\n${dayNum}/${monthNum}`;
    }
  }
  return dayStr.split(' ')[0].substring(0, 3).toUpperCase();
}

function Section({ title, accent, children, defaultOpen = false }) {
  const t = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: open ? accent + '35' : t.border, borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
      <TouchableOpacity onPress={() => setOpen(o => !o)}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13, borderBottomWidth: open ? 1 : 0, borderBottomColor: t.border }}>
        <Text style={{ fontSize: t.fs(11), fontWeight: '700', letterSpacing: 2, color: open ? accent : t.text3 }}>{title}</Text>
        <Text style={{ color: open ? accent : t.text3, fontSize: t.fs(16) }}>{open ? '▴' : '▾'}</Text>
      </TouchableOpacity>
      {open && <View style={{ padding: 13 }}>{children}</View>}
    </View>
  );
}

function MiniCalendar({ currentIdx, onSelect, allDays }) {
  const t = useTheme();
  const today = getToday();

  const programDates = allDays.map(d => parseDateFromDay(d.day)).filter(Boolean);
  if (programDates.length === 0) return null;

  const minDate = new Date(Math.min(...programDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...programDates.map(d => d.getTime())));

  const months = [];
  let cursor = new Date(minDate.getFullYear(), minDate.getMonth() - 1, 1);
  const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth() + 2, 1);
  while (cursor < endMonth) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  const programDayMap = {};
  allDays.forEach((d, idx) => {
    const date = parseDateFromDay(d.day);
    if (date) {
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      programDayMap[key] = { idx, type: d.type };
    }
  });

  const typeAccents = { Halterofilia: '#e63946', Fuerza: '#4895ef', Libre: '#f4a261' };
  const currentDate = parseDateFromDay(allDays[currentIdx]?.day);
  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const DAY_LABELS = ['L','M','X','J','V','S','D'];

  return (
    <View style={{ backgroundColor: t.card, borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: t.border }}>
      <Text style={{ fontSize: t.fs(11), fontWeight: '900', color: t.text, letterSpacing: 2, marginBottom: 12, textAlign: 'center' }}>
        CALENDARIO {minDate.getFullYear()}
      </Text>
      {months.map(({ year, month }) => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const offset = firstDay === 0 ? 6 : firstDay - 1;
        const cells = Array(offset).fill(null);
        for (let i = 1; i <= daysInMonth; i++) cells.push(i);
        while (cells.length % 7 !== 0) cells.push(null);
        const hasProgram = cells.some(cell => cell && !!programDayMap[`${year}-${month}-${cell}`]);

        return (
          <View key={`${year}-${month}`} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
              <Text style={{ fontSize: t.fs(10), fontWeight: '900', color: hasProgram ? t.accent : t.text3, letterSpacing: 2, paddingHorizontal: 10 }}>
                {MONTH_NAMES[month].toUpperCase()} {year}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              {DAY_LABELS.map(d => (
                <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: t.fs(8), color: t.text3, fontWeight: '700' }}>{d}</Text>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {cells.map((cell, i) => {
                if (!cell) return <View key={`e-${month}-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />;
                const key = `${year}-${month}-${cell}`;
                const prog = programDayMap[key];
                const isActive = currentDate && currentDate.getDate() === cell && currentDate.getMonth() === month && currentDate.getFullYear() === year;
                const isRealToday = cell === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const accent = prog ? typeAccents[prog.type] || t.accent : null;
                const past = new Date(year, month, cell) < today;
                return (
                  <TouchableOpacity key={key} onPress={() => prog && onSelect(prog.idx)}
                    style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{
                      width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isActive ? accent || t.accent : isRealToday ? t.accent + '30' : prog ? accent + '15' : 'transparent',
                      borderWidth: isRealToday && !isActive ? 2 : 0,
                      borderColor: isRealToday ? t.accent : 'transparent',
                      opacity: prog ? 1 : past ? 0.25 : 0.4,
                    }}>
                      <Text style={{ fontSize: t.fs(9), fontWeight: prog || isRealToday ? '700' : '400', color: isActive ? '#fff' : isRealToday ? t.accent : prog ? accent : t.text3 }}>{cell}</Text>
                    </View>
                    {prog && past && !isActive && <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#52b788', position: 'absolute', bottom: 2 }} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border }}>
        {[{ color: '#e63946', label: 'Halterofilia' }, { color: '#4895ef', label: 'Fuerza' }, { color: '#f4a261', label: 'Open Gym' }].map(l => (
          <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: l.color }} />
            <Text style={{ fontSize: t.fs(9), color: t.text3 }}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function FreeDayToday({ navigate }) {
  const t = useTheme();
  const today = new Date();
  const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return (
    <View style={{ padding: 14 }}>
      <View style={{ backgroundColor: t.accent + '15', borderWidth: 2, borderColor: t.accent + '40', borderRadius: 12, padding: 16, marginBottom: 14, alignItems: 'center' }}>
        <Text style={{ fontSize: t.fs(9), color: t.accent, letterSpacing: 3, fontWeight: '700', marginBottom: 4 }}>HOY</Text>
        <Text style={{ fontSize: t.fs(24), fontWeight: '900', color: t.text, letterSpacing: 1 }}>{dayNames[today.getDay()].toUpperCase()}</Text>
        <Text style={{ fontSize: t.fs(13), color: t.text2, marginTop: 4 }}>{today.getDate()} de {monthNames[today.getMonth()]} de {today.getFullYear()}</Text>
      </View>
      <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ fontSize: t.fs(24), marginBottom: 10 }}>🕊️</Text>
        <Text style={{ fontSize: t.fs(15), fontWeight: '900', color: t.text, marginBottom: 6 }}>Sin entreno programado</Text>
        <Text style={{ fontSize: t.fs(12), color: t.text3, textAlign: 'center', lineHeight: t.fs(18) }}>
          Hoy no hay sesión en el programa. Puedes crear un WOD libre o descansar.
        </Text>
      </View>
      <TouchableOpacity onPress={() => navigate('HISTORIAL')}
        style={{ backgroundColor: t.accent, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: t.fs(14), fontWeight: '900', color: '#fff', letterSpacing: 1 }}>🔓 CREAR WOD LIBRE</Text>
        <Text style={{ fontSize: t.fs(10), color: '#ffffff99', marginTop: 3 }}>Ir a Historial → + WOD Libre</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigate && navigate('showProgram')}
        style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12, alignItems: 'center' }}>
        <Text style={{ fontSize: t.fs(12), fontWeight: '700', color: t.text2 }}>📋 Ver programa completo ↓</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen({ navigate }) {
  const t = useTheme();
  const { activeProgram, loading } = useProgram();

  // Calcular allDays desde el programa activo
  const plan = activeProgram;
  const allDays = plan ? plan.weeks.flatMap((w, wi) =>
    w.days.map((d, di) => ({ ...d, weekIndex: wi, dayIndex: di, weekNumber: w.number, weekFocus: w.focus }))
  ) : [];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showFreeDay, setShowFreeDay] = useState(false);

  // Sincronizar con el día de hoy cuando el programa carga
  const [initialized, setInitialized] = useState(false);
  if (!initialized && allDays.length > 0) {
    setInitialized(true);
    const idx = getInitialIdx(allDays);
    setCurrentIdx(idx);
    setShowFreeDay(!isTodayInProgram(allDays));
  }

  if (loading || !plan || allDays.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: t.text3, fontSize: t.fs(12), letterSpacing: 2 }}>CARGANDO PROGRAMA...</Text>
      </View>
    );
  }

  const day = allDays[currentIdx] || allDays[0];
  const week = plan.weeks[day.weekIndex];
  const weekDays = week.days;

  const goDay = (dir) => {
    setShowFreeDay(false);
    const next = currentIdx + dir;
    if (next >= 0 && next < allDays.length) setCurrentIdx(next);
  };

  const goToWeekDay = (di) => {
    setShowFreeDay(false);
    const idx = allDays.findIndex(d => d.weekIndex === day.weekIndex && d.dayIndex === di);
    if (idx >= 0) setCurrentIdx(idx);
  };

  const goToToday = () => {
    if (isTodayInProgram(allDays)) {
      setCurrentIdx(getInitialIdx(allDays));
      setShowFreeDay(false);
    } else {
      setShowFreeDay(true);
    }
  };

  const programTitle = (() => {
    const dates = allDays.map(d => parseDateFromDay(d.day)).filter(Boolean);
    if (!dates.length) return 'CROSSFIT';
    const minD = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxD = new Date(Math.max(...dates.map(d => d.getTime())));
    const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
    if (minD.getMonth() === maxD.getMonth()) return `CROSSFIT ${MONTHS[minD.getMonth()]} ${minD.getFullYear()}`;
    if (minD.getFullYear() === maxD.getFullYear()) return `CROSSFIT ${MONTHS[minD.getMonth()]}–${MONTHS[maxD.getMonth()]} ${minD.getFullYear()}`;
    return `CROSSFIT ${MONTHS[minD.getMonth()]} ${minD.getFullYear()}–${MONTHS[maxD.getMonth()]} ${maxD.getFullYear()}`;
  })();

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* HEADER */}
      <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 12, paddingTop: 54 }}>
        <Text style={{ fontSize: t.fs(8), color: t.accent + '88', letterSpacing: 3, fontWeight: '700' }}>PROGRAMA · EN PAREJA</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          <Text style={{ fontSize: t.fs(20), fontWeight: '900', color: t.text, letterSpacing: 1, flex: 1 }}>{programTitle}</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity onPress={goToToday}
              style={{ backgroundColor: t.accent, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ fontSize: t.fs(10), fontWeight: '900', color: '#fff', letterSpacing: 1 }}>⚡ HOY</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCalendar(s => !s)}
              style={{ backgroundColor: showCalendar ? t.accent + '20' : t.bg4, borderWidth: 1, borderColor: showCalendar ? t.accent : t.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ fontSize: t.fs(12), color: showCalendar ? t.accent : t.text3 }}>📅</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={{ fontSize: t.fs(9), color: t.text3, marginTop: 2 }}>S{day.weekNumber} · {week.focus}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {showCalendar && (
          <View style={{ padding: 12 }}>
            <MiniCalendar currentIdx={currentIdx} allDays={allDays} onSelect={(idx) => { setCurrentIdx(idx); setShowCalendar(false); setShowFreeDay(false); }} />
          </View>
        )}

        {showFreeDay ? (
          <FreeDayToday navigate={(action) => {
            if (action === 'showProgram') setShowFreeDay(false);
            else navigate(action);
          }} />
        ) : (
          <View style={{ padding: 12 }}>
            {/* SEMANA INFO */}
            <View style={{ backgroundColor: t.bg2, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 10, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontSize: t.fs(10), fontWeight: '700', color: t.accent, letterSpacing: 1 }}>
                    S{day.weekNumber} — {week.focus.toUpperCase()}
                  </Text>
                  <Text style={{ fontSize: t.fs(9), color: t.text3, marginTop: 2 }}>{week.theme}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {plan.weeks.map((w, i) => {
                    const isSelected = day.weekIndex === i;
                    return (
                      <TouchableOpacity key={i}
                        onPress={() => { const idx = allDays.findIndex(d => d.weekIndex === i); setCurrentIdx(idx); setShowFreeDay(false); }}
                        style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: isSelected ? t.accent : t.bg4, borderWidth: 1, borderColor: isSelected ? t.accent : t.border, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: t.fs(8), fontWeight: '700', color: isSelected ? '#fff' : t.text3 }}>S{i + 1}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={{ height: 2, backgroundColor: t.bg4, borderRadius: 1 }}>
                <View style={{ height: 2, width: `${(day.weekIndex + 1) * 25}%`, backgroundColor: t.accent, borderRadius: 1 }} />
              </View>
            </View>

            {/* DAY TABS */}
            <View style={{ flexDirection: 'row', gap: 4, marginBottom: 10 }}>
              {weekDays.map((d, i) => {
                const active = day.dayIndex === i;
                const parts = formatDayTab(d.day).split('\n');
                const todayTab = isToday(d.day);
                const pastTab = isPast(d.day);
                return (
                  <TouchableOpacity key={i} onPress={() => goToWeekDay(i)}
                    style={{ flex: 1, backgroundColor: active ? t.accent + '18' : t.bg4, borderWidth: todayTab ? 2 : 1, borderColor: active ? t.accent : todayTab ? t.accent + '80' : t.border, borderRadius: 8, padding: 6, alignItems: 'center' }}>
                    <Text style={{ fontSize: t.fs(8), fontWeight: '700', color: active ? t.accent : todayTab ? t.accent : t.text3, letterSpacing: 0.5 }}>{parts[0]}</Text>
                    <Text style={{ fontSize: t.fs(8), color: active ? t.text2 : t.text3, marginTop: 1 }}>{parts[1]}</Text>
                    {todayTab && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: t.accent, marginTop: 2 }} />}
                    {pastTab && !todayTab && <Text style={{ fontSize: t.fs(7), color: '#52b788', marginTop: 1 }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* DAY HERO + FLECHAS */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <TouchableOpacity onPress={() => goDay(-1)} disabled={currentIdx === 0}
                style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: t.bg4, borderWidth: 1, borderColor: currentIdx === 0 ? t.border : t.accent + '40', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: t.fs(15), color: currentIdx === 0 ? t.text3 : t.accent }}>←</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, backgroundColor: t.accent + '18', borderWidth: 2, borderColor: t.accent, borderRadius: 12, padding: 12 }}>
                {isToday(day.day) && (
                  <View style={{ backgroundColor: t.accent, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 4 }}>
                    <Text style={{ fontSize: t.fs(7), color: '#fff', fontWeight: '900', letterSpacing: 2 }}>HOY</Text>
                  </View>
                )}
                <Text style={{ fontSize: t.fs(8), color: t.accent, letterSpacing: 3, fontWeight: '700' }}>{day.type.toUpperCase()}</Text>
                <Text style={{ fontSize: t.fs(20), fontWeight: '900', letterSpacing: 1, color: t.text, marginTop: 2 }}>{day.label}</Text>
                <Text style={{ fontSize: t.fs(9), color: t.text2, marginTop: 4 }}>📅 {day.day}</Text>
              </View>
              <TouchableOpacity onPress={() => goDay(1)} disabled={currentIdx === allDays.length - 1}
                style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: t.bg4, borderWidth: 1, borderColor: currentIdx === allDays.length - 1 ? t.border : t.accent + '40', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: t.fs(15), color: currentIdx === allDays.length - 1 ? t.text3 : t.accent }}>→</Text>
              </TouchableOpacity>
            </View>

            {/* OPEN GYM */}
            {day.type === 'Libre' && (
              <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: '#f4a26130', borderRadius: 12, padding: 14, marginBottom: 8 }}>
                <Text style={{ fontSize: t.fs(12), fontWeight: '700', color: '#f4a261', letterSpacing: 2, marginBottom: 10 }}>🕊️ SESIÓN LIBRE</Text>
                {day.wod.freeContent?.map((txt, i) => (
                  <Text key={i} style={{ fontSize: t.fs(12), color: txt.startsWith('⚠️') ? '#f4a261' : t.text2, marginBottom: 8 }}>▸ {txt}</Text>
                ))}
              </View>
            )}

            {/* SECCIONES */}
            {day.type !== 'Libre' && (
              <>
                {day.warmup?.length > 0 && (
                  <Section title="🔥 CALENTAMIENTO" accent={t.accent}>
                    {day.warmup.map((txt, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                        <Text style={{ color: t.accent }}>▸</Text>
                        <Text style={{ fontSize: t.fs(12), color: t.text2, flex: 1, lineHeight: t.fs(18) }}>{txt}</Text>
                      </View>
                    ))}
                  </Section>
                )}

                {day.strength && (
                  <Section title={`💪 FUERZA — ${day.strength.title}`} accent={t.accent} defaultOpen={true}>
                    {day.strength.sets.map((s, i) => {
                      const p = s.desc.match(/(\d+)%/)?.[1];
                      return (
                        <View key={i} style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 10, marginBottom: 7 }}>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: t.accent + '20', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: t.fs(9), color: t.accent, fontWeight: '700' }}>{i + 1}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text }}>{s.desc}</Text>
                              {s.note && <Text style={{ fontSize: t.fs(11), color: t.text2, marginTop: 2 }}>{s.note}</Text>}
                              {p && <View style={{ marginTop: 5, height: 2, backgroundColor: t.border, borderRadius: 1 }}><View style={{ height: 2, width: `${p}%`, backgroundColor: t.accent, borderRadius: 1 }} /></View>}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                    {day.strength.note && <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 4 }}>📝 {day.strength.note}</Text>}
                  </Section>
                )}

                <Section title={`⚡ WOD — ${day.wod?.type || ''} ${day.wod?.duration || ''}`} accent={t.accent} defaultOpen={true}>
                  {day.wod?.formatNote && (
                    <View style={{ backgroundColor: t.bg4, borderRadius: 6, padding: 8, marginBottom: 10 }}>
                      <Text style={{ fontSize: t.fs(10), color: t.text2 }}>⚡ {day.wod.format} — {day.wod.formatNote}</Text>
                    </View>
                  )}
                  {day.wod?.movements?.map((m, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 10, backgroundColor: t.bg4, borderLeftWidth: 3, borderLeftColor: t.accent, borderRadius: 8, padding: 10, marginBottom: 6 }}>
                      <Text style={{ minWidth: 38, fontSize: t.fs(13), fontWeight: '700', color: t.accent }}>{m.reps}</Text>
                      <View>
                        <Text style={{ fontSize: t.fs(14), fontWeight: '700', color: t.text }}>{m.name}</Text>
                        {m.weight && m.weight !== 'BW' && <Text style={{ fontSize: t.fs(10), color: t.text2, marginTop: 2 }}>{m.weight}</Text>}
                      </View>
                    </View>
                  ))}
                  {day.wod?.gymNote && (
                    <View style={{ backgroundColor: t.dark ? '#080f08' : '#e8f5e9', borderWidth: 1, borderColor: t.dark ? '#1e3e1e' : '#c8e6c9', borderRadius: 6, padding: 8, marginTop: 4 }}>
                      <Text style={{ fontSize: t.fs(11), color: '#5a9a5a' }}>💡 {day.wod.gymNote}</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => navigate('TIMER')}
                    style={{ backgroundColor: t.accent, borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 10 }}>
                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: t.fs(13), letterSpacing: 1 }}>▶ INICIAR TIMER</Text>
                  </TouchableOpacity>
                </Section>

                {day.gymExtra && (
                  <Section title="🤸 BLOQUE TÉCNICO POST-WOD" accent="#4caf50">
                    <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: '#81c784', marginBottom: 4 }}>{day.gymExtra.title}</Text>
                    <Text style={{ fontSize: t.fs(11), color: '#3e7a42', fontStyle: 'italic', marginBottom: 10 }}>🎯 {day.gymExtra.focus}</Text>
                    {day.gymExtra.blocks.map((b, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 8, backgroundColor: t.dark ? '#080e0a' : '#e8f5e9', borderLeftWidth: 3, borderLeftColor: '#2e6e32', borderRadius: 6, padding: 10, marginBottom: 6 }}>
                        <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: t.dark ? '#0e2a12' : '#c8e6c9', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: t.fs(9), color: '#4caf50', fontWeight: '700' }}>{i + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: t.fs(12), fontWeight: '700', color: '#81c784' }}>{b.label}</Text>
                          <Text style={{ fontSize: t.fs(11), color: t.dark ? '#4a6a4e' : '#2e7d32', marginTop: 2, lineHeight: t.fs(16) }}>{b.detail}</Text>
                        </View>
                      </View>
                    ))}
                  </Section>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}