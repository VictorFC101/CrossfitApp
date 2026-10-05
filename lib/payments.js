// Helpers puros de pagos (sin imports de React Native): fáciles de testear.

export function formatPrecio(cents, moneda = 'EUR') {
  const valor = (Number(cents) || 0) / 100;
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: String(moneda || 'EUR').toUpperCase(),
    }).format(valor);
  } catch (e) {
    return `${valor.toFixed(2).replace('.', ',')} ${moneda || ''}`.trim();
  }
}

const mismaLinea = (a, b) =>
  a.producto_id === b.producto_id && (a.variante_id || null) === (b.variante_id || null);

export function cartTotal(carrito) {
  return (carrito || []).reduce(
    (acc, l) => acc + (Number(l.precio_cents) || 0) * (Number(l.cantidad) || 0),
    0
  );
}

export function cartCount(carrito) {
  return (carrito || []).reduce((acc, l) => acc + (Number(l.cantidad) || 0), 0);
}

// linea: { producto_id, variante_id, cantidad?, precio_cents, nombre?, etiqueta?, moneda?, imagen_url? }
export function addToCart(carrito, linea) {
  const base = carrito || [];
  const cant = Math.max(1, Math.floor(Number(linea.cantidad) || 1));
  const existe = base.some(l => mismaLinea(l, linea));
  if (existe) {
    return base.map(l => (mismaLinea(l, linea) ? { ...l, cantidad: l.cantidad + cant } : l));
  }
  return [...base, { ...linea, variante_id: linea.variante_id || null, cantidad: cant }];
}

export function removeFromCart(carrito, producto_id, variante_id = null) {
  const ref = { producto_id, variante_id: variante_id || null };
  return (carrito || []).filter(l => !mismaLinea(l, ref));
}

// cantidad <= 0 elimina la línea
export function setQty(carrito, producto_id, variante_id, cantidad) {
  const ref = { producto_id, variante_id: variante_id || null };
  const q = Math.floor(Number(cantidad) || 0);
  if (q <= 0) return removeFromCart(carrito, producto_id, variante_id);
  return (carrito || []).map(l => (mismaLinea(l, ref) ? { ...l, cantidad: q } : l));
}

const DIA_MS = 24 * 60 * 60 * 1000;

export function estadoMembresia(suscripcion, now = new Date()) {
  if (!suscripcion) return { activa: false, diasRestantes: 0, etiqueta: 'Sin membresía' };
  const fin = suscripcion.periodo_fin ? new Date(suscripcion.periodo_fin) : null;
  const finValido = fin && !isNaN(fin.getTime());
  const diasRestantes = finValido ? Math.max(0, Math.ceil((fin.getTime() - new Date(now).getTime()) / DIA_MS)) : 0;
  const estado = suscripcion.estado;
  let activa = false;
  let etiqueta;
  switch (estado) {
    case 'activa':
      // Sin fecha de fin válida nunca es activa: sería una membresía sin límite
      activa = Boolean(finValido) && diasRestantes > 0;
      etiqueta = !activa
        ? 'Vencida'
        : suscripcion.cancelar_al_final
          ? `Cancelada, activa ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'} más`
          : 'Activa';
      break;
    case 'impago': etiqueta = 'Pago pendiente'; break;
    case 'pendiente': etiqueta = 'Pendiente de pago'; break;
    case 'cancelada': etiqueta = 'Cancelada'; break;
    case 'vencida': etiqueta = 'Vencida'; break;
    default: etiqueta = 'Sin membresía';
  }
  return { activa, diasRestantes, etiqueta };
}

export function etiquetaPlan(plan) {
  if (!plan) return '';
  const meses = Number(plan.meses) || 1;
  if (plan.tipo === 'recurrente' && meses === 1) return 'Mensual';
  if (meses === 1) return '1 mes';
  if (meses === 12) return 'Anual';
  return `${meses} meses`;
}

export const ETIQUETA_PEDIDO = {
  pendiente: 'Pendiente de pago',
  pagado: 'Pagado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};
