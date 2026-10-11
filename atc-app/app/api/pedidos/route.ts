import { z } from 'zod';
import { clientIp, redLimite, tiendaConfig } from '@/lib/server/config';
import { limit } from '@/lib/server/ratelimit';
import { turnstileOk } from '@/lib/server/turnstile';
import { avisoFaltante, corteLimite, leerJson, respuestas } from '@/lib/server/http';
import { crearPedido } from '@/lib/server/tienda';
import { ENTREGAS, PAY_IDS, POR_PRODUCTO } from '@/lib/whatsapp';

// POST /api/pedidos — la bolsa registra el pedido y la base aparta el stock por 48 h (docs/atc/seguridad.md §3 y §5,
// fila 21). El cobro sigue siendo por WhatsApp: acá no hay pagos ni datos de tarjeta.
// Orden: mismo sitio → JSON chico y válido → configuración → IP confiable → límite por red (y por /48 en IPv6) →
// Turnstile → techo de todo el sitio (cuenta solo lo que pasó Turnstile: sin resolverlo nadie lo gasta) → base
// (crear_pedido, con su propio límite por red, precios de la base y reserva atómica) → respuesta sin caché.
// Si algo falla, la bolsa igual abre WhatsApp sin código: nunca se pierde una venta.
export const dynamic = 'force-dynamic';

const MAX_BODY = 2048;
// Topes de la bolsa (los mismos que controla crear_pedido): 3 unidades por producto (lib/whatsapp.ts) y 10 por pedido.
const POR_PEDIDO = 10;
// Límites de todo el sitio, para que un ataque desde muchas redes no llene la base de pedidos falsos. Si se pasan, la
// bolsa sigue por WhatsApp sin código (nadie pierde la venta). Se pueden ajustar sin tocar el código.
const num = (v: string | undefined, d: number) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };
const MAX_48 = () => num(process.env.ATC_RL_PED48, 20), MAX_SITIO = () => num(process.env.ATC_RL_PEDG, 60);
const Body = z.object({
  items: z.array(z.object({ slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(60), qty: z.number().int().min(1).max(POR_PRODUCTO) }).strict()).min(1).max(10)
    .refine(xs => xs.reduce((a, x) => a + x.qty, 0) <= POR_PEDIDO),
  entrega: z.enum(ENTREGAS),
  pago: z.enum(PAY_IDS),
  // Opcional en la bolsa: sin nombre, el pedido queda como "Cliente web"
  nombre: z.string().max(60).optional(),
  turnstileToken: z.string().max(2048).optional(),
}).strict();

const r = respuestas(), { json } = r;
const avisar = avisoFaltante('pedidos');

export async function POST(req: Request) {
  const leido = await leerJson(req, MAX_BODY, Body, r);
  if ('corte' in leido) return leido.corte;
  const { items, entrega, pago, nombre, turnstileToken } = leido.data;

  const cfg = tiendaConfig();
  if (!cfg.ok) { avisar(cfg.missing); return r.noDisponible(); }
  // Sin base (modo demo, solo fuera de producción): no se registra nada y la bolsa sigue por WhatsApp sin código.
  if (cfg.mode === 'demo') return r.noDisponible();
  const ip = clientIp(req, cfg.mode);
  if (!ip) return r.noDisponible();

  const porRed = corteLimite(await limit(ip, cfg.mode, { ns: 'ped', max: 5, window: 600 }), r, 'demasiados_pedidos');
  if (porRed) return porRed;
  // IPv6: además el /48 entero (un /48 son 65.536 redes /64, gratis en un túnel)
  if (ip.includes(':')) {
    const por48 = corteLimite(await limit(ip, cfg.mode, { ns: 'ped48', max: MAX_48(), window: 600, bits: 48 }), r, 'demasiados_pedidos');
    if (por48) return por48;
  }

  if (!(await turnstileOk(cfg.mode, turnstileToken, ip, 'pedido', req))) return json({ ok: false, motivo: 'verificacion' }, 403);
  const techo = corteLimite(await limit('*', cfg.mode, { ns: 'pedg', max: MAX_SITIO(), window: 600 }), r, 'demasiados_pedidos');
  if (techo) return techo;

  try {
    const res = await crearPedido(cfg.dbUrl, cfg.mode, { items, entrega, pago, nombre: nombre?.trim() || 'Cliente web', ip: redLimite(ip) });
    return json(res, res.ok ? 200 : res.motivo === 'sin_stock' ? 409 : res.motivo === 'demasiados_pedidos' ? 429 : 400);
  } catch (e) {
    // Nunca se registran el nombre ni los productos.
    console.error('[pedidos] la base no respondió:', (e as { code?: string }).code ?? 'sin código');
    return r.noDisponible();
  }
}
