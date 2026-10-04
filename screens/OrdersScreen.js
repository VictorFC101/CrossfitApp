import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../ThemeContext';
import { usePayments } from '../PaymentContext';
import { formatPrecio, ETIQUETA_PEDIDO } from '../lib/payments';

const formatFecha = (iso) => {
  const d = new Date(iso);
  if (!iso || isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function OrdersScreen({ onClose }) {
  const t = useTheme();
  const { pedidos, loading, error, refresh } = usePayments();

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 20 }}>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ fontSize: t.fs(12), color: t.accent, fontWeight: '800', letterSpacing: 1 }}>{'‹ VOLVER'}</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: t.fs(28), fontWeight: '900', letterSpacing: 2, color: t.text, marginTop: 6 }}>MIS PEDIDOS</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
        {!!error && (
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.accent, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <Text style={{ fontSize: t.fs(12), color: t.text }}>{error}</Text>
            <TouchableOpacity onPress={refresh} style={{ marginTop: 8 }}>
              <Text style={{ fontSize: t.fs(12), color: t.accent, fontWeight: '800' }}>REINTENTAR</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && pedidos.length === 0 ? (
          <ActivityIndicator color={t.accent} style={{ marginTop: 40 }} />
        ) : pedidos.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Text style={{ fontSize: 36 }}>📦</Text>
            <Text style={{ fontSize: t.fs(14), color: t.text2, marginTop: 10, textAlign: 'center' }}>Aún no has hecho ningún pedido</Text>
          </View>
        ) : pedidos.map(p => (
          <View key={p.id} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: t.fs(12), color: t.text2, fontWeight: '700' }}>{formatFecha(p.created_at)}</Text>
              <Text style={{ fontSize: t.fs(11), fontWeight: '800', letterSpacing: 1, color: p.estado === 'cancelado' ? t.text3 : t.accent }}>
                {(ETIQUETA_PEDIDO[p.estado] || p.estado || '').toUpperCase()}
              </Text>
            </View>
            {(p.items || []).map(it => (
              <View key={it.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ fontSize: t.fs(13), color: t.text, flex: 1 }}>
                  {it.cantidad} × {it.producto?.nombre || 'Producto'}{it.variante?.etiqueta ? ` (${it.variante.etiqueta})` : ''}
                </Text>
                <Text style={{ fontSize: t.fs(13), color: t.text2 }}>{formatPrecio(it.precio_cents * it.cantidad, p.moneda)}</Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: t.border }}>
              <Text style={{ fontSize: t.fs(12), color: t.text3, fontWeight: '700', letterSpacing: 1 }}>TOTAL</Text>
              <Text style={{ fontSize: t.fs(15), color: t.text, fontWeight: '900' }}>{formatPrecio(p.total_cents, p.moneda)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
