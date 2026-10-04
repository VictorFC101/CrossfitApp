import { View, Text, ScrollView, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { useTheme } from '../../ThemeContext';
import { eurosACents, centsAEuros, formatear } from './precio';
import { useMiBoxId, PanelHeader, Estado, Btn, Campo, Chips, cardStyle, confirmar } from './ui';

const CATEGORIAS = [{ value: 'ropa', label: 'Ropa' }, { value: 'parches', label: 'Parches' }, { value: 'otros', label: 'Otros' }];
const VACIO = { id: null, nombre: '', descripcion: '', precio: '', imagen_url: '', categoria: 'ropa' };

export default function AdminProductosPanel({ onClose }) {
  const t = useTheme();
  const boxId = useMiBoxId();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [nuevaVar, setNuevaVar] = useState({ etiqueta: '', stock: '' });
  const [stockEdit, setStockEdit] = useState({});

  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error: e } = await supabase.from('productos')
      .select('*, producto_variantes(id,etiqueta,stock,activo)').order('created_at', { ascending: false });
    if (e) setError('No se pudieron cargar los productos.'); else setProductos(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    const cents = eurosACents(form.precio);
    if (!form.nombre.trim()) return Alert.alert('Error', 'El nombre es obligatorio');
    if (cents === null) return Alert.alert('Error', 'Introduce un precio válido en euros');
    const fila = { nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null, precio_cents: cents,
      imagen_url: form.imagen_url.trim() || null, categoria: form.categoria };
    setSaving(true);
    let res;
    if (form.id) res = await supabase.from('productos').update(fila).eq('id', form.id);
    else {
      if (!boxId) { setSaving(false); return Alert.alert('Error', 'Tu usuario no tiene box asignado'); }
      res = await supabase.from('productos').insert({ ...fila, box_id: boxId, moneda: 'EUR', activo: true });
    }
    setSaving(false);
    if (res.error) return Alert.alert('Error', 'No se pudo guardar el producto');
    setForm(null); cargar();
  };

  const toggleActivo = async (p) => {
    const { error: e } = await supabase.from('productos').update({ activo: !p.activo }).eq('id', p.id);
    if (e) Alert.alert('Error', 'No se pudo actualizar el producto'); else cargar();
  };

  const anadirVariante = async (p) => {
    const stock = parseInt(nuevaVar.stock, 10);
    if (!nuevaVar.etiqueta.trim() || !Number.isInteger(stock) || stock < 0) return Alert.alert('Error', 'Indica etiqueta y stock válido');
    const { error: e } = await supabase.from('producto_variantes')
      .insert({ producto_id: p.id, etiqueta: nuevaVar.etiqueta.trim(), stock, activo: true });
    if (e) return Alert.alert('Error', 'No se pudo añadir la variante');
    setNuevaVar({ etiqueta: '', stock: '' }); cargar();
  };

  const guardarStock = async (v) => {
    const stock = parseInt(stockEdit[v.id], 10);
    if (!Number.isInteger(stock) || stock < 0) return Alert.alert('Error', 'Stock no válido');
    const { error: e } = await supabase.from('producto_variantes').update({ stock }).eq('id', v.id);
    if (e) return Alert.alert('Error', 'No se pudo actualizar el stock');
    setStockEdit(s => { const n = { ...s }; delete n[v.id]; return n; }); cargar();
  };

  const eliminarVariante = (v) => confirmar('Eliminar variante', `¿Eliminar "${v.etiqueta}"?`, 'Eliminar', async () => {
    const { error: e } = await supabase.from('producto_variantes').delete().eq('id', v.id);
    if (e) Alert.alert('Error', 'No se pudo eliminar (puede tener pedidos). Desactívala en su lugar.'); else cargar();
  });

  const toggleVariante = async (v) => {
    const { error: e } = await supabase.from('producto_variantes').update({ activo: !v.activo }).eq('id', v.id);
    if (e) Alert.alert('Error', 'No se pudo actualizar la variante'); else cargar();
  };

  const editar = (p) => setForm({ id: p.id, nombre: p.nombre, descripcion: p.descripcion || '', precio: centsAEuros(p.precio_cents),
    imagen_url: p.imagen_url || '', categoria: p.categoria || 'otros' });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <PanelHeader titulo="TIENDA" onClose={onClose} accion={!form && <Btn primario label="+ NUEVO" onPress={() => setForm({ ...VACIO })} />} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>
        {form && (
          <View style={cardStyle(t)}>
            <Text style={{ color: t.text, fontWeight: '900', fontSize: t.fs(14), marginBottom: 10 }}>{form.id ? 'EDITAR PRODUCTO' : 'NUEVO PRODUCTO'}</Text>
            <Campo label="NOMBRE" value={form.nombre} onChangeText={v => setForm({ ...form, nombre: v })} />
            <Campo label="DESCRIPCIÓN" value={form.descripcion} multiline onChangeText={v => setForm({ ...form, descripcion: v })} />
            <Campo label="PRECIO (EUROS)" value={form.precio} keyboardType="decimal-pad" placeholder="25,00" onChangeText={v => setForm({ ...form, precio: v })} />
            <Campo label="URL DE IMAGEN" value={form.imagen_url} onChangeText={v => setForm({ ...form, imagen_url: v })} />
            <Chips opciones={CATEGORIAS} valor={form.categoria} onChange={v => setForm({ ...form, categoria: v })} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn primario label={saving ? 'GUARDANDO...' : 'GUARDAR'} onPress={guardar} disabled={saving} />
              <Btn label="CANCELAR" onPress={() => setForm(null)} />
            </View>
          </View>
        )}
        <Estado loading={loading} error={error} vacio={!loading && !error && productos.length === 0}
          textoVacio="Aún no hay productos. Crea el primero con + NUEVO." onReintentar={cargar} />
        {!loading && !error && productos.map(p => {
          const vars = p.producto_variantes || [];
          const abierto = expandido === p.id;
          return (
            <View key={p.id} style={{ ...cardStyle(t), opacity: p.activo ? 1 : 0.6 }}>
              <Text style={{ fontSize: t.fs(9), color: p.activo ? t.accent : t.text3, fontWeight: '700', letterSpacing: 1 }}>
                {p.activo ? 'ACTIVO' : 'INACTIVO'} · {(p.categoria || '').toUpperCase()}
              </Text>
              <Text style={{ fontSize: t.fs(15), fontWeight: '900', color: t.text, marginTop: 2 }}>{p.nombre}</Text>
              <Text style={{ fontSize: t.fs(13), color: t.text2, marginTop: 2 }}>{formatear(p.precio_cents, p.moneda)}</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                <Btn label="EDITAR" onPress={() => editar(p)} />
                <Btn label={p.activo ? 'DESACTIVAR' : 'ACTIVAR'} onPress={() => toggleActivo(p)} />
                <Btn label={abierto ? `OCULTAR VARIANTES` : `VARIANTES (${vars.length})`} onPress={() => setExpandido(abierto ? null : p.id)} />
              </View>
              {abierto && (
                <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 10 }}>
                  {vars.length === 0 && <Text style={{ color: t.text3, fontSize: t.fs(12), marginBottom: 8 }}>Sin variantes.</Text>}
                  {vars.map(v => (
                    <View key={v.id} style={{ marginBottom: 10 }}>
                      <Text style={{ color: v.activo ? t.text : t.text3, fontWeight: '700', fontSize: t.fs(13) }}>
                        {v.etiqueta} · stock {v.stock}{v.activo ? '' : ' (inactiva)'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 4 }}>
                        <View style={{ width: 90 }}>
                          <Campo label="STOCK" keyboardType="number-pad" value={stockEdit[v.id] ?? String(v.stock)}
                            onChangeText={s => setStockEdit(e => ({ ...e, [v.id]: s }))} />
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                          <Btn label="GUARDAR" onPress={() => guardarStock(v)} disabled={stockEdit[v.id] === undefined} />
                          <Btn label={v.activo ? 'DESACTIVAR' : 'ACTIVAR'} onPress={() => toggleVariante(v)} />
                          <Btn peligro label="ELIMINAR" onPress={() => eliminarVariante(v)} />
                        </View>
                      </View>
                    </View>
                  ))}
                  <Text style={{ color: t.text3, fontSize: t.fs(10), fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>NUEVA VARIANTE</Text>
                  <Campo label="ETIQUETA (p. ej. M)" value={nuevaVar.etiqueta} onChangeText={v => setNuevaVar({ ...nuevaVar, etiqueta: v })} />
                  <Campo label="STOCK" keyboardType="number-pad" value={nuevaVar.stock} onChangeText={v => setNuevaVar({ ...nuevaVar, stock: v })} />
                  <Btn primario label="AÑADIR VARIANTE" onPress={() => anadirVariante(p)} />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
