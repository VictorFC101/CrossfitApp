import { View, Text, ScrollView, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { useTheme } from '../../ThemeContext';
import { formatear } from './precio';
import { PanelHeader, Estado, Btn, Chips, cardStyle, confirmar } from './ui';

const FILTROS = [
  { value: 'todos', label: 'Todos' }, { value: 'pendiente', label: 'Pendientes' }, { value: 'pagado', label: 'Pagados' },
  { value: 'entregado', label: 'Entregados' }, { value: 'cancelado', label: 'Cancelados' },
];
const ETIQUETA = { pendiente: 'PENDIENTE', pagado: 'PAGADO', entregado: 'ENTREGADO', cancelado: 'CANCELADO' };

export default function AdminPedidosPanel({ onClose }) {
  const t = useTheme();
  const [pedidos, setPedidos] = useState([]);
  const [nombres, setNombres] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todos');

  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error: e } = await supabase.from('pedidos')
      .select('*, pedido_items(cantidad, precio_cents, productos(nombre), producto_variantes(etiqueta))')
      .order('created_at', { ascending: false });
    if (e) { setError('No se pudieron cargar los pedidos.'); setLoading(false); return; }
    setPedidos(data || []);
    const ids = [...new Set((data || []).map(p => p.usuario_id))];
    if (ids.length) {
      const { data: us } = await supabase.from('usuarios_publicos').select('id,nombre').in('id', ids);
      setNombres(Object.fromEntries((us || []).map(u => [u.id, u.nombre])));
    }
    setLoading(false);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const cambiarEstado = async (p, estado) => {
    const { error: e } = await supabase.from('pedidos').update({ estado }).eq('id', p.id);
    if (e) Alert.alert('Error', 'No se pudo actualizar el pedido'); else cargar();
  };

  const visibles = filtro === 'todos' ? pedidos : pedidos.filter(p => p.estado === filtro);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <PanelHeader titulo="PEDIDOS" onClose={onClose} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>
        <Chips opciones={FILTROS} valor={filtro} onChange={setFiltro} />
        <Estado loading={loading} error={error} vacio={!loading && !error && visibles.length === 0}
          textoVacio="No hay pedidos en este estado." onReintentar={cargar} />
        {!loading && !error && visibles.map(p => (
          <View key={p.id} style={cardStyle(t)}>
            <Text style={{ fontSize: t.fs(9), color: t.accent, fontWeight: '700', letterSpacing: 1 }}>{ETIQUETA[p.estado] || p.estado}</Text>
            <Text style={{ fontSize: t.fs(15), fontWeight: '900', color: t.text, marginTop: 2 }}>{nombres[p.usuario_id] || 'Usuario'}</Text>
            <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 2 }}>
              {new Date(p.created_at).toLocaleDateString('es-ES')} · {formatear(p.total_cents, p.moneda)}
            </Text>
            {(p.pedido_items || []).map((it, i) => (
              <Text key={i} style={{ fontSize: t.fs(12), color: t.text2, marginTop: 3 }}>
                {it.cantidad} x {it.productos?.nombre || 'Producto'}{it.producto_variantes?.etiqueta ? ` (${it.producto_variantes.etiqueta})` : ''} · {formatear(it.precio_cents, p.moneda)}
              </Text>
            ))}
            {(p.estado === 'pagado' || p.estado === 'pendiente') && (
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                {p.estado === 'pagado' && <Btn primario label="Marcar como entregado" onPress={() => cambiarEstado(p, 'entregado')} />}
                <Btn peligro label="Cancelar" onPress={() => confirmar('Cancelar pedido', '¿Seguro que quieres cancelar este pedido?', 'Cancelar pedido', () => cambiarEstado(p, 'cancelado'))} />
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
