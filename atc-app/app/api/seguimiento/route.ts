import { z } from 'zod';
import { clientIp, redLimite, trackingConfig } from '@/lib/server/config';
import { limit } from '@/lib/server/ratelimit';
import { turnstileOk } from '@/lib/server/turnstile';
import { avisoFaltante, corteLimite, leerJson, respuestas } from '@/lib/server/http';
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

// Las fallas usan siempre { ok:false, motivo } (ver TrackResult): el cliente las mapea a un mensaje.
const r = respuestas(), { json } = r;
const avisar = avisoFaltante('seguimiento');

export async function POST(req: Request) {
  const leido = await leerJson(req, MAX_BODY, Body, r);
  if ('corte' in leido) return leido.corte;
  const { codigo, telefono3, turnstileToken } = leido.data;

  const cfg = trackingConfig();
  if (!cfg.ok) { avisar(cfg.missing); return r.noDisponible(); }
  const ip = clientIp(req, cfg.mode);
  if (!ip) return r.noDisponible();

  const corte = corteLimite(await limit(ip, cfg.mode), r, 'demasiados_intentos');
  if (corte) return corte;

  if (!(await turnstileOk(cfg.mode, turnstileToken, ip, 'seguimiento', req))) return json({ ok: false, motivo: 'verificacion' }, 403);

  if (cfg.mode === 'demo') return json(demoTrack(codigo, telefono3));
  try {
    // La base también limita por IP: en IPv6, por su /64.
    const res = await trackOrder(cfg.dbUrl, cfg.mode, codigo, telefono3, redLimite(ip));
    return json(res, !res.ok && res.motivo === 'demasiados_intentos' ? 429 : 200);
  } catch (e) {
    // Nunca se registra el código ni el teléfono.
    console.error('[seguimiento] la base no respondió:', (e as { code?: string }).code ?? 'sin código');
    return r.noDisponible();
  }
}
