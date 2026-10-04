-- 015: seguridad P1 — escalada de privilegios, programas editables por cualquiera, funciones expuestas a anon

-- ── Helper: ¿el usuario actual es admin? (SECURITY DEFINER para no depender del RLS de usuarios)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin');
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ── 1) usuarios: nadie puede darse rol/box/pareja a sí mismo
-- SECURITY INVOKER a propósito: dentro de las RPC SECURITY DEFINER (pareja) current_user es el
-- propietario y se permite; desde la API current_user es 'authenticated' y se valida.
CREATE OR REPLACE FUNCTION public.usuarios_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_admin() THEN
      NEW.rol := 'atleta';
      NEW.partner_id := NULL;
    END IF;
    RETURN NEW;
  END IF;
  IF NOT public.is_admin() THEN
    IF NEW.rol IS DISTINCT FROM OLD.rol THEN
      RAISE EXCEPTION 'No autorizado a cambiar el rol' USING ERRCODE = '42501';
    END IF;
    IF NEW.box_id IS DISTINCT FROM OLD.box_id THEN
      RAISE EXCEPTION 'No autorizado a cambiar el box' USING ERRCODE = '42501';
    END IF;
    IF NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
      RAISE EXCEPTION 'No autorizado a cambiar la pareja' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS usuarios_guard ON public.usuarios;
CREATE TRIGGER usuarios_guard BEFORE INSERT OR UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.usuarios_guard();

-- ── 2) programas: solo su coach (o un admin) los modifica; lectura acotada
DROP POLICY IF EXISTS "Coaches pueden gestionar programas" ON public.programas;
DROP POLICY IF EXISTS "Ver todos los programas" ON public.programas;
DROP POLICY IF EXISTS "Ver programas publicos" ON public.programas;

-- AdminScreen y AssignProgramScreen hacen upsert sin coach_id: que sea el autor
ALTER TABLE public.programas ALTER COLUMN coach_id SET DEFAULT auth.uid();

CREATE POLICY "Ver programas" ON public.programas FOR SELECT TO authenticated
  USING (
    publico
    OR coach_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM asignaciones a WHERE a.programa_id = programas.id AND a.user_id = (SELECT auth.uid()))
    OR (SELECT public.is_admin())
  );
CREATE POLICY "Admin gestiona programas" ON public.programas FOR ALL TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

-- ── 3) Funciones SECURITY DEFINER: fuera de anon
REVOKE EXECUTE ON FUNCTION public.remove_partner()               FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_partner_request(uuid)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_public_info(uuid)     FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.remove_partner()               TO authenticated;
GRANT  EXECUTE ON FUNCTION public.accept_partner_request(uuid)   TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_user_public_info(uuid)     TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()              FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.remove_partner() SET search_path = public;
