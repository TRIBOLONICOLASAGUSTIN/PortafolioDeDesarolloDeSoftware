// Superadmin de PRUEBA (solo para los tests: nada de esto se usa en el sitio).
// Replica el formato del servidor (lib/server/admin.ts y lib/server/totp.ts) para generar códigos y sesiones.
import { createHash, createHmac, randomBytes, scryptSync } from 'node:crypto';

export const ADMIN = { user: 'dueno', pass: 'clave-de-prueba-123', totp: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP' };

/** Variables de entorno de un superadmin de prueba (hash scrypt más liviano que el de producción, para que sea rápido). */
export function adminEnv() {
  const salt = randomBytes(16);
  const hash = scryptSync(ADMIN.pass, salt, 32, { N: 2 ** 14, r: 8, p: 1 });
  return {
    ATC_ADMIN_USER: ADMIN.user,
    ATC_ADMIN_PASS_HASH: `scrypt:14:8:1:${salt.toString('base64url')}:${hash.toString('base64url')}`,
    ATC_ADMIN_TOTP_SECRET: ADMIN.totp,
    ATC_SESSION_SECRET: randomBytes(32).toString('base64url'),
  };
}

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const b32 = s => { let bits = 0, val = 0; const out = []; for (const c of s) { val = (val << 5) | B32.indexOf(c); bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); };

/** Código de 6 dígitos del paso de 30 s que corresponde a `now` + `offset` pasos. */
export function totpCode(offset = 0, now = Date.now(), secret = ADMIN.totp) {
  const m = Buffer.alloc(8); m.writeBigUInt64BE(BigInt(Math.floor(now / 30000) + offset));
  const h = createHmac('sha1', b32(secret)).update(m).digest(); const o = h[19] & 15;
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0');
}

/** Un "ahora" que no esté pegado al cambio de paso (si faltan menos de 4 s, espera al paso siguiente). */
export async function stableNow() {
  const into = (Date.now() / 1000) % 30;
  if (into > 26) await new Promise(r => setTimeout(r, (30 - into + .5) * 1000));
  return Date.now();
}

/** Sesión firmada como la del servidor (para probar sesiones vencidas o alteradas). */
export function forgeSession(env, exp) {
  const totpHex = b32(env.ATC_ADMIN_TOTP_SECRET).toString('hex');
  const huella = createHash('sha256').update(`${env.ATC_ADMIN_USER}\n${env.ATC_ADMIN_PASS_HASH}\n${totpHex}`).digest('base64url').slice(0, 22);
  const n = randomBytes(12).toString('base64url');
  const sig = createHmac('sha256', Buffer.from(env.ATC_SESSION_SECRET, 'base64url')).update(`v1.${exp}.${n}.${huella}`).digest('base64url');
  return `v1.${exp}.${n}.${sig}`;
}

/** POST /api/ingresar. */
export async function login(base, body, headers = {}) {
  const res = await fetch(`${base}/api/ingresar`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, headers: res.headers, text, json, cookie: res.headers.get('set-cookie') };
}
