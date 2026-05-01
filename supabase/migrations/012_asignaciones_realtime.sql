-- ============================================================
-- Realtime para asignaciones — notificar solo al usuario asignado
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE asignaciones REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE asignaciones;
