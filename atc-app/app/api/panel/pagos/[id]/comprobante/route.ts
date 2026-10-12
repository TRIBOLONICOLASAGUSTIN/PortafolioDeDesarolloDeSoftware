import { notFound } from 'next/navigation';
import { reciente, sesionActual } from '@/lib/server/admin';
import { panelConfig } from '@/lib/server/config';
import { rpc } from '@/lib/server/db';
import { respuestas, sameSite } from '@/lib/server/http';
import { noExiste } from '@/lib/server/no-existe';

// GET y DELETE /api/panel/pagos/[id]/comprobante — el comprobante de una transferencia, solo para el superadmin con
// sesión (seguridad.md §5, fila 25). Sin sesión, el mismo 404 que cualquier dirección de /api (también los demás métodos).
// - GET devuelve el comprobante tal como está guardado: CIFRADO con la llave del dueño. El servidor no lo puede abrir;
//   lo abre el panel en el navegador del dueño, con la frase que solo él sabe (lib/cifrado-comprobante.ts). Por eso no
//   pide volver a ingresar: una sesión robada no tiene la frase.
// - DELETE ("Ya lo revisé") lo borra; quedan el nombre de quien pagó y el monto. Pide haber ingresado hace menos de 15
//   minutos (si no, 403 "reingresar"): una sesión robada más vieja no puede borrar comprobantes.
export const dynamic = 'force-dynamic';
export { noExiste as HEAD, noExiste as POST, noExiste as PUT, noExiste as PATCH, noExiste as OPTIONS };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TIPOS = ['image/jpeg', 'image/png', 'application/pdf'];
const r = respuestas({ 'X-Robots-Tag': 'noindex', 'X-Content-Type-Options': 'nosniff' }), { json } = r;

type Ctx = { params: Promise<{ id: string }> };
/** Id y configuración (la sesión ya se controló). Devuelve la respuesta de corte o lo necesario para seguir. */
async function preparar({ params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const cfg = panelConfig();
  if (!cfg.ok) return { corte: r.noDisponible() };
  if (cfg.mode === 'demo') notFound();
  return { id, cfg };
}
const fallaBase = (e: unknown) => {
  console.error('[panel/comprobante] la base no respondió:', (e as { code?: string }).code ?? 'sin código');
  return r.noDisponible();
};

export async function GET(_req: Request, ctx: Ctx) {
  if (!(await sesionActual())) notFound();
  const p = await preparar(ctx);
  if ('corte' in p) return p.corte;
  let c: { tipo: string; datos: string } | null;
  try {
    c = await rpc<{ tipo: string; datos: string } | null>('panel', p.cfg.dbUrl, p.cfg.mode,
      `select (select jsonb_build_object('tipo', tipo, 'datos', encode(datos, 'base64')) from public.ver_comprobante($1::uuid)) as r`, [p.id]);
  } catch (e) {
    return fallaBase(e);
  }
  // Inexistente, ya borrado a mano o vencido (90 días): 404.
  if (!c || !TIPOS.includes(c.tipo)) notFound();
  return json({ ok: true, tipo: c.tipo, sobre: Buffer.from(c.datos, 'base64').toString('base64url') });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const s = await sesionActual();
  if (!s) notFound();
  if (!sameSite(req)) return json({ ok: false, motivo: 'origen' }, 403);
  const p = await preparar(ctx);
  if ('corte' in p) return p.corte;
  if (!reciente(s)) return json({ ok: false, motivo: 'reingresar' }, 403);
  try {
    const borrado = await rpc<boolean>('panel', p.cfg.dbUrl, p.cfg.mode, 'select public.borrar_comprobante($1::uuid) as r', [p.id]);
    return borrado ? json({ ok: true }) : json({ ok: false, motivo: 'no_existe' }, 404);
  } catch (e) {
    return fallaBase(e);
  }
}
