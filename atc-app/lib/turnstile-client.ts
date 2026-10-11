// Cloudflare Turnstile en el navegador, solo cuando hace falta (datos mínimos): el script se pide recién cuando el
// cliente consulta una reparación o finaliza un pedido, no en cada visita. Lo comparten el seguimiento y la bolsa.
// Acá también vive el envío a las rutas del sitio (postJson), que usan el seguimiento, la bolsa y el ingreso.
// Con la CSP 'strict-dynamic', un script que agrega otro script propio (este módulo) no necesita nonce.
// (El ingreso del dueño usa el widget implícito con su <Script>: el formulario nativo lee cf-turnstile-response.)
type TS = { render: (el: HTMLElement, o: Record<string, unknown>) => string; remove?: (id: string) => void; reset?: (el?: string | HTMLElement) => void };
declare global { interface Window { turnstile?: TS } }

export const TURNSTILE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let carga: Promise<TS | null> | null = null;

function cargar(): Promise<TS | null> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  carga ??= new Promise(res => {
    const s = document.createElement('script');
    s.src = SRC; s.async = true;
    s.onload = () => res(window.turnstile ?? null);
    s.onerror = () => { carga = null; res(null); };
    document.head.appendChild(s);
  });
  return carga;
}

/**
 * Token de Turnstile para una acción ('seguimiento' | 'pedido'). Sin clave configurada devuelve null (desarrollo).
 * El widget es invisible salvo que Cloudflare pida interactuar; si no responde en 8 s, sigue sin token (el servidor decide).
 */
export async function tokenTurnstile(el: HTMLElement | null, action: 'seguimiento' | 'pedido'): Promise<string | null> {
  if (!TURNSTILE_KEY || !el) return null;
  const ts = await cargar();
  if (!ts) return null;
  return new Promise(res => {
    const fin = setTimeout(() => res(null), 8000);
    el.replaceChildren();
    ts.render(el, { sitekey: TURNSTILE_KEY, action, appearance: 'interaction-only', size: 'flexible', language: 'es',
      callback: (t: string) => { clearTimeout(fin); res(t); }, 'error-callback': () => { clearTimeout(fin); res(null); } });
  });
}

/** POST JSON a una ruta del sitio, con el token de Turnstile si hay. `j`: la respuesta, o null si no llegó un JSON. */
export async function postJson<T>(url: string, body: Record<string, unknown>, token?: string | null, ms?: number) {
  const r = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, ...(ms ? { signal: AbortSignal.timeout(ms) } : {}),
    body: JSON.stringify({ ...body, ...(token ? { turnstileToken: token } : {}) }),
  });
  return { ok: r.ok, status: r.status, j: (await r.json().catch(() => null)) as T | null };
}
