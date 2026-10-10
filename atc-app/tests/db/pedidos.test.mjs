// Pruebas de los pedidos de la tienda (la bolsa): reserva atómica de stock, autocancelación a las 48 h, permisos y
// retención. Cada prueba empieza con un ID que se cita en docs/atc/seguridad.md (`npm run check:docs` lo controla).
// Correr con: npm run test:db
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connect, inTx, setRole, asAdmin, expectError, makeOwner, pedir, OWNER, STRANGER, PEDIDO_RE } from './helpers.mjs';

let c;
before(async () => { c = await connect(); });
after(async () => { await c?.end(); });

const stock = async (cl, slug) => (await cl.query('select stock from public.products where slug = $1', [slug])).rows[0].stock;

test('FN-5 · crear_pedido solo la ejecuta atc_tienda; atc_tienda no lee ni escribe tablas ni ejecuta otra cosa', async () => {
  const exec = async role => (await c.query(`
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and has_function_privilege($1, p.oid, 'EXECUTE') order by 1`, [role])).rows.map(r => r.proname);
  assert.deepEqual(await exec('atc_tienda'), ['crear_pedido']);
  for (const role of ['anon', 'authenticated', 'atc_tracker']) assert.ok(!(await exec(role)).includes('crear_pedido'), `${role} ejecuta crear_pedido`);
  const { rows: [r] } = await c.query(`select rolconnlimit, rolsuper, rolinherit from pg_roles where rolname = 'atc_tienda'`);
  assert.ok(r.rolconnlimit > 0 && r.rolconnlimit <= 20 && !r.rolsuper && !r.rolinherit);
  await inTx(c, async () => {
    await setRole(c, 'atc_tienda');
    for (const t of ['public.products', 'public.sales_orders', 'public.sales_order_items', 'public.orders', 'private.secrets']) await expectError(c, `select * from ${t}`);
    await expectError(c, `update public.products set stock = 999`);
    await expectError(c, 'select private.autocancelar_pedidos()');
    await expectError(c, 'select public.track_order($1, $2, $3)', ['AT-3FJ8-WX', '548', '1.2.3.4']);
  });
  await inTx(c, async () => {
    await setRole(c, 'anon');
    await expectError(c, `select public.crear_pedido('[{"slug":"ins-105a","qty":1}]'::jsonb, 'retiro', 'efectivo', 'Ana', '1.2.3.4')`);
  });
});

test('FN-6 · Reserva atómica: precios de la base, todo o nada, y con la última unidad dos pedidos a la vez no la venden dos veces', async () => {
  await inTx(c, async () => {
    await setRole(c, 'atc_tienda');
    const ok = await pedir(c, [{ slug: 'ins-105a', qty: 2 }, { slug: 'red-hdmi', qty: 1 }], { nombre: '  María   de los Ángeles  González ' });
    assert.equal(ok.ok, true);
    assert.match(ok.codigo, PEDIDO_RE);
    await asAdmin(c);
    const precios = (await c.query(`select slug, price_ars from public.products where slug in ('ins-105a', 'red-hdmi')`)).rows;
    const precio = Object.fromEntries(precios.map(r => [r.slug, r.price_ars]));
    assert.equal(ok.total, 2 * precio['ins-105a'] + precio['red-hdmi'], 'el total sale de los precios de la base');
    const { rows: [o] } = await c.query('select customer_name, status, extract(epoch from expires_at - created_at)::int / 3600 as horas from public.sales_orders where public_code = $1', [ok.codigo]);
    assert.equal(o.customer_name, 'María G.', 'del cliente se guarda nombre e inicial');
    assert.equal(o.status, 'pendiente');
    assert.equal(o.horas, 48);
    // Todo o nada: si un producto no alcanza, no se aparta ninguno
    const antes = [await stock(c, 'ins-105a'), await stock(c, 'red-c6')];
    await setRole(c, 'atc_tienda');
    const no = await pedir(c, [{ slug: 'ins-105a', qty: 1 }, { slug: 'red-c6', qty: 1 }]);
    assert.deepEqual(no, { ok: false, motivo: 'sin_stock', productos: ['red-c6'] });
    await asAdmin(c);
    assert.deepEqual([await stock(c, 'ins-105a'), await stock(c, 'red-c6')], antes);
  });
  // Concurrencia real: dos conexiones piden la última unidad al mismo tiempo
  const a = await connect(), b = await connect();
  try {
    await a.query(`update public.products set stock = 1 where slug = 'per-g203'`);
    await a.query('begin'); await setRole(a, 'atc_tienda');
    await b.query('begin'); await setRole(b, 'atc_tienda');
    const ra = await pedir(a, [{ slug: 'per-g203', qty: 1 }], { ip: '198.51.100.1' });
    const pb = pedir(b, [{ slug: 'per-g203', qty: 1 }], { ip: '198.51.100.2' });   // queda esperando el bloqueo de la fila
    await new Promise(r => setTimeout(r, 300));
    await a.query('commit');
    const rb = await pb;
    await b.query('commit');
    assert.equal(ra.ok, true);
    assert.deepEqual(rb, { ok: false, motivo: 'sin_stock', productos: ['per-g203'] });
    assert.equal(await stock(c, 'per-g203'), 0);
  } finally {
    await c.query(`delete from public.sales_orders where public_code in (select o.public_code from public.sales_orders o join public.sales_order_items i on i.order_id = o.id join public.products p on p.id = i.product_id where p.slug = 'per-g203')`);
    await c.query(`update public.products set stock = 2 where slug = 'per-g203'`);
    await a.end(); await b.end();
  }
});

test('FN-7 · crear_pedido rechaza entradas absurdas con la misma respuesta y limita 5 pedidos por hora por red', async () => {
  await inTx(c, async () => {
    await setRole(c, 'atc_tienda');
    const malas = [
      [[], {}], [[{ slug: 'ins-105a', qty: 0 }], {}], [[{ slug: 'ins-105a', qty: 11 }], {}], [[{ slug: 'ins-105a', qty: '1; drop table x' }], {}],
      [[{ slug: '../etc', qty: 1 }], {}], [[{ slug: 'ins-105a', qty: 1 }, { slug: 'ins-105a', qty: 1 }], {}],
      [Array.from({ length: 11 }, (_, i) => ({ slug: `p${i}`, qty: 1 })), {}], [[{ slug: 'ins-105a', qty: 1 }], { entrega: 'drone' }],
      [[{ slug: 'ins-105a', qty: 1 }], { pago: 'cripto' }], [[{ slug: 'ins-105a', qty: 1 }], { nombre: '   ' }], [[{ slug: 'ins-105a', qty: 1 }], { nombre: '<script>' }],
      [[{ slug: 'ins-105a', qty: 10 }, { slug: 'red-hdmi', qty: 10 }, { slug: 'comp-nv2', qty: 1 }], {}],
    ];
    for (const [items, o] of malas) assert.deepEqual(await pedir(c, items, o), { ok: false, motivo: 'solicitud_invalida' }, JSON.stringify([items, o]).slice(0, 80));
    // Un producto que no existe o está pausado cuenta como sin stock
    assert.equal((await pedir(c, [{ slug: 'no-existe', qty: 1 }])).motivo, 'sin_stock');
    for (let i = 0; i < 5; i++) assert.equal((await pedir(c, [{ slug: 'red-hdmi', qty: 1 }], { ip: '192.0.2.9' })).ok, true);
    assert.deepEqual(await pedir(c, [{ slug: 'red-hdmi', qty: 1 }], { ip: '192.0.2.9' }), { ok: false, motivo: 'demasiados_pedidos' });
    assert.equal((await pedir(c, [{ slug: 'red-hdmi', qty: 1 }], { ip: '192.0.2.10' })).ok, true, 'otra red sigue andando');
    await asAdmin(c);
    const { rows } = await c.query(`select ip_hash from public.sales_orders`);
    for (const r of rows) assert.match(r.ip_hash, /^[0-9a-f]{64}$/, 'la red se guarda solo como HMAC');
  });
});

test('FN-8 · Estados: a las 48 h sin pago se autocancela y el stock vuelve; el dueño solo hace los cambios con sentido', async () => {
  await inTx(c, async () => {
    await setRole(c, 'atc_tienda');
    const v = await pedir(c, [{ slug: 'ins-t544', qty: 3 }]), p2 = await pedir(c, [{ slug: 'ins-t544', qty: 1 }]);
    await asAdmin(c);
    const s0 = await stock(c, 'ins-t544');
    await c.query(`update public.sales_orders set expires_at = now() - interval '1 minute' where public_code = $1`, [v.codigo]);
    assert.equal((await c.query('select private.autocancelar_pedidos() as n')).rows[0].n, 1);
    assert.equal(await stock(c, 'ins-t544'), s0 + 3, 'el stock del pedido vencido vuelve');
    const { rows: [o] } = await c.query('select status, cancelled_at from public.sales_orders where public_code = $1', [v.codigo]);
    assert.equal(o.status, 'autocancelado'); assert.ok(o.cancelled_at);
    // El dueño: pagar y entregar; no puede volver atrás ni cancelar un pago
    await makeOwner(c);
    await setRole(c, 'authenticated', OWNER);
    await c.query(`update public.sales_orders set status = 'pagado' where public_code = $1`, [p2.codigo]);
    await expectError(c, `update public.sales_orders set status = 'pendiente' where public_code = $1`, [p2.codigo], '23514');
    await expectError(c, `update public.sales_orders set status = 'cancelado' where public_code = $1`, [p2.codigo], '23514');
    await expectError(c, `update public.sales_orders set total_ars = 1 where public_code = $1`, [p2.codigo]);
    await c.query(`update public.sales_orders set status = 'entregado' where public_code = $1`, [p2.codigo]);
    await asAdmin(c);
    const { rows: [e] } = await c.query('select paid_at, delivered_at from public.sales_orders where public_code = $1', [p2.codigo]);
    assert.ok(e.paid_at && e.delivered_at);
    assert.equal(await stock(c, 'ins-t544'), s0 + 3, 'pagar y entregar no mueven el stock (ya salió con la reserva)');
  });
});

test('RLS-8 · Los pedidos solo los ve el dueño: ni anon ni otro usuario leen pedidos ni sus productos', async () => {
  await inTx(c, async () => {
    await setRole(c, 'atc_tienda');
    await pedir(c, [{ slug: 'ins-105a', qty: 1 }]);
    await makeOwner(c);
    await setRole(c, 'authenticated', STRANGER);
    assert.equal((await c.query('select count(*)::int as n from public.sales_orders')).rows[0].n, 0);
    assert.equal((await c.query('select count(*)::int as n from public.sales_order_items')).rows[0].n, 0);
    await setRole(c, 'authenticated', OWNER);
    assert.equal((await c.query('select count(*)::int as n from public.sales_orders')).rows[0].n, 1);
    await expectError(c, `insert into public.sales_orders (public_code, customer_name, delivery, payment, total_ars) values ('P-0000-00', 'X', 'retiro', 'efectivo', 1)`);
    await expectError(c, 'delete from public.sales_orders');
    await setRole(c, 'anon');
    await expectError(c, 'select * from public.sales_orders');
  });
});

test('GEN-2 · Los códigos de pedido usan Crockford y no se repiten', async () => {
  const { rows } = await c.query('select private.gen_pedido_code() as code from generate_series(1, 5000)');
  for (const r of rows) assert.match(r.code, PEDIDO_RE);
  const chars = new Set(rows.map(r => r.code.slice(2).replace('-', '')).join(''));
  for (const bad of 'ILOU') assert.ok(!chars.has(bad), `aparece ${bad}`);
});

test('RET-2 · Retención de pedidos: la red se borra a los 30 días y los pedidos cerrados se anonimizan a los 24 meses', async () => {
  await inTx(c, async () => {
    await setRole(c, 'atc_tienda');
    const viejo = await pedir(c, [{ slug: 'red-hdmi', qty: 1 }]), nuevo = await pedir(c, [{ slug: 'red-hdmi', qty: 1 }]);
    await asAdmin(c);
    await c.query(`update public.sales_orders set status = 'cancelado' where public_code = $1`, [viejo.codigo]);
    await c.query(`update public.sales_orders set created_at = now() - interval '25 months', cancelled_at = now() - interval '25 months' where public_code = $1`, [viejo.codigo]);
    await c.query(`update public.sales_orders set created_at = now() - interval '31 days' where public_code = $1`, [nuevo.codigo]);
    assert.equal((await c.query('select private.limpiar_pedidos() as n')).rows[0].n, 1);
    const rows = Object.fromEntries((await c.query('select public_code, customer_name, ip_hash, anonymized_at from public.sales_orders')).rows.map(r => [r.public_code, r]));
    assert.equal(rows[viejo.codigo].customer_name, null); assert.ok(rows[viejo.codigo].anonymized_at);
    assert.equal(rows[nuevo.codigo].ip_hash, null, 'la red se borra a los 30 días');
    assert.equal(rows[nuevo.codigo].customer_name, 'Lucía M.', 'un pedido abierto conserva el nombre');
  });
});
