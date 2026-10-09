import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../supabase';
import { useTheme } from '../../ThemeContext';
import { PanelHeader, Estado, cardStyle } from './ui';
import AdminAtletaDetalle from './AdminAtletaDetalle';
import { Avatar, textoUltimo } from './atletaUi';
import { estadoActividad } from '../../coachLogic';
import { COACH_ESTADOS, COACH_SIN_PERMISO, COACH_VACIO } from '../../constants';

const ORDEN_ESTADO = { inactivo: 0, irregular: 1, activo: 2 };

export default function AdminAtletasPanel({ onClose }) {
  const t = useTheme();
  const [atletas, setAtletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [sel, setSel] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error: e } = await supabase.rpc('coach_athletes');
    if (e) {
      setError(e.code === '42501' ? COACH_SIN_PERMISO : 'No se pudieron cargar los atletas.');
      setLoading(false); return;
    }
    setAtletas(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const filas = useMemo(() => {
    const now = new Date();
    const q = busqueda.trim().toLowerCase();
    return atletas
      .filter(a => !q || (a.nombre || '').toLowerCase().includes(q))
      .map(a => ({ ...a, estado: estadoActividad(a, now) }))
      .sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || (a.nombre || '').localeCompare(b.nombre || '', 'es'));
  }, [atletas, busqueda]);

  if (sel) return <AdminAtletaDetalle atleta={sel} onClose={() => setSel(null)} />;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <PanelHeader titulo="ATLETAS" onClose={onClose} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <TextInput value={busqueda} onChangeText={setBusqueda} placeholder="Buscar atleta..." placeholderTextColor={t.text3}
          style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 10, color: t.text, fontSize: t.fs(13), marginBottom: 12 }} />
        <Estado loading={loading} error={error} vacio={!loading && !error && atletas.length === 0}
          textoVacio={COACH_VACIO} onReintentar={cargar} />
        {!loading && !error && atletas.length > 0 && filas.length === 0 && (
          <Text style={{ color: t.text3, fontSize: t.fs(13), textAlign: 'center', marginTop: 30 }}>Ningún atleta coincide con la búsqueda.</Text>
        )}
        {!loading && !error && filas.map(a => {
          const est = COACH_ESTADOS[a.estado];
          const asignado = a.origen === 'asignado' || a.origen === 'ambos';
          return (
            <TouchableOpacity key={a.id} onPress={() => setSel(a)} style={[cardStyle(t), { flexDirection: 'row', gap: 12, alignItems: 'center' }]}>
              <Avatar nombre={a.nombre} url={a.avatar_url} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: t.fs(15), fontWeight: '900', color: t.text }}>{a.nombre || 'Atleta'}</Text>
                  {asignado && (
                    <View style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.accent, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ fontSize: t.fs(9), fontWeight: '700', color: t.accent }}>Asignado</Text>
                    </View>
                  )}
                </View>
                {!!a.box_nombre && <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 1 }}>{a.box_nombre}</Text>}
                {!!a.programa_nombre && <Text style={{ fontSize: t.fs(12), color: t.text2, marginTop: 2 }}>{a.programa_nombre}</Text>}
                <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 2 }}>{textoUltimo(a.ultimo_resultado)}</Text>
                <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 1 }}>7d: {a.resultados_7d ?? 0} · 30d: {a.resultados_30d ?? 0}</Text>
              </View>
              <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: t.text2 }}>{est.emoji} {est.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
