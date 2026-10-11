import 'server-only';
import { localPermitido } from './config';

// Verificación de Cloudflare Turnstile del lado del servidor (el resultado del navegador solo no alcanza).
// Además de `success`, se controla:
// - action: cada formulario tiene la suya (seguimiento / ingresar / pedido); un token resuelto en uno no sirve en otro.
// - hostname: el sitio donde se resolvió tiene que ser este mismo.
// Solo para pruebas locales (ATC_LOCAL=1 fuera de un hosting) se puede apuntar a un verificador falso, y solo en esta
// compu (127.0.0.1): así la clave secreta nunca viaja a otro servidor.
const URL_CF = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const falso = () => { const u = process.env.ATC_TURNSTILE_URL; try { return u && ['127.0.0.1', 'localhost'].includes(new URL(u).hostname) ? u : null; } catch { return null; } };
const verificador = () => (localPermitido() && falso()) || URL_CF;
const host = (req: Request) => (req.headers.get('host') ?? '').replace(/:\d+$/, '').toLowerCase();

export type Accion = 'seguimiento' | 'ingresar' | 'pedido';

export async function verifyTurnstile(token: string, ip: string, action: Accion, req: Request): Promise<boolean> {
  try {
    const res = await fetch(verificador(), {
      method: 'POST',
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY ?? '', response: token, remoteip: ip }),
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    });
    const out = (await res.json()) as { success?: boolean; action?: string; hostname?: string };
    return out.success === true && out.action === action && !!out.hostname && out.hostname.toLowerCase() === host(req);
  } catch {
    return false;
  }
}

/** Turnstile es obligatorio en producción (y fuera de ella si hay clave secreta): true si no hace falta o si el token vale. */
export async function turnstileOk(mode: 'demo' | 'local' | 'prod', token: string | undefined, ip: string, action: Accion, req: Request) {
  if (mode !== 'prod' && !process.env.TURNSTILE_SECRET_KEY) return true;
  return !!token && verifyTurnstile(token, ip, action, req);
}
