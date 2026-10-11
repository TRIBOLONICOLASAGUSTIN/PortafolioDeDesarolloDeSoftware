// Pruebas de POST /api/pedidos (la bolsa registra el pedido y la base aparta el stock 48 h).
// Cada prueba empieza con un ID (API-n) que se cita en docs/atc/seguridad.md; `npm run check:docs` lo controla.
// Corren contra `next start` y la base local de pruebas. Correr con: npm run test:api
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, LOCAL_ENV } from '../helpers/server.mjs';
import { postRuta } from '../helpers/http.mjs';
import { connect } from '../db/helpers.mjs';

let local, prod, demo, db;
before(async () => {
  [local, prod, demo] = await Promise.all([
    startServer({ port: 3134, env: { ...LOCAL_ENV } }),
    // "Producción" sin configuración: tiene que fallar cerrado.
    startServer({ port: 3135, env: {} }),
    // Fuera de producción y sin base: no registra nada (la bolsa sigue por WhatsApp sin código).
    startServer({ port: 3136, env: { ATC_LOCAL: '1', ATC_IP_HEADER: 'cf-connecting-ip' } }),
  ]);
  db = await connect();
});
after(async () => { await db?.end(); await Promise.all([local?.stop(), prod?.stop(), demo?.stop()]); });

let ipSeq = 10;
const nextIp = () => `198.51.100.${ipSeq++}`;
const post = (srv, body, { ip = nextIp(), headers = {}, raw } = {}) => postRuta(srv.base, '/api/pedidos', body, { headers: { 'cf-connecting-ip': ip, ...headers }, raw });
const PEDIDO = { items: [{ slug: 'ins-105a', qty: 2 }, { slug: 'red-hdmi', qty: 1 }], entrega: 'retiro', pago: 'transferencia', nombre: 'Sofía Ramírez' };
const stock = async slug => (await db.query('select stock from public.products where slug = $1', [slug])).rows[0].stock;

test('API-24 · La bolsa registra el pedido: código P-, total con los precios de la base, stock apartado, nombre mínimo y sin caché', async () => {
  const s0 = await stock('ins-105a');
  const r = await post(local, PEDIDO);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.match(r.json.codigo, /^P-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{2}$/);
  const { rows: [o] } = await db.query('select customer_name, total_ars, status, ip_hash from public.sales_orders where public_code = $1', [r.json.codigo]);
  const precios = Object.fromEntries((await db.query(`select slug, price_ars from public.products where slug in ('ins-105a', 'red-hdmi')`)).rows.map(x => [x.slug, x.price_ars]));
  assert.equal(r.json.total, 2 * precios['ins-105a'] + precios['red-hdmi']);
  assert.deepEqual([o.customer_name, o.total_ars, o.status], ['Sofía R.', r.json.total, 'pendiente']);
  assert.match(o.ip_hash, /^[0-9a-f]{64}$/);
  assert.equal(await stock('ins-105a'), s0 - 2, 'el stock queda apartado');
  assert.deepEqual(Object.keys(r.json).sort(), ['codigo', 'items', 'ok', 'total', 'vence']);
});

test('API-25 · Pedidos inválidos, inventados o de otro sitio se rechazan sin registrar nada (403/400), y lo que no alcanza da 409 sin apartar', async () => {
  const n0 = (await db.query('select count(*)::int as n from public.sales_orders')).rows[0].n;
  assert.equal((await post(local, PEDIDO, { headers: { origin: 'https://otro-sitio.example', 'sec-fetch-site': 'cross-site' } })).status, 403);
  for (const body of [
    { ...PEDIDO, items: [{ slug: 'ins-105a', qty: 1, precio: 1 }] },          // un precio inventado
    { ...PEDIDO, total: 1 },                                                    // claves de más
    { ...PEDIDO, items: [] }, { ...PEDIDO, items: [{ slug: '../x', qty: 1 }] }, { ...PEDIDO, items: [{ slug: 'ins-105a', qty: 50 }] },
    { ...PEDIDO, entrega: 'drone' }, { ...PEDIDO, nombre: 'x'.repeat(61) },
  ]) assert.equal((await post(local, body)).status, 400, JSON.stringify(body).slice(0, 80));
  assert.equal((await post(local, null, { raw: '{"items":' })).status, 400);
  assert.equal((await post(local, null, { raw: JSON.stringify({ ...PEDIDO, nombre: 'a'.repeat(60), pad: 'x'.repeat(3000) }) })).status, 400, 'cuerpo de más de 2 KB');
  const sin = await post(local, { ...PEDIDO, items: [{ slug: 'red-c6', qty: 1 }] });
  assert.equal(sin.status, 409);
  assert.deepEqual(sin.json, { ok: false, motivo: 'sin_stock', productos: ['red-c6'] });
  assert.equal((await db.query('select count(*)::int as n from public.sales_orders')).rows[0].n, n0, 'no se registró nada');
});

test('API-26 · Límite por IP del servidor: el sexto pedido en 10 minutos desde la misma red da 429 con Retry-After; otra red sigue', async () => {
  const ip = '203.0.113.88', st = [];
  for (let i = 0; i < 6; i++) st.push((await post(local, { ...PEDIDO, items: [{ slug: 'red-hdmi', qty: 1 }] }, { ip })).status);
  assert.deepEqual(st, [200, 200, 200, 200, 200, 429]);
  const r = await post(local, { ...PEDIDO, items: [{ slug: 'red-hdmi', qty: 1 }] }, { ip });
  assert.ok(Number(r.headers.get('retry-after')) > 0);
  assert.equal((await post(local, { ...PEDIDO, items: [{ slug: 'red-hdmi', qty: 1 }] })).status, 200);
});

test('API-27 · En producción sin configuración responde 503, y sin base (fuera de producción) no registra nada: la bolsa sigue por WhatsApp sin código', async () => {
  for (const srv of [prod, demo]) {
    const r = await post(srv, PEDIDO);
    assert.equal(r.status, 503);
    assert.deepEqual(r.json, { ok: false, motivo: 'no_disponible' });
  }
});
