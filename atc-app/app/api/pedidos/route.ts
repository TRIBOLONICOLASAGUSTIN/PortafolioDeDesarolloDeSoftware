import { z } from 'zod';
import { clientIp, redLimite, tiendaConfig } from '@/lib/server/config';
import { limit } from '@/lib/server/ratelimit';
import { verifyTurnstile } from '@/lib/server/turnstile';
import { readLimited, sameSite } from '@/lib/server/http';
import { crearPedido } from '@/lib/server/tienda';

// POST /api/pedidos — la bolsa registra el pedido y la base aparta el stock por 48 h (docs/atc/seguridad.md §3 y §5,
// fila 21). El cobro sigue siendo por WhatsApp: acá no hay pagos ni datos de tarjeta.
// Orden: mismo sitio → JSON chico y válido → configuración → IP confiable → límite por red (y por /48 en IPv6) →
// Turnstile → techo de todo el sitio (cuenta solo lo que pasó Turnstile: sin resolverlo nadie lo gasta) → base
// (crear_pedido, con su propio límite por red, precios de la base y reserva atómica) → respuesta sin caché.
// Si algo falla, la bolsa igual abre WhatsApp sin código: nunca se pierde una venta.
export const dynamic = 'force-dynamic';

const MAX_BODY = 2048;
// Topes de la bolsa (los mismos que controla crear_pedido): 3 unidades por producto y 10 por pedido.
const POR_PRODUCTO = 3, POR_PEDIDO = 10;
// Límites de todo el sitio, para que un ataque desde muchas redes no llene la base de pedidos falsos. Si se pasan, la
// bolsa sigue por WhatsApp sin código (nadie pierde la venta). Se pueden ajustar sin tocar el código.
const num = (v: string | undefined, d: number) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };
const MAX_48 = () => num(process.env.ATC_RL_PED48, 20), MAX_SITIO = () => num(process.env.ATC_RL_PEDG, 60);
const Body = z.object({
  items: z.array(z.object({ slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(60), qty: z.number().int().min(1).max(POR_PRODUCTO) }).strict()).min(1).max(10)
    .refine(xs => xs.reduce((a, x) => a + x.qty, 0) <= POR_PEDIDO),
  entrega: z.enum(['retiro', 'envio']),
  pago: z.enum(['efectivo', 'transferencia', 'mp', 'tarjeta']),
  // Opcional en la bolsa: sin nombre, el pedido queda como "Cliente web"
  nombre: z.string().max(60).optional(),
  turnstileToken: z.string().max(2048).optional(),
}).strict();

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...extra } });
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
  const { items, entrega, pago, nombre, turnstileToken } = parsed.data;

  const cfg = tiendaConfig();
  if (!cfg.ok) {
    if (!warned) { warned = true; console.error(`[pedidos] falta configuración: ${cfg.missing.join(', ')}`); }
    return unavailable();
  }
  // Sin base (modo demo, solo fuera de producción): no se registra nada y la bolsa sigue por WhatsApp sin código.
  if (cfg.mode === 'demo') return unavailable();
  const ip = clientIp(req, cfg.mode);
  if (!ip) return unavailable();

  const rl = await limit(ip, cfg.mode, { ns: 'ped', max: 5, window: 600 });
  if (rl === 'error') return unavailable();
  if (!rl.allowed) return json({ ok: false, motivo: 'demasiados_pedidos' }, 429, { 'Retry-After': String(rl.retry) });
  // IPv6: además el /48 entero (un /48 son 65.536 redes /64, gratis en un túnel)
  if (ip.includes(':')) {
    const r = await limit(ip, cfg.mode, { ns: 'ped48', max: MAX_48(), window: 600, bits: 48 });
    if (r === 'error') return unavailable();
    if (!r.allowed) return json({ ok: false, motivo: 'demasiados_pedidos' }, 429, { 'Retry-After': String(r.retry) });
  }

  if (cfg.mode === 'prod' || process.env.TURNSTILE_SECRET_KEY) {
    if (!turnstileToken || !(await verifyTurnstile(turnstileToken, ip, 'pedido', req))) return json({ ok: false, motivo: 'verificacion' }, 403);
  }
  const techo = await limit('*', cfg.mode, { ns: 'pedg', max: MAX_SITIO(), window: 600 });
  if (techo === 'error') return unavailable();
  if (!techo.allowed) return json({ ok: false, motivo: 'demasiados_pedidos' }, 429, { 'Retry-After': String(techo.retry) });

  try {
    const r = await crearPedido(cfg.dbUrl, cfg.mode, { items, entrega, pago, nombre: nombre?.trim() || 'Cliente web', ip: redLimite(ip) });
    return json(r, r.ok ? 200 : r.motivo === 'sin_stock' ? 409 : r.motivo === 'demasiados_pedidos' ? 429 : 400);
  } catch (e) {
    // Nunca se registran el nombre ni los productos.
    console.error('[pedidos] la base no respondió:', (e as { code?: string }).code ?? 'sin código');
    return unavailable();
  }
}
