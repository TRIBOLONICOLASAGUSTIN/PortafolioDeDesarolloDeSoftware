// Pruebas de los pagos por transferencia con comprobante: solo el dueño (por el rol atc_panel del servidor) los
// registra y los ve, el monto nunca es negativo, el archivo se valida por sus primeros bytes y se borra a los 90 días.
// Cada prueba empieza con un ID que se cita en docs/atc/seguridad.md (`npm run check:docs` lo controla).
// Correr con: npm run test:db
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connect, inTx, setRole, asAdmin, expectError, makeOwner, pedir, OWNER, STRANGER } from './helpers.mjs';

let c;
before(async () => { c = await connect(); });
after(async () => { await c?.end(); });

// Archivos mínimos con los primeros bytes de cada formato (y uno falso)
const PNG = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.from('resto del png')]);
const JPG = Buffer.concat([Buffer.from('ffd8ffe0', 'hex'), Buffer.from('resto del jpg')]);
const PDF = Buffer.from('%PDF-1.7\nresto del pdf');
const FALSO = Buffer.from('<script>alert(1)</script>');

const pagar = async (codigo, { pagador = 'Lucía Martínez', monto = 24999, tipo = 'image/png', datos = PNG } = {}) =>
  (await c.query('select public.registrar_pago($1, $2, $3, $4, $5) as r', [codigo, pagador, monto, tipo, datos])).rows[0].r;
const nuevoPedido = async (items = [{ slug: 'ins-105a', qty: 1 }]) => { await setRole(c, 'atc_tienda'); const p = await pedir(c, items); assert.ok(p.ok); return p; };

test('FN-11 · registrar_pago: el pedido pasa a pagado; montos de 0 o negativos, archivos falsos, de más de 2 MB o pedidos inexistentes se rechazan', async () => {
  await inTx(c, async () => {
    const p = await nuevoPedido();
    await setRole(c, 'atc_panel');
    for (const monto of [0, -500, -1, 100000001]) assert.deepEqual(await pagar(p.codigo, { monto }), { ok: false, motivo: 'solicitud_invalida' }, `monto ${monto}`);
    assert.deepEqual(await pagar(p.codigo, { datos: FALSO }), { ok: false, motivo: 'solicitud_invalida' }, 'un archivo que no es PNG');
    assert.deepEqual(await pagar(p.codigo, { tipo: 'image/jpeg', datos: PNG }), { ok: false, motivo: 'solicitud_invalida' }, 'el tipo no coincide con los bytes');
    assert.deepEqual(await pagar(p.codigo, { tipo: 'image/svg+xml', datos: FALSO }), { ok: false, motivo: 'solicitud_invalida' }, 'SVG no');
    assert.deepEqual(await pagar(p.codigo, { datos: Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]) }), { ok: false, motivo: 'solicitud_invalida' }, 'más de 2 MB');
    assert.deepEqual(await pagar(p.codigo, { pagador: ' ' }), { ok: false, motivo: 'solicitud_invalida' }, 'sin nombre');
    assert.deepEqual(await pagar('P-0000-00'), { ok: false, motivo: 'pedido' }, 'pedido inexistente');
    const r = await pagar(p.codigo, { pagador: '  Lucía Martínez ' });
    assert.equal(r.ok, true); assert.equal(r.estado, 'pagado'); assert.equal(r.pagador, 'Lucía Martínez'); assert.equal(r.monto, 24999);
    for (const [tipo, datos] of [['image/jpeg', JPG], ['application/pdf', PDF]]) assert.equal((await pagar(p.codigo, { tipo, datos })).ok, true, `${tipo} vale`);
    assert.deepEqual(await pagar(p.codigo), { ok: false, motivo: 'demasiados_pagos' }, 'como mucho 3 por pedido');
    const ver = (await c.query('select * from public.ver_comprobante($1)', [r.pago])).rows[0];
    assert.equal(ver.tipo, 'image/png'); assert.ok(Buffer.from(ver.datos).equals(PNG));
    await asAdmin(c);
    assert.equal((await c.query('select status from public.sales_orders where public_code = $1', [p.codigo])).rows[0].status, 'pagado');
    // Ni siquiera el administrador de la base puede guardar un monto de 0 o negativo (CHECK)
    await expectError(c, `insert into public.sales_payments (order_id, pagador, monto_ars) select id, 'X Y', -10 from public.sales_orders limit 1`, [], '23514');
    await expectError(c, `insert into public.sales_payments (order_id, pagador, monto_ars) select id, 'X Y', 0 from public.sales_orders limit 1`, [], '23514');
  });
  await inTx(c, async () => {
    // Un pedido cancelado no recibe pagos
    const p = await nuevoPedido();
    await asAdmin(c); await c.query(`update public.sales_orders set status = 'cancelado' where public_code = $1`, [p.codigo]);
    await setRole(c, 'atc_panel');
    assert.deepEqual(await pagar(p.codigo), { ok: false, motivo: 'pedido' });
  });
});

test('FN-12 · Solo atc_panel registra pagos y ve comprobantes; atc_panel no lee ni escribe tablas ni ejecuta otra cosa', async () => {
  const exec = async role => (await c.query(`
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and has_function_privilege($1, p.oid, 'EXECUTE') order by 1`, [role])).rows.map(r => r.proname);
  assert.deepEqual(await exec('atc_panel'), ['registrar_pago', 'ver_comprobante']);
  for (const role of ['anon', 'authenticated', 'atc_tracker', 'atc_tienda']) {
    const fs = await exec(role);
    assert.ok(!fs.includes('registrar_pago') && !fs.includes('ver_comprobante'), `${role} ejecuta funciones de pagos`);
  }
  const { rows: [r] } = await c.query(`select rolconnlimit, rolsuper, rolinherit from pg_roles where rolname = 'atc_panel'`);
  assert.ok(r.rolconnlimit > 0 && r.rolconnlimit <= 20 && !r.rolsuper && !r.rolinherit);
  await inTx(c, async () => {
    await setRole(c, 'atc_panel');
    for (const t of ['public.sales_payments', 'public.sales_orders', 'public.products', 'private.comprobantes']) await expectError(c, `select * from ${t}`);
    await expectError(c, 'select private.limpiar_comprobantes()');
    await expectError(c, 'select public.crear_pedido($1::jsonb, $2, $3, $4, $5)', ['[]', 'retiro', 'efectivo', 'X', '1.2.3.4']);
  });
});

test('RLS-9 · Pagos: solo el dueño los ve y nadie los escribe desde el API; el comprobante no lo ve nadie del API', async () => {
  await inTx(c, async () => {
    const p = await nuevoPedido();
    await setRole(c, 'atc_panel');
    assert.equal((await pagar(p.codigo)).ok, true);
    await makeOwner(c);
    await setRole(c, 'authenticated', OWNER);
    const pagos = (await c.query('select pagador, monto_ars from public.sales_payments')).rows;
    assert.deepEqual(pagos, [{ pagador: 'Lucía Martínez', monto_ars: 24999 }]);
    await expectError(c, `insert into public.sales_payments (order_id, pagador, monto_ars) select id, 'X Y', 10 from public.sales_orders limit 1`);
    await expectError(c, `update public.sales_payments set monto_ars = 1`);
    await expectError(c, 'select * from private.comprobantes');
    await expectError(c, 'select * from public.ver_comprobante(gen_random_uuid())');
    await setRole(c, 'authenticated', STRANGER);
    assert.equal((await c.query('select * from public.sales_payments')).rowCount, 0);
    await setRole(c, 'anon');
    await expectError(c, 'select * from public.sales_payments');
    await expectError(c, 'select * from private.comprobantes');
  });
});

test('RET-3 · Retención de pagos: el comprobante se borra a los 90 días (quedan nombre y monto) y el nombre se borra cuando el pedido se anonimiza', async () => {
  await inTx(c, async () => {
    const viejo = await nuevoPedido(), nuevo = await nuevoPedido([{ slug: 'red-hdmi', qty: 1 }]);
    await setRole(c, 'atc_panel');
    const pv = await pagar(viejo.codigo), pn = await pagar(nuevo.codigo, { monto: 12499 });
    await asAdmin(c);
    await c.query(`update private.comprobantes set created_at = now() - interval '91 days' where payment_id = $1`, [pv.pago]);
    await c.query(`update private.comprobantes set created_at = now() - interval '89 days' where payment_id = $1`, [pn.pago]);
    assert.equal((await c.query('select private.limpiar_comprobantes() as n')).rows[0].n, 1);
    const quedan = (await c.query('select payment_id from private.comprobantes')).rows.map(r => r.payment_id);
    assert.deepEqual(quedan, [pn.pago], 'solo queda el comprobante de menos de 90 días');
    assert.equal((await c.query('select count(*)::int as n from public.sales_payments')).rows[0].n, 2, 'los pagos quedan');
    // Pedido anonimizado (24 meses): también se borra el nombre de quien pagó
    await c.query(`update public.sales_orders set status = 'entregado' where public_code = $1`, [viejo.codigo]);
    await c.query(`update public.sales_orders set delivered_at = now() - interval '25 months' where public_code = $1`, [viejo.codigo]);
    await c.query('select private.limpiar_pedidos()');
    await c.query('select private.limpiar_comprobantes()');
    const pagos = Object.fromEntries((await c.query('select id, pagador, monto_ars from public.sales_payments')).rows.map(r => [r.id, r]));
    assert.equal(pagos[pv.pago].pagador, null); assert.equal(pagos[pv.pago].monto_ars, 24999, 'el monto queda para Ganancias');
    assert.equal(pagos[pn.pago].pagador, 'Lucía Martínez');
  });
});
