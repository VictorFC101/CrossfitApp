import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import { STORAGE_KEYS } from './constants';
import { addToCart, removeFromCart, setQty, cartTotal, cartCount, estadoMembresia, unirSuscripciones } from './lib/payments';

const PaymentContext = createContext(null);

const MSG_GENERICO = 'No se pudo completar la operación. Inténtalo de nuevo.';

// Extrae un mensaje legible de un error de supabase.functions.invoke
async function mensajeError(error, fallback = MSG_GENERICO) {
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.json();
      if (body?.error && typeof body.error === 'string') return body.error;
    }
  } catch (e) {}
  return fallback;
}

export function PaymentProvider({ userId, children }) {
  const [productos, setProductos] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [suscripcion, setSuscripcion] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [loading, setLoading] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);
  const carritoCargado = useRef(false);

  // Carrito persistido
  useEffect(() => {
    (async () => {
      try {
        const pagoOk = Platform.OS === 'web' && typeof window !== 'undefined'
          && (window.location?.pathname || '').startsWith('/pago/exito');
        const raw = pagoOk ? null : await AsyncStorage.getItem(STORAGE_KEYS.CARRITO);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setCarrito(parsed);
        }
      } catch (e) {}
      carritoCargado.current = true;
    })();
  }, []);

  useEffect(() => {
    if (!carritoCargado.current) return;
    AsyncStorage.setItem(STORAGE_KEYS.CARRITO, JSON.stringify(carrito)).catch(() => {});
  }, [carrito]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [rProd, rPlan, rSus, rSusVivas, rPed] = await Promise.all([
        supabase.from('productos').select('*, variantes:producto_variantes(*)').eq('activo', true).order('nombre'),
        supabase.from('planes').select('*').eq('activo', true).order('precio_cents'),
        supabase.from('suscripciones').select('*, plan:plan_id(*)').eq('usuario_id', userId)
          .order('created_at', { ascending: false }).limit(5),
        // Las activas/impagadas se piden aparte: los intentos de pago abandonados (pendiente)
        // podrían sacar una membresía vigente de las 5 más recientes.
        supabase.from('suscripciones').select('*, plan:plan_id(*)').eq('usuario_id', userId)
          .in('estado', ['activa', 'impago']).order('periodo_fin', { ascending: false }).limit(5),
        supabase.from('pedidos')
          .select('*, items:pedido_items(*, producto:producto_id(nombre), variante:variante_id(etiqueta))')
          .eq('usuario_id', userId).order('created_at', { ascending: false }).limit(50),
      ]);
      const fallo = [rProd, rPlan, rSus, rSusVivas, rPed].find(r => r.error);
      if (fallo) throw fallo.error;
      setProductos((rProd.data || []).map(p => ({
        ...p,
        variantes: (p.variantes || []).filter(v => v.activo !== false),
      })));
      setPlanes(rPlan.data || []);
      setSuscripcion(unirSuscripciones(rSusVivas.data, rSus.data));
      setPedidos(rPed.data || []);
    } catch (e) {
      setError('No se pudo cargar la tienda. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Al volver a la app (p. ej. tras pagar en el navegador) se recargan los datos
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s === 'active') refresh(); });
    return () => sub.remove();
  }, [refresh]);

  // Web: Stripe redirige a /pago/exito o /pago/cancelado; se limpia la URL tras refrescar
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const path = window.location?.pathname || '';
    if (path.startsWith('/pago/')) {
      try { window.history.replaceState({}, '', '/'); } catch (e) {}
    }
  }, []);

  // La suscripción vigente: la primera activa, si no la más reciente
  const sesList = Array.isArray(suscripcion) ? suscripcion : [];
  const suscripcionActiva = sesList.find(s => estadoMembresia(s).activa) || sesList[0] || null;

  const add = (producto, variante, cantidad = 1) => {
    if (!producto) return;
    setCarrito(c => addToCart(c, {
      producto_id: producto.id,
      variante_id: variante?.id || null,
      cantidad,
      precio_cents: producto.precio_cents,
      moneda: producto.moneda,
      nombre: producto.nombre,
      etiqueta: variante?.etiqueta || null,
      imagen_url: producto.imagen_url || null,
    }));
  };
  const remove = (producto_id, variante_id = null) => setCarrito(c => removeFromCart(c, producto_id, variante_id));
  const cambiarCantidad = (producto_id, variante_id, cantidad) => setCarrito(c => setQty(c, producto_id, variante_id, cantidad));
  const clear = () => setCarrito([]);

  // Abre la URL de Stripe y refresca al volver. Devuelve 'exito' | 'cancelado' | 'cerrado'
  const abrirUrl = async (url) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.location.assign(url);
      return 'cerrado';
    }
    const res = await WebBrowser.openAuthSessionAsync(url, 'wodly://pago');
    await refresh();
    if (res?.type === 'success' && res.url) {
      if (res.url.includes('pago/exito')) return 'exito';
      if (res.url.includes('pago/cancelado')) return 'cancelado';
    }
    return 'cerrado';
  };

  const invocar = async (nombre, body) => {
    setProcesando(true);
    setError(null);
    try {
      const payload = { ...body };
      if (Platform.OS === 'web' && typeof window !== 'undefined') payload.return_url_base = window.location.origin;
      const { data, error: err } = await supabase.functions.invoke(nombre, { body: payload });
      if (err) throw new Error(await mensajeError(err));
      if (!data?.url) throw new Error(data?.error || 'No se recibió el enlace de pago.');
      return await abrirUrl(data.url);
    } catch (e) {
      setError(e?.message || MSG_GENERICO);
      return null;
    } finally {
      setProcesando(false);
    }
  };

  const checkoutCarrito = async () => {
    if (!carrito.length) { setError('El carrito está vacío.'); return null; }
    const items = carrito.map(l => ({ producto_id: l.producto_id, variante_id: l.variante_id, cantidad: l.cantidad }));
    const r = await invocar('create-checkout', { tipo: 'producto', items });
    if (r === 'exito') setCarrito([]);
    return r;
  };

  const checkoutPlan = (planId) => invocar('create-checkout', { tipo: 'plan', plan_id: planId });

  const abrirPortal = () => invocar('create-portal-session', {});

  const value = {
    productos, planes, suscripcionActiva, pedidos, carrito,
    total: cartTotal(carrito), cantidadCarrito: cartCount(carrito),
    add, remove, cambiarCantidad, clear,
    checkoutCarrito, checkoutPlan, abrirPortal, refresh,
    loading, procesando, error, limpiarError: () => setError(null),
  };

  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>;
}

export function usePayments() {
  const ctx = useContext(PaymentContext);
  if (!ctx) throw new Error('usePayments debe usarse dentro de PaymentProvider');
  return ctx;
}
