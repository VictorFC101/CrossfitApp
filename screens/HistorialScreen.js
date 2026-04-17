import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, FlatList } from 'react-native';
import { useState } from 'react';
import { useApp } from '../AppContext';
import { useTheme } from '../ThemeContext';
import { useProgram } from '../ProgramContext';
import { useSocial } from '../SocialContext';
import { MOVEMENTS_DB, CATEGORIES, CATEGORY_COLORS } from '../movements_db';
import { RM_NAMES, TYPE_COLORS as SHARED_TYPE_COLORS } from '../constants';

const rmNames = RM_NAMES;

const WOD_TYPES = ['AMRAP', 'FOR TIME', 'EMOM', 'STRENGTH', 'LIBRE'];

function MovementPicker({ visible, onClose, onSelect }) {
  const t = useTheme();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('Todos');

  const filtered = MOVEMENTS_DB.filter(m => {
    const matchCat = cat === 'Todos' || m.category === cat;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 16, paddingTop: 56 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: t.fs(20), fontWeight: '900', color: t.text, letterSpacing: 1 }}>AÑADIR MOVIMIENTO</Text>
            <TouchableOpacity onPress={onClose}
              style={{ backgroundColor: t.bg4, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: t.border }}>
              <Text style={{ fontSize: t.fs(12), color: t.text2, fontWeight: '700' }}>✕ CERRAR</Text>
            </TouchableOpacity>
          </View>
          <TextInput value={search} onChangeText={setSearch}
            placeholder="Buscar movimiento..."
            placeholderTextColor={t.text3}
            style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 10, color: t.text, fontSize: t.fs(14), padding: 12, marginBottom: 10 }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {CATEGORIES.map(c => {
                const active = cat === c;
                const color = CATEGORY_COLORS[c] || t.accent;
                return (
                  <TouchableOpacity key={c} onPress={() => setCat(c)}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: active ? color + '25' : t.bg4, borderWidth: 1, borderColor: active ? color : t.border, borderRadius: 20 }}>
                    <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: active ? color : t.text3 }}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          renderItem={({ item }) => {
            const color = CATEGORY_COLORS[item.category] || t.accent;
            return (
              <TouchableOpacity onPress={() => { onSelect(item); onClose(); }}
                style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: t.fs(8), fontWeight: '700', color, textAlign: 'center', letterSpacing: 0.5 }}>{item.category.substring(0, 3).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: t.fs(14), fontWeight: '700', color: t.text }}>{item.name}</Text>
                  <Text style={{ fontSize: t.fs(10), color: t.text3, marginTop: 2 }}>{item.equipment} · {item.unit}</Text>
                </View>
                <View style={{ backgroundColor: color + '15', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: t.fs(9), color, fontWeight: '700' }}>{item.category}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

function WodCreator({ visible, onClose, onSave }) {
  const t = useTheme();
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('AMRAP');
  const [duracion, setDuracion] = useState('20');
  const [movimientos, setMovimientos] = useState([]);
  const [resultado, setResultado] = useState('');
  const [notas, setNotas] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);

  const addMovement = (mv) => {
    setMovimientos(prev => [...prev, { ...mv, reps: '', weight: '', note: '' }]);
  };

  const updateMovement = (idx, field, val) => {
    setMovimientos(prev => prev.map((m, i) => i === idx ? { ...m, [field]: val } : m));
  };

  const removeMovement = (idx) => {
    setMovimientos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!nombre.trim()) return;
    const wod = {
      id: Date.now().toString(),
      nombre,
      tipo,
      duracion,
      movimientos,
      resultado,
      notas,
      fecha: new Date().toISOString(),
      libre: true,
    };
    onSave(wod);
    setNombre(''); setTipo('AMRAP'); setDuracion('20');
    setMovimientos([]); setResultado(''); setNotas('');
    onClose();
  };

  const reset = () => {
    setNombre(''); setTipo('AMRAP'); setDuracion('20');
    setMovimientos([]); setResultado(''); setNotas('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <MovementPicker visible={showPicker} onClose={() => setShowPicker(false)} onSelect={addMovement} />
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 16, paddingTop: 56 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: t.text, letterSpacing: 1 }}>NUEVO WOD</Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }}
              style={{ backgroundColor: t.bg4, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: t.border }}>
              <Text style={{ fontSize: t.fs(12), color: t.text2, fontWeight: '700' }}>✕ CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 80 }}>

          {/* NOMBRE */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>NOMBRE DEL WOD</Text>
            <TextInput value={nombre} onChangeText={setNombre}
              placeholder="Ej: Murph, Cindy, WOD martes..."
              placeholderTextColor={t.text3}
              style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.accent + '40', borderRadius: 10, color: t.text, fontSize: t.fs(16), fontWeight: '700', padding: 14 }} />
          </View>

          {/* TIPO */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>TIPO DE WOD</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {WOD_TYPES.map(tp => (
                <TouchableOpacity key={tp} onPress={() => setTipo(tp)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: tipo === tp ? t.accent + '20' : t.card, borderWidth: 1, borderColor: tipo === tp ? t.accent : t.border, borderRadius: 8 }}>
                  <Text style={{ fontSize: t.fs(12), fontWeight: '700', color: tipo === tp ? t.accent : t.text2 }}>{tp}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* DURACIÓN */}
          {tipo !== 'STRENGTH' && tipo !== 'LIBRE' && (
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>DURACIÓN (MIN)</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {['10', '15', '20', '25', '30'].map(d => (
                  <TouchableOpacity key={d} onPress={() => setDuracion(d)}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: duracion === d ? t.accent + '20' : t.card, borderWidth: 1, borderColor: duracion === d ? t.accent : t.border, borderRadius: 8 }}>
                    <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: duracion === d ? t.accent : t.text2 }}>{d} min</Text>
                  </TouchableOpacity>
                ))}
                <TextInput value={duracion} onChangeText={setDuracion} keyboardType="numeric"
                  placeholder="Custom"
                  placeholderTextColor={t.text3}
                  style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 8, color: t.text, fontSize: t.fs(13), fontWeight: '700', padding: 8, width: 80, textAlign: 'center' }} />
              </View>
            </View>
          )}

          {/* MOVIMIENTOS */}
          <View style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700' }}>MOVIMIENTOS</Text>
              <TouchableOpacity onPress={() => setShowPicker(true)}
                style={{ backgroundColor: t.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: t.fs(12), color: '#fff', fontWeight: '900' }}>+ AÑADIR</Text>
              </TouchableOpacity>
            </View>

            {movimientos.length === 0 && (
              <TouchableOpacity onPress={() => setShowPicker(true)}
                style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 20, alignItems: 'center', borderStyle: 'dashed' }}>
                <Text style={{ fontSize: t.fs(24), marginBottom: 8 }}>💪</Text>
                <Text style={{ fontSize: t.fs(13), color: t.text3, textAlign: 'center' }}>Toca para añadir movimientos desde la base de datos</Text>
              </TouchableOpacity>
            )}

            {movimientos.map((mv, idx) => {
              const color = CATEGORY_COLORS[mv.category] || t.accent;
              return (
                <View key={idx} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: color + '40', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                      <Text style={{ fontSize: t.fs(14), fontWeight: '900', color: t.text }}>{mv.name}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeMovement(idx)}
                      style={{ backgroundColor: '#e6394420', borderRadius: 6, padding: 5 }}>
                      <Text style={{ fontSize: t.fs(11), color: '#e63946', fontWeight: '700' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: t.fs(9), color: t.text3, marginBottom: 4, letterSpacing: 1 }}>{mv.unit.toUpperCase()}</Text>
                      <TextInput value={mv.reps} onChangeText={v => updateMovement(idx, 'reps', v)}
                        keyboardType="numeric" placeholder="0"
                        placeholderTextColor={t.text3}
                        style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, color: t.text, fontSize: t.fs(16), fontWeight: '700', padding: 10, textAlign: 'center' }} />
                    </View>
                    {mv.equipment !== 'BW' && (
                      <View style={{ flex: 1.5 }}>
                        <Text style={{ fontSize: t.fs(9), color: t.text3, marginBottom: 4, letterSpacing: 1 }}>PESO / NOTAS</Text>
                        <TextInput value={mv.weight} onChangeText={v => updateMovement(idx, 'weight', v)}
                          placeholder="♂ kg / ♀ kg"
                          placeholderTextColor={t.text3}
                          style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, color: t.text, fontSize: t.fs(13), padding: 10 }} />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* RESULTADO */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: t.fs(10), color: '#4caf50', letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>RESULTADO</Text>
            <TextInput value={resultado} onChangeText={setResultado}
              placeholder="Rondas, tiempo, peso... (ej: 8+3, 24:15, 100kg)"
              placeholderTextColor={t.text3}
              style={{ backgroundColor: t.card, borderWidth: 1, borderColor: '#4caf5040', borderRadius: 10, color: t.text, fontSize: t.fs(14), fontWeight: '700', padding: 14 }} />
          </View>

          {/* NOTAS */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>NOTAS</Text>
            <TextInput value={notas} onChangeText={setNotas}
              placeholder="Sensaciones, PRs, notas técnicas..."
              placeholderTextColor={t.text3}
              multiline numberOfLines={3}
              style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, color: t.text, fontSize: t.fs(13), padding: 14, textAlignVertical: 'top', minHeight: 80 }} />
          </View>

          {/* GUARDAR */}
          <TouchableOpacity onPress={handleSave}
            style={{ backgroundColor: nombre.trim() ? t.accent : t.border, borderRadius: 10, padding: 16, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: t.fs(15), letterSpacing: 1 }}>
              {nombre.trim() ? '💾 GUARDAR WOD' : 'Escribe un nombre para guardar'}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </Modal>
  );
}

export default function HistorialScreen() {
  const { resultados, rms, saveResultado, wodsLibres, saveWodLibre, deleteWodLibre } = useApp();
  const t = useTheme();
  const { activeProgram } = useProgram();
  const { feed, esAmigo } = useSocial();
  const [expanded, setExpanded] = useState(null);
  const [tab, setTab] = useState('yo');
  const [showCreator, setShowCreator] = useState(false);

  const allDays = activeProgram
    ? activeProgram.weeks.flatMap((w, wi) =>
        w.days.map((d, di) => ({ ...d, weekIndex: wi, dayIndex: di, weekNumber: w.number }))
      )
    : [];

  const typeColors = SHARED_TYPE_COLORS;

  const diasConResultado = allDays.filter(d => resultados[d.day]);
  const diasSinResultado = allDays.filter(d => !resultados[d.day] && d.type !== 'Libre');

  // Resultados de amigos agrupados por día (desde feed real)
  const companerosPorDia = {};
  feed
    .filter(f => f.tipo === 'wod_completado' && esAmigo(f.user_id) && f.data?.dia)
    .forEach(f => {
      const dia = f.data.dia;
      if (!companerosPorDia[dia]) companerosPorDia[dia] = [];
      companerosPorDia[dia].push({
        nombre: f.user_nombre || 'Atleta',
        resultado: f.data.resultado || '—',
        notas: f.data.notas || '',
      });
    });

  const handleSaveWodLibre = (wod) => {
  saveWodLibre(wod);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <WodCreator visible={showCreator} onClose={() => setShowCreator(false)} onSave={handleSaveWodLibre} />

      {/* HEADER */}
      <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 20, paddingTop: 60 }}>
        <Text style={{ fontSize: t.fs(10), color: t.accent + '88', letterSpacing: 4, fontWeight: '700' }}>REGISTRO DEL BLOQUE</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <Text style={{ fontSize: t.fs(32), fontWeight: '900', letterSpacing: 2, color: t.text }}>HISTORIAL</Text>
          <TouchableOpacity onPress={() => setShowCreator(true)}
            style={{ backgroundColor: t.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: t.fs(12), color: '#fff', fontWeight: '900', letterSpacing: 1 }}>+ WOD LIBRE</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 4 }}>
          {diasConResultado.length + wodsLibres.length} WODs completados · {diasSinResultado.length} pendientes
        </Text>
      </View>

      {/* TABS */}
      <View style={{ flexDirection: 'row', gap: 8, padding: 12, backgroundColor: t.header, borderBottomWidth: 1, borderBottomColor: t.border }}>
        {[
          { key: 'yo', label: '👤 MIS RESULTADOS' },
          { key: 'libres', label: `🔓 LIBRES (${wodsLibres.length})` },
          { key: 'companeros', label: '👥 COMPAÑEROS' }
        ].map(tb => (
          <TouchableOpacity key={tb.key} onPress={() => setTab(tb.key)}
            style={{ flex: 1, padding: 8, backgroundColor: tab === tb.key ? t.accent + '20' : t.bg4, borderWidth: 1, borderColor: tab === tb.key ? t.accent : t.border, borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: t.fs(9), fontWeight: '700', color: tab === tb.key ? t.accent : t.text3 }}>{tb.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>

        {/* MIS RESULTADOS */}
        {tab === 'yo' && (
          <>
            {diasConResultado.length === 0 && (
              <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 24, alignItems: 'center', marginTop: 20 }}>
                <Text style={{ fontSize: t.fs(32), marginBottom: 12 }}>📋</Text>
                <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text, marginBottom: 6 }}>Sin resultados aún</Text>
                <Text style={{ fontSize: t.fs(12), color: t.text3, textAlign: 'center' }}>Completa un WOD y guarda tu resultado para verlo aquí</Text>
              </View>
            )}

            {diasConResultado.map((day, i) => {
              const res = resultados[day.day];
              const isOpen = expanded === day.day;
              const accent = typeColors[day.type] || t.accent;
              const rmKey = day.rmKey;
              const rmVal = rms[rmKey];
              const companeros = companerosPorDia[day.day] || [];

              return (
                <TouchableOpacity key={i} onPress={() => setExpanded(isOpen ? null : day.day)}
                  style={{ backgroundColor: t.card, borderWidth: 1, borderColor: isOpen ? accent + '50' : t.border, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: accent + '20', borderWidth: 1, borderColor: accent + '40', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: t.fs(9), fontWeight: '700', color: accent, letterSpacing: 0.5, textAlign: 'center' }}>
                        {day.day.split(' ')[0].substring(0, 3).toUpperCase()}{'\n'}{day.day.split(' ')[1]}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: t.fs(14), fontWeight: '900', color: t.text }}>{day.label}</Text>
                      <Text style={{ fontSize: t.fs(10), color: t.text3, marginTop: 2 }}>S{day.weekNumber} · {day.type}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: accent }}>{res.resultado || '—'}</Text>
                      <Text style={{ fontSize: t.fs(9), color: t.text3, marginTop: 2 }}>{isOpen ? '▴' : '▾'}</Text>
                    </View>
                  </View>

                  {isOpen && (
                    <View style={{ borderTopWidth: 1, borderTopColor: t.border, padding: 14 }}>
                      <View style={{ backgroundColor: accent + '10', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                        <Text style={{ fontSize: t.fs(10), color: accent, letterSpacing: 2, fontWeight: '700', marginBottom: 6 }}>📊 RESULTADO</Text>
                        <Text style={{ fontSize: t.fs(24), fontWeight: '900', color: accent }}>{res.resultado || 'No registrado'}</Text>
                        {res.fecha && (
                          <Text style={{ fontSize: t.fs(10), color: t.text3, marginTop: 4 }}>
                            Guardado: {new Date(res.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        )}
                      </View>

                      {res.notas ? (
                        <View style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 12, marginBottom: 12 }}>
                          <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 6 }}>📝 NOTAS</Text>
                          <Text style={{ fontSize: t.fs(13), color: t.text, lineHeight: t.fs(20) }}>{res.notas}</Text>
                        </View>
                      ) : null}

                      {rmKey && rmVal && parseFloat(rmVal) > 0 && (
                        <View style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 12, marginBottom: 12 }}>
                          <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 6 }}>🏋️ 1RM REGISTRADO</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: t.fs(13), color: t.text2 }}>{rmNames[rmKey]}</Text>
                            <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: accent }}>{rmVal}<Text style={{ fontSize: t.fs(12), color: t.text3 }}> kg</Text></Text>
                          </View>
                        </View>
                      )}

                      {day.wod.movements && day.wod.movements.length > 0 && (
                        <View style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 12, marginBottom: 12 }}>
                          <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>⚡ MOVIMIENTOS</Text>
                          {day.wod.movements.map((m, j) => (
                            <View key={j} style={{ flexDirection: 'row', gap: 8, marginBottom: 5 }}>
                              <Text style={{ fontSize: t.fs(12), fontWeight: '700', color: accent, minWidth: 30 }}>{m.reps}</Text>
                              <Text style={{ fontSize: t.fs(12), color: t.text }}>{m.name}</Text>
                              {m.weight && m.weight !== 'BW' && <Text style={{ fontSize: t.fs(11), color: t.text3 }}>· {m.weight}</Text>}
                            </View>
                          ))}
                        </View>
                      )}

                      {companeros.length > 0 && (
                        <View style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 12 }}>
                          <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>👥 COMPAÑEROS</Text>
                          {companeros.map((c, j) => (
                            <View key={j} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: j < companeros.length - 1 ? 8 : 0, paddingBottom: j < companeros.length - 1 ? 8 : 0, borderBottomWidth: j < companeros.length - 1 ? 1 : 0, borderBottomColor: t.border }}>
                              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.accent + '20', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: t.accent }}>{c.nombre.split(' ').map(p => p[0]).join('')}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: t.fs(12), fontWeight: '700', color: t.text }}>{c.nombre}</Text>
                                {c.notas ? <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 1 }}>{c.notas}</Text> : null}
                              </View>
                              <Text style={{ fontSize: t.fs(14), fontWeight: '900', color: accent }}>{c.resultado}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {diasSinResultado.length > 0 && (
              <>
                <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginTop: 8, marginBottom: 8 }}>PENDIENTES</Text>
                {diasSinResultado.map((day, i) => {
                  const accent = typeColors[day.type] || t.accent;
                  return (
                    <View key={i} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: 0.5 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: accent + '15', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: t.fs(8), fontWeight: '700', color: accent, textAlign: 'center' }}>
                          {day.day.split(' ')[0].substring(0, 3).toUpperCase()}{'\n'}{day.day.split(' ')[1]}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text }}>{day.label}</Text>
                        <Text style={{ fontSize: t.fs(10), color: t.text3 }}>S{day.weekNumber} · Sin resultado</Text>
                      </View>
                      <Text style={{ fontSize: t.fs(18), color: t.text3 }}>○</Text>
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* WODS LIBRES */}
        {tab === 'libres' && (
          <>
            {wodsLibres.length === 0 ? (
              <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 24, alignItems: 'center', marginTop: 20 }}>
                <Text style={{ fontSize: t.fs(32), marginBottom: 12 }}>🔓</Text>
                <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text, marginBottom: 6 }}>Sin WODs libres</Text>
                <Text style={{ fontSize: t.fs(12), color: t.text3, textAlign: 'center', marginBottom: 16 }}>
                  Crea un WOD libre para registrar entrenamientos fuera de la programación
                </Text>
                <TouchableOpacity onPress={() => setShowCreator(true)}
                  style={{ backgroundColor: t.accent, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 }}>
                  <Text style={{ fontSize: t.fs(13), color: '#fff', fontWeight: '900' }}>+ CREAR WOD LIBRE</Text>
                </TouchableOpacity>
              </View>
            ) : (
              wodsLibres.map((wod, i) => {
                const isOpen = expanded === wod.id;
                return (
                  <TouchableOpacity key={wod.id} onPress={() => setExpanded(isOpen ? null : wod.id)}
                    style={{ backgroundColor: t.card, borderWidth: 1, borderColor: isOpen ? t.accent + '50' : t.border, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: t.accent + '20', borderWidth: 1, borderColor: t.accent + '40', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: t.fs(8), fontWeight: '700', color: t.accent, textAlign: 'center' }}>🔓{'\n'}LIBRE</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: t.fs(14), fontWeight: '900', color: t.text }}>{wod.nombre}</Text>
                        <Text style={{ fontSize: t.fs(10), color: t.text3, marginTop: 2 }}>
                          {wod.tipo} · {wod.tipo !== 'STRENGTH' && wod.tipo !== 'LIBRE' ? `${wod.duracion} min · ` : ''}{new Date(wod.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.accent }}>{wod.resultado || '—'}</Text>
                        <Text style={{ fontSize: t.fs(9), color: t.text3, marginTop: 2 }}>{isOpen ? '▴' : '▾'}</Text>
                      </View>
                    </View>

                    {isOpen && (
                      <View style={{ borderTopWidth: 1, borderTopColor: t.border, padding: 14 }}>
                        {wod.resultado ? (
                          <View style={{ backgroundColor: t.accent + '10', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                            <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 6 }}>📊 RESULTADO</Text>
                            <Text style={{ fontSize: t.fs(24), fontWeight: '900', color: t.accent }}>{wod.resultado}</Text>
                          </View>
                        ) : null}

                        {wod.movimientos.length > 0 && (
                          <View style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 12, marginBottom: 12 }}>
                            <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>⚡ MOVIMIENTOS</Text>
                            {wod.movimientos.map((m, j) => {
                              const color = CATEGORY_COLORS[m.category] || t.accent;
                              return (
                                <View key={j} style={{ flexDirection: 'row', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
                                  <Text style={{ fontSize: t.fs(13), fontWeight: '700', color, minWidth: 35 }}>{m.reps}</Text>
                                  <Text style={{ fontSize: t.fs(13), color: t.text, flex: 1 }}>{m.name}</Text>
                                  {m.weight ? <Text style={{ fontSize: t.fs(11), color: t.text3 }}>{m.weight}</Text> : null}
                                </View>
                              );
                            })}
                          </View>
                        )}

                        {wod.notas ? (
                          <View style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 12 }}>
                            <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 6 }}>📝 NOTAS</Text>
                            <Text style={{ fontSize: t.fs(13), color: t.text, lineHeight: t.fs(20) }}>{wod.notas}</Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        {/* COMPAÑEROS */}
        {tab === 'companeros' && (
          <View style={{ marginTop: 8 }}>
            {Object.keys(companerosPorDia).length === 0 ? (
              <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 24, alignItems: 'center', marginTop: 20 }}>
                <Text style={{ fontSize: t.fs(32), marginBottom: 12 }}>👥</Text>
                <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text, marginBottom: 6 }}>Sin resultados de compañeros</Text>
                <Text style={{ fontSize: t.fs(12), color: t.text3, textAlign: 'center', lineHeight: t.fs(18) }}>
                  Aquí aparecerán los resultados de tus amigos cuando completen WODs del mismo programa
                </Text>
              </View>
            ) : (
              Object.keys(companerosPorDia).map((dia, i) => {
                const dayData = allDays.find(d => d.day === dia);
                const accent = dayData ? typeColors[dayData.type] || t.accent : t.accent;
                const lista = companerosPorDia[dia];
                return (
                  <View key={i} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                    <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: t.border, backgroundColor: accent + '10' }}>
                      <Text style={{ fontSize: t.fs(12), fontWeight: '900', color: accent }}>{dia}</Text>
                      <Text style={{ fontSize: t.fs(10), color: t.text3, marginTop: 2 }}>{dayData?.label}</Text>
                    </View>
                    {lista.map((c, j) => (
                      <View key={j} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: j < lista.length - 1 ? 1 : 0, borderBottomColor: t.border }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.accent + '20', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.accent }}>{c.nombre.split(' ').map(p => p[0]).join('')}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text }}>{c.nombre}</Text>
                          {c.notas ? <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 2 }}>{c.notas}</Text> : null}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: accent }}>{c.resultado}</Text>
                          <Text style={{ fontSize: t.fs(9), color: t.text3 }}>RESULTADO</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}