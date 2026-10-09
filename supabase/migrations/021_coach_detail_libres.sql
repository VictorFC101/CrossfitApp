-- 021: coach_athlete_detail también devuelve los WODs libres del atleta
-- (los benchmarks hechos fuera del programa — Fran, Murph… — también cuentan en su pestaña Benchmarks)
CREATE OR REPLACE FUNCTION public.coach_athlete_detail(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.es_mi_atleta(p_user_id) THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'resultados', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'dia', r.dia, 'resultado', r.resultado, 'notas', r.notas, 'rx', coalesce(r.rx, true),
        'fecha', r.fecha, 'partes', r.partes, 'benchmark_key', r.benchmark_key, 'programa_id', r.programa_id)
        ORDER BY r.fecha DESC) FROM resultados r WHERE r.user_id = p_user_id), '[]'::jsonb),
    'rms', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'movimiento', m.movimiento, 'peso', m.peso, 'reps', m.reps, 'fecha', m.fecha))
        FROM rms m WHERE m.user_id = p_user_id), '[]'::jsonb),
    'rms_historial', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'movimiento', h.movimiento, 'peso', h.peso, 'reps', h.reps, 'fecha', h.fecha) ORDER BY h.fecha)
        FROM rms_historial h WHERE h.user_id = p_user_id), '[]'::jsonb),
    'wods_libres', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', w.id, 'nombre', w.nombre, 'tipo', w.tipo, 'resultado', w.resultado, 'notas', w.notas,
        'fecha', w.fecha, 'benchmark_key', w.benchmark_key) ORDER BY w.fecha DESC)
        FROM wods_libres w WHERE w.user_id = p_user_id), '[]'::jsonb)
  );
END;
$$;
