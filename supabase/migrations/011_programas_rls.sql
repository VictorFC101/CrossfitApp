-- ============================================================
-- RLS para tabla programas
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE programas ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer programas públicos
CREATE POLICY "Ver programas publicos"
  ON programas FOR SELECT
  TO authenticated
  USING (publico = true);

-- El creador puede insertar, actualizar y eliminar sus programas
CREATE POLICY "Coach gestiona sus programas"
  ON programas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coach actualiza sus programas"
  ON programas FOR UPDATE
  TO authenticated
  USING (auth.uid() = coach_id);

CREATE POLICY "Coach elimina sus programas"
  ON programas FOR DELETE
  TO authenticated
  USING (auth.uid() = coach_id);
