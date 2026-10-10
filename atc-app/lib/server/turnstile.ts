import 'server-only';

// Verificación de Cloudflare Turnstile del lado del servidor (el resultado del navegador solo no alcanza).
// Además de `success`, se controla:
// - action: cada formulario tiene la suya (seguimiento / ingresar); un token resuelto en uno no sirve en el otro.
// - hostname: el sitio donde se resolvió tiene que ser este mismo.
// Solo para pruebas locales (ATC_LOCAL=1, nunca en producción) se puede apuntar a un verificador falso.
const URL_CF = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const verificador = () => (process.env.ATC_LOCAL === '1' && process.env.ATC_TURNSTILE_URL) || URL_CF;
const host = (req: Request) => (req.headers.get('host') ?? '').replace(/:\d+$/, '').toLowerCase();

export type Accion = 'seguimiento' | 'ingresar';

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
