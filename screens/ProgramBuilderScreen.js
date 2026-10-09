import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../ThemeContext';
import { useProgram } from '../ProgramContext';
import { parseDateFromDay } from '../dateUtils';
import { DAY_TYPES, BLOCK_KINDS, BLOCK_KIND_LABELS, SCORE_TYPES, WOD_TYPES, WOD_FORMATS, RM_CATEGORIES, RM_NAMES, TYPE_COLORS } from '../constants';
import { STRENGTH_KINDS, assembleDay, blockToForm, formToBlock, dayToBuilderBlocks, newFormBlock, summarizeBlock, scoreLabel } from '../builderLogic';
import { validateProgram, formatValidationIssues } from '../programValidation';
import { confirmar } from './admin/ui';

const DIAS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function formatDayStr(date) {
  return `${DIAS_ES[date.getDay()]} ${date.getDate()} ${MESES_ES[date.getMonth()]}`;
}

function generateWeeksFromRange(startStr, endStr, weekFoci) {
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd, 12, 0, 0);
  const end = new Date(ey, em - 1, ed, 12, 0, 0);

  const weeks = [];
  let current = new Date(start);
  let weekNum = 1;

  while (current <= end) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekEnd > end) weekEnd.setTime(end.getTime());

    weeks.push({
      number: weekNum,
      dates: `${weekStart.getDate()} ${MESES_ES[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MESES_ES[weekEnd.getMonth()]}`,
      focus: weekFoci[weekNum - 1]?.focus || `Semana ${weekNum}`,
      theme: weekFoci[weekNum - 1]?.theme || '',
      days: [],
      _weekStart: new Date(weekStart),
      _weekEnd: new Date(weekEnd),
    });

    current.setDate(current.getDate() + 7);
    weekNum++;
  }
  return weeks;
}

function getAllDaysInRange(startStr, endStr) {
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd, 12, 0, 0);
  const end = new Date(ey, em - 1, ed, 12, 0, 0);
  const days = [];
  let cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// ─── STEP INDICATOR ──────────────────────────────────────────────────────────

function StepIndicator({ step, total, t }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: 16 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: i === step ? t.accent : i < step ? t.accent + '60' : t.border }} />
      ))}
    </View>
  );
}

// ─── STEP 1: NOMBRE + FECHAS ─────────────────────────────────────────────────

function Step1({ data, onChange, t }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: t.text, marginBottom: 4 }}>NOMBRE Y FECHAS</Text>
      <Text style={{ fontSize: t.fs(12), color: t.text3, marginBottom: 24 }}>Define el nombre y el rango del programa</Text>

      <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>NOMBRE DEL PROGRAMA</Text>
      <TextInput value={data.name} onChangeText={v => onChange({ ...data, name: v })}
        placeholder="Ej: CrossFit Mayo 2026"
        placeholderTextColor={t.text3}
        style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.accent + '40', borderRadius: 10, color: t.text, fontSize: t.fs(16), fontWeight: '700', padding: 14, marginBottom: 20 }} />

      <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>FECHA DE INICIO</Text>
      <TextInput value={data.startDate} onChangeText={v => onChange({ ...data, startDate: v })}
        placeholder="YYYY-MM-DD (ej: 2026-05-04)"
        placeholderTextColor={t.text3}
        style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, color: t.text, fontSize: t.fs(14), padding: 14, marginBottom: 16 }} />

      <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>FECHA DE FIN</Text>
      <TextInput value={data.endDate} onChangeText={v => onChange({ ...data, endDate: v })}
        placeholder="YYYY-MM-DD (ej: 2026-05-29)"
        placeholderTextColor={t.text3}
        style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, color: t.text, fontSize: t.fs(14), padding: 14, marginBottom: 20 }} />

      {data.startDate && data.endDate && data.startDate.match(/^\d{4}-\d{2}-\d{2}$/) && data.endDate.match(/^\d{4}-\d{2}-\d{2}$/) && (
        <View style={{ backgroundColor: t.accent + '15', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: t.accent + '30' }}>
          <Text style={{ fontSize: t.fs(12), color: t.accent, fontWeight: '700' }}>
            📅 {Math.ceil((new Date(data.endDate) - new Date(data.startDate)) / (1000 * 60 * 60 * 24 * 7))} semanas aproximadamente
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── STEP 2: FOCO DE SEMANAS ─────────────────────────────────────────────────

function Step2({ data, onChange, weeks, t }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: t.text, marginBottom: 4 }}>SEMANAS</Text>
      <Text style={{ fontSize: t.fs(12), color: t.text3, marginBottom: 24 }}>Define el foco y tema de cada semana</Text>

      {weeks.map((w, i) => (
        <View key={i} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: t.accent, letterSpacing: 1, marginBottom: 4 }}>
            S{w.number} · {w.dates}
          </Text>

          <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 1, marginBottom: 6 }}>FOCO</Text>
          <TextInput
            value={data.weekFoci[i]?.focus || ''}
            onChangeText={v => {
              const updated = [...data.weekFoci];
              updated[i] = { ...updated[i], focus: v };
              onChange({ ...data, weekFoci: updated });
            }}
            placeholder="Ej: Activación & Técnica Base"
            placeholderTextColor={t.text3}
            style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, color: t.text, fontSize: t.fs(13), padding: 10, marginBottom: 10 }} />

          <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 1, marginBottom: 6 }}>TEMA</Text>
          <TextInput
            value={data.weekFoci[i]?.theme || ''}
            onChangeText={v => {
              const updated = [...data.weekFoci];
              updated[i] = { ...updated[i], theme: v };
              onChange({ ...data, weekFoci: updated });
            }}
            placeholder="Ej: Establecemos patrones de movimiento"
            placeholderTextColor={t.text3}
            style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, color: t.text, fontSize: t.fs(13), padding: 10 }} />
        </View>
      ))}
    </ScrollView>
  );
}

// ─── STEP 3: CALENDARIO ──────────────────────────────────────────────────────

function Step3({ data, onChange, allCalDays, weeks, onEditDay, t }) {
  const today = new Date();

  const getSessionForDate = (date) => {
    const dateStr = formatDayStr(date);
    for (const w of data.weeks) {
      const found = w.days.find(d => d.day === dateStr);
      if (found) return found;
    }
    return null;
  };

  const getWeekForDate = (date) => {
    return weeks.find(w => date >= w._weekStart && date <= w._weekEnd);
  };

  const typeColors = Object.fromEntries(DAY_TYPES.map(k => [k, TYPE_COLORS[k]]));

  const months = [];
  const seen = new Set();
  allCalDays.forEach(d => {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!seen.has(key)) { seen.add(key); months.push({ year: d.getFullYear(), month: d.getMonth() }); }
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: t.text, marginBottom: 4 }}>CALENDARIO</Text>
      <Text style={{ fontSize: t.fs(12), color: t.text3, marginBottom: 8 }}>Toca un día para añadir o editar la sesión</Text>

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {Object.entries(typeColors).map(([type, color]) => (
          <View key={type} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            <Text style={{ fontSize: t.fs(9), color: t.text3 }}>{type}</Text>
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.border }} />
          <Text style={{ fontSize: t.fs(9), color: t.text3 }}>Sin sesión</Text>
        </View>
      </View>

      {months.map(({ year, month }) => {
        const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const offset = firstDay === 0 ? 6 : firstDay - 1;
        const cells = Array(offset).fill(null);
        for (let i = 1; i <= daysInMonth; i++) cells.push(i);
        while (cells.length % 7 !== 0) cells.push(null);

        const isInRange = (day) => {
          const d = new Date(year, month, day, 12, 0, 0);
          return allCalDays.some(cd => cd.getDate() === d.getDate() && cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear());
        };

        return (
          <View key={`${year}-${month}`} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: t.fs(13), fontWeight: '900', color: t.text, letterSpacing: 2, marginBottom: 10, textAlign: 'center' }}>
              {MESES_FULL[month].toUpperCase()} {year}
            </Text>
            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              {DAY_LABELS.map(d => (
                <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: t.fs(9), color: t.text3, fontWeight: '700' }}>{d}</Text>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {cells.map((cell, i) => {
                if (!cell) return <View key={`e-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />;
                const inRange = isInRange(cell);
                if (!inRange) return (
                  <View key={cell} style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: t.fs(10), color: t.text3 + '40' }}>{cell}</Text>
                  </View>
                );
                const date = new Date(year, month, cell, 12, 0, 0);
                const session = getSessionForDate(date);
                const color = session ? typeColors[session.type] || t.text3 : null;
                return (
                  <TouchableOpacity key={cell} onPress={() => onEditDay(date)}
                    style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{
                      width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: color ? color + '25' : t.bg4,
                      borderWidth: 1.5,
                      borderColor: color || t.border,
                    }}>
                      <Text style={{ fontSize: t.fs(10), fontWeight: session ? '700' : '400', color: color || t.text3 }}>{cell}</Text>
                    </View>
                    {session && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, marginTop: 1 }} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── SESSION EDITOR (días por bloques, schema v2) ─────────────────────────────

// Aviso multiplataforma (Alert.alert no hace nada en react-native-web)
function notify(title, message) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-undef
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

function isoDate(date) {
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function SectionHeader({ label, t }) {
  return <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 8, marginTop: 16 }}>{label}</Text>;
}

function Field({ label, value, onChange, placeholder, multiline, t }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: t.fs(9), color: t.text3, letterSpacing: 1, marginBottom: 4 }}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={t.text3} multiline={multiline} numberOfLines={multiline ? 4 : 1}
        style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, color: t.text, fontSize: t.fs(13), padding: 10, textAlignVertical: multiline ? 'top' : 'center', minHeight: multiline ? 80 : undefined }} />
    </View>
  );
}

// options: valores; labelOf: texto visible; multi: value es un array
function Chips({ options, value, onChange, labelOf, multi, t }) {
  const isOn = opt => (multi ? value.includes(opt) : value === opt);
  const press = opt => {
    if (!multi) return onChange(opt);
    onChange(isOn(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
      {options.map(opt => (
        <TouchableOpacity key={String(opt)} onPress={() => press(opt)}
          style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: isOn(opt) ? t.accent + '20' : t.bg4, borderWidth: 1, borderColor: isOn(opt) ? t.accent : t.border, borderRadius: 8 }}>
          <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: isOn(opt) ? t.accent : t.text3 }}>{labelOf ? labelOf(opt) : String(opt)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SmallLabel({ children, t }) {
  return <Text style={{ fontSize: t.fs(9), color: t.text3, letterSpacing: 1, marginBottom: 6 }}>{children}</Text>;
}

function BlockCard({ form, index, total, onChange, onMove, onDelete, t }) {
  const set = patch => onChange({ ...form, ...patch });
  const setWod = patch => onChange({ ...form, wod: { ...form.wod, ...patch } });
  const isStrength = STRENGTH_KINDS.includes(form.kind);
  const summary = summarizeBlock(formToBlock(form));
  const iconBtn = (label, onPress, disabled) => (
    <TouchableOpacity onPress={onPress} disabled={disabled}
      style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, opacity: disabled ? 0.35 : 1 }}>
      <Text style={{ fontSize: t.fs(12), color: t.text2, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ fontSize: t.fs(11), fontWeight: '800', color: t.accent, letterSpacing: 1 }}>
          {index + 1}. {BLOCK_KIND_LABELS[form.kind].toUpperCase()}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {iconBtn('↑', () => onMove(-1), index === 0)}
          {iconBtn('↓', () => onMove(1), index === total - 1)}
          {iconBtn('Eliminar', onDelete)}
        </View>
      </View>

      <Field t={t} label="TÍTULO" value={form.title} onChange={v => set({ title: v })} placeholder={BLOCK_KIND_LABELS[form.kind]} />

      {isStrength && (
        <>
          <SmallLabel t={t}>MOVIMIENTOS (1RM)</SmallLabel>
          {Object.entries(RM_CATEGORIES).map(([cat, def]) => (
            <View key={cat}>
              <Text style={{ fontSize: t.fs(9), color: def.color, fontWeight: '700', marginBottom: 4 }}>{cat.toUpperCase()}</Text>
              <Chips t={t} multi options={def.movements.map(m => m.key)} value={form.rmKeys}
                onChange={v => set({ rmKeys: v })} labelOf={k => RM_NAMES[k] || k} />
            </View>
          ))}
          <Field t={t} multiline label="SERIES (una por línea: 5×3 @ 80% | nota opcional)" value={form.prescText} onChange={v => set({ prescText: v })}
            placeholder={'5×3 @ 80%\n6×(1+1) @ 70-75% | tirón completo\n4x2 @ 70%'} />
          <Field t={t} label="TEMPO (opcional, para todas las series)" value={form.tempo} onChange={v => set({ tempo: v })} placeholder="21X1" />
          <Field t={t} label="DESCANSO" value={form.rest} onChange={v => set({ rest: v })} placeholder="2-3 min entre series" />
        </>
      )}

      {form.kind === 'wod' && form.wod && (
        <>
          <SmallLabel t={t}>TIPO</SmallLabel>
          <Chips t={t} options={WOD_TYPES} value={form.wod.type} onChange={v => setWod({ type: v })} />
          <Field t={t} label="DURACIÓN" value={form.wod.duration} onChange={v => setWod({ duration: v })} placeholder="20 min" />
          <SmallLabel t={t}>FORMATO</SmallLabel>
          <Chips t={t} options={WOD_FORMATS} value={form.wod.format} onChange={v => setWod({ format: v })} />
          <Field t={t} label="NOTA DEL FORMATO" value={form.wod.formatNote} onChange={v => setWod({ formatNote: v })} placeholder="Pareja A completa la ronda..." />
          <Field t={t} multiline label="MOVIMIENTOS (reps|nombre|peso — uno por línea)" value={form.wod.movementsText} onChange={v => setWod({ movementsText: v })}
            placeholder={'4|Clean & Jerk|♂ 60kg / ♀ 40kg\n10|TTB|BW\n15|Cal Ski Erg|alternos'} />
          <Field t={t} label="NOTA DEL GYM" value={form.wod.gymNote} onChange={v => setWod({ gymNote: v })} placeholder="Nota para el gimnasio..." />
          {form.base?.wod?.parts?.length > 0 && (
            <Text style={{ fontSize: t.fs(10), color: t.text3, marginBottom: 12 }}>
              Este WOD tiene {form.base.wod.parts.length} partes: se conservan tal cual (solo editables por JSON).
            </Text>
          )}
        </>
      )}

      {!isStrength && form.kind !== 'wod' && (
        <Field t={t} multiline label="CONTENIDO (una línea por elemento)" value={form.itemsText} onChange={v => set({ itemsText: v })}
          placeholder={'400m remo + 10 dislocaciones\nMovilidad de cadera 90 seg'} />
      )}

      <Field t={t} label="NOTAS" value={form.notes} onChange={v => set({ notes: v })} placeholder="Notas del bloque" />

      {form.kind !== 'warmup' && (
        <>
          <SmallLabel t={t}>MARCADOR</SmallLabel>
          <Chips t={t} options={SCORE_TYPES} value={form.scoreType} onChange={v => set({ scoreType: v })} labelOf={scoreLabel} />
        </>
      )}

      <Text style={{ fontSize: t.fs(11), color: t.text3, fontStyle: 'italic' }}>{summary}</Text>
    </View>
  );
}

function SessionEditor({ date, session, onSave, onDelete, onClose, t }) {
  const dateStr = formatDayStr(date);
  const [type, setType] = useState(session?.type || DAY_TYPES[0]);
  const [label, setLabel] = useState(session?.label || '');
  const [blocks, setBlocks] = useState(() => dayToBuilderBlocks(session).map(blockToForm));
  const [addKind, setAddKind] = useState(false);

  const updateBlock = (i, f) => setBlocks(bs => bs.map((b, j) => (j === i ? f : b)));
  const moveBlock = (i, dir) => setBlocks(bs => {
    const j = i + dir;
    if (j < 0 || j >= bs.length) return bs;
    const copy = [...bs];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  });
  const deleteBlock = i => confirmar('Eliminar bloque', '¿Seguro que quieres eliminar este bloque?', 'Eliminar', () => setBlocks(bs => bs.filter((_, j) => j !== i)));
  const addBlock = kind => { setBlocks(bs => [...bs, newFormBlock(kind, bs)]); setAddKind(false); };

  const handleSave = () => {
    const day = assembleDay({ day: dateStr, date: isoDate(date), type, label }, blocks);
    const v = validateProgram({ weeks: [{ days: [day] }] });
    if (!v.ok) return notify('No se puede guardar la sesión', formatValidationIssues(v.errors, 8));
    onSave(day);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 16, paddingTop: 56 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: t.fs(9), color: t.accent + '88', letterSpacing: 3, fontWeight: '700' }}>EDITAR SESIÓN</Text>
            <Text style={{ fontSize: t.fs(18), fontWeight: '900', color: t.text }}>{dateStr}</Text>
          </View>
          <TouchableOpacity onPress={onClose}
            style={{ backgroundColor: t.bg4, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: t.fs(12), color: t.text2, fontWeight: '700' }}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>
        <SectionHeader t={t} label="TIPO DE SESIÓN" />
        <Chips t={t} options={DAY_TYPES} value={type} onChange={setType} />

        <SectionHeader t={t} label="TÍTULO DEL DÍA" />
        <Field t={t} label="LABEL" value={label} onChange={setLabel} placeholder="Ej: CLEAN & JERK" />

        <SectionHeader t={t} label={`BLOQUES (${blocks.length})`} />
        {blocks.length === 0 && (
          <Text style={{ fontSize: t.fs(12), color: t.text3, marginBottom: 12 }}>Aún no hay bloques. Añade los que necesite el día; ninguno es obligatorio.</Text>
        )}
        {blocks.map((f, i) => (
          <BlockCard key={f.id} form={f} index={i} total={blocks.length} t={t}
            onChange={nf => updateBlock(i, nf)} onMove={dir => moveBlock(i, dir)} onDelete={() => deleteBlock(i)} />
        ))}

        {addKind ? (
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.accent + '60', borderRadius: 12, padding: 12 }}>
            <SmallLabel t={t}>ELIGE EL TIPO DE BLOQUE</SmallLabel>
            <Chips t={t} options={BLOCK_KINDS} value={null} onChange={addBlock} labelOf={k => BLOCK_KIND_LABELS[k]} />
            <TouchableOpacity onPress={() => setAddKind(false)}>
              <Text style={{ fontSize: t.fs(12), color: t.text3, fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setAddKind(true)}
            style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: t.accent + '80', borderRadius: 12, padding: 14, alignItems: 'center' }}>
            <Text style={{ color: t.accent, fontWeight: '800', fontSize: t.fs(13) }}>+ AÑADIR BLOQUE</Text>
          </TouchableOpacity>
        )}

        {/* BOTONES */}
        <View style={{ gap: 10, marginTop: 20 }}>
          <TouchableOpacity onPress={handleSave}
            style={{ backgroundColor: t.accent, borderRadius: 10, padding: 14, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: t.fs(14), letterSpacing: 1 }}>GUARDAR SESIÓN</Text>
          </TouchableOpacity>
          {session && (
            <TouchableOpacity onPress={onDelete}
              style={{ backgroundColor: '#e6394415', borderWidth: 1, borderColor: '#e6394430', borderRadius: 10, padding: 14, alignItems: 'center' }}>
              <Text style={{ color: '#e63946', fontWeight: '700', fontSize: t.fs(13) }}>ELIMINAR SESIÓN</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── MAIN BUILDER ─────────────────────────────────────────────────────────────

export default function ProgramBuilderScreen({ onClose }) {
  const t = useTheme();
  const { addProgram } = useProgram();

  const [step, setStep] = useState(0); // 0=nombre, 1=semanas, 2=calendario
  const [editingDay, setEditingDay] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    weekFoci: [],
    weeks: [],
  });

  // JSON upload
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');

  const weeks = formData.startDate?.match(/^\d{4}-\d{2}-\d{2}$/) && formData.endDate?.match(/^\d{4}-\d{2}-\d{2}$/)
    ? generateWeeksFromRange(formData.startDate, formData.endDate, formData.weekFoci)
    : [];

  const allCalDays = formData.startDate?.match(/^\d{4}-\d{2}-\d{2}$/) && formData.endDate?.match(/^\d{4}-\d{2}-\d{2}$/)
    ? getAllDaysInRange(formData.startDate, formData.endDate)
    : [];

  const canNext = () => {
    if (step === 0) return formData.name.trim() && formData.startDate.match(/^\d{4}-\d{2}-\d{2}$/) && formData.endDate.match(/^\d{4}-\d{2}-\d{2}$/);
    if (step === 1) return weeks.length > 0;
    return true;
  };

  const handleSaveSession = (session) => {
    const dateStr = session.day;
    let targetWeekIdx = -1;
    for (let i = 0; i < weeks.length; i++) {
      const date = new Date(editingDay.getTime());
      if (date >= weeks[i]._weekStart && date <= weeks[i]._weekEnd) {
        targetWeekIdx = i;
        break;
      }
    }
    if (targetWeekIdx === -1) return;

    const updatedWeeks = [...(formData.weeks.length ? formData.weeks : weeks.map(w => ({ ...w, days: [] })))];
    if (!updatedWeeks[targetWeekIdx]) return;

    const existingIdx = updatedWeeks[targetWeekIdx].days.findIndex(d => d.day === dateStr);
    if (existingIdx >= 0) {
      updatedWeeks[targetWeekIdx].days[existingIdx] = session;
    } else {
      updatedWeeks[targetWeekIdx].days.push(session);
      updatedWeeks[targetWeekIdx].days.sort((a, b) => {
        const da = parseDateFromDay(a.day);
        const db = parseDateFromDay(b.day);
        return (da?.getTime() || 0) - (db?.getTime() || 0);
      });
    }
    setFormData(prev => ({ ...prev, weeks: updatedWeeks }));
    setEditingDay(null);
  };

  const handleDeleteSession = () => {
    const dateStr = formatDayStr(editingDay);
    const updatedWeeks = formData.weeks.map(w => ({
      ...w,
      days: w.days.filter(d => d.day !== dateStr),
    }));
    setFormData(prev => ({ ...prev, weeks: updatedWeeks }));
    setEditingDay(null);
  };

  const getSessionForDate = (date) => {
    const dateStr = formatDayStr(date);
    for (const w of (formData.weeks.length ? formData.weeks : [])) {
      const found = w.days.find(d => d.day === dateStr);
      if (found) return found;
    }
    return null;
  };

  const handleSaveProgram = async () => {
    const finalWeeks = (formData.weeks.length ? formData.weeks : weeks.map(w => ({ ...w, days: [] }))).map((w, i) => ({
      number: w.number,
      dates: w.dates,
      focus: w.focus || formData.weekFoci[i]?.focus || `Semana ${w.number}`,
      theme: w.theme || formData.weekFoci[i]?.theme || '',
      days: w.days || [],
    }));

    const program = { name: formData.name, weeks: finalWeeks };
    const validation = validateProgram(program);
    if (!validation.ok) return notify('Programa no válido', formatValidationIssues(validation.errors, 8));
    setSaving(true);
    const result = await addProgram(program);
    setSaving(false);
    if (!result.success) return Alert.alert('Error', result.error);
    Alert.alert('✅ Programa guardado', `"${formData.name}" añadido correctamente`, [{ text: 'OK', onPress: onClose }]);
  };

  const handleUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled) return;
      const assetUri = result.assets[0].uri;
      const content = Platform.OS === 'web'
        ? await (await fetch(assetUri)).text()
        : await FileSystem.readAsStringAsync(assetUri);
      const parsed = JSON.parse(content);
      if (!parsed.weeks) throw new Error('El JSON no tiene campo "weeks"');
      const result2 = await addProgram(parsed);
      if (!result2.success) return Alert.alert('Error', result2.error);
      Alert.alert('✅ Programa importado', `"${parsed.name || 'Programa'}" añadido correctamente`, [{ text: 'OK', onPress: onClose }]);
    } catch (e) {
      Alert.alert('Error', `No se pudo importar: ${e.message}`);
    }
  };

  const handlePasteJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.weeks) throw new Error('El JSON no tiene campo "weeks"');
      addProgram(parsed).then(r => {
        if (!r.success) return setJsonError(r.error);
        Alert.alert('✅ Programa importado', `"${parsed.name || 'Programa'}" añadido correctamente`, [{ text: 'OK', onPress: onClose }]);
      });
    } catch (e) {
      setJsonError(e.message);
    }
  };

  // Si está editando un día
  if (editingDay) {
    const existing = getSessionForDate(editingDay);
    return (
      <SessionEditor
        date={editingDay}
        session={existing}
        onSave={handleSaveSession}
        onDelete={handleDeleteSession}
        onClose={() => setEditingDay(null)}
        t={t} />
    );
  }

  const STEPS = ['Nombre', 'Semanas', 'Calendario'];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* HEADER */}
      <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 16, paddingTop: 56 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: t.fs(9), color: t.accent + '88', letterSpacing: 4, fontWeight: '700' }}>CREAR PROGRAMA</Text>
            <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: t.text, marginTop: 2 }}>{STEPS[step].toUpperCase()}</Text>
          </View>
          <TouchableOpacity onPress={onClose}
            style={{ backgroundColor: t.bg4, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: t.fs(12), color: t.text2, fontWeight: '700' }}>✕ CERRAR</Text>
          </TouchableOpacity>
        </View>
        <StepIndicator step={step} total={3} t={t} />
      </View>

      {/* IMPORT BUTTONS — solo en step 0 */}
      {step === 0 && (
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 0 }}>
          <TouchableOpacity onPress={handleUploadFile}
            style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16 }}>📂</Text>
            <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: t.text2 }}>SUBIR ARCHIVO</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowJsonModal(true)}
            style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16 }}>📋</Text>
            <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: t.text2 }}>PEGAR JSON</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL PEGAR JSON */}
      {showJsonModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: t.bg, zIndex: 100 }}>
          <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 16, paddingTop: 56 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: t.fs(18), fontWeight: '900', color: t.text }}>PEGAR JSON</Text>
              <TouchableOpacity onPress={() => { setShowJsonModal(false); setJsonText(''); setJsonError(''); }}
                style={{ backgroundColor: t.bg4, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: t.border }}>
                <Text style={{ fontSize: t.fs(12), color: t.text2, fontWeight: '700' }}>✕ CERRAR</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 14 }}>
            <TextInput value={jsonText} onChangeText={v => { setJsonText(v); setJsonError(''); }}
              placeholder='{ "name": "...", "weeks": [...] }' placeholderTextColor={t.text3}
              multiline numberOfLines={14}
              style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, color: t.text, fontSize: t.fs(11), padding: 12, textAlignVertical: 'top', minHeight: 250, marginBottom: 12 }} />
            {jsonError ? <View style={{ backgroundColor: '#e6394420', borderRadius: 8, padding: 12, marginBottom: 12 }}><Text style={{ color: '#e63946', fontSize: t.fs(12) }}>❌ {jsonError}</Text></View> : null}
            <TouchableOpacity onPress={handlePasteJson}
              style={{ backgroundColor: t.accent, borderRadius: 10, padding: 14, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: t.fs(13) }}>💾 IMPORTAR JSON</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* STEPS */}
      <View style={{ flex: 1 }}>
        {step === 0 && <Step1 data={formData} onChange={setFormData} t={t} />}
        {step === 1 && <Step2 data={formData} onChange={setFormData} weeks={weeks} t={t} />}
        {step === 2 && (
          <Step3 data={formData} onChange={setFormData} allCalDays={allCalDays} weeks={weeks}
            onEditDay={setEditingDay} t={t} />
        )}
      </View>

      {/* FOOTER NAV */}
      <View style={{ flexDirection: 'row', gap: 10, padding: 14, backgroundColor: t.header, borderTopWidth: 1, borderTopColor: t.border }}>
        {step > 0 && (
          <TouchableOpacity onPress={() => setStep(s => s - 1)}
            style={{ flex: 1, backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text2 }}>← ATRÁS</Text>
          </TouchableOpacity>
        )}
        {step < 2 ? (
          <TouchableOpacity onPress={() => canNext() && setStep(s => s + 1)} disabled={!canNext()}
            style={{ flex: 1, backgroundColor: canNext() ? t.accent : t.border, borderRadius: 10, padding: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: t.fs(13), fontWeight: '900', color: '#fff' }}>SIGUIENTE →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleSaveProgram} disabled={saving}
            style={{ flex: 1, backgroundColor: saving ? t.border : '#52b788', borderRadius: 10, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            {saving && <ActivityIndicator color="#fff" size="small" />}
            <Text style={{ fontSize: t.fs(13), fontWeight: '900', color: '#fff' }}>💾 GUARDAR PROGRAMA</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}