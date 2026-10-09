-- 020: pagos — problemas MEDIOS
--   A) Reserva de stock al crear el pedido (RPC crear_pedido_reservando): sin sobreventa.
--   C) Catálogo por box: helper mi_box_id() + políticas SELECT de productos / variantes / planes.
--   D) Si un producto tiene variantes (activas o no) la línea exige variante_id activa.
--   marcar_pedido_pagado: bloquea las variantes en orden de id (mismo orden que la reserva).
-- Idempotente (re-ejecutable). Cada bloque (BLOQUE n) se puede aplicar por separado, en orden.
-- Aplicar ANTES de desplegar create-checkout (usa crear_pedido_reservando).

-- ── BLOQUE 1) Helper: box del usuario actual ───────────────────────────────────
-- SECURITY DEFINER para no depender de las políticas RLS de usuarios.
CREATE OR REPLACE FUNCTION public.mi_box_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT box_id FROM public.usuarios WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.mi_box_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mi_box_id() TO authenticated, service_role;

-- ── BLOQUE 2) Catálogo visible solo del box propio (o global, box_id NULL) ──────
-- Staff sigue viendo todo (además, las políticas *_staff_write FOR ALL ya le dan SELECT).
-- Usuario sin box (mi_box_id() NULL) solo ve artículos con box_id NULL.
ALTER POLICY "productos_select" ON public.productos
  USING (
    (SELECT public.es_staff())
    OR (activo AND (box_id IS NULL OR box_id = (SELECT public.mi_box_id())))
  );

ALTER POLICY "producto_variantes_select" ON public.producto_variantes
  USING (
    (SELECT public.es_staff())
    OR (activo AND EXISTS (
      SELECT 1 FROM public.productos p
       WHERE p.id = producto_variantes.producto_id
         AND p.activo
         AND (p.box_id IS NULL OR p.box_id = (SELECT public.mi_box_id()))
    ))
  );

ALTER POLICY "planes_select" ON public.planes
  USING (
    (SELECT public.es_staff())
    OR (activo AND (box_id IS NULL OR box_id = (SELECT public.mi_box_id())))
  );

-- ── BLOQUE 3) Índice para contar reservas (pedidos pendientes recientes) ────────
CREATE INDEX IF NOT EXISTS pedidos_pendientes_created_idx
  ON public.pedidos (created_at) WHERE estado = 'pendiente';

-- ── BLOQUE 4) Crear pedido reservando stock (solo service role) ────────────────
-- Una sola transacción:
--   1. bloquea (FOR UPDATE, orden por id → sin deadlocks) TODAS las variantes de los
--      productos del carrito; dos compras simultáneas de la misma variante se serializan;
--   2. valida producto activo, box del comprador, moneda única, variante obligatoria si el
--      producto tiene alguna variante (activa o no) y que pertenezca al producto y esté activa;
--   3. disponible = stock − unidades en pedidos 'pendiente' de los últimos 35 min
--      (ventana de reserva; la Checkout Session caduca a los ~31 min, así que un pendiente
--      más antiguo ya no se puede pagar y deja de contar solo, sin jobs de limpieza);
--   4. inserta pedido + pedido_items con precios leídos de productos (nunca del cliente).
-- Los productos SIN variantes no llevan control de stock.
-- Errores: SQLSTATE PT400 / PT403 / PT409 (PostgREST responde con ese HTTP status) con
-- mensaje en español apto para mostrar al usuario.
-- Devuelve jsonb { pedido_id, total_cents, moneda, items:[{producto_id, variante_id, cantidad,
--   precio_cents, nombre, descripcion, imagen_url, etiqueta}] } en el orden del carrito.
CREATE OR REPLACE FUNCTION public.crear_pedido_reservando(p_usuario_id uuid, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_box     uuid;
  v_moneda  text;
  v_total   bigint := 0;
  v_pedido  uuid;
  v_items   jsonb;
  r         record;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El carrito está vacío' USING ERRCODE = 'PT400';
  END IF;
  IF jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Demasiados artículos en el carrito' USING ERRCODE = 'PT400';
  END IF;

  SELECT u.box_id INTO v_box FROM public.usuarios u WHERE u.id = p_usuario_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de usuario no encontrado' USING ERRCODE = 'PT403';
  END IF;

  -- 1) Bloqueo determinista de las variantes implicadas
  PERFORM 1
     FROM public.producto_variantes v
    WHERE v.producto_id IN (
            SELECT (e->>'producto_id')::uuid FROM jsonb_array_elements(p_items) e)
    ORDER BY v.id
      FOR UPDATE;

  -- 2) Validación línea a línea (precios y estado leídos de la BD)
  FOR r IN
    SELECT e.ord, x.producto_id, x.variante_id, x.cantidad,
           p.id AS pid, p.nombre, p.precio_cents, p.moneda, p.activo, p.box_id,
           v.id AS vid, v.producto_id AS v_producto, v.activo AS v_activo,
           EXISTS (SELECT 1 FROM public.producto_variantes pv
                    WHERE pv.producto_id = x.producto_id) AS tiene_variantes
      FROM jsonb_array_elements(p_items) WITH ORDINALITY AS e(val, ord)
     CROSS JOIN LATERAL jsonb_to_record(e.val) AS x(producto_id uuid, variante_id uuid, cantidad integer)
      LEFT JOIN public.productos p ON p.id = x.producto_id
      LEFT JOIN public.producto_variantes v ON v.id = x.variante_id
     ORDER BY e.ord
  LOOP
    IF r.cantidad IS NULL OR r.cantidad < 1 OR r.cantidad > 99 THEN
      RAISE EXCEPTION 'Cantidad inválida' USING ERRCODE = 'PT400';
    END IF;
    IF r.pid IS NULL OR NOT r.activo THEN
      RAISE EXCEPTION 'Un producto ya no está disponible' USING ERRCODE = 'PT409';
    END IF;
    IF r.box_id IS NOT NULL AND r.box_id IS DISTINCT FROM v_box THEN
      RAISE EXCEPTION '"%" no está disponible en tu box', r.nombre USING ERRCODE = 'PT403';
    END IF;
    IF v_moneda IS NOT NULL AND r.moneda <> v_moneda THEN
      RAISE EXCEPTION 'No se pueden mezclar monedas' USING ERRCODE = 'PT400';
    END IF;
    v_moneda := r.moneda;
    IF r.variante_id IS NOT NULL THEN
      IF r.vid IS NULL OR r.v_producto <> r.pid OR NOT r.v_activo THEN
        RAISE EXCEPTION 'La variante de "%" ya no está disponible', r.nombre USING ERRCODE = 'PT409';
      END IF;
    ELSIF r.tiene_variantes THEN
      RAISE EXCEPTION 'Selecciona una talla/variante para "%"', r.nombre USING ERRCODE = 'PT400';
    END IF;
    v_total := v_total + r.precio_cents::bigint * r.cantidad;
  END LOOP;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'El total del pedido debe ser mayor que 0' USING ERRCODE = 'PT400';
  END IF;
  IF v_total > 2147483647 THEN
    RAISE EXCEPTION 'El total del pedido es demasiado alto' USING ERRCODE = 'PT400';
  END IF;

  -- 3) Disponibilidad = stock − reservas vigentes (después del bloqueo: nueva instantánea)
  FOR r IN
    WITH pedido AS (
      SELECT x.variante_id, sum(x.cantidad)::bigint AS cant
        FROM jsonb_to_recordset(p_items) AS x(variante_id uuid, cantidad integer)
       WHERE x.variante_id IS NOT NULL
       GROUP BY x.variante_id
    )
    SELECT pd.cant, v.stock, v.etiqueta, p.nombre,
           COALESCE((
             SELECT sum(pi.cantidad)
               FROM public.pedido_items pi
               JOIN public.pedidos pe ON pe.id = pi.pedido_id
              WHERE pi.variante_id = pd.variante_id
                AND pe.estado = 'pendiente'
                AND pe.created_at > now() - interval '35 minutes'
           ), 0) AS reservado
      FROM pedido pd
      JOIN public.producto_variantes v ON v.id = pd.variante_id
      JOIN public.productos p ON p.id = v.producto_id
  LOOP
    IF r.stock - r.reservado < r.cant THEN
      RAISE EXCEPTION 'Sin stock suficiente de "%" (%)', r.nombre, r.etiqueta USING ERRCODE = 'PT409';
    END IF;
  END LOOP;

  -- 4) Pedido + líneas
  INSERT INTO public.pedidos (usuario_id, estado, total_cents, moneda)
  VALUES (p_usuario_id, 'pendiente', v_total::integer, v_moneda)
  RETURNING id INTO v_pedido;

  INSERT INTO public.pedido_items (pedido_id, producto_id, variante_id, cantidad, precio_cents)
  SELECT v_pedido, x.producto_id, x.variante_id, x.cantidad, p.precio_cents
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS e(val, ord)
   CROSS JOIN LATERAL jsonb_to_record(e.val) AS x(producto_id uuid, variante_id uuid, cantidad integer)
    JOIN public.productos p ON p.id = x.producto_id
   ORDER BY e.ord;

  SELECT jsonb_agg(jsonb_build_object(
           'producto_id', x.producto_id,
           'variante_id', x.variante_id,
           'cantidad', x.cantidad,
           'precio_cents', p.precio_cents,
           'nombre', p.nombre,
           'descripcion', p.descripcion,
           'imagen_url', p.imagen_url,
           'etiqueta', v.etiqueta) ORDER BY e.ord)
    INTO v_items
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS e(val, ord)
   CROSS JOIN LATERAL jsonb_to_record(e.val) AS x(producto_id uuid, variante_id uuid, cantidad integer)
    JOIN public.productos p ON p.id = x.producto_id
    LEFT JOIN public.producto_variantes v ON v.id = x.variante_id;

  RETURN jsonb_build_object(
    'pedido_id', v_pedido,
    'total_cents', v_total,
    'moneda', v_moneda,
    'items', v_items);
END;
$$;
REVOKE ALL ON FUNCTION public.crear_pedido_reservando(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crear_pedido_reservando(uuid, jsonb) TO service_role;

-- ── BLOQUE 5) marcar_pedido_pagado: mismo orden de bloqueo que la reserva ───────
-- pendiente → pagado + descuento de stock en una transacción. El pedido deja de contar como
-- reserva en el mismo instante en que se descuenta su stock (nunca cuenta doble).
-- GREATEST(..., 0) se mantiene como red de seguridad (el CHECK stock >= 0 haría fallar el
-- webhook): con la reserva de crear_pedido_reservando la sobreventa ya no es posible en la
-- práctica; solo podría darse si un pago se confirma después de la ventana de 35 min
-- (p.ej. método de pago asíncrono o webhook muy retrasado) o si staff baja el stock a mano.
CREATE OR REPLACE FUNCTION public.marcar_pedido_pagado(p_pedido_id uuid, p_payment_intent text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.pedidos
     SET estado = 'pagado',
         stripe_payment_intent = COALESCE(p_payment_intent, stripe_payment_intent)
   WHERE id = p_pedido_id AND estado = 'pendiente';
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Bloqueo en orden de id (igual que crear_pedido_reservando) para evitar deadlocks
  PERFORM 1
     FROM public.producto_variantes v
    WHERE v.id IN (SELECT i.variante_id FROM public.pedido_items i
                    WHERE i.pedido_id = p_pedido_id AND i.variante_id IS NOT NULL)
    ORDER BY v.id
      FOR UPDATE;

  UPDATE public.producto_variantes v
     SET stock = GREATEST(v.stock - i.cantidad, 0)
    FROM (
      SELECT variante_id, sum(cantidad)::integer AS cantidad
        FROM public.pedido_items
       WHERE pedido_id = p_pedido_id AND variante_id IS NOT NULL
       GROUP BY variante_id
    ) i
   WHERE v.id = i.variante_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.marcar_pedido_pagado(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_pedido_pagado(uuid, text) TO service_role;
