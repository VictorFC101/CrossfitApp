-- 021: vista del coach sobre los resultados de sus atletas + lectura de resultados/RMs acotada
-- "Mis atletas" = mismo box que el staff, o con un programa asignado por él (aunque sea de otro box).

-- ── Helper: ¿el usuario actual (staff) puede ver los datos de p_user_id?
CREATE OR REPLACE FUNCTION public.es_mi_atleta(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.es_staff() AND (
    EXISTS (SELECT 1 FROM usuarios me JOIN usuarios u ON u.box_id = me.box_id
            WHERE me.id = auth.uid() AND u.id = p_user_id AND me.box_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM asignaciones a WHERE a.coach_id = auth.uid() AND a.user_id = p_user_id
               AND a.status IN ('activo', 'pendiente'))
  );
$$;
REVOKE EXECUTE ON FUNCTION public.es_mi_atleta(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.es_mi_atleta(uuid) TO authenticated;

-- ── Lectura acotada: propio + pareja + staff (su box / asignados).
-- Antes: cualquier usuario con sesión leía resultados y RMs de todos los boxes.
-- El feed usa feed_actividad y la clasificación su RPC: no dependen de estas tablas.
DROP POLICY IF EXISTS "Ver todos los resultados" ON public.resultados;
CREATE POLICY "Ver resultados propios, pareja o atletas" ON public.resultados FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR user_id = (SELECT partner_id FROM usuarios WHERE id = (SELECT auth.uid()))
    OR user_id IN (SELECT id FROM usuarios WHERE partner_id = (SELECT auth.uid()))
    OR public.es_mi_atleta(user_id)
  );

DROP POLICY IF EXISTS "Ver todos los RMs" ON public.rms;
CREATE POLICY "Ver RMs propios, pareja o atletas" ON public.rms FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR user_id = (SELECT partner_id FROM usuarios WHERE id = (SELECT auth.uid()))
    OR user_id IN (SELECT id FROM usuarios WHERE partner_id = (SELECT auth.uid()))
    OR public.es_mi_atleta(user_id)
  );

-- rms_historial: la política ALL propia sigue; el staff puede leer el de sus atletas
CREATE POLICY "Staff ve historial de sus atletas" ON public.rms_historial FOR SELECT TO authenticated
  USING (public.es_mi_atleta(user_id));

-- ── Lista de "mis atletas" con actividad
CREATE OR REPLACE FUNCTION public.coach_athletes()
RETURNS TABLE (id uuid, nombre text, avatar_url text, box_nombre text, origen text,
               programa_id text, programa_nombre text, ultimo_resultado timestamptz,
               resultados_7d int, resultados_30d int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    WITH me AS (SELECT box_id FROM usuarios WHERE usuarios.id = auth.uid()),
    asig AS (
      SELECT DISTINCT ON (a.user_id) a.user_id, a.programa_id
      FROM asignaciones a WHERE a.coach_id = auth.uid() AND a.status IN ('activo', 'pendiente')
      ORDER BY a.user_id, a.created_at DESC
    ),
    atletas AS (
      SELECT u.id,
             CASE WHEN u.box_id = (SELECT box_id FROM me) AND s.user_id IS NOT NULL THEN 'ambos'
                  WHEN s.user_id IS NOT NULL THEN 'asignado' ELSE 'box' END AS origen,
             s.programa_id
      FROM usuarios u LEFT JOIN asig s ON s.user_id = u.id
      WHERE u.id <> auth.uid()
        AND ((u.box_id = (SELECT box_id FROM me) AND (SELECT box_id FROM me) IS NOT NULL) OR s.user_id IS NOT NULL)
    )
    SELECT u.id, u.nombre, u.avatar_url, b.nombre, at.origen, at.programa_id, p.name,
           (SELECT max(r.fecha) FROM resultados r WHERE r.user_id = u.id),
           (SELECT count(*)::int FROM resultados r WHERE r.user_id = u.id AND r.fecha > now() - interval '7 days'),
           (SELECT count(*)::int FROM resultados r WHERE r.user_id = u.id AND r.fecha > now() - interval '30 days')
    FROM atletas at JOIN usuarios u ON u.id = at.id
    LEFT JOIN boxes b ON b.id = u.box_id
    LEFT JOIN programas p ON p.id = at.programa_id
    ORDER BY u.nombre;
END;
$$;

-- ── Detalle de un atleta: resultados, RMs actuales e historial de RMs (JSON)
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
        FROM rms_historial h WHERE h.user_id = p_user_id), '[]'::jsonb)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.coach_athletes(), public.coach_athlete_detail(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.coach_athletes(), public.coach_athlete_detail(uuid) TO authenticated;
