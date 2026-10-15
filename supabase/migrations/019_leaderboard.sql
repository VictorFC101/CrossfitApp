-- 019: clasificación por WOD (solo el box) + opción de privacidad

-- Identificar el WOD sin ambigüedad: dos programas pueden tener el mismo 'dia'
ALTER TABLE public.resultados ADD COLUMN IF NOT EXISTS programa_id text;
CREATE INDEX IF NOT EXISTS resultados_programa_dia_idx ON public.resultados (programa_id, dia);
CREATE INDEX IF NOT EXISTS resultados_dia_idx ON public.resultados (dia);

-- Privacidad: el atleta puede ocultarse de la clasificación (por defecto visible)
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS mostrar_en_ranking boolean NOT NULL DEFAULT true;
GRANT SELECT (mostrar_en_ranking) ON public.usuarios TO authenticated;

-- Clasificación del box para un WOD. Solo datos públicos (nombre, avatar, resultado).
-- Quien consulta siempre se ve a sí mismo, aunque se haya ocultado para los demás.
CREATE OR REPLACE FUNCTION public.wod_leaderboard(p_dia text, p_programa_id text DEFAULT NULL)
RETURNS TABLE (user_id uuid, nombre text, avatar_url text, resultado text, rx boolean,
               partes jsonb, fecha timestamptz, es_yo boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.user_id, u.nombre, u.avatar_url, r.resultado, coalesce(r.rx, true), r.partes, r.fecha,
         r.user_id = auth.uid()
  FROM resultados r
  JOIN usuarios u ON u.id = r.user_id
  JOIN usuarios me ON me.id = auth.uid()
  WHERE auth.uid() IS NOT NULL
    AND me.box_id IS NOT NULL
    AND u.box_id = me.box_id
    AND r.dia = p_dia
    AND (p_programa_id IS NULL OR r.programa_id IS NULL OR r.programa_id = p_programa_id)
    AND (u.mostrar_en_ranking OR u.id = auth.uid())
    AND coalesce(r.resultado, '') <> '';
$$;
REVOKE EXECUTE ON FUNCTION public.wod_leaderboard(text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.wod_leaderboard(text, text) TO authenticated;
