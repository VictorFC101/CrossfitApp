import { View, Text, ScrollView } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { useTheme } from '../../ThemeContext';
import { PanelHeader, Estado, Chips, cardStyle } from './ui';

const FILTROS = [
  { value: 'todos', label: 'Todas' }, { value: 'activa', label: 'Activas' }, { value: 'impago', label: 'Impago' },
  { value: 'pendiente', label: 'Pendientes' }, { value: 'cancelada', label: 'Canceladas' }, { value: 'vencida', label: 'Vencidas' },
];

function fecha(f) { return f ? new Date(f).toLocaleDateString('es-ES') : '—'; }

export default function AdminMembresiasPanel({ onClose }) {
  const t = useTheme();
  const [subs, setSubs] = useState([]);
  const [nombres, setNombres] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todos');

  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error: e } = await supabase.from('suscripciones')
      .select('*, planes(nombre)').order('periodo_fin', { ascending: true, nullsFirst: false });
    if (e) { setError('No se pudieron cargar las membresías.'); setLoading(false); return; }
    setSubs(data || []);
    const ids = [...new Set((data || []).map(s => s.usuario_id))];
    if (ids.length) {
      const { data: us } = await supabase.from('usuarios_publicos').select('id,nombre').in('id', ids);
      setNombres(Object.fromEntries((us || []).map(u => [u.id, u.nombre])));
    }
    setLoading(false);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const visibles = filtro === 'todos' ? subs : subs.filter(s => s.estado === filtro);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <PanelHeader titulo="MEMBRESÍAS" onClose={onClose} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>
        <Chips opciones={FILTROS} valor={filtro} onChange={setFiltro} />
        <Estado loading={loading} error={error} vacio={!loading && !error && visibles.length === 0}
          textoVacio="No hay membresías en este estado." onReintentar={cargar} />
        {!loading && !error && visibles.map(s => (
          <View key={s.id} style={cardStyle(t)}>
            <Text style={{ fontSize: t.fs(9), color: s.estado === 'activa' ? t.accent : t.text3, fontWeight: '700', letterSpacing: 1 }}>
              {String(s.estado).toUpperCase()}{s.cancelar_al_final ? ' · SE CANCELA AL FINAL' : ''}
            </Text>
            <Text style={{ fontSize: t.fs(15), fontWeight: '900', color: t.text, marginTop: 2 }}>{nombres[s.usuario_id] || 'Usuario'}</Text>
            <Text style={{ fontSize: t.fs(12), color: t.text2, marginTop: 2 }}>{s.planes?.nombre || 'Plan'}</Text>
            <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 2 }}>Vence: {fecha(s.periodo_fin)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
