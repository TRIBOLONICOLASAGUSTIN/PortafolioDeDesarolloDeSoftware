import 'server-only';
import type { z } from 'zod';
import type { Limit } from './ratelimit';

// Controles HTTP compartidos por las rutas del servidor (seguimiento, pedidos e ingreso del superadmin).
// Cada ruta sigue escribiendo su orden de controles completo: acá solo vive cómo se hace cada paso.

/** Mismo sitio: Sec-Fetch-Site same-origin y Origin igual al Host (si vienen). */
export function sameSite(req: Request) {
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return false;
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.get('host'); } catch { return false; }
}

/**
 * Cuerpo de hasta `max` bytes; si es más largo, no hay cuerpo o no termina de llegar en `ms` (un cuerpo que llega gota a
 * gota para retener la conexión), null: sin leer de más ni esperar de más.
 */
export async function readLimited(req: Request, max: number, ms = 5000): Promise<string | null> {
  if (Number(req.headers.get('content-length') ?? 0) > max) return null;
  const reader = req.body?.getReader();
  if (!reader) return null;
  let vencido = false;
  const corte = setTimeout(() => { vencido = true; reader.cancel().catch(() => {}); }, ms);
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (vencido) return null;
      if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    return new TextDecoder().decode(Buffer.concat(chunks));
  } catch {
    return null;
  } finally {
    clearTimeout(corte);
  }
}

type Encabezados = Record<string, string>;
/** Respuestas JSON sin caché de una ruta (`fijos`: encabezados que la ruta suma siempre). Las fallas son { ok:false, motivo }. */
export function respuestas(fijos: Encabezados = {}) {
  const json = (body: unknown, status = 200, extra: Encabezados = {}) =>
    Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...fijos, ...extra } });
  return {
    json,
    invalida: () => json({ ok: false, motivo: 'solicitud_invalida' }, 400),
    noDisponible: () => json({ ok: false, motivo: 'no_disponible' }, 503),
  };
}
export type Respuestas = ReturnType<typeof respuestas>;

/**
 * Primeros pasos de toda ruta POST: mismo sitio (403) → JSON de hasta `max` bytes, bien formado y válido para `schema`
 * (400 sin detalles). Devuelve los datos o la respuesta para cortar.
 */
export async function leerJson<T>(req: Request, max: number, schema: z.ZodType<T>, r: Respuestas): Promise<{ data: T } | { corte: Response }> {
  if (!sameSite(req)) return { corte: r.json({ ok: false, motivo: 'origen' }, 403) };
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return { corte: r.invalida() };
  const text = await readLimited(req, max);
  if (text === null) return { corte: r.invalida() };
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { corte: r.invalida() }; }
  const parsed = schema.safeParse(data);
  return parsed.success ? { data: parsed.data } : { corte: r.invalida() };
}

/** Avisa en el log una sola vez por proceso qué configuración falta (no en cada pedido). */
export function avisoFaltante(ruta: string) {
  let dicho = false;
  return (missing: string[]) => { if (!dicho) { dicho = true; console.error(`[${ruta}] falta configuración: ${missing.join(', ')}`); } };
}

/** Resultado de un límite: null si sigue; si no, 503 (Upstash no respondió: falla cerrado) o 429 con Retry-After. */
export function corteLimite(rl: Limit, r: Respuestas, motivo: string): Response | null {
  if (rl === 'error') return r.noDisponible();
  return rl.allowed ? null : r.json({ ok: false, motivo }, 429, { 'Retry-After': String(rl.retry) });
}
