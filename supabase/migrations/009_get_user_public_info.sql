-- ============================================================
-- RPC: get_user_public_info
-- Devuelve el perfil público de cualquier usuario.
-- SECURITY DEFINER para bypassar RLS de usuarios_publicos.
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_public_info(p_user_id uuid)
RETURNS TABLE(id uuid, nombre text, avatar_url text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
    SELECT up.id, up.nombre, up.avatar_url
    FROM usuarios_publicos up
    WHERE up.id = p_user_id;
END;
$$;
