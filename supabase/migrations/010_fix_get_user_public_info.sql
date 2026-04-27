-- ============================================================
-- FIX: get_user_public_info — avatar_url no existe en DB, devolver NULL
-- usuarios_publicos no tiene avatar_url (solo AsyncStorage local)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_public_info(p_user_id uuid)
RETURNS TABLE(id uuid, nombre text, avatar_url text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
    SELECT up.id, up.nombre, NULL::text AS avatar_url
    FROM usuarios_publicos up
    WHERE up.id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_public_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_public_info(uuid) TO anon;
