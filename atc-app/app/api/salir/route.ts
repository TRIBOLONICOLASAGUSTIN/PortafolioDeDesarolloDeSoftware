import { adminConfig, cookieSesion } from '@/lib/server/admin';
import { sameSite } from '@/lib/server/http';

// POST /api/salir — cierra la sesión del superadmin (borra la cookie). Solo desde el mismo sitio.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
  if (!sameSite(req)) return Response.json({ ok: false, motivo: 'origen' }, { status: 403, headers });
  const cfg = adminConfig();
  if (cfg.ok) headers['Set-Cookie'] = cookieSesion(cfg, '', 0);
  return Response.json({ ok: true }, { headers });
}
