-- ============================================================
-- Policy DELETE para feed_actividad
-- Cada usuario puede eliminar solo sus propias publicaciones
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE POLICY "feed_actividad_delete_own"
  ON feed_actividad FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
