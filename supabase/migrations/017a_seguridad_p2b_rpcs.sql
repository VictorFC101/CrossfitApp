-- 017a: seguridad P2b (parte aditiva) — RPCs para dejar de leer email / push_token / códigos de box
-- desde el cliente. Compatible con la app SDK 54. La retirada de permisos de columna va en 017b,
-- cuando la build SDK 57 (que usa estas RPCs) esté instalada.

-- Buscar usuario por email EXACTO (sin listar emails de nadie)
CREATE OR REPLACE FUNCTION public.find_user_by_email(p_email text)
RETURNS TABLE (id uuid, nombre text, box_id uuid, box_nombre text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.nombre, u.box_id, b.nombre
  FROM usuarios u LEFT JOIN boxes b ON b.id = u.box_id
  WHERE auth.uid() IS NOT NULL
    AND lower(u.email) = lower(trim(p_email))
    AND u.id <> auth.uid()
  LIMIT 1;
$$;

-- Comprobar el código de invitación de un box en el alta (antes del login)
CREATE OR REPLACE FUNCTION public.check_box_code(p_codigo text)
RETURNS TABLE (id uuid, nombre text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.nombre FROM boxes b
  WHERE b.codigo_invitacion = upper(trim(p_codigo))
  LIMIT 1;
$$;

-- Token push de otro usuario solo si hay relación (amistad aceptada, pareja, solicitud de pareja) o eres staff
CREATE OR REPLACE FUNCTION public.get_push_token(p_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.push_token FROM usuarios u
  WHERE u.id = p_user_id
    AND auth.uid() IS NOT NULL
    AND (
      public.es_staff()
      OR EXISTS (SELECT 1 FROM amistades a WHERE a.status = 'aceptada'
                   AND ((a.user_id = auth.uid() AND a.friend_id = p_user_id)
                     OR (a.friend_id = auth.uid() AND a.user_id = p_user_id)))
      OR u.partner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM usuarios me WHERE me.id = auth.uid() AND me.partner_id = p_user_id)
      OR EXISTS (SELECT 1 FROM solicitudes_partner s
                   WHERE (s.solicitante_id = auth.uid() AND s.receptor_id = p_user_id)
                      OR (s.receptor_id = auth.uid() AND s.solicitante_id = p_user_id))
    );
$$;

-- Listado de usuarios con email para coach/admin (AdminScreen, AssignProgramScreen)
CREATE OR REPLACE FUNCTION public.admin_list_users(p_query text DEFAULT NULL, p_box_id uuid DEFAULT NULL)
RETURNS TABLE (id uuid, nombre text, email text, rol text, genero text, box_id uuid, box_nombre text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT u.id, u.nombre, u.email, u.rol, u.genero, u.box_id, b.nombre
    FROM usuarios u LEFT JOIN boxes b ON b.id = u.box_id
    WHERE (p_box_id IS NULL OR u.box_id = p_box_id)
      AND (p_query IS NULL OR trim(p_query) = ''
           OR u.nombre ILIKE '%' || trim(p_query) || '%'
           OR u.email  ILIKE '%' || trim(p_query) || '%')
    ORDER BY u.nombre;
END;
$$;

-- Boxes con su código de invitación, solo admin
CREATE OR REPLACE FUNCTION public.admin_list_boxes()
RETURNS TABLE (id uuid, nombre text, ciudad text, codigo_invitacion text, created_by uuid, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT b.id, b.nombre, b.ciudad, b.codigo_invitacion, b.created_by, b.created_at
               FROM boxes b ORDER BY b.nombre;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.find_user_by_email(text), public.get_push_token(uuid),
  public.admin_list_users(text, uuid), public.admin_list_boxes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text), public.get_push_token(uuid),
  public.admin_list_users(text, uuid), public.admin_list_boxes() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.check_box_code(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.check_box_code(text) TO anon, authenticated;

-- Notificaciones: quién la envía (trazabilidad). El WITH CHECK se endurece en 017b.
ALTER TABLE public.notificaciones
  ADD COLUMN IF NOT EXISTS sender_id uuid DEFAULT auth.uid() REFERENCES public.usuarios(id) ON DELETE SET NULL;
