-- ============================================================
-- PROGRAM LIBRARY — biblioteca de programas reutilizables
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

CREATE TABLE IF NOT EXISTS program_library (
  id        uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name      text        NOT NULL,
  descripcion text,
  data      jsonb       NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE program_library ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer la biblioteca
CREATE POLICY "Authenticated read library"
  ON program_library FOR SELECT
  TO authenticated
  USING (true);

-- Cualquier usuario autenticado puede subir programas
CREATE POLICY "Authenticated insert library"
  ON program_library FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Cualquier usuario autenticado puede borrar de la biblioteca
CREATE POLICY "Authenticated delete library"
  ON program_library FOR DELETE
  TO authenticated
  USING (true);
