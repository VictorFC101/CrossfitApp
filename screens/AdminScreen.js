import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../ThemeContext';
import { useProgram } from '../ProgramContext';
import { parseDateFromDay } from '../dateUtils';
import { supabase } from '../supabase';
import ProgramBuilderScreen from './ProgramBuilderScreen';
import AssignProgramScreen from './AssignProgramScreen';

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

function AddJsonModal({ visible, onClose, onSave }) {
  const t = useTheme();
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const validate = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.weeks || !Array.isArray(parsed.weeks)) throw new Error('Falta el campo "weeks"');
      if (parsed.weeks.length === 0) throw new Error('"weeks" no puede estar vacío');
      for (const w of parsed.weeks) {
        if (!w.days || !Array.isArray(w.days)) throw new Error('Cada semana necesita un array "days"');
      }
      setPreview(parsed); setError('');
    } catch (e) { setError(e.message); setPreview(null); }
  };

  const handleSave = () => {
    if (!preview) return;
    onSave(preview);
    setJsonText(''); setPreview(null); onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 16, paddingTop: 56 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: t.fs(18), fontWeight: '900', color: t.text }}>PEGAR JSON</Text>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: t.bg4, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: t.border }}>
              <Text style={{ fontSize: t.fs(12), color: t.text2, fontWeight: '700' }}>✕ CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 14 }}>
          <TextInput value={jsonText} onChangeText={v => { setJsonText(v); setError(''); setPreview(null); }}
            placeholder='{ "weeks": [...] }' placeholderTextColor={t.text3} multiline numberOfLines={12}
            style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, color: t.text, fontSize: t.fs(11), padding: 12, textAlignVertical: 'top', minHeight: 200, marginBottom: 12 }} />
          {error ? <View style={{ backgroundColor: '#e6394420', borderRadius: 8, padding: 12, marginBottom: 12 }}><Text style={{ color: '#e63946', fontSize: t.fs(12) }}>❌ {error}</Text></View> : null}
          {preview ? <View style={{ backgroundColor: '#52b78820', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <Text style={{ color: '#52b788', fontSize: t.fs(12), fontWeight: '700', marginBottom: 4 }}>✅ JSON válido</Text>
            <Text style={{ color: '#52b788', fontSize: t.fs(11) }}>{preview.weeks.length} semanas · {preview.weeks.reduce((a, w) => a + w.days.length, 0)} días</Text>
          </View> : null}
          <TouchableOpacity onPress={validate} style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text2 }}>🔍 VALIDAR JSON</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} disabled={!preview} style={{ backgroundColor: preview ? t.accent : t.border, borderRadius: 10, padding: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: t.fs(13), fontWeight: '900', color: '#fff' }}>💾 GUARDAR PROGRAMA</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── RESCHEDULE ───────────────────────────────────────────────────────────────

function RescheduleModal({ visible, program, onClose, onSave }) {
  const t = useTheme();
  const [newStartDate, setNewStartDate] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  const handlePreview = () => {
    if (!newStartDate.match(/^\d{4}-\d{2}-\d{2}$/)) return setError('Formato: YYYY-MM-DD (ej: 2026-05-04)');
    try {
      const rescheduled = reschedulePlan(program, newStartDate);
      if (!rescheduled) throw new Error('No se pudieron calcular las fechas');
      setPreview(rescheduled); setError('');
    } catch (e) { setError(e.message); }
  };

  const handleSave = () => {
    if (!preview) return;
    onSave({ ...preview, id: Date.now().toString(), name: `${preview.name || 'Programa'} (copia)` });
    setNewStartDate(''); setPreview(null); onClose();
  };

  if (!program) return null;
  const allDays = program.weeks.flatMap(w => w.days);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 16, paddingTop: 56 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: t.fs(18), fontWeight: '900', color: t.text }}>📋 COPIAR PROGRAMA</Text>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: t.bg4, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: t.border }}>
              <Text style={{ fontSize: t.fs(12), color: t.text2, fontWeight: '700' }}>✕ CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 14 }}>
          <View style={{ backgroundColor: t.card, borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, marginBottom: 4 }}>PROGRAMA ORIGINAL</Text>
            <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text }}>{program.name || program._meta?.title || 'Programa'}</Text>
            <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 4 }}>Inicio: {allDays[0]?.day} · {program.weeks.length} semanas</Text>
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
                              <View style={{ backgroundColor: color + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                                <Text style={{ fontSize: t.fs(9), color, fontWeight: '700' }}>{asig.status.toUpperCase()}</Text>
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
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          <TouchableOpacity onPress={() => setShowAddJson(true)}
            style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 24 }}>📋</Text>
            <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: t.text, textAlign: 'center' }}>PEGAR JSON</Text>
            <Text style={{ fontSize: t.fs(9), color: t.text3, textAlign: 'center' }}>Pega un JSON ya preparado</Text>
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
        <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 10 }}>
          TODOS LOS PROGRAMAS ({programs.length})
        </Text>
        {programs.map((program) => {
          const isActive = program._meta?.status === 'activo';
          const color = statusColor[program._meta?.status] || '#555';
          const isPublishing = publishing === program.id;
          return (
            <View key={program.id} style={{ backgroundColor: t.card, borderWidth: 2, borderColor: isActive ? t.accent + '60' : t.border, borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: t.fs(9), color, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>
                  {statusLabel[program._meta?.status] || '⚫ DESCONOCIDO'}
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