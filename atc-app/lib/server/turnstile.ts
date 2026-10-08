import 'server-only';

/** Verifica el token de Cloudflare Turnstile del lado del servidor (el del navegador solo no alcanza). */
export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY ?? '', response: token, remoteip: ip }),
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    });
    const out = (await res.json()) as { success?: boolean };
    return out.success === true;
  } catch {
    return false;
  }
}
