import { notFound } from 'next/navigation';
import { esSuperadmin } from '@/lib/server/admin';
import { avisoFaltante, readBytes, respuestas, sameSite } from '@/lib/server/http';
import { panelConfig } from '@/lib/server/config';
import { rpc } from '@/lib/server/db';
import { cifrar } from '@/lib/server/cifrado';
import { noExiste } from '@/lib/server/no-existe';
import { COMPROBANTE_MAX, limpiarComprobante } from '@/lib/comprobante';
import { CODIGO_PEDIDO_RE, pagoSchema } from '@/lib/panel/schemas';

// POST /api/panel/pagos — el dueño registra la transferencia de un pedido con su comprobante (seguridad.md §5, fila 25).
// Solo existe para el superadmin con sesión: sin la cookie, next.config la reescribe a una dirección inexistente (el
// mismo 404 que cualquier otra); con una cookie que no vale, 404 también.
// Orden: sesión → mismo sitio → cuerpo de hasta 2 MB + margen (con tiempo límite) → campos (Zod: código, quién pagó y
// monto mayor a 0) → tipo por los primeros bytes (no por la extensión) y sin datos ocultos (ubicación, celular,
// miniatura: lib/comprobante.ts) → configuración → cifrado (lib/server/cifrado.ts) → base (registrar_pago con atc_panel,
// que vuelve a validar todo, rechaza un archivo sin cifrar y pasa el pedido a pagado) → respuesta sin caché.
// Del pago se guardan el nombre de quien pagó y el monto; el archivo lo ve solo el dueño y se borra a los 90 días.
// Los demás métodos responden como una dirección inexistente (si no, Next contestaría OPTIONS y 405 por su cuenta).
export const dynamic = 'force-dynamic';
export { noExiste as GET, noExiste as HEAD, noExiste as PUT, noExiste as PATCH, noExiste as DELETE, noExiste as OPTIONS };

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
  const limpio = limpiarComprobante(new Uint8Array(await archivo.arrayBuffer()));
  // Al cerrar un JPEG cortado se le suman 2 bytes: el tope se controla de nuevo.
  if (!limpio || limpio.datos.length > COMPROBANTE_MAX) return r.invalida();

  const cfg = panelConfig();
  if (!cfg.ok) { avisar(cfg.missing); return r.noDisponible(); }
  // Sin base (modo demo, solo fuera de producción): el panel sigue en maqueta y no se guarda nada.
  if (cfg.mode === 'demo') return r.noDisponible();
  try {
    const res = await rpc<{ ok: boolean; motivo?: string }>('panel', cfg.dbUrl, cfg.mode, 'select public.registrar_pago($1, $2, $3, $4, $5) as r',
      [codigo, datos.data.pagador, datos.data.monto, limpio.tipo, cifrar(cfg.clave, limpio.tipo, limpio.datos)]);
    return json(res, res.ok ? 200 : res.motivo === 'solicitud_invalida' ? 400 : 409);
  } catch (e) {
    // Nunca se registran el nombre, el monto ni el archivo.
    console.error('[panel/pagos] la base no respondió:', (e as { code?: string }).code ?? 'sin código');
    return r.noDisponible();
  }
}
