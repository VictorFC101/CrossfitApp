// La foto de perfil se sube siempre a la misma ruta ({uid}/avatar.jpg). Si la URL no cambia,
// el móvil y la CDN de Supabase siguen mostrando la imagen cacheada anterior.
// Versionar la URL en cada subida obliga a descargar la nueva.
export function urlVersionada(url, version = Date.now()) {
  if (!url) return url;
  const base = String(url).split('?')[0];
  return `${base}?v=${version}`;
}
