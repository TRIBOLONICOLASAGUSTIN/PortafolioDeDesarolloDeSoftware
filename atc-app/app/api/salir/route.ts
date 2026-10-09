import { adminConfig, cookieSpec } from '@/lib/server/admin';
import { sameSite } from '@/lib/server/http';

// POST /api/salir — cierra la sesión del superadmin (borra la cookie). Solo desde el mismo sitio.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
  if (!sameSite(req)) return Response.json({ ok: false, motivo: 'origen' }, { status: 403, headers });
  const cfg = adminConfig();
  if (cfg.ok) {
    const { name, secure } = cookieSpec(cfg);
    headers['Set-Cookie'] = [`${name}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0', ...(secure ? ['Secure'] : [])].join('; ');
  }
  return Response.json({ ok: true }, { headers });
}
