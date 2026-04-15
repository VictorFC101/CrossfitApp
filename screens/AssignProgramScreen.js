import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';
import { supabase } from '../supabase';
import { useProgram } from '../ProgramContext';
import { parseDateFromDay } from '../dateUtils';

const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function getProgramRange(program) {
  const allDays = program.weeks?.flatMap(w => w.days) || [];
  const dates = allDays.map(d => parseDateFromDay(d.day)).filter(Boolean);
  if (!dates.length) return '';
  const min = new Date(Math.min(...dates.map(d => d.getTime())));
  const max = new Date(Math.max(...dates.map(d => d.getTime())));
  return `${min.getDate()} ${MESES_ES[min.getMonth()]} – ${max.getDate()} ${MESES_ES[max.getMonth()]} ${max.getFullYear()}`;
}

function UserCard({ user, selected, onPress, t }) {
  return (
    <TouchableOpacity onPress={onPress}
      style={{ backgroundColor: selected ? t.accent + '15' : t.card, borderWidth: 2, borderColor: selected ? t.accent : t.border, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.accent + '20', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: t.fs(14), fontWeight: '900', color: t.accent }}>
          {user.nombre ? user.nombre.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() : '??'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: t.fs(14), fontWeight: '700', color: t.text }}>{user.nombre || 'Sin nombre'}</Text>
        <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 2 }}>{user.email || user.id.substring(0, 8) + '...'}</Text>
      </View>
      {selected && (
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: t.fs(12) }}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function AssignProgramScreen({ onClose }) {
  const t = useTheme();
  const { programs } = useProgram();
  const [step, setStep] = useState(0); // 0=programa, 1=usuarios, 2=fecha, 3=confirmar
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignMode, setAssignMode] = useState('individual'); // individual | grupo

  const publicPrograms = programs.filter(p => p._meta?.status !== null);

  useEffect(() => {
    if (step === 1) loadUsers();
  }, [step]);

  const loadUsers = async (query = '') => {
    setLoadingUsers(true);
    try {
      let q = supabase.from('usuarios_publicos').select('*');
      if (query.trim()) {
        q = q.or(`nombre.ilike.%${query}%,email.ilike.%${query}%`);
      }
      const { data, error } = await q.limit(50);
      if (error) throw error;
      setUsers(data || []);
    } catch (e) {
      Alert.alert('Error', `No se pudieron cargar los usuarios: ${e.message}`);
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleUser = (user) => {
    if (assignMode === 'individual') {
      setSelectedUsers([user]);
    } else {
      const exists = selectedUsers.find(u => u.id === user.id);
      if (exists) setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
      else setSelectedUsers(prev => [...prev, user]);
    }
  };

const handleAssign = async () => {
    if (!selectedProgram || !selectedUsers.length || !startDate.match(/^\d{4}-\d{2}-\d{2}$/)) return;
    setAssigning(true);

    try {
      const { data: { user: coach } } = await supabase.auth.getUser();

      // Calcular fecha fin del programa
      const numWeeks = selectedProgram.weeks?.length || 4;
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(endDateObj.getDate() + (numWeeks * 7) - 1);
      const endDate = endDateObj.toISOString().split('T')[0];

      // Verificar solapamiento para cada usuario
      const conflicts = [];
      for (const u of selectedUsers) {
        const { data: existing } = await supabase
          .from('asignaciones')
          .select('*, programas(name)')
          .eq('user_id', u.id)
          .neq('status', 'rechazado');

        if (existing?.length) {
          for (const asig of existing) {
            const asigStart = new Date(asig.start_date);
            const asigEnd = new Date(asig.start_date);
            const asigWeeks = asig.programas?.weeks?.length || 4;
            asigEnd.setDate(asigEnd.getDate() + (asigWeeks * 7) - 1);

            const newStart = new Date(startDate);
            const newEnd = endDateObj;

            if (newStart <= asigEnd && newEnd >= asigStart) {
              conflicts.push(`${u.nombre}: solapa con "${asig.programas?.name || 'programa existente'}" (${asig.start_date})`);
            }
          }
        }
      }

      if (conflicts.length > 0) {
        setAssigning(false);
        return Alert.alert(
          '⚠️ Conflicto de fechas',
          `No se puede asignar por solapamiento:\n\n${conflicts.join('\n')}`,
          [{ text: 'Entendido' }]
        );
      }

      // Sin conflictos — crear asignaciones
      const asignaciones = selectedUsers.map(u => ({
        programa_id: selectedProgram.id,
        user_id: u.id,
        coach_id: coach.id,
        start_date: startDate,
        status: 'pendiente',
      }));

      const { error: assignError } = await supabase.from('asignaciones').insert(asignaciones);
      if (assignError) throw assignError;

      // Notificaciones
      const notifs = selectedUsers.map(u => ({
        user_id: u.id,
        tipo: 'programa_asignado',
        titulo: '📋 Nuevo programa asignado',
        mensaje: `Tu coach te ha asignado "${selectedProgram._meta?.title || selectedProgram.name}" con inicio el ${startDate}`,
        data: {
          programa_id: selectedProgram.id,
          programa: selectedProgram,
          start_date: startDate,
          coach_nombre: coach.email,
        },
      }));
      await supabase.from('notificaciones').insert(notifs);

      // Push
      for (const u of selectedUsers) {
        if (u.push_token) {
          try {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: u.push_token,
                title: '📋 Nuevo programa',
                body: `Tu coach te ha asignado "${selectedProgram._meta?.title || selectedProgram.name}"`,
                data: { tipo: 'programa_asignado', programa_id: selectedProgram.id },
              }),
            });
          } catch (e) {}
        }
      }

      Alert.alert(
        '✅ Asignado',
        `Programa asignado a ${selectedUsers.length} usuario${selectedUsers.length > 1 ? 's' : ''} correctamente`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (e) {
      Alert.alert('Error', `No se pudo asignar: ${e.message}`);
    } finally {
      setAssigning(false);
    }
  };

  const STEPS = ['Programa', 'Usuarios', 'Fecha', 'Confirmar'];

  const canNext = () => {
    if (step === 0) return !!selectedProgram;
    if (step === 1) return selectedUsers.length > 0;
    if (step === 2) return startDate.match(/^\d{4}-\d{2}-\d{2}$/);
    return true;
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* HEADER */}
      <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 16, paddingTop: 56 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: t.fs(9), color: t.accent + '88', letterSpacing: 4, fontWeight: '700' }}>ASIGNAR PROGRAMA</Text>
            <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: t.text, marginTop: 2 }}>{STEPS[step].toUpperCase()}</Text>
          </View>
          <TouchableOpacity onPress={onClose}
            style={{ backgroundColor: t.bg4, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: t.fs(12), color: t.text2, fontWeight: '700' }}>✕ CERRAR</Text>
          </TouchableOpacity>
        </View>

        {/* STEP INDICATOR */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 }}>
          {STEPS.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: i === step ? t.accent : i < step ? t.accent + '60' : t.border }} />
            </View>
          ))}
        </View>
      </View>

      {/* STEP 0 — SELECCIONAR PROGRAMA */}
      {step === 0 && (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>
          <Text style={{ fontSize: t.fs(12), color: t.text3, marginBottom: 16 }}>
            Selecciona el programa que quieres asignar
          </Text>
          {publicPrograms.map(program => {
            const isSelected = selectedProgram?.id === program.id;
            const statusColors = { activo: '#52b788', futuro: '#4895ef', completado: '#888' };
            const color = statusColors[program._meta?.status] || t.text3;
            return (
              <TouchableOpacity key={program.id} onPress={() => setSelectedProgram(program)}
                style={{ backgroundColor: isSelected ? t.accent + '15' : t.card, borderWidth: 2, borderColor: isSelected ? t.accent : t.border, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: t.fs(9), color, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>
                      {program._meta?.status?.toUpperCase()}
                    </Text>
                    <Text style={{ fontSize: t.fs(15), fontWeight: '900', color: t.text }}>{program._meta?.title}</Text>
                    <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 2 }}>{getProgramRange(program)}</Text>
                    <Text style={{ fontSize: t.fs(10), color: t.text3, marginTop: 2 }}>
                      {program.weeks?.length} semanas · {program.weeks?.reduce((a, w) => a + (w.days?.filter(d => d.type !== 'Libre').length || 0), 0)} sesiones
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '900', fontSize: t.fs(14) }}>✓</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
          {publicPrograms.length === 0 && (
            <View style={{ backgroundColor: t.card, borderRadius: 12, padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: t.fs(24), marginBottom: 12 }}>📋</Text>
              <Text style={{ fontSize: t.fs(14), fontWeight: '700', color: t.text, marginBottom: 6 }}>Sin programas</Text>
              <Text style={{ fontSize: t.fs(12), color: t.text3, textAlign: 'center' }}>
                Primero crea y publica un programa desde el panel de Admin
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* STEP 1 — SELECCIONAR USUARIOS */}
      {step === 1 && (
        <View style={{ flex: 1 }}>
          <View style={{ padding: 14, paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {[{ key: 'individual', label: '👤 Individual' }, { key: 'grupo', label: '👥 Grupo' }].map(m => (
                <TouchableOpacity key={m.key} onPress={() => { setAssignMode(m.key); setSelectedUsers([]); }}
                  style={{ flex: 1, padding: 10, backgroundColor: assignMode === m.key ? t.accent + '20' : t.bg4, borderWidth: 2, borderColor: assignMode === m.key ? t.accent : t.border, borderRadius: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: t.fs(12), fontWeight: '700', color: assignMode === m.key ? t.accent : t.text2 }}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput value={search}
              onChangeText={v => { setSearch(v); loadUsers(v); }}
              placeholder="Buscar por nombre o email..."
              placeholderTextColor={t.text3}
              style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, color: t.text, fontSize: t.fs(14), padding: 12, marginBottom: 8 }} />
            {selectedUsers.length > 0 && (
              <Text style={{ fontSize: t.fs(11), color: t.accent, fontWeight: '700', marginBottom: 8 }}>
                {selectedUsers.length} usuario{selectedUsers.length > 1 ? 's' : ''} seleccionado{selectedUsers.length > 1 ? 's' : ''}
              </Text>
            )}
          </View>
          {loadingUsers ? (
            <ActivityIndicator color={t.accent} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView contentContainerStyle={{ padding: 14, paddingTop: 0, paddingBottom: 100 }}>
              {users.map(user => (
                <UserCard key={user.id} user={user}
                  selected={!!selectedUsers.find(u => u.id === user.id)}
                  onPress={() => toggleUser(user)} t={t} />
              ))}
              {users.length === 0 && (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Text style={{ fontSize: t.fs(13), color: t.text3 }}>No se encontraron usuarios</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* STEP 2 — FECHA DE INICIO */}
      {step === 2 && (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>
          <Text style={{ fontSize: t.fs(12), color: t.text3, marginBottom: 24 }}>
            Define la fecha de inicio del programa para {selectedUsers.length === 1 ? selectedUsers[0].nombre || 'este usuario' : `estos ${selectedUsers.length} usuarios`}
          </Text>

          <View style={{ backgroundColor: t.card, borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, marginBottom: 6 }}>PROGRAMA SELECCIONADO</Text>
            <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text }}>{selectedProgram?._meta?.title}</Text>
            <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 2 }}>{selectedProgram?.weeks?.length} semanas</Text>
          </View>

          <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>FECHA DE INICIO</Text>
          <TextInput value={startDate} onChangeText={setStartDate}
            placeholder="YYYY-MM-DD (ej: 2026-05-04)"
            placeholderTextColor={t.text3}
            style={{ backgroundColor: t.card, borderWidth: 1, borderColor: startDate.match(/^\d{4}-\d{2}-\d{2}$/) ? t.accent : t.border, borderRadius: 10, color: t.text, fontSize: t.fs(16), fontWeight: '700', padding: 14, marginBottom: 12 }} />

          {startDate.match(/^\d{4}-\d{2}-\d{2}$/) && selectedProgram && (
            <View style={{ backgroundColor: t.accent + '15', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: t.accent + '30' }}>
              <Text style={{ fontSize: t.fs(12), color: t.accent, fontWeight: '700', marginBottom: 4 }}>📅 Resumen</Text>
              <Text style={{ fontSize: t.fs(12), color: t.text2 }}>
                El programa empezará el {startDate} y durará {selectedProgram.weeks?.length} semanas
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* STEP 3 — CONFIRMAR */}
      {step === 3 && (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>
          <Text style={{ fontSize: t.fs(12), color: t.text3, marginBottom: 20 }}>
            Revisa los detalles antes de asignar
          </Text>

          <View style={{ backgroundColor: t.accent + '10', borderWidth: 1, borderColor: t.accent + '30', borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 10 }}>📋 PROGRAMA</Text>
            <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text }}>{selectedProgram?._meta?.title}</Text>
            <Text style={{ fontSize: t.fs(12), color: t.text3, marginTop: 4 }}>{selectedProgram?.weeks?.length} semanas · {selectedProgram?.weeks?.reduce((a, w) => a + (w.days?.filter(d => d.type !== 'Libre').length || 0), 0)} sesiones</Text>
          </View>

          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 10 }}>
              👤 USUARIOS ({selectedUsers.length})
            </Text>
            {selectedUsers.map((u, i) => (
              <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: i < selectedUsers.length - 1 ? 10 : 0, paddingBottom: i < selectedUsers.length - 1 ? 10 : 0, borderBottomWidth: i < selectedUsers.length - 1 ? 1 : 0, borderBottomColor: t.border }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.accent + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: t.accent }}>
                    {u.nombre ? u.nombre.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() : '??'}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text }}>{u.nombre || 'Sin nombre'}</Text>
                  <Text style={{ fontSize: t.fs(11), color: t.text3 }}>{u.email || u.id.substring(0, 12) + '...'}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 6 }}>📅 FECHA DE INICIO</Text>
            <Text style={{ fontSize: t.fs(18), fontWeight: '900', color: t.text }}>{startDate}</Text>
          </View>

          <View style={{ backgroundColor: '#4895ef15', borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#4895ef30' }}>
            <Text style={{ fontSize: t.fs(12), color: '#4895ef', lineHeight: t.fs(18) }}>
              ℹ️ Los usuarios recibirán una notificación y podrán aceptar o rechazar el programa desde la app.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* FOOTER */}
      <View style={{ flexDirection: 'row', gap: 10, padding: 14, backgroundColor: t.header, borderTopWidth: 1, borderTopColor: t.border, position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        {step > 0 && (
          <TouchableOpacity onPress={() => setStep(s => s - 1)}
            style={{ flex: 1, backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text2 }}>← ATRÁS</Text>
          </TouchableOpacity>
        )}
        {step < 3 ? (
          <TouchableOpacity onPress={() => canNext() && setStep(s => s + 1)} disabled={!canNext()}
            style={{ flex: 1, backgroundColor: canNext() ? t.accent : t.border, borderRadius: 10, padding: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: t.fs(13), fontWeight: '900', color: '#fff' }}>SIGUIENTE →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleAssign} disabled={assigning}
            style={{ flex: 1, backgroundColor: assigning ? t.border : '#52b788', borderRadius: 10, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            {assigning && <ActivityIndicator color="#fff" size="small" />}
            <Text style={{ fontSize: t.fs(13), fontWeight: '900', color: '#fff' }}>
              {assigning ? 'ASIGNANDO...' : '✅ CONFIRMAR ASIGNACIÓN'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}