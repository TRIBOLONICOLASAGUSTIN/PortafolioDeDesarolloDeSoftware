import { notFound } from 'next/navigation';
import { esSuperadmin } from '@/lib/server/admin';
import { panelConfig } from '@/lib/server/config';
import { rpc } from '@/lib/server/db';

// GET /api/panel/pagos/[id]/comprobante — el comprobante de una transferencia, solo para el superadmin con sesión
// (seguridad.md §5, fila 25). Sin sesión, el mismo 404 que cualquier dirección.
// Se sirve aislado: sin caché, sin que el navegador adivine el tipo (nosniff) y con una CSP que no deja correr nada
// (sandbox), así un PDF o una imagen manipulados no pueden ejecutar código en el sitio. Los PDF se descargan.
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await esSuperadmin())) notFound();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const cfg = panelConfig();
  if (!cfg.ok || cfg.mode === 'demo') notFound();
  let c: { tipo: string; datos: string } | null;
  try {
    c = await rpc<{ tipo: string; datos: string } | null>('panel', cfg.dbUrl, cfg.mode,
      `select (select jsonb_build_object('tipo', tipo, 'datos', encode(datos, 'base64')) from public.ver_comprobante($1::uuid)) as r`, [id]);
  } catch (e) {
    console.error('[panel/comprobante] la base no respondió:', (e as { code?: string }).code ?? 'sin código');
    return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  // Inexistente o ya borrado (90 días): 404.
  if (!c || !EXT[c.tipo]) notFound();
  const pdf = c.tipo === 'application/pdf';
  return new Response(new Uint8Array(Buffer.from(c.datos, 'base64')), {
    headers: {
      'Content-Type': c.tipo,
      'Content-Disposition': `${pdf ? 'attachment' : 'inline'}; filename="comprobante.${EXT[c.tipo]}"`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self'",
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
