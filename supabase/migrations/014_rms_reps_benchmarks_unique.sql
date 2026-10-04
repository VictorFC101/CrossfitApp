-- 014: deduplicar rms/resultados, RM por repeticiones (1/3/5/10RM) y benchmarks
--
-- saveRM/saveResultado hacían .upsert() sin restricción única ni onConflict, así que
-- cada guardado insertaba una fila nueva y la carga (sin ORDER BY) podía mostrar un
-- RM antiguo. Se conserva la fila más reciente; el historial completo sigue en rms_historial.

-- 1) Deduplicar: quedarse con la fila más reciente por (user_id, movimiento) / (user_id, dia)
DELETE FROM rms a USING rms b
 WHERE a.user_id IS NOT DISTINCT FROM b.user_id
   AND a.movimiento = b.movimiento
   AND (COALESCE(a.fecha, '-infinity'::timestamptz), a.id) < (COALESCE(b.fecha, '-infinity'::timestamptz), b.id);

DELETE FROM resultados a USING resultados b
 WHERE a.user_id IS NOT DISTINCT FROM b.user_id
   AND a.dia = b.dia
   AND (COALESCE(a.fecha, '-infinity'::timestamptz), a.id) < (COALESCE(b.fecha, '-infinity'::timestamptz), b.id);

-- 2) RM por repeticiones: lo existente es 1RM
ALTER TABLE rms           ADD COLUMN IF NOT EXISTS reps SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE rms_historial ADD COLUMN IF NOT EXISTS reps SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE rms           ADD CONSTRAINT rms_reps_range CHECK (reps BETWEEN 1 AND 20);
ALTER TABLE rms_historial ADD CONSTRAINT rms_historial_reps_range CHECK (reps BETWEEN 1 AND 20);

-- 3) Restricciones únicas para que upsert(onConflict) actualice en vez de insertar
ALTER TABLE rms        ADD CONSTRAINT rms_user_mov_reps_key   UNIQUE (user_id, movimiento, reps);
ALTER TABLE resultados ADD CONSTRAINT resultados_user_dia_key UNIQUE (user_id, dia);

-- 4) Benchmarks (Fran, Grace...): etiqueta opcional en resultados del programa y WODs libres
ALTER TABLE resultados  ADD COLUMN IF NOT EXISTS benchmark_key TEXT;
ALTER TABLE wods_libres ADD COLUMN IF NOT EXISTS benchmark_key TEXT;
CREATE INDEX IF NOT EXISTS resultados_user_benchmark_idx  ON resultados  (user_id, benchmark_key) WHERE benchmark_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS wods_libres_user_benchmark_idx ON wods_libres (user_id, benchmark_key) WHERE benchmark_key IS NOT NULL;
