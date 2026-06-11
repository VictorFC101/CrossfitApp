-- ============================================================
-- FIX: feed_actividad visible entre usuarios del mismo box
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Reemplazar la policy SELECT de feed_actividad para incluir mismo box
--    (borra la política existente de lectura, sea cual sea su nombre)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'feed_actividad' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON feed_actividad', pol.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "feed_actividad_select"
  ON feed_actividad FOR SELECT
  TO authenticated
  USING (
    -- Propios registros
    user_id = auth.uid()
    -- Registros de amigos aceptados (en cualquier dirección)
    OR user_id IN (
      SELECT CASE
        WHEN user_id = auth.uid() THEN friend_id
        ELSE user_id
      END
      FROM amistades
      WHERE (user_id = auth.uid() OR friend_id = auth.uid())
        AND status = 'aceptada'
    )
    -- Registros de usuarios del mismo box
    OR user_id IN (
      SELECT id FROM usuarios
      WHERE box_id = (
        SELECT box_id FROM usuarios WHERE id = auth.uid()
      )
      AND box_id IS NOT NULL
    )
  );

-- 2. Si feed_social es una vista, asegurarse de que no tiene su propio filtro
--    que contradiga lo anterior. Si existe, recrearla sin filtro adicional.
--    (Ejecuta esto solo si tienes una vista feed_social custom)
--
-- DROP VIEW IF EXISTS feed_social;
-- CREATE VIEW feed_social AS
--   SELECT
--     fa.id,
--     fa.user_id,
--     fa.tipo,
--     fa.data,
--     fa.created_at,
--     u.nombre  AS user_nombre,
--     u.box_id  AS user_box_id,
--     b.nombre  AS box_nombre
--   FROM feed_actividad fa
--   JOIN usuarios u ON u.id = fa.user_id
--   LEFT JOIN boxes b ON b.id = u.box_id;
