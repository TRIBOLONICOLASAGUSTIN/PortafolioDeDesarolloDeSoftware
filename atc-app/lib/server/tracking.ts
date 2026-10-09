import 'server-only';
import pg from 'pg';
import type { TrackResult } from '@/lib/data/tracking';
import { DEMO_ORDERS } from '@/lib/data/demo-orders';

// Conexión como atc_tracker: un rol que SOLO puede ejecutar public.track_order (seguridad.md §4).
// La contraseña vive en ATC_TRACKER_DATABASE_URL, una variable de entorno del servidor: nunca en el repo.
// El pool se cachea una vez por proceso con la PRIMERA url. En producción hay una sola
// ATC_TRACKER_DATABASE_URL por proceso, así que es correcto; si alguna vez conviviera más de una,
// habría que cachear por url.
const g = globalThis as unknown as { atcTrackerPool?: pg.Pool };
const pool = (url: string) =>
  (g.atcTrackerPool ??= new pg.Pool({ connectionString: url, max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 3_000, application_name: 'atc-web-seguimiento' }));

export async function trackOrder(url: string, code: string, phone3: string, ip: string): Promise<TrackResult> {
  const { rows } = await pool(url).query('select public.track_order($1, $2, $3) as r', [code, phone3, ip]);
  return rows[0].r as TrackResult;
}

/** Modo demo (solo fuera de producción y sin base): misma normalización y misma respuesta uniforme que la base.
 *  Espeja normalize_code (migración 0300): tope de 64, prefijo AT solo si largo 8, y validación del set
 *  Crockford (sin I, L, O, U). Un código que no pasa estas reglas se trata como "no encontrada", igual que la base. */
export function demoTrack(code: string, phone3: string): TrackResult {
  const miss: TrackResult = { ok: false, motivo: 'no_encontrada' };
  if (code.length > 64) return miss;
  const s = code.toUpperCase().replace(/[^0-9A-Z]/g, '');
  const body = (s.length === 8 && s.startsWith('AT') ? s.slice(2) : s).replace(/[IL]/g, '1').replace(/O/g, '0');
  if (!/^[0-9A-HJKMNP-TV-Z]{6}$/.test(body)) return miss;
  const o = DEMO_ORDERS[`AT-${body.slice(0, 4)}-${body.slice(4)}`];
  return o && o.tel === phone3 ? o.r : miss;
}
