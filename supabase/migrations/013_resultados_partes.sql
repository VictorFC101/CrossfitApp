-- Añadir columna partes para resultados multi-bloque (strength + wod parts)
ALTER TABLE resultados ADD COLUMN IF NOT EXISTS partes JSONB DEFAULT NULL;
