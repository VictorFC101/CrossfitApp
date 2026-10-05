-- 017: endurecimiento de pagos (Stripe)
--   1) Solo admins (no coaches) pueden actualizar pedidos y suscripciones desde la API.
--   2) Triggers guard: desde la API solo se permiten transiciones "hacia abajo"
--      (nunca regalar una membresía activa ni marcar un pedido como pagado).
--   3) CHECK: una suscripción 'activa' siempre tiene periodo_fin.
--   4) suscripciones.stripe_payment_intent para enlazar reembolsos (charge.refunded) de prepagos.
--   5) RPC marcar_pedido_pagado: pendiente → pagado + descuento de stock en una transacción.
--   6) es_staff() fuera de anon.
-- Idempotente (re-ejecutable). Aplicar ANTES de desplegar la versión nueva de stripe-webhook.

-- ── 4) Columna para enlazar reembolsos de prepagos ────────────────────────────
ALTER TABLE public.suscripciones ADD COLUMN IF NOT EXISTS stripe_payment_intent text;
CREATE INDEX IF NOT EXISTS suscripciones_payment_intent_idx ON public.suscripciones (stripe_payment_intent);
CREATE INDEX IF NOT EXISTS pedidos_payment_intent_idx       ON public.pedidos (stripe_payment_intent);

-- ── 1) UPDATE solo para admins (SELECT sigue siendo es_staff) ─────────────────
DROP POLICY IF EXISTS "pedidos_staff_update" ON public.pedidos;
CREATE POLICY "pedidos_staff_update" ON public.pedidos FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "suscripciones_staff_update" ON public.suscripciones;
CREATE POLICY "suscripciones_staff_update" ON public.suscripciones FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

-- El GRANT por columna de 016 se mantiene: desde la API solo se puede tocar "estado".
REVOKE UPDATE ON public.pedidos       FROM authenticated, anon;
REVOKE UPDATE ON public.suscripciones FROM authenticated, anon;
GRANT  UPDATE (estado) ON public.pedidos       TO authenticated;
GRANT  UPDATE (estado) ON public.suscripciones TO authenticated;

-- ── 2) Guards (SECURITY INVOKER, mismo patrón que usuarios_guard de 015) ──────
-- Service role (webhook / create-checkout) y funciones SECURITY DEFINER no se ven afectados:
-- current_user no es 'authenticated' ni 'anon'.
CREATE OR REPLACE FUNCTION public.suscripciones_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - 'estado') IS DISTINCT FROM (to_jsonb(OLD) - 'estado') THEN
    RAISE EXCEPTION 'Solo se puede cambiar el estado de la suscripción' USING ERRCODE = '42501';
  END IF;
  IF NEW.estado IS DISTINCT FROM OLD.estado AND NEW.estado NOT IN ('cancelada', 'vencida') THEN
    RAISE EXCEPTION 'Solo se puede cancelar o dar por vencida una suscripción (los pagos los activa Stripe)'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS suscripciones_guard ON public.suscripciones;
CREATE TRIGGER suscripciones_guard BEFORE UPDATE ON public.suscripciones
  FOR EACH ROW EXECUTE FUNCTION public.suscripciones_guard();

CREATE OR REPLACE FUNCTION public.pedidos_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - 'estado') IS DISTINCT FROM (to_jsonb(OLD) - 'estado') THEN
    RAISE EXCEPTION 'Solo se puede cambiar el estado del pedido' USING ERRCODE = '42501';
  END IF;
  IF NEW.estado IS DISTINCT FROM OLD.estado AND NOT (
       (OLD.estado = 'pagado' AND NEW.estado = 'entregado')
    OR (OLD.estado IN ('pendiente', 'pagado') AND NEW.estado = 'cancelado')
  ) THEN
    RAISE EXCEPTION 'Cambio de estado de pedido no permitido (% → %)', OLD.estado, NEW.estado
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS pedidos_guard ON public.pedidos;
CREATE TRIGGER pedidos_guard BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.pedidos_guard();

REVOKE EXECUTE ON FUNCTION public.suscripciones_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pedidos_guard()       FROM PUBLIC, anon, authenticated;

-- ── 3) CHECK: 'activa' implica periodo_fin ────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'suscripciones_activa_con_fin' AND conrelid = 'public.suscripciones'::regclass
  ) THEN
    ALTER TABLE public.suscripciones
      ADD CONSTRAINT suscripciones_activa_con_fin
      CHECK (estado <> 'activa' OR periodo_fin IS NOT NULL) NOT VALID;
  END IF;
END;
$$;

-- Validar solo si no hay filas que lo incumplan; si las hay, el CHECK ya protege las
-- escrituras nuevas y se avisa para revisarlas a mano (no se modifican datos aquí).
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.suscripciones WHERE estado = 'activa' AND periodo_fin IS NULL;
  IF n = 0 THEN
    ALTER TABLE public.suscripciones VALIDATE CONSTRAINT suscripciones_activa_con_fin;
  ELSE
    RAISE WARNING '017: % suscripciones activas sin periodo_fin; revisar y ejecutar VALIDATE CONSTRAINT suscripciones_activa_con_fin', n;
  END IF;
END;
$$;

-- ── 5) pendiente → pagado + stock, atómico (solo service role) ────────────────
-- Devuelve true si esta llamada hizo la transición (y descontó stock), false si ya no estaba pendiente.
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

-- ── 6) es_staff() no es para anon (Supabase concede EXECUTE a anon por defecto) ─
REVOKE EXECUTE ON FUNCTION public.es_staff() FROM anon;
