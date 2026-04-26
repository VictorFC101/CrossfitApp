import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../ThemeContext';
import { useProgram } from '../ProgramContext';
import { parseDateFromDay } from '../dateUtils';
import { supabase } from '../supabase';
import ProgramBuilderScreen from './ProgramBuilderScreen';
import AssignProgramScreen from './AssignProgramScreen';
import { mayo2026 } from '../assets/mayo2026';
import * as DocumentPicker from 'expo-document-picker';

const MESES_LARGOS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const ADMIN_PIN_KEY = 'admin_pin';

const DIAS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function formatDayStr(date) {
  return `${DIAS_ES[date.getDay()]} ${date.getDate()} ${MESES_ES[date.getMonth()]}`;
}

function reschedulePlan(plan, newStartDateStr) {
  const [y, m, d] = newStartDateStr.split('-').map(Number);
  const newStart = new Date(y, m - 1, d, 12, 0, 0);
  const allDays = plan.weeks.flatMap(w => w.days);
  const originalDates = allDays.map(day => parseDateFromDay(day.day)).filter(Boolean);
  if (!originalDates.length) return null;
  const originalStart = new Date(Math.min(...originalDates.map(d => d.getTime())));
  const offsetMs = newStart.getTime() - originalStart.getTime();
  const offsetDays = Math.round(offsetMs / (1000 * 60 * 60 * 24));
  let dayIdx = 0;
  const newWeeks = plan.weeks.map(week => ({
    ...week,
    days: week.days.map(day => {
      const originalDate = originalDates[dayIdx++];
      if (!originalDate) return day;
      const newDate = new Date(originalDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
      return { ...day, day: formatDayStr(newDate) };
    })
  }));
  const newWeeksWithDates = newWeeks.map(week => {
    const weekDates = week.days.map(d => parseDateFromDay(d.day)).filter(Boolean);
    if (!weekDates.length) return week;
    const minD = new Date(Math.min(...weekDates.map(d => d.getTime())));
    const maxD = new Date(Math.max(...weekDates.map(d => d.getTime())));
    return { ...week, dates: `${minD.getDate()} ${MESES_ES[minD.getMonth()]} – ${maxD.getDate()} ${MESES_ES[maxD.getMonth()]}` };
  });
  return { ...plan, weeks: newWeeksWithDates };
}

// ─── PIN ─────────────────────────────────────────────────────────────────────

function PinScreen({ onSuccess }) {
  const t = useTheme();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState('checking');
  const [error, setError] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(ADMIN_PIN_KEY).then(stored => {
      setStep(stored ? 'verify' : 'create');
    });
  }, []);

  const handlePress = (num) => {
    setError('');
    if (step === 'create') { if (pin.length < 4) setPin(p => p + num); }
    else if (step === 'confirm') { if (confirmPin.length < 4) setConfirmPin(p => p + num); }
    else if (step === 'verify') { if (pin.length < 4) setPin(p => p + num); }
  };

  const handleDelete = () => {
    setError('');
    if (step === 'confirm') setConfirmPin(p => p.slice(0, -1));
    else setPin(p => p.slice(0, -1));
  };

  const handleNext = async () => {
    if (step === 'create') {
      if (pin.length !== 4) return setError('Introduce 4 dígitos');
      setStep('confirm');
    } else if (step === 'confirm') {
      if (confirmPin !== pin) { setError('Los PINs no coinciden'); setConfirmPin(''); return; }
      await AsyncStorage.setItem(ADMIN_PIN_KEY, pin);
      onSuccess();
    } else if (step === 'verify') {
      const stored = await AsyncStorage.getItem(ADMIN_PIN_KEY);
      if (pin === stored) { onSuccess(); }
      else { setError('PIN incorrecto'); setPin(''); }
    }
  };

  if (step === 'checking') return null;

  const currentPin = step === 'confirm' ? confirmPin : pin;
  const title = step === 'create' ? 'CREAR PIN' : step === 'confirm' ? 'CONFIRMAR PIN' : 'ACCESO ADMIN';
  const subtitle = step === 'create' ? 'Elige un PIN de 4 dígitos' : step === 'confirm' ? 'Repite el PIN para confirmar' : 'Introduce tu PIN de administrador';
  const btnLabel = step === 'create' ? 'SIGUIENTE' : step === 'confirm' ? 'CREAR PIN' : 'ENTRAR';
  const NUMS = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: t.accent + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Text style={{ fontSize: 28 }}>🔐</Text>
      </View>
      <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: t.text, letterSpacing: 2, marginBottom: 6, textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontSize: t.fs(12), color: t.text3, marginBottom: 32, textAlign: 'center' }}>{subtitle}</Text>
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 32 }}>
        {[0,1,2,3].map(i => (
          <View key={i} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: i < currentPin.length ? t.accent : 'transparent', borderWidth: 2, borderColor: i < currentPin.length ? t.accent : t.text3 }} />
        ))}
      </View>
      {error ? <Text style={{ color: '#e63946', fontSize: t.fs(12), marginBottom: 16, textAlign: 'center' }}>{error}</Text> : null}
      <View style={{ width: '100%', maxWidth: 280 }}>
        {NUMS.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            {row.map((num, ci) => {
              if (num === '') return <View key={ci} style={{ width: 80, height: 60 }} />;
              const isDelete = num === '⌫';
              return (
                <TouchableOpacity key={ci} onPress={() => isDelete ? handleDelete() : handlePress(num)}
                  style={{ width: 80, height: 60, borderRadius: 12, backgroundColor: isDelete ? t.bg4 : t.card, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: isDelete ? t.fs(18) : t.fs(22), fontWeight: '700', color: isDelete ? t.text3 : t.text }}>{num}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
      <TouchableOpacity onPress={handleNext} disabled={currentPin.length !== 4}
        style={{ backgroundColor: currentPin.length === 4 ? t.accent : t.border, borderRadius: 12, padding: 16, width: '100%', maxWidth: 280, alignItems: 'center', marginTop: 16 }}>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: t.fs(14), letterSpacing: 1 }}>{btnLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── ADD JSON ─────────────────────────────────────────────────────────────────

const WEEKDAYS_ES = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

function stripProgramDates(program) {
  return {
    ...program,
    weeks: program.weeks.map(week => ({
      ...week,
      dates: '',
      days: week.days.map(day => {
        // "Lunes 5 May" → "Lunes" / "Miércoles 7 May" → "Miércoles"
        const firstWord = (day.day || '').split(' ')[0];
        const cleaned = WEEKDAYS_ES.includes(firstWord) ? firstWord : day.day;
        return { ...day, day: cleaned };
      }),
    })),
  };
}

function AddJsonModal({ visible, onClose, onSave }) {
  const t = useTheme();
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => { setError(''); setPreview(null); setFileName(''); };

  const pickFile = async () => {
    setLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled) { setLoading(false); return; }
      const asset = result.assets[0];
      setFileName(asset.name);
      const text = await fetch(asset.uri).then(r => r.text());
      const parsed = JSON.parse(text);
      if (!parsed.weeks || !Array.isArray(parsed.weeks)) throw new Error('Falta el campo "weeks"');
      if (parsed.weeks.length === 0) throw new Error('"weeks" no puede estar vacío');
      for (const w of parsed.weeks) {
        if (!w.days || !Array.isArray(w.days)) throw new Error('Cada semana necesita un array "days"');
      }
      setPreview(stripProgramDates(parsed));
      setError('');
    } catch (e) {
      setError(e.message);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!preview) return;
    onSave(preview);
    reset();
    onClose();
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 16, paddingTop: 56 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: t.fs(18), fontWeight: '900', color: t.text }}>SUBIR JSON</Text>
            <TouchableOpacity onPress={handleClose} style={{ backgroundColor: t.bg4, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: t.border }}>
              <Text style={{ fontSize: t.fs(12), color: t.text2, fontWeight: '700' }}>✕ CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 14 }}>
          <TouchableOpacity onPress={pickFile} disabled={loading}
            style={{ backgroundColor: t.card, borderWidth: 2, borderColor: t.accent + '60', borderStyle: 'dashed', borderRadius: 14, padding: 32, alignItems: 'center', gap: 10, marginBottom: 16 }}>
            {loading
              ? <ActivityIndicator color={t.accent} />
              : <>
                  <Text style={{ fontSize: 36 }}>📂</Text>
                  <Text style={{ fontSize: t.fs(13), fontWeight: '800', color: t.text }}>
                    {fileName || 'Seleccionar archivo JSON'}
                  </Text>
                  <Text style={{ fontSize: t.fs(10), color: t.text3, textAlign: 'center' }}>
                    {fileName ? 'Toca para cambiar el archivo' : 'Toca para abrir el explorador de archivos'}
                  </Text>
                </>
            }
          </TouchableOpacity>

          {error ? (
            <View style={{ backgroundColor: '#e6394420', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <Text style={{ color: '#e63946', fontSize: t.fs(12) }}>❌ {error}</Text>
            </View>
          ) : null}

          {preview ? (
            <View style={{ backgroundColor: '#52b78820', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <Text style={{ color: '#52b788', fontSize: t.fs(12), fontWeight: '700', marginBottom: 6 }}>✅ Programa listo para guardar</Text>
              <Text style={{ color: '#52b788', fontSize: t.fs(11), marginBottom: 2 }}>
                {preview.name || 'Sin nombre'} · {preview.weeks.length} semanas
              </Text>
              <Text style={{ color: '#52b788', fontSize: t.fs(11) }}>
                {preview.weeks.reduce((a, w) => a + w.days.length, 0)} días · Fechas eliminadas
              </Text>
            </View>
          ) : null}

          <TouchableOpacity onPress={handleSave} disabled={!preview}
            style={{ backgroundColor: preview ? t.accent : t.border, borderRadius: 10, padding: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: t.fs(13), fontWeight: '900', color: '#fff' }}>💾 GUARDAR EN TODOS LOS PROGRAMAS</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── TEMPLATE HELPERS ────────────────────────────────────────────────────────

function stripDatesFromProgram(program, diasSemana) {
  let dayCounter = 0;
  const newWeeks = program.weeks.map(week => ({
    ...week,
    dates: `Semana ${week.number}`,
    days: week.days.map((day, di) => {
      dayCounter++;
      return {
        ...day,
        day: `Día ${dayCounter}`,
        _diaNombre: diasSemana[di % diasSemana.length],
      };
    }),
  }));
  return {
    ...program,
    weeks: newWeeks,
    _isTemplate: true,
    _templateDiasSemana: diasSemana,
  };
}

function scheduleTemplate(template, startDateStr) {
  const [y, m, d] = startDateStr.split('-').map(Number);
  const startDate = new Date(y, m - 1, d, 12, 0, 0);
  const diasSemana = template._templateDiasSemana || [];
  // Offset de cada día de semana desde el lunes (Lun=0, Mar=1, ...)
  const dayOffsets = { Lunes:0, Martes:1, 'Miércoles':2, Jueves:3, Viernes:4, Sábado:5, Domingo:6 };
  // startDate es el Día 1 → alinear al "lunes de esa semana"
  const firstOffset = dayOffsets[diasSemana[0]] ?? 0;
  const weekAnchor = new Date(startDate);
  weekAnchor.setDate(startDate.getDate() - firstOffset);

  const newWeeks = template.weeks.map((week, wi) => {
    const weekStart = new Date(weekAnchor);
    weekStart.setDate(weekAnchor.getDate() + wi * 7);
    const days = week.days.map((day, di) => {
      const diaNombre = day._diaNombre || diasSemana[di] || diasSemana[0];
      const offset = dayOffsets[diaNombre] ?? di;
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + offset);
      return { ...day, day: formatDayStr(dayDate) };
    });
    const weekDates = days.map(d => parseDateFromDay(d.day)).filter(Boolean);
    if (!weekDates.length) return { ...week, days };
    const minD = new Date(Math.min(...weekDates.map(d => d.getTime())));
    const maxD = new Date(Math.max(...weekDates.map(d => d.getTime())));
    return {
      ...week,
      dates: `${minD.getDate()} ${MESES_ES[minD.getMonth()]} – ${maxD.getDate()} ${MESES_ES[maxD.getMonth()]}`,
      days,
    };
  });
  return { ...template, weeks: newWeeks, _isTemplate: false };
}

// ─── RESCHEDULE ───────────────────────────────────────────────────────────────

function RescheduleModal({ visible, program, onClose, onSave }) {
  const t = useTheme();
  const [newStartDate, setNewStartDate] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  const isTemplate = !!program?._isTemplate;

  const handlePreview = () => {
    if (!newStartDate.match(/^\d{4}-\d{2}-\d{2}$/)) return setError('Formato: YYYY-MM-DD (ej: 2026-05-04)');
    try {
      let rescheduled;
      if (isTemplate) {
        rescheduled = scheduleTemplate(program, newStartDate);
      } else {
        rescheduled = reschedulePlan(program, newStartDate);
        if (!rescheduled) throw new Error('No se pudieron calcular las fechas');
      }
      setPreview(rescheduled); setError('');
    } catch (e) { setError(e.message); }
  };

  const handleSave = () => {
    if (!preview) return;
    const baseName = program._meta?.title || program.name || 'Programa';
    onSave({ ...preview, id: Date.now().toString(), name: isTemplate ? baseName : `${baseName} (copia)` });
    setNewStartDate(''); setPreview(null); onClose();
  };

  if (!program) return null;
  const allDays = program.weeks.flatMap(w => w.days);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 16, paddingTop: 56 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: t.fs(18), fontWeight: '900', color: t.text }}>
              {isTemplate ? '📅 PROGRAMAR PLANTILLA' : '📋 COPIAR PROGRAMA'}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: t.bg4, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: t.border }}>
              <Text style={{ fontSize: t.fs(12), color: t.text2, fontWeight: '700' }}>✕ CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 14 }}>
          <View style={{ backgroundColor: t.card, borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, marginBottom: 4 }}>
              {isTemplate ? 'PLANTILLA IA' : 'PROGRAMA ORIGINAL'}
            </Text>
            <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text }}>{program.name || program._meta?.title || 'Programa'}</Text>
            <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 4 }}>
              {isTemplate
                ? `${program.weeks.length} semanas · Patrón: ${(program._templateDiasSemana || []).join(', ')}`
                : `Inicio: ${allDays[0]?.day} · ${program.weeks.length} semanas`}
            </Text>
            {isTemplate && (
              <Text style={{ fontSize: t.fs(10), color: '#9b5de5', marginTop: 6 }}>
                Elige la fecha del Día 1 — las demás se calculan automáticamente
              </Text>
            )}
          </View>
          <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>NUEVA FECHA DE INICIO</Text>
          <TextInput value={newStartDate} onChangeText={v => { setNewStartDate(v); setError(''); setPreview(null); }}
            placeholder="YYYY-MM-DD (ej: 2026-05-04)" placeholderTextColor={t.text3}
            style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.accent + '40', borderRadius: 10, color: t.text, fontSize: t.fs(15), fontWeight: '700', padding: 14, marginBottom: 12 }} />
          {error ? <View style={{ backgroundColor: '#e6394420', borderRadius: 8, padding: 12, marginBottom: 12 }}><Text style={{ color: '#e63946', fontSize: t.fs(12) }}>❌ {error}</Text></View> : null}
          {preview ? (
            <View style={{ backgroundColor: '#52b78820', borderRadius: 8, padding: 14, marginBottom: 12 }}>
              <Text style={{ color: '#52b788', fontSize: t.fs(13), fontWeight: '900', marginBottom: 8 }}>✅ Vista previa</Text>
              {preview.weeks.map((w, i) => (
                <View key={i} style={{ marginBottom: 8 }}>
                  <Text style={{ color: '#52b788', fontSize: t.fs(11), fontWeight: '700' }}>S{w.number} — {w.focus}</Text>
                  {w.days.map((d, j) => (
                    <Text key={j} style={{ color: '#3a8a5a', fontSize: t.fs(10), marginLeft: 8, marginTop: 2 }}>· {d.day} — {d.label}</Text>
                  ))}
                </View>
              ))}
            </View>
          ) : null}
          <TouchableOpacity onPress={handlePreview} style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text2 }}>👁 PREVISUALIZAR FECHAS</Text>
          </TouchableOpacity>
          {preview && (
            <TouchableOpacity onPress={handleSave} style={{ backgroundColor: t.accent, borderRadius: 10, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: t.fs(13), fontWeight: '900', color: '#fff' }}>💾 GUARDAR COMO NUEVO PROGRAMA</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── USER MANAGEMENT ──────────────────────────────────────────────────────────

function UserManagementScreen({ onClose }) {
  const t = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [boxes, setBoxes] = useState([]);
  const [userPrograms, setUserPrograms] = useState({});
  const [expandedUser, setExpandedUser] = useState(null);

  useEffect(() => {
    loadUsers();
    loadBoxes();
  }, []);

  const loadUsers = async (query = '') => {
    setLoading(true);
    try {
      let q = supabase.from('usuarios_publicos').select('*');
      if (query.trim()) q = q.or(`nombre.ilike.%${query}%,email.ilike.%${query}%`);
      const { data } = await q.order('nombre');
      setUsers(data || []);
    } catch (e) {}
    finally { setLoading(false); }
  };

  const loadBoxes = async () => {
    const { data } = await supabase.from('boxes').select('*');
    setBoxes(data || []);
  };

  const deleteAssignment = async (asigId, userId) => {
    Alert.alert('Quitar programa', '¿Seguro que quieres quitar este programa al usuario?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('asignaciones').delete().eq('id', asigId);
        if (error) return Alert.alert('Error', error.message);
        setUserPrograms(prev => ({ ...prev, [userId]: prev[userId].filter(a => a.id !== asigId) }));
      }}
    ]);
  };

  const loadUserPrograms = async (userId) => {
    if (expandedUser === userId) { setExpandedUser(null); return; }
    const { data } = await supabase
      .from('asignaciones')
      .select('*, programas(id, name)')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });
    setUserPrograms(prev => ({ ...prev, [userId]: data || [] }));
    setExpandedUser(userId);
  };

  const updateRole = async (userId, newRole) => {
    const { error } = await supabase.from('usuarios').update({ rol: newRole }).eq('id', userId);
    if (error) { Alert.alert('Error', error.message); return; }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, rol: newRole } : u));
    Alert.alert('✅ Rol actualizado', `Rol cambiado a ${newRole}`);
  };

  const updateBox = async (userId, boxId) => {
    const { error } = await supabase.from('usuarios').update({ box_id: boxId }).eq('id', userId);
    if (error) { Alert.alert('Error', error.message); return; }
    const box = boxes.find(b => b.id === boxId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, box_id: boxId, box_nombre: box?.nombre } : u));
  };

  const roleColors = { admin: '#e63946', coach: '#4895ef', atleta: '#52b788' };
  const roleIcons = { admin: '⚡', coach: '🏋️', atleta: '👤' };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 16, paddingTop: 56 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: t.text }}>USUARIOS</Text>
          <TouchableOpacity onPress={onClose}
            style={{ backgroundColor: t.bg4, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: t.fs(12), color: t.text2, fontWeight: '700' }}>✕ CERRAR</Text>
          </TouchableOpacity>
        </View>
        <TextInput value={search} onChangeText={v => { setSearch(v); loadUsers(v); }}
          placeholder="Buscar por nombre o email..."
          placeholderTextColor={t.text3}
          style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 10, color: t.text, fontSize: t.fs(14), padding: 12 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={t.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
          <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 10 }}>
            {users.length} USUARIOS REGISTRADOS
          </Text>
          {users.map(user => {
            const roleColor = roleColors[user.rol] || t.text3;
            return (
              <View key={user.id} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                {/* HEADER USUARIO */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: roleColor + '20', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: t.fs(18) }}>{roleIcons[user.rol] || '👤'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: t.fs(14), fontWeight: '900', color: t.text }}>{user.nombre || 'Sin nombre'}</Text>
                    <Text style={{ fontSize: t.fs(11), color: t.text3 }}>{user.email}</Text>
                    {user.box_nombre && (
                      <Text style={{ fontSize: t.fs(10), color: t.accent, marginTop: 2 }}>📍 {user.box_nombre}</Text>
                    )}
                  </View>
                  <View style={{ backgroundColor: roleColor + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ fontSize: t.fs(9), color: roleColor, fontWeight: '700' }}>{user.rol?.toUpperCase()}</Text>
                  </View>
                </View>

                {/* ROL */}
                <Text style={{ fontSize: t.fs(9), color: t.text3, letterSpacing: 1, marginBottom: 6 }}>ROL</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                  {['atleta', 'coach', 'admin'].map(role => (
                    <TouchableOpacity key={role} onPress={() => updateRole(user.id, role)}
                      style={{ flex: 1, padding: 8, backgroundColor: user.rol === role ? roleColors[role] + '20' : t.bg4, borderWidth: 1, borderColor: user.rol === role ? roleColors[role] : t.border, borderRadius: 8, alignItems: 'center' }}>
                      <Text style={{ fontSize: t.fs(10), fontWeight: '700', color: user.rol === role ? roleColors[role] : t.text3 }}>
                        {roleIcons[role]} {role.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* BOX */}
                <Text style={{ fontSize: t.fs(9), color: t.text3, letterSpacing: 1, marginBottom: 6 }}>BOX</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {boxes.map(box => (
                      <TouchableOpacity key={box.id} onPress={() => updateBox(user.id, box.id)}
                        style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: user.box_id === box.id ? t.accent + '20' : t.bg4, borderWidth: 1, borderColor: user.box_id === box.id ? t.accent : t.border, borderRadius: 20 }}>
                        <Text style={{ fontSize: t.fs(10), fontWeight: '700', color: user.box_id === box.id ? t.accent : t.text3 }}>
                          {box.nombre}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {/* VER PROGRAMAS */}
                <TouchableOpacity onPress={() => loadUserPrograms(user.id)}
                  style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                  <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: t.text2 }}>
                    {expandedUser === user.id ? '▴ OCULTAR PROGRAMAS' : '▾ VER PROGRAMAS'}
                  </Text>
                </TouchableOpacity>

                {expandedUser === user.id && (
                  <View style={{ marginTop: 10, backgroundColor: t.bg4, borderRadius: 8, padding: 10 }}>
                    {!userPrograms[user.id]?.length ? (
                      <Text style={{ fontSize: t.fs(11), color: t.text3, textAlign: 'center' }}>Sin programas asignados</Text>
                    ) : (
                      userPrograms[user.id].map((asig, i) => {
                        const statusColors = { pendiente: '#f4a261', activo: '#52b788', rechazado: '#e63946' };
                        const color = statusColors[asig.status] || t.text3;
                        return (
                          <View key={asig.id} style={{ borderBottomWidth: i < userPrograms[user.id].length - 1 ? 1 : 0, borderBottomColor: t.border, paddingBottom: 8, marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontSize: t.fs(12), fontWeight: '700', color: t.text, flex: 1 }}>
                                {asig.programas?.name || 'Programa'}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={{ backgroundColor: color + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                                  <Text style={{ fontSize: t.fs(9), color, fontWeight: '700' }}>{asig.status.toUpperCase()}</Text>
                                </View>
                                <TouchableOpacity onPress={() => deleteAssignment(asig.id, user.id)}
                                  style={{ backgroundColor: '#e6394415', borderRadius: 6, padding: 5, borderWidth: 1, borderColor: '#e6394430' }}>
                                  <Text style={{ fontSize: t.fs(11), color: '#e63946' }}>🗑</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                            <Text style={{ fontSize: t.fs(10), color: t.text3, marginTop: 3 }}>
                              📅 Inicio: {asig.start_date}
                            </Text>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

// ─── BOX MANAGEMENT ───────────────────────────────────────────────────────────

function BoxManagementScreen({ onClose }) {
  const t = useTheme();
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newBox, setNewBox] = useState({ nombre: '', ciudad: '', codigo_invitacion: '' });
  const [saving, setSaving] = useState(false);
  const [expandedBox, setExpandedBox] = useState(null);
  const [boxMembers, setBoxMembers] = useState({});

  useEffect(() => { loadBoxes(); }, []);

  const loadBoxes = async () => {
    setLoading(true);
    const { data } = await supabase.from('boxes').select('*').order('nombre');
    setBoxes(data || []);
    setLoading(false);
  };

  const loadBoxMembers = async (boxId) => {
    if (expandedBox === boxId) { setExpandedBox(null); return; }
    const { data } = await supabase.from('usuarios_publicos').select('*').eq('box_id', boxId);
    setBoxMembers(prev => ({ ...prev, [boxId]: data || [] }));
    setExpandedBox(boxId);
  };

  const createBox = async () => {
    if (!newBox.nombre.trim() || !newBox.codigo_invitacion.trim()) {
      Alert.alert('Error', 'Nombre y código son obligatorios');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('boxes').insert({
      nombre: newBox.nombre.trim(),
      ciudad: newBox.ciudad.trim(),
      codigo_invitacion: newBox.codigo_invitacion.trim().toUpperCase(),
    });
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setNewBox({ nombre: '', ciudad: '', codigo_invitacion: '' });
    setShowCreate(false);
    loadBoxes();
  };

  const deleteBox = async (boxId) => {
    Alert.alert('Eliminar box', '¿Seguro? Los usuarios perderán su asignación.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await supabase.from('boxes').delete().eq('id', boxId);
        loadBoxes();
      }}
    ]);
  };

  const roleColors = { admin: '#e63946', coach: '#4895ef', atleta: '#52b788' };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 16, paddingTop: 56 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: t.text }}>BOXES & EQUIPOS</Text>
          <TouchableOpacity onPress={onClose}
            style={{ backgroundColor: t.bg4, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: t.fs(12), color: t.text2, fontWeight: '700' }}>✕ CERRAR</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => setShowCreate(s => !s)}
          style={{ backgroundColor: t.accent + '15', borderWidth: 1, borderColor: t.accent + '40', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <Text style={{ fontSize: 18 }}>➕</Text>
          <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.accent }}>CREAR NUEVO BOX</Text>
        </TouchableOpacity>

        {showCreate && (
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.accent + '40', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 12 }}>NUEVO BOX</Text>
            <Text style={{ fontSize: t.fs(9), color: t.text3, letterSpacing: 1, marginBottom: 6 }}>NOMBRE *</Text>
            <TextInput value={newBox.nombre} onChangeText={v => setNewBox(p => ({ ...p, nombre: v }))}
              placeholder="Ej: CrossFit Barcelona" placeholderTextColor={t.text3}
              style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, color: t.text, fontSize: t.fs(14), padding: 12, marginBottom: 10 }} />
            <Text style={{ fontSize: t.fs(9), color: t.text3, letterSpacing: 1, marginBottom: 6 }}>CIUDAD</Text>
            <TextInput value={newBox.ciudad} onChangeText={v => setNewBox(p => ({ ...p, ciudad: v }))}
              placeholder="Ej: Barcelona" placeholderTextColor={t.text3}
              style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, color: t.text, fontSize: t.fs(14), padding: 12, marginBottom: 10 }} />
            <Text style={{ fontSize: t.fs(9), color: t.text3, letterSpacing: 1, marginBottom: 6 }}>CÓDIGO DE INVITACIÓN *</Text>
            <TextInput value={newBox.codigo_invitacion} onChangeText={v => setNewBox(p => ({ ...p, codigo_invitacion: v.toUpperCase() }))}
              placeholder="Ej: BCN2026" placeholderTextColor={t.text3} autoCapitalize="characters"
              style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, color: t.text, fontSize: t.fs(14), padding: 12, marginBottom: 14 }} />
            <Text style={{ fontSize: t.fs(10), color: t.text3, marginBottom: 14 }}>
              Los atletas usan este código al registrarse para unirse al box.
            </Text>
            <TouchableOpacity onPress={createBox} disabled={saving}
              style={{ backgroundColor: saving ? t.border : t.accent, borderRadius: 8, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              {saving && <ActivityIndicator color="#fff" size="small" />}
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: t.fs(13) }}>💾 CREAR BOX</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={t.accent} />
        ) : (
          <>
            <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 10 }}>
              {boxes.length} BOXES REGISTRADOS
            </Text>
            {boxes.map(box => (
              <View key={box.id} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text }}>{box.nombre}</Text>
                    {box.ciudad && <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 2 }}>📍 {box.ciudad}</Text>}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <View style={{ backgroundColor: t.accent + '15', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ fontSize: t.fs(10), color: t.accent, fontWeight: '700', letterSpacing: 1 }}>🔑 {box.codigo_invitacion}</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => deleteBox(box.id)}
                    style={{ backgroundColor: '#e6394415', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#e6394430' }}>
                    <Text style={{ fontSize: t.fs(11), color: '#e63946' }}>🗑</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => loadBoxMembers(box.id)}
                  style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                  <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: t.text2 }}>
                    {expandedBox === box.id ? '▴ OCULTAR MIEMBROS' : '▾ VER MIEMBROS'}
                  </Text>
                </TouchableOpacity>

                {expandedBox === box.id && (
                  <View style={{ marginTop: 10, backgroundColor: t.bg4, borderRadius: 8, padding: 10 }}>
                    {!boxMembers[box.id]?.length ? (
                      <Text style={{ fontSize: t.fs(11), color: t.text3, textAlign: 'center' }}>Sin miembros</Text>
                    ) : (
                      boxMembers[box.id].map((member, i) => {
                        const roleColor = roleColors[member.rol] || t.text3;
                        return (
                          <View key={member.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: i < boxMembers[box.id].length - 1 ? 1 : 0, borderBottomColor: t.border }}>
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: roleColor + '20', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: t.fs(12), fontWeight: '700', color: roleColor }}>
                                {member.nombre ? member.nombre[0].toUpperCase() : '?'}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text }}>{member.nombre || 'Sin nombre'}</Text>
                              <Text style={{ fontSize: t.fs(10), color: t.text3 }}>{member.email}</Text>
                            </View>
                            <View style={{ backgroundColor: roleColor + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
                              <Text style={{ fontSize: t.fs(9), color: roleColor, fontWeight: '700' }}>{member.rol?.toUpperCase()}</Text>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── IA WIZARD CONSTANTS ─────────────────────────────────────────────────────

const DIAS_SEMANA_LIST = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

const TIPOS_DIA_OPTS = [
  { key: 'endurance', label: 'ENDURANCE', icon: '🏃', desc: 'WOD largo 30-40 min · Sin fuerza · Cardio + gimnásticos', color: '#f4a261' },
  { key: 'endurance_pesado', label: 'ENDURANCE PESADO', icon: '🔥', desc: 'WOD largo 30-40 min · Sin fuerza · Peso moderado-alto', color: '#e9c46a' },
  { key: 'endurance_extra', label: 'ENDURANCE EXTRA', icon: '🔥', desc: 'WOD 30-35 min · Sin fuerza · DB/KB pesado · Gimnásticos + cuerda + cardio · Individual / Pareja / Equipo', color: '#f77f00' },
  { key: 'crossfit_general', label: 'CROSSFIT GENERAL', icon: '⚡', desc: 'Fuerza 20 min + WOD corto 10-15 min · Alta intensidad', color: '#e63946' },
  { key: 'crossfit_largo', label: 'CROSSFIT LARGO', icon: '💪', desc: 'Fuerza 20 min + WOD largo 22-25 min · Alto volumen', color: '#9b5de5' },
];

const OBJETIVOS_LIST = [
  'Fuerza en halterofilia (Snatch, C&J)',
  'Fuerza general (Squat, Deadlift, Press)',
  'Gimnásticos (TTB, HSPU, Muscle-Up)',
  'Cardio / Endurance',
  'Composición corporal',
  'Preparación para competición',
];

const EQUIPAMIENTO_LIST = [
  'Barras olímpicas y discos','Mancuernas','Kettlebells',
  'RowErg / Remo','Ski Erg','Assault Bike / BikeErg',
  'Cuerda de salto','Cuerda para escalar','Cajas pliométricas',
  'Anillas','Pull-up bar','Wall Balls',
];

function OptionCard({ t, selected, onPress, icon, label, desc, color }) {
  const c = color || '#9b5de5';
  return (
    <TouchableOpacity onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 12, marginBottom: 10,
        borderWidth: 2, borderColor: selected ? c : t.border,
        backgroundColor: selected ? c + '20' : t.card }}>
      <Text style={{ fontSize: 26 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: t.fs(13), fontWeight: '900', color: selected ? c : t.text }}>{label}</Text>
        {desc ? <Text style={{ fontSize: t.fs(10), color: t.text3, marginTop: 2 }}>{desc}</Text> : null}
      </View>
      {selected && <Text style={{ color: c, fontSize: 18, fontWeight: '900' }}>✓</Text>}
    </TouchableOpacity>
  );
}

// ─── IA PROGRAM MODAL ────────────────────────────────────────────────────────

function IAProgramModal({ visible, onClose, onSave }) {
  const t = useTheme();
  const now = new Date();
  const nextMes = now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2;
  const nextAnio = now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear();

  const [step, setStep] = useState(1);
  const [modalidad, setModalidad] = useState(null);
  const [duracion, setDuracion] = useState(null);
  const [diasSemana, setDiasSemana] = useState([]);
  const [tipoPorDia, setTipoPorDia] = useState({});
  const [nivel, setNivel] = useState(null);
  const [objetivos, setObjetivos] = useState([]);
  const [equipamiento, setEquipamiento] = useState([]);
  const [restricciones, setRestricciones] = useState('');
  const [mes, setMes] = useState(nextMes);
  const [anio, setAnio] = useState(nextAnio);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [tokensUsed, setTokensUsed] = useState(null);

  const TOTAL_STEPS = 9;
  const STEP_LABELS = ['Modalidad','Duración','Días','Tipo/Día','Nivel','Objetivos','Equip.','Mes','Confirmar'];

  const reset = () => {
    setStep(1); setModalidad(null); setDuracion(null); setDiasSemana([]); setTipoPorDia({});
    setNivel(null); setObjetivos([]); setEquipamiento([]); setRestricciones('');
    setMes(nextMes); setAnio(nextAnio); setLoading(false); setPreview(null); setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const toggleDia = (dia) => {
    setDiasSemana(prev => {
      if (prev.includes(dia)) {
        setTipoPorDia(t => { const n = {...t}; delete n[dia]; return n; });
        return prev.filter(d => d !== dia);
      }
      return [...prev, dia].sort((a, b) => DIAS_SEMANA_LIST.indexOf(a) - DIAS_SEMANA_LIST.indexOf(b));
    });
  };

  const toggleObjetivo = (obj) => {
    setObjetivos(prev => prev.includes(obj) ? prev.filter(o => o !== obj) : prev.length < 3 ? [...prev, obj] : prev);
  };

  const toggleEquip = (eq) => {
    setEquipamiento(prev => prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]);
  };

  const changeMes = (dir) => {
    setMes(m => {
      let nm = m + dir;
      if (nm < 1) { nm = 12; setAnio(a => a - 1); }
      else if (nm > 12) { nm = 1; setAnio(a => a + 1); }
      return nm;
    });
  };

  const canNext = () => {
    if (step === 1) return !!modalidad;
    if (step === 2) return !!duracion;
    if (step === 3) return diasSemana.length >= 2;
    if (step === 4) return diasSemana.length > 0 && diasSemana.every(d => tipoPorDia[d]);
    if (step === 5) return !!nivel;
    if (step === 6) return objetivos.length >= 1;
    if (step === 7) return equipamiento.length >= 1;
    return true;
  };

  const generateProgram = async () => {
    setLoading(true); setError(''); setPreview(null);
    try {
      const cfg = { modalidad, duracion, diasSemana, tipoPorDia, nivel, objetivos, equipamiento, restricciones };
      const { data, error: fnErr } = await supabase.functions.invoke('hyper-api', {
        body: { mes, anio, config: cfg },
      });
      if (fnErr) {
        let detail = fnErr.message;
        try { if (fnErr.context?.json) { const ctx = await fnErr.context.json(); detail = ctx?.error || JSON.stringify(ctx); } } catch {}
        throw new Error(detail);
      }
      if (!data?.success) throw new Error(data?.error || 'La IA no pudo generar el programa');
      setPreview(data.program);
      setTokensUsed(data.meta?.tokensUsed ?? null);
    } catch (e) {
      setError(e.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCalendario = () => {
    if (!preview) return;
    onSave(preview, mes, anio, 'calendario');
    reset(); onClose();
  };

  const handleSavePlantilla = () => {
    if (!preview) return;
    const stripped = stripDatesFromProgram(preview, diasSemana);
    onSave(stripped, mes, anio, 'plantilla');
    reset(); onClose();
  };

  const totalDias = preview?.weeks?.reduce((a, w) => a + (w.days?.length ?? 0), 0) ?? 0;

  const renderStep = () => {
    if (step === 1) return (
      <View>
        <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text, marginBottom: 16 }}>¿Cómo vais a entrenar?</Text>
        <OptionCard t={t} selected={modalidad==='equipos'} onPress={()=>setModalidad('equipos')} icon="👥" label="EQUIPOS" desc="3-4 personas" />
        <OptionCard t={t} selected={modalidad==='parejas'} onPress={()=>setModalidad('parejas')} icon="👫" label="PAREJAS" desc="2 personas" />
        <OptionCard t={t} selected={modalidad==='individual'} onPress={()=>setModalidad('individual')} icon="👤" label="INDIVIDUAL" desc="1 persona" />
      </View>
    );

    if (step === 2) return (
      <View>
        <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text, marginBottom: 16 }}>¿Cuánto tiempo por sesión?</Text>
        <OptionCard t={t} selected={duracion==='1h'} onPress={()=>setDuracion('1h')} icon="⏱️" label="1 HORA" desc="Calentamiento + Fuerza + WOD corto" />
        <OptionCard t={t} selected={duracion==='1.5h'} onPress={()=>setDuracion('1.5h')} icon="⏰" label="1.5 HORAS" desc="Calentamiento + Fuerza + WOD + Bloque técnico" />
        <OptionCard t={t} selected={duracion==='2h'} onPress={()=>setDuracion('2h')} icon="🕑" label="2 HORAS" desc="Sesión completa + WOD largo + Técnico + Movilidad" />
      </View>
    );

    if (step === 3) return (
      <View>
        <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text, marginBottom: 6 }}>¿Qué días entrenáis?</Text>
        <Text style={{ fontSize: t.fs(11), color: t.text3, marginBottom: 16 }}>Selecciona mínimo 2 días</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {DIAS_SEMANA_LIST.map(dia => {
            const sel = diasSemana.includes(dia);
            return (
              <TouchableOpacity key={dia} onPress={() => toggleDia(dia)}
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 2,
                  borderColor: sel ? '#9b5de5' : t.border, backgroundColor: sel ? '#9b5de520' : t.card }}>
                <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: sel ? '#9b5de5' : t.text2 }}>{dia.slice(0,3).toUpperCase()}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {diasSemana.length > 0 && (
          <View style={{ backgroundColor: '#9b5de510', borderRadius: 8, padding: 10 }}>
            <Text style={{ fontSize: t.fs(11), color: '#9b5de5', fontWeight: '700' }}>{diasSemana.length} días: {diasSemana.join(', ')}</Text>
          </View>
        )}
      </View>
    );

    if (step === 4) return (
      <View>
        <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text, marginBottom: 16 }}>Tipo de entrenamiento por día</Text>
        {diasSemana.map(dia => (
          <View key={dia} style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: t.fs(11), color: t.accent, fontWeight: '900', letterSpacing: 2, marginBottom: 8 }}>{dia.toUpperCase()}</Text>
            {TIPOS_DIA_OPTS.map(opt => {
              const sel = tipoPorDia[dia] === opt.key;
              return (
                <TouchableOpacity key={opt.key} onPress={() => setTipoPorDia(prev => ({...prev, [dia]: opt.key}))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, marginBottom: 6,
                    borderWidth: 2, borderColor: sel ? opt.color : t.border, backgroundColor: sel ? opt.color+'20' : t.card }}>
                  <Text style={{ fontSize: 18 }}>{opt.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: t.fs(12), fontWeight: '900', color: sel ? opt.color : t.text }}>{opt.label}</Text>
                    <Text style={{ fontSize: t.fs(10), color: t.text3, marginTop: 1 }}>{opt.desc}</Text>
                  </View>
                  {sel && <Text style={{ color: opt.color, fontSize: 16, fontWeight: '900' }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );

    if (step === 5) return (
      <View>
        <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text, marginBottom: 16 }}>¿Cuál es vuestro nivel?</Text>
        <OptionCard t={t} selected={nivel==='principiante'} onPress={()=>setNivel('principiante')} icon="🌱" label="PRINCIPIANTE" desc="< 1 año · Movimientos básicos" />
        <OptionCard t={t} selected={nivel==='intermedio'} onPress={()=>setNivel('intermedio')} icon="⚡" label="INTERMEDIO" desc="1-3 años · Dominan RX básico" />
        <OptionCard t={t} selected={nivel==='avanzado'} onPress={()=>setNivel('avanzado')} icon="🔥" label="AVANZADO" desc="3+ años · Fran < 8 min · HSPU · C2B" />
        <OptionCard t={t} selected={nivel==='competidor'} onPress={()=>setNivel('competidor')} icon="🏆" label="COMPETIDOR" desc="Fran < 5 min · BMU · RMU · HSW" />
      </View>
    );

    if (step === 6) return (
      <View>
        <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text, marginBottom: 6 }}>¿Qué queréis mejorar?</Text>
        <Text style={{ fontSize: t.fs(11), color: t.text3, marginBottom: 16 }}>Selecciona hasta 3 objetivos</Text>
        {OBJETIVOS_LIST.map(obj => {
          const sel = objetivos.includes(obj);
          const disabled = !sel && objetivos.length >= 3;
          return (
            <TouchableOpacity key={obj} onPress={() => !disabled && toggleObjetivo(obj)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, marginBottom: 8,
                borderWidth: 2, borderColor: sel ? '#52b788' : t.border,
                backgroundColor: sel ? '#52b78820' : t.card, opacity: disabled ? 0.4 : 1 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                borderColor: sel ? '#52b788' : t.border, backgroundColor: sel ? '#52b788' : 'transparent',
                alignItems: 'center', justifyContent: 'center' }}>
                {sel && <Text style={{ color:'#fff', fontSize:11, fontWeight:'900' }}>✓</Text>}
              </View>
              <Text style={{ flex: 1, fontSize: t.fs(12), fontWeight: '700', color: sel ? '#52b788' : t.text2 }}>{obj}</Text>
            </TouchableOpacity>
          );
        })}
        <Text style={{ fontSize: t.fs(10), color: t.text3, textAlign: 'center', marginTop: 4 }}>{objetivos.length}/3</Text>
      </View>
    );

    if (step === 7) return (
      <View>
        <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text, marginBottom: 16 }}>¿Qué equipamiento tenéis?</Text>
        {EQUIPAMIENTO_LIST.map(eq => {
          const sel = equipamiento.includes(eq);
          return (
            <TouchableOpacity key={eq} onPress={() => toggleEquip(eq)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, marginBottom: 8,
                borderWidth: 2, borderColor: sel ? '#4895ef' : t.border, backgroundColor: sel ? '#4895ef20' : t.card }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                borderColor: sel ? '#4895ef' : t.border, backgroundColor: sel ? '#4895ef' : 'transparent',
                alignItems: 'center', justifyContent: 'center' }}>
                {sel && <Text style={{ color:'#fff', fontSize:11, fontWeight:'900' }}>✓</Text>}
              </View>
              <Text style={{ flex: 1, fontSize: t.fs(12), fontWeight: '700', color: sel ? '#4895ef' : t.text2 }}>{eq}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );

    if (step === 8) return (
      <View>
        <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text, marginBottom: 20 }}>Últimos detalles</Text>
        <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>LESIONES / LIMITACIONES</Text>
        <TextInput value={restricciones} onChangeText={setRestricciones}
          placeholder="Ej: rodilla derecha, no burpees, evitar overhead..." placeholderTextColor={t.text3}
          multiline style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10,
            color: t.text, fontSize: t.fs(13), padding: 12, minHeight: 80, textAlignVertical: 'top', marginBottom: 24 }} />
        <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 12 }}>MES A GENERAR</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: t.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#9b5de540' }}>
          <TouchableOpacity onPress={() => changeMes(-1)}
            style={{ backgroundColor: t.bg4, borderRadius: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: t.fs(18), color: t.text2 }}>◀</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: t.fs(24), fontWeight: '900', color: t.text }}>{MESES_LARGOS[mes - 1]}</Text>
            <Text style={{ fontSize: t.fs(14), color: t.text3, fontWeight: '700' }}>{anio}</Text>
          </View>
          <TouchableOpacity onPress={() => changeMes(1)}
            style={{ backgroundColor: t.bg4, borderRadius: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: t.fs(18), color: t.text2 }}>▶</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

    if (step === 9) {
      const tipoLabels = { endurance:'ENDURANCE', endurance_pesado:'END. PESADO', crossfit_general:'CF GENERAL', crossfit_largo:'CF LARGO' };
      const resumen = [
        { label: 'MODALIDAD', value: modalidad?.toUpperCase() },
        { label: 'DURACIÓN', value: duracion },
        { label: 'DÍAS', value: diasSemana.join(', ') },
        { label: 'MES', value: `${MESES_LARGOS[mes-1]} ${anio}` },
        { label: 'NIVEL', value: nivel?.toUpperCase() },
        { label: 'OBJETIVOS', value: objetivos.join(' · ') || '—' },
        { label: 'EQUIP.', value: `${equipamiento.length} elementos` },
        ...(restricciones ? [{ label: 'LIMITAC.', value: restricciones }] : []),
      ];
      return (
        <View>
          <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text, marginBottom: 16 }}>Confirma la configuración</Text>
          {resumen.map(item => (
            <View key={item.label} style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <Text style={{ fontSize: t.fs(9), color: t.text3, letterSpacing: 1, width: 80, paddingTop: 2 }}>{item.label}</Text>
              <Text style={{ flex: 1, fontSize: t.fs(12), color: t.text, fontWeight: '700' }}>{item.value}</Text>
            </View>
          ))}
          <View style={{ marginTop: 14, marginBottom: 4 }}>
            <Text style={{ fontSize: t.fs(9), color: t.text3, letterSpacing: 1, marginBottom: 8 }}>TIPO POR DÍA</Text>
            {diasSemana.map(dia => {
              const tipoOpt = TIPOS_DIA_OPTS.find(o => o.key === tipoPorDia[dia]);
              return (
                <View key={dia} style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
                  <Text style={{ fontSize: t.fs(11), color: t.text3, width: 80 }}>{dia}</Text>
                  <Text style={{ fontSize: t.fs(11), color: tipoOpt?.color || t.text, fontWeight: '700' }}>{tipoOpt?.label || '—'}</Text>
                </View>
              );
            })}
          </View>
          {!!error && (
            <View style={{ backgroundColor: '#e6394420', borderRadius: 10, padding: 12, marginTop: 14 }}>
              <Text style={{ fontSize: t.fs(12), color: '#e63946', fontWeight: '700', marginBottom: 4 }}>❌ Error</Text>
              <Text style={{ fontSize: t.fs(11), color: '#e63946' }}>{error}</Text>
            </View>
          )}
          {!!preview && (
            <View style={{ backgroundColor: '#52b78815', borderRadius: 12, padding: 14, marginTop: 14, borderWidth: 1, borderColor: '#52b78840' }}>
              <Text style={{ fontSize: t.fs(13), fontWeight: '900', color: '#52b788', marginBottom: 10 }}>✅ Programación generada</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#52b78820', borderRadius: 8, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: t.fs(20), fontWeight: '900', color: '#52b788' }}>{preview.weeks?.length ?? 0}</Text>
                  <Text style={{ fontSize: t.fs(9), color: '#52b78888', letterSpacing: 1 }}>SEMANAS</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#52b78820', borderRadius: 8, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: t.fs(20), fontWeight: '900', color: '#52b788' }}>{totalDias}</Text>
                  <Text style={{ fontSize: t.fs(9), color: '#52b78888', letterSpacing: 1 }}>DÍAS</Text>
                </View>
                {!!tokensUsed && (
                  <View style={{ flex: 1, backgroundColor: '#9b5de520', borderRadius: 8, padding: 10, alignItems: 'center' }}>
                    <Text style={{ fontSize: t.fs(14), fontWeight: '900', color: '#9b5de5' }}>{(tokensUsed/1000).toFixed(1)}k</Text>
                    <Text style={{ fontSize: t.fs(9), color: '#9b5de588', letterSpacing: 1 }}>TOKENS</Text>
                  </View>
                )}
              </View>
              {preview.weeks?.map((w, i) => (
                <View key={i} style={{ backgroundColor: t.card, borderRadius: 8, padding: 10, marginBottom: 6 }}>
                  <Text style={{ fontSize: t.fs(11), fontWeight: '900', color: t.text, marginBottom: 4 }}>S{w.number} · {w.dates} — {w.focus}</Text>
                  {w.days?.map((d, j) => (
                    <View key={j} style={{ flexDirection: 'row', gap: 8, marginBottom: 2, alignItems: 'center' }}>
                      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#9b5de5' }} />
                      <Text style={{ fontSize: t.fs(10), color: t.text2 }}>{d.day} — <Text style={{ fontWeight: '700' }}>{d.label}</Text> <Text style={{ color: t.text3 }}>({d.type})</Text></Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
      );
    }
    return null;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        {/* HEADER */}
        <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: '#9b5de5', padding: 16, paddingTop: 56 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <View>
              <Text style={{ fontSize: t.fs(9), color: '#9b5de5', letterSpacing: 3, fontWeight: '700' }}>INTELIGENCIA ARTIFICIAL</Text>
              <Text style={{ fontSize: t.fs(18), fontWeight: '900', color: t.text }}>🤖 PROGRAMACIÓN IA</Text>
            </View>
            <TouchableOpacity onPress={handleClose}
              style={{ backgroundColor: t.bg4, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: t.border }}>
              <Text style={{ fontSize: t.fs(12), color: t.text2, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>
          {/* PROGRESS BAR */}
          <View style={{ flexDirection: 'row', gap: 3, marginBottom: 6 }}>
            {STEP_LABELS.map((_, i) => (
              <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i + 1 <= step ? '#9b5de5' : t.border }} />
            ))}
          </View>
          <Text style={{ fontSize: t.fs(9), color: '#9b5de5', fontWeight: '700' }}>PASO {step}/{TOTAL_STEPS} — {STEP_LABELS[step-1]?.toUpperCase()}</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {renderStep()}
        </ScrollView>

        {/* FOOTER */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: t.bg,
          borderTopWidth: 1, borderTopColor: t.border, padding: 16, paddingBottom: 32, flexDirection: 'row', gap: 10 }}>
          {step > 1 && !loading && !preview && (
            <TouchableOpacity onPress={() => setStep(s => s - 1)}
              style={{ flex: 1, backgroundColor: t.bg4, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: t.border }}>
              <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text2 }}>◀ ATRÁS</Text>
            </TouchableOpacity>
          )}
          {step < 9 && (
            <TouchableOpacity onPress={() => setStep(s => s + 1)} disabled={!canNext()}
              style={{ flex: 2, backgroundColor: canNext() ? '#9b5de5' : t.border, borderRadius: 12, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: t.fs(13), fontWeight: '900', color: '#fff' }}>SIGUIENTE ▶</Text>
            </TouchableOpacity>
          )}
          {step === 9 && !preview && (
            <TouchableOpacity onPress={generateProgram} disabled={loading}
              style={{ flex: 2, backgroundColor: loading ? '#9b5de540' : '#9b5de5', borderRadius: 12, padding: 14,
                alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontSize: 16 }}>🤖</Text>}
              <Text style={{ fontSize: t.fs(13), fontWeight: '900', color: '#fff' }}>{loading ? 'GENERANDO... (60s)' : 'GENERAR'}</Text>
            </TouchableOpacity>
          )}
          {!!preview && (
            <View style={{ flex: 2, gap: 8 }}>
              <TouchableOpacity onPress={handleSaveCalendario}
                style={{ backgroundColor: '#52b788', borderRadius: 12, padding: 14,
                  alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16 }}>📅</Text>
                <Text style={{ fontSize: t.fs(13), fontWeight: '900', color: '#fff' }}>AÑADIR AL CALENDARIO</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSavePlantilla}
                style={{ backgroundColor: '#9b5de5', borderRadius: 12, padding: 14,
                  alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16 }}>📋</Text>
                <Text style={{ fontSize: t.fs(13), fontWeight: '900', color: '#fff' }}>GUARDAR COMO PROGRAMA</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── ADMIN SCREEN ─────────────────────────────────────────────────────────────

export default function AdminScreen({ onClose }) {
  const t = useTheme();
  const { programs, addProgram, deleteProgram } = useProgram();
  const [authenticated, setAuthenticated] = useState(false);
  const [showAddJson, setShowAddJson] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showBoxes, setShowBoxes] = useState(false);
  const [showIAProgram, setShowIAProgram] = useState(false);
  const [rescheduleProgram, setRescheduleProgram] = useState(null);
  const [publishing, setPublishing] = useState(null);

  const statusColor = { activo: '#52b788', futuro: '#4895ef', completado: '#555' };
  const statusLabel = { activo: '🟢 ACTIVO', futuro: '🔵 FUTURO', completado: '⚫ HISTORIAL' };

  const handleAdd = async (plan) => {
    const result = await addProgram(plan);
    if (!result.success) Alert.alert('Error', result.error);
    else Alert.alert('✅ Éxito', 'Programa añadido correctamente');
  };

  const handleDelete = (program) => {
    if (program._meta?.status === 'activo') return Alert.alert('No permitido', 'No puedes eliminar el programa activo.');
    Alert.alert('Eliminar programa', `¿Seguro que quieres eliminar "${program._meta?.title || 'este programa'}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        const result = await deleteProgram(program.id);
        if (!result.success) Alert.alert('Error', result.error);
      }}
    ]);
  };

  const handlePublish = async (program) => {
    setPublishing(program.id);
    try {
      const { error } = await supabase.from('programas').upsert({
        id: program.id,
        name: program._meta?.title || program.name || 'Programa',
        data: program,
        start_date: program._meta?.start?.toISOString(),
        end_date: program._meta?.end?.toISOString(),
        status: program._meta?.status,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      Alert.alert('✅ Publicado', 'Programa publicado en Supabase correctamente');
    } catch (e) {
      Alert.alert('Error', `No se pudo publicar: ${e.message}`);
    } finally {
      setPublishing(null);
    }
  };

  const handleIASave = async (plan, mes, anio, modo) => {
    const nombre = `IA · ${MESES_LARGOS[mes - 1]} ${anio}`;
    if (modo === 'plantilla') {
      // plan ya viene con fechas borradas (stripDatesFromProgram aplicado en el modal)
      const result = await addProgram({ ...plan, name: nombre, _generatedBy: 'ia' });
      if (!result.success) Alert.alert('Error', result.error);
      else Alert.alert('✅ Plantilla guardada', `"${nombre}" guardada. Ábrela desde TODOS LOS PROGRAMAS y usa 📋 COPIAR para programar las fechas.`);
    } else {
      // calendario: guardar con fechas reales tal como generó la IA
      const result = await addProgram({ ...plan, name: nombre, _generatedBy: 'ia' });
      if (!result.success) Alert.alert('Error', result.error);
      else Alert.alert('✅ Añadido al calendario', `Programación de ${MESES_LARGOS[mes - 1]} ${anio} añadida correctamente.`);
    }
  };

  if (!authenticated) return <PinScreen onSuccess={() => setAuthenticated(true)} />;
  if (showBuilder) return <ProgramBuilderScreen onClose={() => setShowBuilder(false)} />;
  if (showAssign) return <AssignProgramScreen onClose={() => setShowAssign(false)} />;
  if (showUsers) return <UserManagementScreen onClose={() => setShowUsers(false)} />;
  if (showBoxes) return <BoxManagementScreen onClose={() => setShowBoxes(false)} />;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <AddJsonModal visible={showAddJson} onClose={() => setShowAddJson(false)} onSave={handleAdd} />
      <RescheduleModal visible={!!rescheduleProgram} program={rescheduleProgram}
        onClose={() => setRescheduleProgram(null)}
        onSave={async (p) => { await handleAdd(p); setRescheduleProgram(null); }} />
      <IAProgramModal visible={showIAProgram} onClose={() => setShowIAProgram(false)} onSave={handleIASave} />

      <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 16, paddingTop: 56 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: t.fs(9), color: t.accent + '88', letterSpacing: 4, fontWeight: '700' }}>PANEL DE ADMINISTRACIÓN</Text>
            <Text style={{ fontSize: t.fs(26), fontWeight: '900', color: t.text, letterSpacing: 2, marginTop: 2 }}>ADMIN</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ backgroundColor: t.bg4, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: t.fs(12), color: t.text2, fontWeight: '700' }}>✕ CERRAR</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>

        {/* AÑADIR PROGRAMA */}
        <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 10 }}>AÑADIR PROGRAMA</Text>

        {/* BOTÓN IA — destacado */}
        <TouchableOpacity onPress={() => setShowIAProgram(true)}
          style={{ backgroundColor: '#9b5de5', borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 26 }}>🤖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: t.fs(14), fontWeight: '900', color: '#fff', letterSpacing: 1 }}>PROGRAMACIÓN IA</Text>
            <Text style={{ fontSize: t.fs(10), color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              Claude genera 4 semanas completas automáticamente
            </Text>
          </View>
          <Text style={{ fontSize: t.fs(20), color: 'rgba(255,255,255,0.8)' }}>▶</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          <TouchableOpacity onPress={() => setShowAddJson(true)}
            style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 24 }}>📂</Text>
            <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: t.text, textAlign: 'center' }}>SUBIR JSON</Text>
            <Text style={{ fontSize: t.fs(9), color: t.text3, textAlign: 'center' }}>Sube un archivo JSON de programa</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowBuilder(true)}
            style={{ flex: 1, backgroundColor: '#52b78815', borderWidth: 1, borderColor: '#52b78840', borderRadius: 12, padding: 14, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 24 }}>🗓️</Text>
            <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: '#52b788', textAlign: 'center' }}>CREAR MANUAL</Text>
            <Text style={{ fontSize: t.fs(9), color: '#52b78888', textAlign: 'center' }}>Calendario día a día</Text>
          </TouchableOpacity>
        </View>

        {/* GESTIÓN */}
        <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 10 }}>GESTIÓN</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          <TouchableOpacity onPress={() => setShowUsers(true)}
            style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 24 }}>👥</Text>
            <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: t.text, textAlign: 'center' }}>USUARIOS</Text>
            <Text style={{ fontSize: t.fs(9), color: t.text3, textAlign: 'center' }}>Roles y programas</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowBoxes(true)}
            style={{ flex: 1, backgroundColor: '#52b78815', borderWidth: 1, borderColor: '#52b78840', borderRadius: 12, padding: 14, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 24 }}>🏋️</Text>
            <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: '#52b788', textAlign: 'center' }}>BOXES</Text>
            <Text style={{ fontSize: t.fs(9), color: '#52b78888', textAlign: 'center' }}>Gimnasios y equipos</Text>
          </TouchableOpacity>
        </View>

        {/* ASIGNAR */}
        <TouchableOpacity onPress={() => setShowAssign(true)}
          style={{ backgroundColor: '#4895ef15', borderWidth: 1, borderColor: '#4895ef40', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 20, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <Text style={{ fontSize: 20 }}>👤</Text>
          <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: '#4895ef' }}>ASIGNAR PROGRAMA A USUARIO</Text>
        </TouchableOpacity>

        {/* PROGRAMAS */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700' }}>
            TODOS LOS PROGRAMAS ({programs.length})
          </Text>
          {!programs.some(p => p.name?.toLowerCase().includes('mayo')) && (
            <TouchableOpacity
              onPress={() => handleAdd({ ...mayo2026, id: undefined })}
              style={{ backgroundColor: '#06d6a020', borderWidth: 1, borderColor: '#06d6a060', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontSize: t.fs(10), color: '#06d6a0', fontWeight: '700' }}>+ IMPORTAR MAYO 2026</Text>
            </TouchableOpacity>
          )}
        </View>
        {programs.map((program) => {
          const isTemplate = !!program._isTemplate;
          const isActive = program._meta?.status === 'activo';
          const color = isTemplate ? '#9b5de5' : (statusColor[program._meta?.status] || '#555');
          const isPublishing = publishing === program.id;
          return (
            <View key={program.id} style={{ backgroundColor: t.card, borderWidth: 2, borderColor: isTemplate ? '#9b5de540' : isActive ? t.accent + '60' : t.border, borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: t.fs(9), color, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>
                  {isTemplate ? '🤖 PLANTILLA IA' : (statusLabel[program._meta?.status] || '⚫ DESCONOCIDO')}
                </Text>
                <Text style={{ fontSize: t.fs(15), fontWeight: '900', color: t.text }}>{program._meta?.title}</Text>
                <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 2 }}>{program._meta?.range}</Text>
                <Text style={{ fontSize: t.fs(10), color: t.text3, marginTop: 2 }}>
                  {program.weeks?.length} semanas · {program.weeks?.reduce((a, w) => a + w.days.filter(d => d.type !== 'Libre').length, 0)} días
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <TouchableOpacity onPress={() => setRescheduleProgram(program)}
                  style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 }}>
                  <Text style={{ fontSize: t.fs(10), color: t.text2, fontWeight: '700' }}>📋 COPIAR</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handlePublish(program)} disabled={isPublishing}
                  style={{ backgroundColor: '#4895ef20', borderWidth: 1, borderColor: '#4895ef40', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {isPublishing ? <ActivityIndicator size="small" color="#4895ef" /> : <Text style={{ fontSize: t.fs(10), color: '#4895ef', fontWeight: '700' }}>☁️ PUBLICAR</Text>}
                </TouchableOpacity>
                {!isActive && (
                  <TouchableOpacity onPress={() => handleDelete(program)}
                    style={{ backgroundColor: '#e6394415', borderWidth: 1, borderColor: '#e6394430', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 }}>
                    <Text style={{ fontSize: t.fs(10), color: '#e63946', fontWeight: '700' }}>🗑 ELIMINAR</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}