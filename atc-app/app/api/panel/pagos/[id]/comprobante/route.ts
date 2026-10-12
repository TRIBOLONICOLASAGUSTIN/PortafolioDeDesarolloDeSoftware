import { notFound } from 'next/navigation';
import { reciente, sesionActual } from '@/lib/server/admin';
import { panelConfig } from '@/lib/server/config';
import { rpc } from '@/lib/server/db';
import { descifrar } from '@/lib/server/cifrado';
import { respuestas, sameSite } from '@/lib/server/http';
import { noExiste } from '@/lib/server/no-existe';
import { tipoComprobante } from '@/lib/comprobante';

// GET y DELETE /api/panel/pagos/[id]/comprobante — ver o borrar el comprobante de una transferencia, solo el superadmin
// con sesión (seguridad.md §5, fila 25). Sin sesión, el mismo 404 que cualquier dirección de /api (también los demás
// métodos). El comprobante trae datos bancarios del cliente: para verlo o borrarlo hay que haber ingresado hace menos de
// 15 minutos (si no, 403 "reingresar"), así una sesión robada más vieja no alcanza.
// Se guarda cifrado: se descifra acá y se controla que siga siendo el tipo guardado. Se sirve aislado: sin caché, sin que
// el navegador adivine el tipo (nosniff) y con una CSP que no deja correr nada (sandbox), así un PDF o una imagen
// manipulados no pueden ejecutar código en el sitio. Los PDF se descargan.
export const dynamic = 'force-dynamic';
export { noExiste as HEAD, noExiste as POST, noExiste as PUT, noExiste as PATCH, noExiste as OPTIONS };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' };
const r = respuestas({ 'X-Robots-Tag': 'noindex' }), { json } = r;

type Ctx = { params: Promise<{ id: string }> };
/** Sesión, id y configuración, en ese orden. Devuelve la respuesta de corte o lo necesario para seguir. */
async function preparar({ params }: Ctx) {
  const s = await sesionActual();
  if (!s) notFound();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  if (!reciente(s)) return { corte: json({ ok: false, motivo: 'reingresar' }, 403) };
  const cfg = panelConfig();
  if (!cfg.ok) return { corte: r.noDisponible() };
  if (cfg.mode === 'demo') notFound();
  return { id, cfg };
}

export async function GET(_req: Request, ctx: Ctx) {
  const p = await preparar(ctx);
  if ('corte' in p) return p.corte;
  let c: { tipo: string; datos: string } | null;
  try {
    c = await rpc<{ tipo: string; datos: string } | null>('panel', p.cfg.dbUrl, p.cfg.mode,
      `select (select jsonb_build_object('tipo', tipo, 'datos', encode(datos, 'base64')) from public.ver_comprobante($1::uuid)) as r`, [p.id]);
  } catch (e) {
    console.error('[panel/comprobante] la base no respondió:', (e as { code?: string }).code ?? 'sin código');
    return r.noDisponible();
  }
  // Inexistente, ya borrado a mano o vencido (90 días): 404.
  if (!c || !EXT[c.tipo]) notFound();
  const plano = descifrar(p.cfg.clave, c.tipo, Buffer.from(c.datos, 'base64'));
  if (!plano || tipoComprobante(plano) !== c.tipo) {
    console.error('[panel/comprobante] no se pudo abrir un comprobante (¿cambió ATC_COMPROBANTES_KEY?)');
    return json({ ok: false, motivo: 'no_se_pudo_abrir' }, 500);
  }
  const pdf = c.tipo === 'application/pdf';
  return new Response(new Uint8Array(plano), {
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

// "Ya lo revisé: borrar comprobante": se borra el archivo y quedan el nombre de quien pagó y el monto (Ganancias).
export async function DELETE(req: Request, ctx: Ctx) {
  if (!(await sesionActual())) notFound();
  if (!sameSite(req)) return json({ ok: false, motivo: 'origen' }, 403);
  const p = await preparar(ctx);
  if ('corte' in p) return p.corte;
  try {
    const borrado = await rpc<boolean>('panel', p.cfg.dbUrl, p.cfg.mode, 'select public.borrar_comprobante($1::uuid) as r', [p.id]);
    return borrado ? json({ ok: true }) : json({ ok: false, motivo: 'no_existe' }, 404);
  } catch (e) {
    console.error('[panel/comprobante] la base no respondió:', (e as { code?: string }).code ?? 'sin código');
    return r.noDisponible();
  }
}
