-- ============================================================
-- REALTIME en solicitudes_partner
-- Necesario para que el emisor detecte cuando su solicitud es aceptada
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Activar replica identity para que Realtime envíe los valores old/new
ALTER TABLE solicitudes_partner REPLICA IDENTITY FULL;

-- Añadir la tabla al publication de Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE solicitudes_partner;
