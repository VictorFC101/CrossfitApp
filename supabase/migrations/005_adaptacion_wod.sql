-- ============================================================
-- ADAPTACION WOD — columna JSONB en resultados
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

ALTER TABLE resultados ADD COLUMN IF NOT EXISTS adaptacion jsonb;
