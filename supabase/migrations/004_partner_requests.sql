-- ============================================================
-- PARTNER REQUESTS — solicitudes de pareja/equipo
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Tabla de solicitudes de pareja
CREATE TABLE IF NOT EXISTS solicitudes_partner (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitante_id uuid       NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  receptor_id   uuid        NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  status        text        DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aceptada', 'rechazada')),
  created_at    timestamptz DEFAULT now(),
  UNIQUE(solicitante_id, receptor_id)
);

ALTER TABLE solicitudes_partner ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_req_read"
  ON solicitudes_partner FOR SELECT TO authenticated
  USING (solicitante_id = auth.uid() OR receptor_id = auth.uid());

CREATE POLICY "partner_req_insert"
  ON solicitudes_partner FOR INSERT TO authenticated
  WITH CHECK (solicitante_id = auth.uid());

CREATE POLICY "partner_req_update"
  ON solicitudes_partner FOR UPDATE TO authenticated
  USING (receptor_id = auth.uid() OR solicitante_id = auth.uid());

-- 2. RPC: aceptar solicitud (actualiza partner_id en ambos usuarios)
CREATE OR REPLACE FUNCTION accept_partner_request(p_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  req solicitudes_partner;
BEGIN
  SELECT * INTO req
  FROM solicitudes_partner
  WHERE id = p_request_id
    AND receptor_id = auth.uid()
    AND status = 'pendiente';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada o no autorizada';
  END IF;

  UPDATE solicitudes_partner SET status = 'aceptada' WHERE id = p_request_id;
  UPDATE usuarios SET partner_id = req.solicitante_id WHERE id = req.receptor_id;
  UPDATE usuarios SET partner_id = req.receptor_id   WHERE id = req.solicitante_id;
END;
$$;

-- 3. RPC: disolver pareja (limpia partner_id en ambos lados)
CREATE OR REPLACE FUNCTION remove_partner()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  my_partner_id uuid;
BEGIN
  SELECT partner_id INTO my_partner_id FROM usuarios WHERE id = auth.uid();
  UPDATE usuarios SET partner_id = NULL WHERE id = auth.uid();
  IF my_partner_id IS NOT NULL THEN
    UPDATE usuarios SET partner_id = NULL WHERE id = my_partner_id;
  END IF;
  -- Limpiar solicitudes previas entre ambos
  IF my_partner_id IS NOT NULL THEN
    UPDATE solicitudes_partner SET status = 'rechazada'
    WHERE (solicitante_id = auth.uid() AND receptor_id = my_partner_id)
       OR (solicitante_id = my_partner_id AND receptor_id = auth.uid());
  END IF;
END;
$$;
