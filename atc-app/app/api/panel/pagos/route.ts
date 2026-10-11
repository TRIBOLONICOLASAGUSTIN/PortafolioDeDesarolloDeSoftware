import { notFound } from 'next/navigation';
import { esSuperadmin } from '@/lib/server/admin';
import { avisoFaltante, readBytes, respuestas, sameSite } from '@/lib/server/http';
import { panelConfig } from '@/lib/server/config';
import { rpc } from '@/lib/server/db';
import { COMPROBANTE_MAX, tipoComprobante } from '@/lib/comprobante';
import { CODIGO_PEDIDO_RE, pagoSchema } from '@/lib/panel/schemas';

// POST /api/panel/pagos — el dueño registra la transferencia de un pedido con su comprobante (seguridad.md §5, fila 25).
// Solo existe para el superadmin con sesión: sin la cookie, next.config la reescribe a una dirección inexistente (el
// mismo 404 que cualquier otra); con una cookie que no vale, 404 también.
// Orden: sesión → mismo sitio → cuerpo de hasta 2 MB + margen (con tiempo límite) → campos (Zod: código, quién pagó y
// monto mayor a 0) → tipo por los primeros bytes (no por la extensión) → configuración → base (registrar_pago con
// atc_panel, que vuelve a validar todo y pasa el pedido a pagado) → respuesta sin caché.
// Del pago se guardan el nombre de quien pagó y el monto; el archivo lo ve solo el dueño y se borra a los 90 días.
export const dynamic = 'force-dynamic';

const MAX_BODY = COMPROBANTE_MAX + 16 * 1024; // el archivo más los campos y los separadores del formulario
const r = respuestas({ 'X-Robots-Tag': 'noindex' }), { json } = r;
const avisar = avisoFaltante('panel/pagos');

export async function POST(req: Request) {
  if (!(await esSuperadmin())) notFound();
  if (!sameSite(req)) return json({ ok: false, motivo: 'origen' }, 403);
  const ct = req.headers.get('content-type') ?? '';
  if (!ct.toLowerCase().startsWith('multipart/form-data')) return r.invalida();
  // Hasta 30 s para que llegue: el dueño puede estar subiendo una foto desde el celular con poca señal.
  const cuerpo = await readBytes(req, MAX_BODY, 30_000);
  if (!cuerpo) return r.invalida();
  let form: FormData;
  try { form = await new Response(new Uint8Array(cuerpo), { headers: { 'content-type': ct } }).formData(); } catch { return r.invalida(); }

  const codigo = String(form.get('codigo') ?? ''), montoTxt = String(form.get('monto') ?? '');
  // Sin signo menos ni decimales: el monto es un entero mayor a 0 (la base lo controla otra vez).
  const datos = pagoSchema.safeParse({ pagador: String(form.get('pagador') ?? ''), monto: /^\d{1,9}$/.test(montoTxt) ? Number(montoTxt) : NaN });
  const archivo = form.get('comprobante');
  if (!CODIGO_PEDIDO_RE.test(codigo) || !datos.success || !(archivo instanceof File) || archivo.size === 0 || archivo.size > COMPROBANTE_MAX) return r.invalida();
  const bytes = Buffer.from(await archivo.arrayBuffer());
  const tipo = tipoComprobante(bytes);
  if (!tipo) return r.invalida();

  const cfg = panelConfig();
  if (!cfg.ok) { avisar(cfg.missing); return r.noDisponible(); }
  // Sin base (modo demo, solo fuera de producción): el panel sigue en maqueta y no se guarda nada.
  if (cfg.mode === 'demo') return r.noDisponible();
  try {
    const res = await rpc<{ ok: boolean; motivo?: string }>('panel', cfg.dbUrl, cfg.mode, 'select public.registrar_pago($1, $2, $3, $4, $5) as r',
      [codigo, datos.data.pagador, datos.data.monto, tipo, bytes]);
    return json(res, res.ok ? 200 : res.motivo === 'solicitud_invalida' ? 400 : 409);
  } catch (e) {
    // Nunca se registran el nombre, el monto ni el archivo.
    console.error('[panel/pagos] la base no respondió:', (e as { code?: string }).code ?? 'sin código');
    return r.noDisponible();
  }
}
