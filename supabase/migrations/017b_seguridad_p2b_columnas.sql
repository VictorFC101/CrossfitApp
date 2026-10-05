-- 017b: seguridad P2b (parte restrictiva) — APLICAR SOLO cuando la build SDK 57 esté instalada en
-- todos los móviles: la app SDK 54 lee email / push_token / codigo_invitacion directamente y fallaría.

-- 1) usuarios: email, push_token y box_codigo fuera del alcance del cliente (se usan las RPCs de 017a)
REVOKE SELECT ON public.usuarios FROM anon, authenticated;
GRANT  SELECT (id, nombre, genero, created_at, rol, box_id, onboarding_completed, partner_id)
  ON public.usuarios TO authenticated;

-- 2) usuarios_publicos sin email (CREATE OR REPLACE no puede quitar columnas: se recrea)
DROP VIEW public.usuarios_publicos;
CREATE VIEW public.usuarios_publicos WITH (security_invoker = true) AS
  SELECT u.id, u.nombre, u.genero, u.rol, u.box_id, b.nombre AS box_nombre, b.ciudad AS box_ciudad
  FROM usuarios u LEFT JOIN boxes b ON b.id = u.box_id;
REVOKE SELECT ON public.usuarios_publicos FROM anon;
GRANT  SELECT ON public.usuarios_publicos TO authenticated;

-- 3) boxes: el código de invitación solo vía check_box_code / admin_list_boxes
REVOKE SELECT ON public.boxes FROM anon, authenticated;
GRANT  SELECT (id, nombre, ciudad, created_by, created_at) ON public.boxes TO anon, authenticated;

-- 4) notificaciones: el remitente es siempre quien la crea
ALTER POLICY "Insertar notificaciones" ON public.notificaciones TO authenticated
  WITH CHECK (sender_id = (SELECT auth.uid()));
