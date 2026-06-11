-- ============================================================
-- FIX: accept_partner_request
-- - search_path explícito para SECURITY DEFINER
-- - Cancela también la solicitud inversa si existe
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

CREATE OR REPLACE FUNCTION accept_partner_request(p_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  req solicitudes_partner;
  calling_uid uuid;
BEGIN
  calling_uid := auth.uid();

  IF calling_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO req
  FROM solicitudes_partner
  WHERE id = p_request_id
    AND receptor_id = calling_uid
    AND status = 'pendiente';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada o no autorizada (id=%, uid=%)', p_request_id, calling_uid;
  END IF;

  -- Aceptar esta solicitud
  UPDATE solicitudes_partner SET status = 'aceptada' WHERE id = p_request_id;

  -- Cancelar la solicitud inversa si existe (el receptor también envió una)
  UPDATE solicitudes_partner SET status = 'rechazada'
  WHERE solicitante_id = calling_uid
    AND receptor_id = req.solicitante_id
    AND status = 'pendiente';

  -- Establecer partner_id en ambos usuarios
  UPDATE usuarios SET partner_id = req.solicitante_id WHERE id = req.receptor_id;
  UPDATE usuarios SET partner_id = req.receptor_id   WHERE id = req.solicitante_id;
END;
$$;
