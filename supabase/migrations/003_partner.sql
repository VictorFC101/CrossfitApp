-- ============================================================
-- PARTNER — pareja de entreno por usuario
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Columna partner_id en usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- 2. RLS en resultados: añadir permiso de lectura para partner
--    (elimina policies SELECT existentes y crea una nueva unificada)
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'resultados' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON resultados', pol.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "resultados_select"
  ON resultados FOR SELECT
  TO authenticated
  USING (
    -- Propios resultados
    user_id = auth.uid()
    -- Resultados del partner (bidireccional)
    OR user_id = (SELECT partner_id FROM usuarios WHERE id = auth.uid())
    OR user_id IN (SELECT id FROM usuarios WHERE partner_id = auth.uid())
  );
