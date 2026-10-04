import { View, Text, ScrollView, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { useTheme } from '../../ThemeContext';
import { eurosACents, centsAEuros, formatear } from './precio';
import { useMiBoxId, PanelHeader, Estado, Btn, Campo, Chips, cardStyle } from './ui';

const TIPOS = [{ value: 'recurrente', label: 'Recurrente (mensual)' }, { value: 'prepago', label: 'Prepago' }];
const VACIO = { id: null, nombre: '', descripcion: '', precio: '', tipo: 'recurrente', meses: '1' };

export default function AdminPlanesPanel({ onClose }) {
  const t = useTheme();
  const boxId = useMiBoxId();
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error: e } = await supabase.from('planes').select('*').order('precio_cents');
    if (e) setError('No se pudieron cargar los planes.'); else setPlanes(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    const cents = eurosACents(form.precio);
    const meses = form.tipo === 'prepago' ? parseInt(form.meses, 10) : 1;
    if (!form.nombre.trim()) return Alert.alert('Error', 'El nombre es obligatorio');
    if (cents === null) return Alert.alert('Error', 'Introduce un precio válido en euros');
    if (!Number.isInteger(meses) || meses < 1) return Alert.alert('Error', 'Indica un número de meses válido');
    const fila = { nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null, precio_cents: cents, tipo: form.tipo, meses };
    setSaving(true);
    let res;
    if (form.id) res = await supabase.from('planes').update(fila).eq('id', form.id);
    else {
      if (!boxId) { setSaving(false); return Alert.alert('Error', 'Tu usuario no tiene box asignado'); }
      res = await supabase.from('planes').insert({ ...fila, box_id: boxId, moneda: 'EUR', activo: true });
    }
    setSaving(false);
    if (res.error) return Alert.alert('Error', 'No se pudo guardar el plan');
    setForm(null); cargar();
  };

  const toggleActivo = async (p) => {
    const { error: e } = await supabase.from('planes').update({ activo: !p.activo }).eq('id', p.id);
    if (e) Alert.alert('Error', 'No se pudo actualizar el plan'); else cargar();
  };

  const editar = (p) => setForm({ id: p.id, nombre: p.nombre, descripcion: p.descripcion || '', precio: centsAEuros(p.precio_cents),
    tipo: p.tipo, meses: String(p.meses ?? 1) });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <PanelHeader titulo="PLANES" onClose={onClose} accion={!form && <Btn primario label="+ NUEVO" onPress={() => setForm({ ...VACIO })} />} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>
        {form && (
          <View style={cardStyle(t)}>
            <Text style={{ color: t.text, fontWeight: '900', fontSize: t.fs(14), marginBottom: 10 }}>{form.id ? 'EDITAR PLAN' : 'NUEVO PLAN'}</Text>
            <Campo label="NOMBRE" value={form.nombre} onChangeText={v => setForm({ ...form, nombre: v })} />
            <Campo label="DESCRIPCIÓN" value={form.descripcion} multiline onChangeText={v => setForm({ ...form, descripcion: v })} />
            <Campo label="PRECIO (EUROS)" value={form.precio} keyboardType="decimal-pad" placeholder="49,00" onChangeText={v => setForm({ ...form, precio: v })} />
            <Chips opciones={TIPOS} valor={form.tipo} onChange={v => setForm({ ...form, tipo: v })} />
            {form.tipo === 'prepago' && (
              <Campo label="MESES CUBIERTOS" value={form.meses} keyboardType="number-pad" onChangeText={v => setForm({ ...form, meses: v })} />
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn primario label={saving ? 'GUARDANDO...' : 'GUARDAR'} onPress={guardar} disabled={saving} />
              <Btn label="CANCELAR" onPress={() => setForm(null)} />
            </View>
          </View>
        )}
        <Estado loading={loading} error={error} vacio={!loading && !error && planes.length === 0}
          textoVacio="Aún no hay planes. Crea el primero con + NUEVO." onReintentar={cargar} />
        {!loading && !error && planes.map(p => (
          <View key={p.id} style={{ ...cardStyle(t), opacity: p.activo ? 1 : 0.6 }}>
            <Text style={{ fontSize: t.fs(9), color: p.activo ? t.accent : t.text3, fontWeight: '700', letterSpacing: 1 }}>
              {p.activo ? 'ACTIVO' : 'INACTIVO'} · {p.tipo === 'recurrente' ? 'RECURRENTE' : `PREPAGO ${p.meses} MES(ES)`}
            </Text>
            <Text style={{ fontSize: t.fs(15), fontWeight: '900', color: t.text, marginTop: 2 }}>{p.nombre}</Text>
            <Text style={{ fontSize: t.fs(13), color: t.text2, marginTop: 2 }}>
              {formatear(p.precio_cents, p.moneda)}{p.tipo === 'recurrente' ? ' / mes' : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
              <Btn label="EDITAR" onPress={() => editar(p)} />
              <Btn label={p.activo ? 'DESACTIVAR' : 'ACTIVAR'} onPress={() => toggleActivo(p)} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
