-- 016: Sistema de pagos (Stripe) — tienda (productos/pedidos) y planes (suscripciones)
--
-- Las tablas de dinero (pedidos, pedido_items, suscripciones, pagos, clientes_stripe)
-- solo se escriben desde Edge Functions con service role (create-checkout, stripe-webhook).
-- Los clientes solo pueden leer sus propias filas. Admins/coaches leen todo y pueden
-- actualizar el estado de pedidos y suscripciones.
-- Las FK de usuario apuntan a public.usuarios, NUNCA a auth.users.

-- ─── Helper: ¿el usuario actual es admin o coach? ──────────────────────────────
-- SECURITY DEFINER para no depender de las políticas RLS de usuarios.
CREATE OR REPLACE FUNCTION public.es_staff()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND rol IN ('admin', 'coach')
  );
$$;

REVOKE ALL ON FUNCTION public.es_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.es_staff() TO authenticated;

-- ─── Catálogo ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.productos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id       uuid NULL REFERENCES public.boxes(id) ON DELETE SET NULL,
  nombre       text NOT NULL,
  descripcion  text,
  precio_cents integer NOT NULL CHECK (precio_cents >= 0),
  moneda       text NOT NULL DEFAULT 'eur',
  imagen_url   text,
  categoria    text CHECK (categoria IN ('ropa', 'parches', 'otros')),
  activo       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.producto_variantes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  etiqueta    text NOT NULL,
  stock       integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  activo      boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.planes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id       uuid NULL REFERENCES public.boxes(id) ON DELETE SET NULL,
  nombre       text NOT NULL,
  descripcion  text,
  precio_cents integer NOT NULL CHECK (precio_cents >= 0),
  moneda       text NOT NULL DEFAULT 'eur',
  tipo         text NOT NULL CHECK (tipo IN ('recurrente', 'prepago')),
  meses        integer NOT NULL DEFAULT 1 CHECK (meses >= 1),
  activo       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── Dinero (solo service role escribe) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clientes_stripe (
  usuario_id         uuid PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pedidos (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id            uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  estado                text NOT NULL DEFAULT 'pendiente'
                          CHECK (estado IN ('pendiente', 'pagado', 'entregado', 'cancelado')),
  total_cents           integer NOT NULL CHECK (total_cents >= 0),
  moneda                text NOT NULL DEFAULT 'eur',
  stripe_session_id     text UNIQUE,
  stripe_payment_intent text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pedido_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id    uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  producto_id  uuid NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
  variante_id  uuid NULL REFERENCES public.producto_variantes(id) ON DELETE RESTRICT,
  cantidad     integer NOT NULL CHECK (cantidad > 0),
  precio_cents integer NOT NULL CHECK (precio_cents >= 0)
);

CREATE TABLE IF NOT EXISTS public.suscripciones (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id             uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  plan_id                uuid NOT NULL REFERENCES public.planes(id) ON DELETE RESTRICT,
  estado                 text NOT NULL DEFAULT 'pendiente'
                           CHECK (estado IN ('pendiente', 'activa', 'impago', 'cancelada', 'vencida')),
  stripe_subscription_id text UNIQUE,
  stripe_session_id      text,
  periodo_inicio         timestamptz,
  periodo_fin            timestamptz,
  cancelar_al_final      boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pagos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  tipo            text CHECK (tipo IN ('pedido', 'suscripcion')),
  referencia_id   uuid,
  importe_cents   integer,
  moneda          text,
  estado          text,
  stripe_event_id text NOT NULL UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── Índices ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS productos_box_activo_idx       ON public.productos (box_id, activo);
CREATE INDEX IF NOT EXISTS producto_variantes_producto_idx ON public.producto_variantes (producto_id);
CREATE INDEX IF NOT EXISTS planes_box_activo_idx          ON public.planes (box_id, activo);
CREATE INDEX IF NOT EXISTS pedidos_usuario_idx            ON public.pedidos (usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pedidos_estado_idx             ON public.pedidos (estado);
CREATE INDEX IF NOT EXISTS pedido_items_pedido_idx        ON public.pedido_items (pedido_id);
CREATE INDEX IF NOT EXISTS suscripciones_usuario_idx      ON public.suscripciones (usuario_id, estado);
CREATE INDEX IF NOT EXISTS suscripciones_session_idx      ON public.suscripciones (stripe_session_id);
CREATE INDEX IF NOT EXISTS pagos_usuario_idx              ON public.pagos (usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pagos_referencia_idx           ON public.pagos (referencia_id);

-- ─── Descuento de stock atómico (solo service role) ──────────────────────────
-- Resta sin bajar de 0 (el CHECK stock >= 0 haría fallar el webhook si hubo sobreventa).
CREATE OR REPLACE FUNCTION public.decrementar_stock(p_variante_id uuid, p_cantidad integer)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.producto_variantes
     SET stock = GREATEST(stock - p_cantidad, 0)
   WHERE id = p_variante_id;
$$;

REVOKE ALL ON FUNCTION public.decrementar_stock(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrementar_stock(uuid, integer) TO service_role;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.productos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto_variantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_stripe    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suscripciones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos              ENABLE ROW LEVEL SECURITY;

-- Borrar políticas previas de estas tablas para que la migración sea re-ejecutable
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('productos', 'producto_variantes', 'planes', 'clientes_stripe',
                        'pedidos', 'pedido_items', 'suscripciones', 'pagos')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END;
$$;

-- Catálogo: lectura de activos para autenticados; staff ve y gestiona todo
CREATE POLICY "productos_select" ON public.productos FOR SELECT TO authenticated
  USING (activo OR public.es_staff());
CREATE POLICY "productos_staff_write" ON public.productos FOR ALL TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

CREATE POLICY "producto_variantes_select" ON public.producto_variantes FOR SELECT TO authenticated
  USING (
    public.es_staff()
    OR (activo AND EXISTS (
      SELECT 1 FROM public.productos p WHERE p.id = producto_id AND p.activo
    ))
  );
CREATE POLICY "producto_variantes_staff_write" ON public.producto_variantes FOR ALL TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

CREATE POLICY "planes_select" ON public.planes FOR SELECT TO authenticated
  USING (activo OR public.es_staff());
CREATE POLICY "planes_staff_write" ON public.planes FOR ALL TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

-- Dinero: el usuario lee lo suyo; staff lee todo. Sin INSERT/DELETE para clientes.
CREATE POLICY "clientes_stripe_select" ON public.clientes_stripe FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.es_staff());

CREATE POLICY "pedidos_select" ON public.pedidos FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.es_staff());
CREATE POLICY "pedidos_staff_update" ON public.pedidos FOR UPDATE TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

CREATE POLICY "pedido_items_select" ON public.pedido_items FOR SELECT TO authenticated
  USING (
    public.es_staff()
    OR EXISTS (SELECT 1 FROM public.pedidos pe WHERE pe.id = pedido_id AND pe.usuario_id = auth.uid())
  );

CREATE POLICY "suscripciones_select" ON public.suscripciones FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.es_staff());
CREATE POLICY "suscripciones_staff_update" ON public.suscripciones FOR UPDATE TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

CREATE POLICY "pagos_select" ON public.pagos FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.es_staff());

-- Staff solo puede cambiar la columna estado (no importes ni ids de Stripe)
REVOKE UPDATE ON public.pedidos       FROM authenticated, anon;
REVOKE UPDATE ON public.suscripciones FROM authenticated, anon;
GRANT  UPDATE (estado) ON public.pedidos       TO authenticated;
GRANT  UPDATE (estado) ON public.suscripciones TO authenticated;
