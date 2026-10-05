import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../ThemeContext';
import { usePayments } from '../PaymentContext';
import { formatPrecio, estadoMembresia, etiquetaPlan } from '../lib/payments';

const formatFecha = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function MembershipsScreen({ onClose }) {
  const t = useTheme();
  const { planes, suscripcionActiva, loading, error, refresh, checkoutPlan, abrirPortal, procesando } = usePayments();
  const estado = estadoMembresia(suscripcionActiva);
  const planActual = suscripcionActiva?.plan || planes.find(p => p.id === suscripcionActiva?.plan_id) || null;
  const gestionable = !!suscripcionActiva && planActual?.tipo !== 'prepago';

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 20 }}>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ fontSize: t.fs(12), color: t.accent, fontWeight: '800', letterSpacing: 1 }}>{'‹ VOLVER'}</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: t.fs(28), fontWeight: '900', letterSpacing: 2, color: t.text, marginTop: 6 }}>MI MEMBRESÍA</Text>
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

        {loading && !suscripcionActiva && planes.length === 0 ? (
          <ActivityIndicator color={t.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* ESTADO ACTUAL */}
            <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>ESTADO ACTUAL</Text>
            <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: estado.activa ? t.accent : t.border, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <Text style={{ fontSize: t.fs(18), fontWeight: '900', color: estado.activa ? t.accent : t.text }}>{estado.etiqueta}</Text>
              {!!planActual && (
                <Text style={{ fontSize: t.fs(12), color: t.text2, marginTop: 4 }}>
                  {planActual.nombre} · {etiquetaPlan(planActual)}
                </Text>
              )}
              {!!suscripcionActiva?.periodo_fin && estado.activa && (
                <Text style={{ fontSize: t.fs(12), color: t.text2, marginTop: 4 }}>
                  {suscripcionActiva.cancelar_al_final ? 'Acaba el ' : 'Próxima renovación: '}{formatFecha(suscripcionActiva.periodo_fin)}
                  {` (${estado.diasRestantes} ${estado.diasRestantes === 1 ? 'día' : 'días'})`}
                </Text>
              )}
              {gestionable && (
                <TouchableOpacity onPress={abrirPortal} disabled={procesando}
                  style={{ marginTop: 14, borderWidth: 1, borderColor: t.accent, borderRadius: 10, padding: 12, alignItems: 'center', opacity: procesando ? 0.6 : 1 }}>
                  {procesando
                    ? <ActivityIndicator color={t.accent} />
                    : <Text style={{ fontSize: t.fs(12), fontWeight: '800', letterSpacing: 1, color: t.accent }}>GESTIONAR SUSCRIPCIÓN</Text>}
                </TouchableOpacity>
              )}
            </View>

            {/* PLANES */}
            <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>PLANES DISPONIBLES</Text>
            {planes.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 30 }}>
                <Text style={{ fontSize: t.fs(14), color: t.text2, textAlign: 'center' }}>Todavía no hay planes disponibles</Text>
              </View>
            ) : planes.map(p => {
              const esActual = estado.activa && suscripcionActiva?.plan_id === p.id;
              return (
                <View key={p.id} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: esActual ? t.accent : t.border, borderRadius: 12, padding: 16, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: t.fs(15), fontWeight: '800', color: t.text, flex: 1 }}>{p.nombre}</Text>
                    <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.accent }}>
                      {formatPrecio(p.precio_cents, p.moneda)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 2, letterSpacing: 1, fontWeight: '700' }}>
                    {etiquetaPlan(p).toUpperCase()}{p.tipo === 'recurrente' ? ' · SE RENUEVA' : ' · PAGO ÚNICO'}
                  </Text>
                  {!!p.descripcion && <Text style={{ fontSize: t.fs(12), color: t.text2, marginTop: 6 }}>{p.descripcion}</Text>}
                  <TouchableOpacity onPress={() => checkoutPlan(p.id)} disabled={procesando || esActual}
                    style={{ marginTop: 12, backgroundColor: esActual ? t.border : t.accent, borderRadius: 10, padding: 12, alignItems: 'center', opacity: procesando ? 0.6 : 1 }}>
                    <Text style={{ fontSize: t.fs(12), fontWeight: '800', letterSpacing: 1, color: esActual ? t.text3 : '#fff' }}>
                      {esActual ? 'PLAN ACTUAL' : (p.tipo === 'recurrente' ? 'SUSCRIBIRME' : 'COMPRAR')}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}
