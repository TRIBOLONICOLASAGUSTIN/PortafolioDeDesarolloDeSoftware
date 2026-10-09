import 'server-only';

// Controles HTTP compartidos por las rutas del servidor (seguimiento e ingreso del superadmin).

/** Mismo sitio: Sec-Fetch-Site same-origin y Origin igual al Host (si vienen). */
export function sameSite(req: Request) {
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return false;
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.get('host'); } catch { return false; }
}

/** Cuerpo de hasta `max` bytes; si es más largo o no hay cuerpo, null (sin leer de más). */
export async function readLimited(req: Request, max: number): Promise<string | null> {
  if (Number(req.headers.get('content-length') ?? 0) > max) return null;
  const reader = req.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
