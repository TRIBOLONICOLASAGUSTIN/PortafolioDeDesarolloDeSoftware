import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { adminConfig, cookieSpec, credencialesOk, cuentaId, nuevaSesion, SESSION_HOURS, Ocupado } from '@/lib/server/admin';
import { clientIp, redLimite } from '@/lib/server/config';
import { readLimited, sameSite } from '@/lib/server/http';
import { fallos2fa, limit, primeraVez } from '@/lib/server/ratelimit';
import { verifyTurnstile } from '@/lib/server/turnstile';
import { verificar } from '@/lib/server/totp';

// POST /api/ingresar — ingreso del superadmin al panel (docs/atc/seguridad.md §3 y §5, fila 17).
// Orden: mismo sitio → JSON chico y válido → configuración completa → (en local, solo desde esta compu) → IP confiable
// → límite por IP (5 en 15 min) → Turnstile → usuario + contraseña (scrypt) + código del celular (TOTP, de un solo uso)
// → tope de códigos fallidos por cuenta (10 en 24 h) → cookie de sesión.
// Cualquier falla de credenciales responde exactamente lo mismo: no dice qué dato estuvo mal.
export const dynamic = 'force-dynamic';

const MAX_BODY = 1024;
/** Códigos del celular fallidos con la contraseña correcta antes de bloquear el ingreso (24 h o hasta admin:setup) */
const MAX_2FA = 10;
// En modo local (npm run dev / next start de pruebas) el ingreso solo se acepta desde esta compu: por la red Wi-Fi
// viajaría por HTTP, sin cifrar.
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);
// Se mira el encabezado Host (con el que llegó el pedido): req.url lleva la dirección donde escucha el servidor.
const desdeEstaCompu = (req: Request) => {
  const h = (req.headers.get('host') ?? '').toLowerCase();
  return LOOPBACK.has(h.startsWith('[') ? h.slice(0, h.indexOf(']') + 1) : h.split(':')[0]);
};
const Body = z.object({
  usuario: z.string().min(1).max(80),
  clave: z.string().min(1).max(200),
  codigo: z.string().regex(/^\d{6}$/),
  turnstileToken: z.string().max(2048).optional(),
}).strict();

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', ...extra } });
const invalid = () => json({ ok: false, motivo: 'solicitud_invalida' }, 400);
const unavailable = () => json({ ok: false, motivo: 'no_disponible' }, 503);
const denied = () => json({ ok: false, motivo: 'credenciales' }, 401);

let warned = false;

// Registro de cada intento (para ver si alguien está probando claves): resultado y la red de origen como HMAC.
// Nunca el usuario, la clave, el código ni la IP en crudo.
const registrar = (secret: Buffer, ip: string, resultado: 'ok' | 'limite' | 'verificacion' | 'credenciales' | 'codigo' | 'bloqueo_2fa' | 'codigo_usado') =>
  console.info(JSON.stringify({ evento: 'ingreso', resultado, red: createHmac('sha256', secret).update(redLimite(ip)).digest('hex').slice(0, 16) }));

export async function POST(req: Request) {
  if (!sameSite(req)) return json({ ok: false, motivo: 'origen' }, 403);
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return invalid();
  const text = await readLimited(req, MAX_BODY);
  if (text === null) return invalid();
  let data: unknown;
  try { data = JSON.parse(text); } catch { return invalid(); }
  const parsed = Body.safeParse(data);
  if (!parsed.success) return invalid();
  const { usuario, clave, codigo, turnstileToken } = parsed.data;

  const cfg = adminConfig();
  if (!cfg.ok) {
    if (!warned) { warned = true; console.error(`[ingresar] falta configuración: ${cfg.missing.join(', ')}`); }
    return unavailable();
  }
  if (cfg.mode === 'local' && !desdeEstaCompu(req)) return json({ ok: false, motivo: 'solo_local' }, 403);
  const ip = clientIp(req, cfg.mode);
  if (!ip) return unavailable();

  const rl = await limit(ip, cfg.mode, { ns: 'adm', max: 5, window: 900 });
  if (rl === 'error') return unavailable();
  if (!rl.allowed) { registrar(cfg.secret, ip, 'limite'); return json({ ok: false, motivo: 'demasiados_intentos' }, 429, { 'Retry-After': String(rl.retry) }); }

  if (cfg.mode === 'prod' || process.env.TURNSTILE_SECRET_KEY) {
    if (!turnstileToken || !(await verifyTurnstile(turnstileToken, ip, 'ingresar', req))) { registrar(cfg.secret, ip, 'verificacion'); return json({ ok: false, motivo: 'verificacion' }, 403); }
  }

  // Se calculan las dos cosas siempre (tiempo parejo) y recién después se decide.
  const step = verificar(cfg.totp, codigo);
  let ok: boolean;
  try { ok = await credencialesOk(cfg, usuario, clave); } catch (e) { if (e instanceof Ocupado) return unavailable(); throw e; }
  // Contraseña correcta con un código equivocado: solo lo provoca quien ya tiene la contraseña. A los 10 en 24 h (desde
  // cualquier red) no entra nadie hasta que pasen las 24 h o el dueño corra admin:setup; el log lo avisa.
  // Se consulta siempre (también con la clave mal) para que el tiempo no delate la contraseña.
  const fallos = await fallos2fa(cuentaId(cfg), cfg.mode, ok && step === null);
  if (fallos === 'error') return unavailable();
  if (ok && fallos >= MAX_2FA) {
    registrar(cfg.secret, ip, 'bloqueo_2fa');
    console.error('[ingresar] contraseña correcta con 10 códigos del celular fallidos en 24 h: cambiá las claves (npm run admin:setup)');
    return denied();
  }
  if (!ok || step === null) { registrar(cfg.secret, ip, ok ? 'codigo' : 'credenciales'); return denied(); }
  // Un código del celular sirve una sola vez (si alguien lo ve por encima del hombro, ya no le sirve).
  if (!(await primeraVez(`adm:totp:${step}`, 120, cfg.mode))) { registrar(cfg.secret, ip, 'codigo_usado'); return denied(); }
  registrar(cfg.secret, ip, 'ok');

  const { name, secure } = cookieSpec(cfg);
  const cookie = [`${name}=${nuevaSesion(cfg)}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${SESSION_HOURS * 3600}`, ...(secure ? ['Secure'] : [])].join('; ');
  return json({ ok: true }, 200, { 'Set-Cookie': cookie });
}
