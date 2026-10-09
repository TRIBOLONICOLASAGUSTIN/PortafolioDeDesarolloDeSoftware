import { z } from 'zod';
import { clientIp, trackingConfig } from '@/lib/server/config';
import { limit } from '@/lib/server/ratelimit';
import { verifyTurnstile } from '@/lib/server/turnstile';
import { readLimited, sameSite } from '@/lib/server/http';
import { demoTrack, trackOrder } from '@/lib/server/tracking';

// POST /api/seguimiento — la única puerta pública a una orden (docs/atc/seguridad.md §3).
// Orden de los controles: mismo sitio → JSON chico y válido → configuración → IP confiable →
// límite por IP → Turnstile → base (track_order con sus propios bloqueos) → respuesta mínima, sin caché.
export const dynamic = 'force-dynamic';

const MAX_BODY = 1024;
const Body = z.object({
  codigo: z.string().min(1).max(64),
  telefono3: z.string().regex(/^\d{3}$/),
  turnstileToken: z.string().max(2048).optional(),
}).strict();

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...extra } });
// Las fallas usan siempre { ok:false, motivo } (ver TrackResult): el cliente las mapea a un mensaje.
const invalid = () => json({ ok: false, motivo: 'solicitud_invalida' }, 400);
const unavailable = () => json({ ok: false, motivo: 'no_disponible' }, 503);

let warned = false;

export async function POST(req: Request) {
  if (!sameSite(req)) return json({ ok: false, motivo: 'origen' }, 403);
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return invalid();
  const text = await readLimited(req, MAX_BODY);
  if (text === null) return invalid();
  let data: unknown;
  try { data = JSON.parse(text); } catch { return invalid(); }
  const parsed = Body.safeParse(data);
  if (!parsed.success) return invalid();
  const { codigo, telefono3, turnstileToken } = parsed.data;

  const cfg = trackingConfig();
  if (!cfg.ok) {
    if (!warned) { warned = true; console.error(`[seguimiento] falta configuración: ${cfg.missing.join(', ')}`); }
    return unavailable();
  }
  const ip = clientIp(req, cfg.mode);
  if (!ip) return unavailable();

  const rl = await limit(ip, cfg.mode);
  if (rl === 'error') return unavailable();
  if (!rl.allowed) return json({ ok: false, motivo: 'demasiados_intentos' }, 429, { 'Retry-After': String(rl.retry) });

  if (cfg.mode === 'prod' || process.env.TURNSTILE_SECRET_KEY) {
    if (!turnstileToken || !(await verifyTurnstile(turnstileToken, ip))) return json({ ok: false, motivo: 'verificacion' }, 403);
  }

  if (cfg.mode === 'demo') return json(demoTrack(codigo, telefono3));
  try {
    const r = await trackOrder(cfg.dbUrl, codigo, telefono3, ip);
    return json(r, !r.ok && r.motivo === 'demasiados_intentos' ? 429 : 200);
  } catch (e) {
    // Nunca se registra el código ni el teléfono.
    console.error('[seguimiento] la base no respondió:', (e as { code?: string }).code ?? 'sin código');
    return unavailable();
  }
}
