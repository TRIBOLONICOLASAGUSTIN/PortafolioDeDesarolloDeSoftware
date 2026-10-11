// Pagos por transferencia del panel: POST /api/panel/pagos y GET /api/panel/pagos/[id]/comprobante.
// Solo existen para el superadmin con sesión; el monto nunca es negativo; el archivo se valida por sus primeros bytes y se
// sirve aislado. Cada prueba empieza con un ID (API-n) que se cita en docs/atc/seguridad.md (`npm run check:docs`).
// Corren contra `next start` y la base local de pruebas. Correr con: npm run test:api
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, LOCAL_ENV } from '../helpers/server.mjs';
import { adminEnv, forgeSession } from '../helpers/admin.mjs';
import { postRuta } from '../helpers/http.mjs';
import { connect } from '../db/helpers.mjs';

const ENV = { ...LOCAL_ENV, ...adminEnv() };
let srv;
before(async () => { srv = await startServer({ port: 3148, env: ENV }); });
after(async () => { await srv?.stop(); });

const sesion = () => `atc_s=${forgeSession(ENV, Math.floor(Date.now() / 1000) + 3600)}`;
const PNG = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.from('resto del png de prueba')]);
const PDF = Buffer.from('%PDF-1.7\nresto del pdf de prueba');
let ipSeq = 10;
// Un pedido real de la bolsa (pendiente), para adjuntarle la transferencia
async function pedido() {
  const r = await postRuta(srv.base, '/api/pedidos', { items: [{ slug: 'red-hdmi', qty: 1 }], entrega: 'retiro', pago: 'transferencia', nombre: 'Lucía Martínez' },
    { headers: { 'cf-connecting-ip': `198.51.100.${ipSeq++}` } });
  assert.equal(r.status, 200, r.text);
  return r.json;
}
async function pagar(campos, { cookie = sesion(), headers = {}, archivo = PNG, nombreArchivo = 'comprobante.png' } = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  if (archivo) f.set('comprobante', new Blob([archivo]), nombreArchivo);
  const res = await fetch(`${srv.base}/api/panel/pagos`, { method: 'POST', body: f, headers: { ...(cookie ? { cookie } : {}), ...headers } });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, headers: res.headers, text, json };
}

// Igual que en API-15: un 404 de estas rutas no se distingue del de cualquier dirección inventada
const SIN_VARIAR = ['date', 'content-length', 'etag', 'connection', 'keep-alive', 'transfer-encoding'];
const encabezados = r => Object.fromEntries([...r.headers].filter(([k]) => !SIN_VARIAR.includes(k)));
const limpiar = (html, ruta) => ruta.slice(1).split('/').reduce((h, seg, i) => h.replaceAll(`"${seg}"`, `"T${i}"`).replaceAll(`\\"${seg}\\"`, `\\"T${i}\\"`),
  html.replace(/\\?"[A-Za-z0-9_-]{20,24}\\?"/g, 'ID')).replaceAll(ruta.slice(1), 'RUTA');

test('API-34 · Sin la sesión del superadmin, las rutas de pagos no se distinguen de una dirección inexistente; con una cookie inventada, 404 sin datos', async () => {
  const id = '3f2b8c1e-0000-4000-8000-000000000000';
  // GET del comprobante sin cookie: el mismo 404 (encabezados y página) que cualquier dirección
  const [a, b] = await Promise.all([fetch(`${srv.base}/api/panel/pagos/${id}/comprobante`), fetch(`${srv.base}/api/zzzzz/aaaaa/${id}/bbbbbbbbbbb`)]);
  assert.equal(a.status, 404);
  assert.deepEqual(encabezados(a), encabezados(b), 'encabezados distintos');
  assert.equal(limpiar(await a.text(), `/api/panel/pagos/${id}/comprobante`), limpiar(await b.text(), `/api/zzzzz/aaaaa/${id}/bbbbbbbbbbb`), 'la página se distingue');
  // POST con formulario sin cookie: la misma respuesta que el mismo POST a una dirección inexistente
  const p = await pedido();
  const campos = { codigo: p.codigo, pagador: 'Lucía Martínez', monto: '12499' };
  const enviar = async ruta => { const f = new FormData(); for (const [k, v] of Object.entries(campos)) f.set(k, v); f.set('comprobante', new Blob([PNG]), 'c.png'); return fetch(srv.base + ruta, { method: 'POST', body: f }); };
  const [x, y] = await Promise.all([enviar('/api/panel/pagos'), enviar('/api/zzzzz/aaaaa')]);
  assert.equal(x.status, y.status); assert.deepEqual(encabezados(x), encabezados(y)); assert.equal(await x.text(), await y.text());
  // Cookies inventadas o firmadas con otro secreto: 404 sin datos (el pedido sigue pendiente)
  for (const cookie of ['atc_s=admin', 'role=admin; isAdmin=1', `atc_s=${forgeSession({ ...ENV, ATC_SESSION_SECRET: 'otro-secreto-'.padEnd(43, 'x') }, Math.floor(Date.now() / 1000) + 3600)}`]) {
    const r = await pagar(campos, { cookie });
    assert.ok(r.status === 404 || r.status === 409, `${cookie}: ${r.status}`);
    assert.equal(r.json, null, `${cookie}: respondió datos`);
  }
  // Con sesión, desde otro sitio: 403
  assert.equal((await pagar(campos, { headers: { origin: 'https://otro-sitio.example' } })).status, 403);
  const db = await connect();
  try {
    const estado = async () => (await db.query('select status from public.sales_orders where public_code = $1', [p.codigo])).rows[0].status;
    const pagos = async () => (await db.query('select count(*)::int as n from public.sales_payments s join public.sales_orders o on o.id = s.order_id where o.public_code = $1', [p.codigo])).rows[0].n;
    assert.equal(await estado(), 'pendiente', 'un intento sin sesión válida cambió el pedido');
    assert.equal(await pagos(), 0, 'un intento sin sesión válida registró un pago');
    assert.equal((await pagar(campos)).status, 200);
    assert.equal(await estado(), 'pagado');
  } finally { await db.end(); }
});

test('API-35 · Registrar un pago: montos de 0, negativos o con decimales, archivos falsos o de más de 2 MB y campos rotos dan 400; un pedido inexistente, 409; uno válido queda pagado', async () => {
  const p = await pedido();
  const ok = { codigo: p.codigo, pagador: 'Lucía Martínez', monto: '12499' };
  for (const monto of ['-500', '-1', '0', '12.5', '1e5', '', '999999999999']) assert.equal((await pagar({ ...ok, monto })).status, 400, `monto ${monto}`);
  assert.equal((await pagar(ok, { archivo: Buffer.from('<script>alert(1)</script>'), nombreArchivo: 'comprobante.png' })).status, 400, 'un texto con extensión .png');
  assert.equal((await pagar(ok, { archivo: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), nombreArchivo: 'c.svg' })).status, 400, 'SVG');
  assert.equal((await pagar(ok, { archivo: Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]) })).status, 400, 'más de 2 MB');
  assert.equal((await pagar(ok, { archivo: null })).status, 400, 'sin archivo');
  assert.equal((await pagar({ ...ok, pagador: 'X' })).status, 400, 'nombre muy corto');
  assert.equal((await pagar({ ...ok, codigo: 'AT-7KQ2-9M' })).status, 400, 'código que no es de un pedido');
  const json = await postRuta(srv.base, '/api/panel/pagos', ok, { headers: { cookie: sesion() } });
  assert.equal(json.status, 400, 'JSON en vez de formulario');
  const inexistente = await pagar({ ...ok, codigo: 'P-0000-00' });
  assert.equal(inexistente.status, 409); assert.equal(inexistente.json.motivo, 'pedido');
  const r = await pagar(ok);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ok, true); assert.equal(r.json.estado, 'pagado'); assert.equal(r.json.monto, 12499);
  assert.match(r.headers.get('cache-control') ?? '', /no-store/);
  assert.match(r.json.pago, /^[0-9a-f-]{36}$/);
});

test('API-36 · El comprobante se sirve solo con sesión, aislado (nosniff, CSP sandbox, sin caché) y los PDF se descargan', async () => {
  const p = await pedido();
  const png = await pagar({ codigo: p.codigo, pagador: 'Lucía Martínez', monto: '12499' });
  const pdf = await pagar({ codigo: p.codigo, pagador: 'Lucía Martínez', monto: '1' }, { archivo: PDF, nombreArchivo: 'c.pdf' });
  assert.equal(png.status, 200); assert.equal(pdf.status, 200);
  const ver = (id, cookie = sesion()) => fetch(`${srv.base}/api/panel/pagos/${id}/comprobante`, { headers: cookie ? { cookie } : {} });
  const a = await ver(png.json.pago);
  assert.equal(a.status, 200);
  assert.equal(a.headers.get('content-type'), 'image/png');
  assert.ok(Buffer.from(await a.arrayBuffer()).equals(PNG), 'el archivo es el mismo');
  assert.equal(a.headers.get('x-content-type-options'), 'nosniff');
  assert.match(a.headers.get('content-security-policy') ?? '', /sandbox/);
  assert.match(a.headers.get('cache-control') ?? '', /private, no-store/);
  assert.match(a.headers.get('content-disposition') ?? '', /^inline/);
  const b = await ver(pdf.json.pago);
  assert.equal(b.headers.get('content-type'), 'application/pdf');
  assert.match(b.headers.get('content-disposition') ?? '', /^attachment/);
  await b.arrayBuffer();
  for (const [id, cookie] of [[png.json.pago, null], [png.json.pago, 'atc_s=admin'], ['3f2b8c1e-0000-4000-8000-000000000000', sesion()], ['no-es-un-id', sesion()]]) {
    const r = await ver(id, cookie);
    assert.equal(r.status, 404, `${id} ${cookie}`);
    assert.doesNotMatch(await r.text(), /PNG|%PDF/);
  }
});
