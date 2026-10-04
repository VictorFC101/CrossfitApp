import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useTheme } from '../ThemeContext';
import { usePayments } from '../PaymentContext';
import { formatPrecio } from '../lib/payments';

const CATEGORIAS = [
  { key: 'todo', label: 'TODO' },
  { key: 'ropa', label: 'ROPA' },
  { key: 'parches', label: 'PARCHES' },
  { key: 'otros', label: 'OTROS' },
];

function Header({ t, titulo, onClose, derecha }) {
  return (
    <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ fontSize: t.fs(12), color: t.accent, fontWeight: '800', letterSpacing: 1 }}>{'‹ VOLVER'}</Text>
        </TouchableOpacity>
        {derecha}
      </View>
      <Text style={{ fontSize: t.fs(28), fontWeight: '900', letterSpacing: 2, color: t.text, marginTop: 6 }}>{titulo}</Text>
    </View>
  );
}

function ProductoCard({ t, producto, onAdd }) {
  const variantes = producto.variantes || [];
  const [varianteId, setVarianteId] = useState(null);
  const [aviso, setAviso] = useState(null);
  const variante = variantes.find(v => v.id === varianteId) || null;
  const agotado = variantes.length > 0 && variantes.every(v => (v.stock ?? 0) <= 0);

  const anadir = () => {
    if (variantes.length > 0 && !variante) { setAviso('Elige una talla/variante'); return; }
    setAviso(null);
    onAdd(producto, variante);
    setAviso('Añadido al carrito');
    setTimeout(() => setAviso(null), 1500);
  };

  return (
    <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {producto.imagen_url ? (
          <Image source={{ uri: producto.imagen_url }} style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: t.bg2 }} />
        ) : (
          <View style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: t.bg2, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28 }}>🛍️</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: t.fs(15), fontWeight: '800', color: t.text }}>{producto.nombre}</Text>
          {!!producto.descripcion && (
            <Text style={{ fontSize: t.fs(11), color: t.text2, marginTop: 2 }} numberOfLines={3}>{producto.descripcion}</Text>
          )}
          <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.accent, marginTop: 6 }}>
            {formatPrecio(producto.precio_cents, producto.moneda)}
          </Text>
        </View>
      </View>

      {variantes.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {variantes.map(v => {
            const sinStock = (v.stock ?? 0) <= 0;
            const sel = v.id === varianteId;
            return (
              <TouchableOpacity key={v.id} disabled={sinStock} onPress={() => { setVarianteId(v.id); setAviso(null); }}
                style={{
                  paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1,
                  borderColor: sel ? t.accent : t.border2,
                  backgroundColor: sel ? t.accent + '22' : 'transparent',
                  opacity: sinStock ? 0.4 : 1,
                }}>
                <Text style={{ fontSize: t.fs(12), fontWeight: '700', color: sel ? t.accent : t.text2, textDecorationLine: sinStock ? 'line-through' : 'none' }}>
                  {v.etiqueta}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity onPress={anadir} disabled={agotado}
        style={{ marginTop: 12, backgroundColor: agotado ? t.border : t.accent, borderRadius: 10, padding: 12, alignItems: 'center' }}>
        <Text style={{ fontSize: t.fs(12), fontWeight: '800', letterSpacing: 1, color: agotado ? t.text3 : '#fff' }}>
          {agotado ? 'AGOTADO' : 'AÑADIR AL CARRITO'}
        </Text>
      </TouchableOpacity>
      {!!aviso && (
        <Text style={{ fontSize: t.fs(11), color: t.text2, textAlign: 'center', marginTop: 6 }}>{aviso}</Text>
      )}
    </View>
  );
}

function Carrito({ t, pagos }) {
  const { carrito, total, cambiarCantidad, remove, clear, checkoutCarrito, procesando } = pagos;
  const moneda = carrito[0]?.moneda || 'EUR';

  if (!carrito.length) {
    return (
      <View style={{ alignItems: 'center', padding: 40 }}>
        <Text style={{ fontSize: 36 }}>🛒</Text>
        <Text style={{ fontSize: t.fs(14), color: t.text2, marginTop: 10, textAlign: 'center' }}>Tu carrito está vacío</Text>
      </View>
    );
  }

  return (
    <View>
      {carrito.map(l => (
        <View key={`${l.producto_id}:${l.variante_id || ''}`}
          style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: t.fs(14), fontWeight: '800', color: t.text }}>{l.nombre}</Text>
              {!!l.etiqueta && <Text style={{ fontSize: t.fs(11), color: t.text2 }}>{l.etiqueta}</Text>}
            </View>
            <Text style={{ fontSize: t.fs(14), fontWeight: '800', color: t.accent }}>
              {formatPrecio(l.precio_cents * l.cantidad, l.moneda)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => cambiarCantidad(l.producto_id, l.variante_id, l.cantidad - 1)}
                style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: t.border2, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: t.text, fontSize: t.fs(16), fontWeight: '800' }}>−</Text>
              </TouchableOpacity>
              <Text style={{ color: t.text, fontSize: t.fs(14), fontWeight: '800', minWidth: 20, textAlign: 'center' }}>{l.cantidad}</Text>
              <TouchableOpacity onPress={() => cambiarCantidad(l.producto_id, l.variante_id, l.cantidad + 1)}
                style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: t.border2, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: t.text, fontSize: t.fs(16), fontWeight: '800' }}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => remove(l.producto_id, l.variante_id)}>
              <Text style={{ fontSize: t.fs(11), color: t.text2, fontWeight: '700' }}>QUITAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 }}>
        <Text style={{ fontSize: t.fs(14), color: t.text2, fontWeight: '700' }}>TOTAL</Text>
        <Text style={{ fontSize: t.fs(20), color: t.text, fontWeight: '900' }}>{formatPrecio(total, moneda)}</Text>
      </View>

      <TouchableOpacity onPress={checkoutCarrito} disabled={procesando}
        style={{ backgroundColor: t.accent, borderRadius: 12, padding: 16, alignItems: 'center', opacity: procesando ? 0.6 : 1 }}>
        {procesando
          ? <ActivityIndicator color="#fff" />
          : <Text style={{ fontSize: t.fs(13), fontWeight: '800', letterSpacing: 1, color: '#fff' }}>PAGAR</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={clear} disabled={procesando} style={{ padding: 14, alignItems: 'center' }}>
        <Text style={{ fontSize: t.fs(11), color: t.text3, fontWeight: '700' }}>VACIAR CARRITO</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ShopScreen({ onClose }) {
  const t = useTheme();
  const pagos = usePayments();
  const { productos, loading, error, refresh, add, cantidadCarrito } = pagos;
  const [categoria, setCategoria] = useState('todo');
  const [verCarrito, setVerCarrito] = useState(false);

  const lista = categoria === 'todo' ? productos : productos.filter(p => p.categoria === categoria);

  const botonCarrito = (
    <TouchableOpacity onPress={() => setVerCarrito(v => !v)}
      style={{ borderWidth: 1, borderColor: t.accent, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 }}>
      <Text style={{ fontSize: t.fs(12), fontWeight: '800', color: t.accent }}>
        {verCarrito ? 'CATÁLOGO' : `🛒 CARRITO (${cantidadCarrito})`}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header t={t} titulo={verCarrito ? 'CARRITO' : 'TIENDA'} onClose={onClose} derecha={botonCarrito} />

      {!verCarrito && (
        <View style={{ flexDirection: 'row', gap: 6, padding: 12, paddingBottom: 0 }}>
          {CATEGORIAS.map(c => {
            const sel = categoria === c.key;
            return (
              <TouchableOpacity key={c.key} onPress={() => setCategoria(c.key)}
                style={{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center',
                  borderColor: sel ? t.accent : t.border2, backgroundColor: sel ? t.accent + '22' : 'transparent' }}>
                <Text style={{ fontSize: t.fs(10), fontWeight: '800', letterSpacing: 1, color: sel ? t.accent : t.text2 }}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
        {!!error && (
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.accent, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <Text style={{ fontSize: t.fs(12), color: t.text }}>{error}</Text>
            <TouchableOpacity onPress={refresh} style={{ marginTop: 8 }}>
              <Text style={{ fontSize: t.fs(12), color: t.accent, fontWeight: '800' }}>REINTENTAR</Text>
            </TouchableOpacity>
          </View>
        )}

        {verCarrito ? (
          <Carrito t={t} pagos={pagos} />
        ) : loading && productos.length === 0 ? (
          <ActivityIndicator color={t.accent} style={{ marginTop: 40 }} />
        ) : lista.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Text style={{ fontSize: 36 }}>🛍️</Text>
            <Text style={{ fontSize: t.fs(14), color: t.text2, marginTop: 10, textAlign: 'center' }}>
              {productos.length === 0 ? 'Todavía no hay productos en la tienda' : 'No hay productos en esta categoría'}
            </Text>
          </View>
        ) : (
          lista.map(p => <ProductoCard key={p.id} t={t} producto={p} onAdd={add} />)
        )}
      </ScrollView>
    </View>
  );
}
