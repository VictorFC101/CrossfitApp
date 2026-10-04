-- 016: seguridad P2a — compatible con la app SDK 54 instalada (sin cambios de app)
-- (P2b — email/push_token y RPCs — irá cuando la build SDK 57 esté instalada)

-- ── 1) Nada de datos personales sin sesión (anon)
ALTER POLICY "Ver todos los RMs"        ON public.rms        TO authenticated;
ALTER POLICY "Ver todos los resultados" ON public.resultados TO authenticated;
ALTER POLICY "Ver todos los usuarios"   ON public.usuarios   TO authenticated;
ALTER POLICY "Ver WODs públicos"        ON public.wods_libres TO authenticated;
ALTER POLICY "Ver comentarios"          ON public.comentarios TO authenticated;
ALTER POLICY "Ver reacciones"           ON public.reacciones  TO authenticated;
-- boxes sigue legible sin sesión: el alta comprueba el código de invitación antes del login (P2b → RPC)

-- Regresión de 015: ProgramContext carga antes del login (anon) y en un login nuevo quedaba vacío.
-- Los programas públicos son contenido de entreno, no datos personales.
CREATE POLICY "Ver programas publicos (sin sesion)" ON public.programas FOR SELECT TO anon
  USING (publico);

-- ── 2) Vistas: que respeten el RLS de quien consulta (feed solo de amigos/box, como define feed_actividad_select)
ALTER VIEW public.feed_social       SET (security_invoker = true);
ALTER VIEW public.usuarios_publicos SET (security_invoker = true);
REVOKE SELECT ON public.feed_social, public.usuarios_publicos FROM anon;

-- ── 3) Amistades: solo el receptor puede aceptar (antes el solicitante se autoaceptaba)
ALTER POLICY "Gestionar mis amistades" ON public.amistades TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT auth.uid()) = friend_id)
  WITH CHECK (
    ((SELECT auth.uid()) = user_id OR (SELECT auth.uid()) = friend_id)
    AND (status IS DISTINCT FROM 'aceptada' OR (SELECT auth.uid()) = friend_id)
  );

-- ── 4) Notificaciones: solo usuarios con sesión pueden crearlas
ALTER POLICY "Insertar notificaciones" ON public.notificaciones TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ── 5) Asignaciones y biblioteca de programas: solo coach/admin
ALTER POLICY "Coach puede asignar" ON public.asignaciones TO authenticated
  WITH CHECK ((SELECT auth.uid()) = coach_id AND (SELECT public.es_staff()));
ALTER POLICY "Authenticated insert library" ON public.program_library
  WITH CHECK ((SELECT public.es_staff()));
ALTER POLICY "Authenticated delete library" ON public.program_library
  USING ((SELECT public.es_staff()));
