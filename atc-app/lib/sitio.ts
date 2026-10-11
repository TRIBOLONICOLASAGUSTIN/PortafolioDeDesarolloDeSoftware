// Dirección pública del sitio (canónicas, Open Graph, sitemap). ATC_SITE_URL en producción; localhost en desarrollo.
export function sitioUrl() {
  const raw = process.env.ATC_SITE_URL ?? 'http://localhost:3000';
  try { const u = new URL(raw); return u.origin; } catch { return 'http://localhost:3000'; }
}
/** El sitio se indexa solo con ATC_INDEXAR=1 (cuando estén los datos reales). */
export const indexar = () => process.env.ATC_INDEXAR === '1';
/** Páginas públicas (sitemap). El panel y el ingreso NUNCA van acá ni en robots: no se revela que existen. */
export const PAGINAS_PUBLICAS = ['/', '/privacidad', '/cookies', '/terminos', '/arrepentimiento'] as const;
