import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Códigos de 6 dígitos que cambian cada 30 s (TOTP, RFC 6238), compatibles con Google Authenticator,
// Microsoft Authenticator, 1Password, etc. La clave vive solo en el servidor (ATC_ADMIN_TOTP_SECRET, base32).
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const STEP = 30;

/** Base32 (RFC 4648) → bytes. null si tiene caracteres inválidos. */
export function base32(s: string): Buffer | null {
  const clean = s.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0, val = 0;
  const out: number[] = [];
  for (const c of clean) {
    const i = B32.indexOf(c);
    if (i < 0) return null;
    val = (val << 5) | i; bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

/** Código de 6 dígitos para el paso `step` (segundos desde 1970 / 30). */
export function codigo(key: Buffer, step: number) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac('sha1', key).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, '0');
}

/**
 * Verifica el código contra el paso actual y uno antes o después (por relojes un poco corridos).
 * Devuelve el paso que coincidió (para no aceptar el mismo código dos veces) o null.
 */
export function verificar(key: Buffer, code: string, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const t = Math.floor(now / 1000 / STEP);
  let match: number | null = null;
  for (const s of [t - 1, t, t + 1]) {
    // Se recorren los tres siempre (tiempo parejo); la comparación no corta en el primer carácter distinto.
    if (timingSafeEqual(Buffer.from(codigo(key, s)), Buffer.from(code)) && match === null) match = s;
  }
  return match;
}
