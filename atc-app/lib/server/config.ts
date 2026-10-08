import 'server-only';

// Modo de la ruta /api/seguimiento (docs/atc/seguridad.md §3 y §8):
// - demo:  fuera de producción y sin base → órdenes de ejemplo. Nunca en producción.
// - local: base en 127.0.0.1 (pruebas o desarrollo) → límite en memoria; Turnstile solo si hay clave.
// - prod:  exige TODA la configuración; si falta algo, responde 503 (falla cerrado).
export type TrackingConfig =
  | { ok: true; mode: 'demo' }
  | { ok: true; mode: 'local' | 'prod'; dbUrl: string }
  | { ok: false; missing: string[] };

// NEXT_PUBLIC_TURNSTILE_SITE_KEY es obligatoria: sin ella el widget no se renderiza en el navegador,
// nunca llega el token y todo seguimiento falla 403. Sin esto, prod se vería sano y el seguimiento muerto.
const REQUIRED_PROD = ['ATC_TRACKER_DATABASE_URL', 'TURNSTILE_SECRET_KEY', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'ATC_IP_HEADER'];

const isLocalDb = (url: string) => {
  try { return ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname); } catch { return false; }
};

export function trackingConfig(): TrackingConfig {
  const prod = process.env.NODE_ENV === 'production';
  const dbUrl = process.env.ATC_TRACKER_DATABASE_URL;
  if (!dbUrl) return prod ? { ok: false, missing: REQUIRED_PROD.filter(k => !process.env[k]) } : { ok: true, mode: 'demo' };
  if (!prod || (process.env.ATC_LOCAL === '1' && isLocalDb(dbUrl))) return { ok: true, mode: 'local', dbUrl };
  const missing = REQUIRED_PROD.filter(k => !process.env[k]);
  // El primer valor de X-Forwarded-For lo escribe el cliente: no sirve para limitar por IP.
  if ((process.env.ATC_IP_HEADER ?? '').toLowerCase() === 'x-forwarded-for') missing.push('ATC_IP_HEADER (no puede ser x-forwarded-for)');
  return missing.length ? { ok: false, missing } : { ok: true, mode: 'prod', dbUrl };
}

/** IP del visitante desde el encabezado que fija la plataforma de hosting. Nunca del primer valor de X-Forwarded-For. */
export function clientIp(req: Request, mode: 'demo' | 'local' | 'prod'): string | null {
  const h = process.env.ATC_IP_HEADER?.toLowerCase();
  const v = h && h !== 'x-forwarded-for' ? req.headers.get(h)?.trim() ?? '' : '';
  if (/^[0-9a-fA-F:.]{2,45}$/.test(v)) return v;
  // En producción, sin IP confiable no se atiende. En local (sin plataforma adelante) se usa 127.0.0.1.
  return mode === 'prod' ? null : '127.0.0.1';
}
