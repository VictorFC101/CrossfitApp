// Lógica pura de búsqueda de usuarios: el email ya no se puede consultar por LIKE
// (columna privada). Solo se admite búsqueda por email exacto vía RPC.

// true si la consulta parece un email (contiene '@')
export function isEmailQuery(q) {
  return typeof q === 'string' && q.trim().includes('@');
}

// Escapa los comodines de LIKE y los separadores de filtros PostgREST (. , ( ))
export function sanitizeNameQuery(q) {
  return String(q || '').trim().replace(/[%_\,()]/g, ' ').replace(/\s+/g, ' ').trim();
}
