-- 018: P3 — rendimiento de RLS, índices de FK, políticas duplicadas y columna avatar_url

-- ── A) auth.uid() evaluado una vez por consulta (no por fila): (SELECT auth.uid())
ALTER POLICY "Eliminar amistad" ON public.amistades USING ((((SELECT auth.uid()) = user_id) OR ((SELECT auth.uid()) = friend_id)));
ALTER POLICY "Enviar solicitud" ON public.amistades WITH CHECK (((SELECT auth.uid()) = user_id));
ALTER POLICY "Ver mis amistades" ON public.amistades USING ((((SELECT auth.uid()) = user_id) OR ((SELECT auth.uid()) = friend_id)));
ALTER POLICY "Usuario puede actualizar su asignacion" ON public.asignaciones USING ((((SELECT auth.uid()) = user_id) OR ((SELECT auth.uid()) = coach_id)));
ALTER POLICY "Usuario ve sus asignaciones" ON public.asignaciones USING ((((SELECT auth.uid()) = user_id) OR ((SELECT auth.uid()) = coach_id)));
ALTER POLICY clientes_stripe_select ON public.clientes_stripe USING (((usuario_id = (SELECT auth.uid())) OR es_staff()));
ALTER POLICY "Crear comentario" ON public.comentarios WITH CHECK (((SELECT auth.uid()) = user_id));
ALTER POLICY "Eliminar propio comentario" ON public.comentarios USING (((SELECT auth.uid()) = user_id));
ALTER POLICY "Insertar actividad propia" ON public.feed_actividad WITH CHECK (((SELECT auth.uid()) = user_id));
ALTER POLICY feed_actividad_delete_own ON public.feed_actividad USING ((user_id = (SELECT auth.uid())));
ALTER POLICY feed_actividad_select ON public.feed_actividad USING (((user_id = (SELECT auth.uid())) OR (user_id IN ( SELECT
        CASE
            WHEN (amistades.user_id = (SELECT auth.uid())) THEN amistades.friend_id
            ELSE amistades.user_id
        END AS user_id
   FROM amistades
  WHERE (((amistades.user_id = (SELECT auth.uid())) OR (amistades.friend_id = (SELECT auth.uid()))) AND (amistades.status = 'aceptada'::text)))) OR (user_id IN ( SELECT usuarios.id
   FROM usuarios
  WHERE ((usuarios.box_id = ( SELECT usuarios_1.box_id
           FROM usuarios usuarios_1
          WHERE (usuarios_1.id = (SELECT auth.uid())))) AND (usuarios.box_id IS NOT NULL))))));
ALTER POLICY "Usuario actualiza sus notificaciones" ON public.notificaciones USING (((SELECT auth.uid()) = user_id));
ALTER POLICY "Usuario ve sus notificaciones" ON public.notificaciones USING (((SELECT auth.uid()) = user_id));
ALTER POLICY pagos_select ON public.pagos USING (((usuario_id = (SELECT auth.uid())) OR es_staff()));
ALTER POLICY pedido_items_select ON public.pedido_items USING ((es_staff() OR (EXISTS ( SELECT 1
   FROM pedidos pe
  WHERE ((pe.id = pedido_items.pedido_id) AND (pe.usuario_id = (SELECT auth.uid())))))));
ALTER POLICY pedidos_select ON public.pedidos USING (((usuario_id = (SELECT auth.uid())) OR es_staff()));
ALTER POLICY "user owns historial" ON public.rms_historial USING (((SELECT auth.uid()) = user_id));
ALTER POLICY partner_req_insert ON public.solicitudes_partner WITH CHECK ((solicitante_id = (SELECT auth.uid())));
ALTER POLICY partner_req_read ON public.solicitudes_partner USING (((solicitante_id = (SELECT auth.uid())) OR (receptor_id = (SELECT auth.uid()))));
ALTER POLICY partner_req_update ON public.solicitudes_partner USING (((receptor_id = (SELECT auth.uid())) OR (solicitante_id = (SELECT auth.uid()))));
ALTER POLICY suscripciones_select ON public.suscripciones USING (((usuario_id = (SELECT auth.uid())) OR es_staff()));
ALTER POLICY "Actualizar usuario" ON public.usuarios USING (((id = (SELECT auth.uid())) OR (SELECT public.is_admin()))) WITH CHECK (((id = (SELECT auth.uid())) OR (SELECT public.is_admin())));

-- ── C) Una política por acción (sin ALL solapados)
-- programas: el admin entra en cada política del coach
DROP POLICY IF EXISTS "Admin gestiona programas" ON public.programas;
ALTER POLICY "Coach gestiona sus programas" ON public.programas WITH CHECK (((SELECT auth.uid()) = coach_id) OR (SELECT public.is_admin()));
ALTER POLICY "Coach actualiza sus programas" ON public.programas USING (((SELECT auth.uid()) = coach_id) OR (SELECT public.is_admin()));
ALTER POLICY "Coach elimina sus programas" ON public.programas USING (((SELECT auth.uid()) = coach_id) OR (SELECT public.is_admin()));

-- boxes: lectura pública (ya existe) + escritura solo admin, por acción
DROP POLICY IF EXISTS "Admin puede gestionar boxes" ON public.boxes;
CREATE POLICY "Admin crea boxes"     ON public.boxes FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin actualiza boxes" ON public.boxes FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin elimina boxes"  ON public.boxes FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- reacciones: insert / update / delete explícitos (regla del proyecto: nunca upsert)
DROP POLICY IF EXISTS "Gestionar propia reaccion" ON public.reacciones;
CREATE POLICY "Crear propia reaccion"      ON public.reacciones FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Actualizar propia reaccion" ON public.reacciones FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Eliminar propia reaccion"   ON public.reacciones FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- ── B) Índices de las FK (y el patrón de consulta del gráfico de RMs)
CREATE INDEX IF NOT EXISTS asignaciones_coach_id_idx        ON public.asignaciones (coach_id);
CREATE INDEX IF NOT EXISTS asignaciones_programa_id_idx     ON public.asignaciones (programa_id);
CREATE INDEX IF NOT EXISTS asignaciones_user_id_idx         ON public.asignaciones (user_id);
CREATE INDEX IF NOT EXISTS boxes_created_by_idx             ON public.boxes (created_by);
CREATE INDEX IF NOT EXISTS comentarios_user_id_idx          ON public.comentarios (user_id);
CREATE INDEX IF NOT EXISTS notificaciones_sender_id_idx     ON public.notificaciones (sender_id);
CREATE INDEX IF NOT EXISTS notificaciones_user_id_idx       ON public.notificaciones (user_id);
CREATE INDEX IF NOT EXISTS pedido_items_producto_id_idx     ON public.pedido_items (producto_id);
CREATE INDEX IF NOT EXISTS pedido_items_variante_id_idx     ON public.pedido_items (variante_id);
CREATE INDEX IF NOT EXISTS programas_coach_id_idx           ON public.programas (coach_id);
CREATE INDEX IF NOT EXISTS rms_historial_user_mov_reps_idx  ON public.rms_historial (user_id, movimiento, reps, fecha);
CREATE INDEX IF NOT EXISTS solicitudes_partner_receptor_idx ON public.solicitudes_partner (receptor_id);
CREATE INDEX IF NOT EXISTS suscripciones_plan_id_idx        ON public.suscripciones (plan_id);
CREATE INDEX IF NOT EXISTS usuarios_box_id_idx              ON public.usuarios (box_id);
CREATE INDEX IF NOT EXISTS usuarios_partner_id_idx          ON public.usuarios (partner_id);

-- ── D) avatar_url: la app la escribía pero la columna no existía (la foto nunca se guardaba)
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS avatar_url text;
GRANT SELECT (avatar_url) ON public.usuarios TO authenticated;

CREATE OR REPLACE VIEW public.usuarios_publicos WITH (security_invoker = true) AS
  SELECT u.id, u.nombre, u.genero, u.rol, u.box_id, b.nombre AS box_nombre, b.ciudad AS box_ciudad, u.avatar_url
  FROM usuarios u LEFT JOIN boxes b ON b.id = u.box_id;

CREATE OR REPLACE FUNCTION public.get_user_public_info(p_user_id uuid)
RETURNS TABLE(id uuid, nombre text, avatar_url text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
    SELECT up.id, up.nombre, up.avatar_url
    FROM usuarios_publicos up
    WHERE up.id = p_user_id;
END;
$$;
