-- ============================================================
-- FIX: accept_partner_request — sincronización bidireccional completa
-- Si existe cualquier solicitud pendiente entre los dos usuarios
-- (en cualquier dirección), aceptarla automáticamente al aceptar una.
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION accept_partner_request(p_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  req   solicitudes_partner;
  calling_uid uuid;
BEGIN
  calling_uid := auth.uid();
  IF calling_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  -- Buscar la solicitud recibida
  SELECT * INTO req FROM solicitudes_partner
  WHERE id = p_request_id
    AND receptor_id = calling_uid
    AND status = 'pendiente';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada o no autorizada';
  END IF;

  -- Marcar esta solicitud como aceptada
  UPDATE solicitudes_partner SET status = 'aceptada' WHERE id = p_request_id;

  -- Marcar como aceptada cualquier solicitud inversa pendiente entre los mismos
  UPDATE solicitudes_partner SET status = 'aceptada'
  WHERE solicitante_id = calling_uid
    AND receptor_id    = req.solicitante_id
    AND status         = 'pendiente';

  -- Establecer partner_id en ambos usuarios
  UPDATE usuarios SET partner_id = req.solicitante_id WHERE id = req.receptor_id;
  UPDATE usuarios SET partner_id = req.receptor_id   WHERE id = req.solicitante_id;
END;
$$;
