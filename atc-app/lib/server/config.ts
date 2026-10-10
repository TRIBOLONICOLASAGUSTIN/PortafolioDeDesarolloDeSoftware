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
// ATC_DB_CA: el certificado (PEM) de la CA de Supabase (Database → Settings → SSL). Con él la conexión a la base va
// cifrada y verificada; sin él, pg conectaría en claro (seguridad.md §8, punto 4).
const REQUIRED_PROD = ['ATC_TRACKER_DATABASE_URL', 'TURNSTILE_SECRET_KEY', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'ATC_IP_HEADER', 'ATC_DB_CA'];
// Parámetros de TLS en la URL: pg-connection-string pisaría la configuración del servidor (por ejemplo sslmode=disable).
const SSL_PARAMS = ['sslmode', 'ssl', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat', 'sslnegotiation'];

const isLocalDb = (url: string) => {
  try { return ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname); } catch { return false; }
};

/** Configuración de una ruta pública que va a la base con su propio rol (seguimiento: atc_tracker; pedidos: atc_tienda). */
function configDe(urlVar: string): TrackingConfig {
  const required = REQUIRED_PROD.map(k => (k === 'ATC_TRACKER_DATABASE_URL' ? urlVar : k));
  const prod = process.env.NODE_ENV === 'production';
  const dbUrl = process.env[urlVar];
  if (!dbUrl) return prod ? { ok: false, missing: required.filter(k => !process.env[k]) } : { ok: true, mode: 'demo' };
  if (!prod || (process.env.ATC_LOCAL === '1' && isLocalDb(dbUrl))) return { ok: true, mode: 'local', dbUrl };
  const missing = required.filter(k => !process.env[k]);
  // El primer valor de X-Forwarded-For lo escribe el cliente: no sirve para limitar por IP.
  if ((process.env.ATC_IP_HEADER ?? '').toLowerCase() === 'x-forwarded-for') missing.push('ATC_IP_HEADER (no puede ser x-forwarded-for)');
  if (process.env.ATC_DB_CA && !process.env.ATC_DB_CA.includes('BEGIN CERTIFICATE')) missing.push('ATC_DB_CA (tiene que ser el certificado en formato PEM)');
  try {
    const q = new URL(dbUrl).searchParams;
    if (SSL_PARAMS.some(k => q.has(k))) missing.push(`${urlVar} (sin parámetros ssl: el cifrado lo fija el servidor)`);
  } catch {
    missing.push(`${urlVar} (inválida)`);
  }
  return missing.length ? { ok: false, missing } : { ok: true, mode: 'prod', dbUrl };
}
export const trackingConfig = () => configDe('ATC_TRACKER_DATABASE_URL');
/** Pedidos de la bolsa (POST /api/pedidos): misma exigencia, con la conexión de atc_tienda. */
export const tiendaConfig = () => configDe('ATC_TIENDA_DATABASE_URL');

/**
 * Red que se usa para limitar: la IPv4 tal cual; en IPv6, el /64 (una conexión hogareña o un servidor recibe un /64
 * entero, así que limitar por dirección exacta se esquiva cambiando los últimos 64 bits).
 */
export function redLimite(ip: string): string {
  const v4 = /^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (v4) return v4[1];
  if (!ip.includes(':')) return ip;
  const [a, b = ''] = ip.toLowerCase().split('::');
  const izq = a ? a.split(':') : [], der = b ? b.split(':') : [];
  const full = [...izq, ...Array(Math.max(0, 8 - izq.length - der.length)).fill('0'), ...der];
  return `${full.slice(0, 4).map(h => (h || '0').replace(/^0+(?=.)/, '')).join(':')}::/64`;
}

/** IP del visitante desde el encabezado que fija la plataforma de hosting. Nunca del primer valor de X-Forwarded-For. */
export function clientIp(req: Request, mode: 'demo' | 'local' | 'prod'): string | null {
  const h = process.env.ATC_IP_HEADER?.toLowerCase();
  const v = h && h !== 'x-forwarded-for' ? req.headers.get(h)?.trim() ?? '' : '';
  if (/^[0-9a-fA-F:.]{2,45}$/.test(v)) return v;
  // En producción, sin IP confiable no se atiende. En local (sin plataforma adelante) se usa 127.0.0.1.
  return mode === 'prod' ? null : '127.0.0.1';
}
