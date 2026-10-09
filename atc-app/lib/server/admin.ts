import 'server-only';
import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { base32 } from './totp';

/* =========================================================
   Superadmin único del panel (docs/atc/seguridad.md §3 y §5, fila 17).
   - Usuario + contraseña (en el entorno va SOLO el hash scrypt) + código del celular (TOTP).
   - Sesión: cookie firmada con HMAC por el servidor, HttpOnly, SameSite=Strict, 8 h. No se guarda nada en la base.
   - Las claves viven en el entorno del servidor (.env.local en desarrollo, variables del hosting en producción):
     nunca en el repo ni con el prefijo NEXT_PUBLIC_. Se generan con `npm run admin:setup`.
   - Cambiar la contraseña, la clave del celular o ATC_SESSION_SECRET cierra todas las sesiones abiertas.
   ========================================================= */
const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, o: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;

export const SESSION_HOURS = 8;
const HASH_RE = /^scrypt:(\d{1,2}):(\d{1,2}):(\d{1,2}):([A-Za-z0-9_-]{16,}):([A-Za-z0-9_-]{40,})$/;
// Producción: además del superadmin, el ingreso exige el límite compartido (Upstash), Turnstile y la IP de la plataforma.
const ADMIN_VARS = ['ATC_ADMIN_USER', 'ATC_ADMIN_PASS_HASH', 'ATC_ADMIN_TOTP_SECRET', 'ATC_SESSION_SECRET'];
const PROD_VARS = ['TURNSTILE_SECRET_KEY', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'ATC_IP_HEADER'];

export type AdminConfig =
  | { ok: true; mode: 'local' | 'prod'; user: string; passHash: string; totp: Buffer; secret: Buffer }
  | { ok: false; missing: string[] };

/** Configuración del superadmin. Si falta algo o es inválido, no hay ingreso posible (falla cerrado). */
export function adminConfig(): AdminConfig {
  const e = process.env;
  const missing = ADMIN_VARS.filter(k => !e[k]);
  const prod = e.NODE_ENV === 'production' && e.ATC_LOCAL !== '1';
  if (prod) missing.push(...PROD_VARS.filter(k => !e[k]));
  if (prod && (e.ATC_IP_HEADER ?? '').toLowerCase() === 'x-forwarded-for') missing.push('ATC_IP_HEADER (no puede ser x-forwarded-for)');
  if (e.ATC_ADMIN_PASS_HASH && !HASH_RE.test(e.ATC_ADMIN_PASS_HASH)) missing.push('ATC_ADMIN_PASS_HASH (formato inválido: generalo con npm run admin:setup)');
  const totp = e.ATC_ADMIN_TOTP_SECRET ? base32(e.ATC_ADMIN_TOTP_SECRET) : null;
  if (e.ATC_ADMIN_TOTP_SECRET && (!totp || totp.length < 16)) missing.push('ATC_ADMIN_TOTP_SECRET (base32 de 128 bits o más)');
  const secret = e.ATC_SESSION_SECRET ? Buffer.from(e.ATC_SESSION_SECRET, 'base64url') : null;
  if (e.ATC_SESSION_SECRET && (!secret || secret.length < 32)) missing.push('ATC_SESSION_SECRET (32 bytes o más, en base64url)');
  if (missing.length) return { ok: false, missing };
  return { ok: true, mode: prod ? 'prod' : 'local', user: e.ATC_ADMIN_USER!, passHash: e.ATC_ADMIN_PASS_HASH!, totp: totp!, secret: secret! };
}

/** Compara usuario y contraseña en tiempo parejo: siempre calcula el scrypt, aunque el usuario no coincida. */
export async function credencialesOk(cfg: Extract<AdminConfig, { ok: true }>, user: string, pass: string) {
  const [, ln, r, p, salt, hash] = HASH_RE.exec(cfg.passHash)!;
  const want = Buffer.from(hash, 'base64url');
  const got = await scrypt(pass.normalize('NFC'), Buffer.from(salt, 'base64url'), want.length, { N: 2 ** Number(ln), r: Number(r), p: Number(p), maxmem: 256 * 1024 * 1024 });
  const passOk = got.length === want.length && timingSafeEqual(got, want);
  const h = (s: string) => createHash('sha256').update(s.normalize('NFC').toLowerCase()).digest();
  const userOk = timingSafeEqual(h(user), h(cfg.user));
  return passOk && userOk;
}

/* ---------- Sesión ---------- */
// La firma incluye una huella de la contraseña y de la clave del celular: si cambian, las sesiones viejas dejan de valer.
const huella = (cfg: Extract<AdminConfig, { ok: true }>) => createHash('sha256').update(`${cfg.user}\n${cfg.passHash}\n${cfg.totp.toString('hex')}`).digest('base64url').slice(0, 22);
const firma = (cfg: Extract<AdminConfig, { ok: true }>, exp: number, n: string) => createHmac('sha256', cfg.secret).update(`v1.${exp}.${n}.${huella(cfg)}`).digest('base64url');

/** Nombre y atributos de la cookie. En producción con https, prefijo __Host- (solo este sitio, solo https). */
export function cookieSpec(cfg: Extract<AdminConfig, { ok: true }>) {
  const https = cfg.mode === 'prod';
  return { name: https ? '__Host-atc_s' : 'atc_s', secure: https };
}

export function nuevaSesion(cfg: Extract<AdminConfig, { ok: true }>, now = Date.now()) {
  const exp = Math.floor(now / 1000) + SESSION_HOURS * 3600;
  const n = randomBytes(12).toString('base64url');
  return `v1.${exp}.${n}.${firma(cfg, exp, n)}`;
}

export function sesionValida(cfg: Extract<AdminConfig, { ok: true }>, value: string | undefined, now = Date.now()) {
  const m = /^v1\.(\d{10})\.([A-Za-z0-9_-]{16})\.([A-Za-z0-9_-]{43})$/.exec(value ?? '');
  if (!m) return false;
  const exp = Number(m[1]);
  if (exp <= Math.floor(now / 1000) || exp > Math.floor(now / 1000) + SESSION_HOURS * 3600 + 60) return false;
  const want = Buffer.from(firma(cfg, exp, m[2])), got = Buffer.from(m[3]);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** ¿El pedido viene del superadmin con una sesión válida? Se usa en cada página y acción del panel. */
export async function esSuperadmin() {
  const cfg = adminConfig();
  if (!cfg.ok) return false;
  const jar = await cookies();
  return sesionValida(cfg, jar.get(cookieSpec(cfg).name)?.value);
}
