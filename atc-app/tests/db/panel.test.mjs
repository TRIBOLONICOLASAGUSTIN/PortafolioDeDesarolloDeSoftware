// Pruebas del panel real (Etapa 2): costos, stock, ventas del local, gastos, cobros, proveedores, lista de precios y
// pedidos de la bolsa. Todo lo escribe y lo lee solo atc_panel (el rol del servidor, después de la sesión del dueño)
// por funciones panel_*; nadie del API toca las tablas. Ningún monto ni cantidad es negativo.
// Cada prueba empieza con un ID que se cita en docs/atc/seguridad.md (`npm run check:docs` lo controla).
// Correr con: npm run test:db
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connect, inTx, setRole, asAdmin, expectError, pedir } from './helpers.mjs';

let c;
before(async () => { c = await connect(); });
after(async () => { await c?.end(); });

const PANEL = ['panel_catalogo', 'panel_cobro', 'panel_gasto', 'panel_movimientos', 'panel_pedido_estado', 'panel_pedidos',
  'panel_precios', 'panel_producto_guardar', 'panel_proveedor_guardar', 'panel_stock', 'panel_venta'];
const TABLAS = ['private.proveedores', 'private.productos_admin', 'private.piezas', 'private.kits', 'private.movimientos',
  'private.movimiento_items', 'private.stock_movs'];

const q1 = async (sql, params = []) => (await c.query(sql, params)).rows[0].r;
const idDe = async slug => { await asAdmin(c); const id = (await c.query('select id from public.products where slug = $1', [slug])).rows[0].id; return id; };
const stockDe = async slug => { await asAdmin(c); return (await c.query('select stock from public.products where slug = $1', [slug])).rows[0].stock; };
const catalogo = async () => q1('select public.panel_catalogo() as r');
const movs = async () => q1('select public.panel_movimientos(current_date - 1) as r');
const producto = (extra = {}) => ({ slug: 'mon-24', cat: 'perifericos', brand: 'Samsung', name: 'Monitor 24"', short: 'Full HD', price: 199999, costo: 150000, umbral: 2, activo: true, stock: 3, ...extra });

test('FN-14 · Las funciones del panel solo las ejecuta atc_panel', async () => {
  for (const f of PANEL) {
    const { rows: [pub] } = await c.query(`
      select exists (select 1 from pg_proc p, aclexplode(p.proacl) a where p.proname = $1 and a.grantee = 0) as x`, [f]);
    assert.equal(pub.x, false, `PUBLIC ejecuta ${f}`);
    for (const [role, esperado] of [['anon', false], ['authenticated', false], ['atc_tracker', false], ['atc_tienda', false], ['atc_panel', true]]) {
      const { rows: [r] } = await c.query(`
        select bool_and(has_function_privilege($1, p.oid, 'EXECUTE')) as x from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = $2`, [role, f]);
      assert.equal(r.x, esperado, `${role} y ${f}`);
    }
  }
  // Las auxiliares de private no las ejecuta nadie del API
  for (const role of ['anon', 'authenticated', 'atc_tracker', 'atc_tienda', 'atc_panel']) {
    const { rows } = await c.query(`
      select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'private' and p.proname in ('entero', 'uuid_de', 'local') and has_function_privilege($1, p.oid, 'EXECUTE')`, [role]);
    assert.deepEqual(rows, [], `${role} ejecuta auxiliares`);
  }
});

test('RLS-10 · Las tablas del panel no las lee ni escribe nadie del API (ni siquiera atc_panel o el dueño por el API)', async () => {
  for (const role of ['anon', 'authenticated', 'atc_tracker', 'atc_tienda', 'atc_panel']) {
    await inTx(c, async () => {
      await setRole(c, role, role === 'authenticated' ? '11111111-1111-4111-8111-111111111111' : null);
      for (const t of TABLAS) await expectError(c, `select * from ${t}`);
      await expectError(c, `insert into private.proveedores (nombre) values ('Intruso')`);
    });
  }
  await inTx(c, async () => {
    // El catálogo público sigue mostrando solo lo de la tienda: el costo no está en products
    const { rows } = await c.query(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'products'`);
    assert.ok(!rows.some(r => /cost/.test(r.column_name)), 'products tiene una columna de costo');
  });
});

test('FN-15 · Pedidos de la bolsa desde el panel: pagar lo pasa a Ganancias con su costo; entregar y cancelar siguen las reglas', async () => {
  await inTx(c, async () => {
    const ins = await idDe('ins-105a');
    await setRole(c, 'atc_panel');
    assert.equal((await q1('select public.panel_producto_guardar($1) as r', [{ ...producto({ slug: 'x' }), id: ins, cat: 'insumos', brand: 'Compatible', name: 'Tóner compatible con HP 105A', price: 24999, costo: 15000 }])).ok, true);
    await setRole(c, 'atc_tienda');
    const p = await pedir(c, [{ slug: 'ins-105a', qty: 2 }]);
    assert.ok(p.ok);
    await setRole(c, 'atc_panel');
    const estado = (codigo, e) => q1('select public.panel_pedido_estado($1, $2) as r', [codigo, e]);
    const lista = await q1('select public.panel_pedidos(30) as r');
    const mio = lista.find(x => x.codigo === p.codigo);
    assert.equal(mio.estado, 'pendiente'); assert.deepEqual(mio.items.map(i => i.qty), [2]); assert.deepEqual(mio.pagos, []);
    // Inválidos y saltos de estado
    for (const [cod, e] of [['P-0000', 'pagado'], [p.codigo, 'autocancelado'], [p.codigo, 'pendiente'], [p.codigo, null]]) assert.deepEqual(await estado(cod, e), { ok: false, motivo: 'solicitud_invalida' }, `${cod} ${e}`);
    assert.deepEqual(await estado('P-0000-00', 'pagado'), { ok: false, motivo: 'pedido' });
    assert.equal((await estado(p.codigo, 'entregado')).motivo, 'estado', 'no se entrega sin pagar');
    // Pagar: entra en Ganancias con el precio del pedido y el costo de ese momento
    assert.equal((await estado(p.codigo, 'pagado')).ok, true);
    const venta = (await movs()).dinero.find(m => m.pedido === p.codigo);
    assert.equal(venta.kind, 'venta'); assert.equal(venta.pay, 'transferencia');
    assert.deepEqual(venta.items.map(i => [i.qty, i.unit, i.unitCost]), [[2, 24999, 15000]]);
    assert.equal((await estado(p.codigo, 'cancelado')).motivo, 'estado', 'un pedido pagado no se cancela');
    assert.equal((await estado(p.codigo, 'entregado')).ok, true);
    assert.equal((await movs()).dinero.filter(m => m.pedido === p.codigo).length, 1, 'una sola venta por pedido');
    // Cancelar un pendiente devuelve el stock y no suma nada a Ganancias
    await setRole(c, 'atc_tienda');
    const antes = await stockDe('ins-105a');
    await setRole(c, 'atc_tienda');
    const p2 = await pedir(c, [{ slug: 'ins-105a', qty: 1 }], { ip: '203.0.113.51' });
    assert.equal(await stockDe('ins-105a'), antes - 1);
    await setRole(c, 'atc_panel');
    assert.equal((await estado(p2.codigo, 'cancelado')).ok, true);
    assert.equal(await stockDe('ins-105a'), antes);
    await setRole(c, 'atc_panel');
    assert.equal((await movs()).dinero.filter(m => m.pedido === p2.codigo).length, 0);
  });
});

test('FN-16 · Stock y ventas del local: atómicos, sin negativos y con su historial', async () => {
  await inTx(c, async () => {
    const [nb, ins] = [await idDe('nb-ideapad'), await idDe('ins-105a')];
    const [sNb, sIns] = [await stockDe('nb-ideapad'), await stockDe('ins-105a')];
    await setRole(c, 'atc_panel');
    const stock = (item, tipo, qty, costo = null) => q1('select public.panel_stock($1, $2, $3, $4, null, null) as r', [item, tipo, qty, costo]);
    const venta = (items, pago = 'efectivo') => q1('select public.panel_venta($1, $2, null) as r', [JSON.stringify(items), pago]);
    const no = { ok: false, motivo: 'solicitud_invalida' };
    // Reposición: entra > 0; ajuste: lo contado, ≥ 0. Nunca negativo.
    for (const [t, n] of [['repo', 0], ['repo', -3], ['ajuste', -1], ['otro', 2], ['repo', 10001]]) assert.deepEqual(await stock(nb, t, n), no, `${t} ${n}`);
    assert.deepEqual(await stock(nb, 'repo', 2, -5), no, 'costo negativo');
    assert.deepEqual(await stock('00000000-0000-4000-8000-000000000000', 'repo', 2), { ok: false, motivo: 'no_existe' });
    assert.deepEqual(await stock(nb, 'repo', 2, 600000), { ok: true, stock: sNb + 2 });
    assert.deepEqual(await stock(nb, 'ajuste', 1), { ok: true, stock: 1 });
    // Venta: todo o nada; sin stock no toca nada
    assert.equal((await venta([{ id: nb, qty: 2, unit: 800000 }])).motivo, 'sin_stock');
    assert.equal(await stockDe('nb-ideapad'), 1, 'no se tocó el stock');
    await setRole(c, 'atc_panel');
    for (const items of [[], [{ id: nb, qty: 0, unit: 1 }], [{ id: nb, qty: -1, unit: 1 }], [{ id: nb, qty: 1, unit: 0 }], [{ id: nb, qty: 1, unit: -500 }],
      [{ id: nb, qty: 1.5, unit: 1 }], [{ id: nb, qty: '1', unit: 1 }], [{ id: 'nb-ideapad', qty: 1, unit: 1 }], [{ id: nb, qty: 1, unit: 1 }, { id: nb, qty: 1, unit: 1 }]])
      assert.deepEqual(await venta(items), no, JSON.stringify(items));
    assert.deepEqual(await venta([{ id: nb, qty: 1, unit: 1 }], 'bitcoin'), no, 'medio de pago desconocido');
    const v = await venta([{ id: nb, qty: 1, unit: 820000 }, { id: ins, qty: 3, unit: 24000 }], 'mp');
    assert.equal(v.ok, true);
    assert.equal(await stockDe('nb-ideapad'), 0); assert.equal(await stockDe('ins-105a'), sIns - 3);
    await setRole(c, 'atc_panel');
    const m = await movs();
    const d = m.dinero.find(x => x.id === v.id);
    assert.equal(d.pay, 'mp'); assert.equal(d.items.length, 2);
    assert.equal(d.items.find(i => i.productId === nb).unitCost, 600000, 'costo de la última reposición');
    const hist = m.stock.filter(s => s.itemId === nb).map(s => [s.tipo, s.delta, s.despues]);
    assert.deepEqual(hist, [['repo', 2, sNb + 2], ['ajuste', 1 - (sNb + 2), 1], ['venta', -1, 0]]);
    // Ni el administrador deja un stock negativo ni un movimiento de dinero con monto negativo
    await asAdmin(c);
    await expectError(c, `update public.products set stock = -1 where id = $1`, [nb], '23514');
    await expectError(c, `insert into private.movimientos (kind, pago, categoria, concepto, monto_ars) values ('gasto', 'efectivo', 'otros', 'X', -10)`, [], '23514');
    await expectError(c, `insert into private.movimiento_items (movimiento_id, product_id, qty, unit_ars, costo_ars) values ($1, $2, -1, 10, 1)`, [v.id, ins], '23514');
  });
});

test('FN-17 · Productos, proveedores, gastos, cobros y lista de precios: validan todo y nunca aceptan montos negativos', async () => {
  await inTx(c, async () => {
    await setRole(c, 'atc_panel');
    const guardar = p => q1('select public.panel_producto_guardar($1) as r', [p]);
    const no = { ok: false, motivo: 'solicitud_invalida' };
    for (const mal of [{ price: 0 }, { price: -1 }, { price: 1.5 }, { price: '199999' }, { costo: -1 }, { umbral: -1 }, { stock: -2 }, { activo: 'si' },
      { slug: 'Con Espacios' }, { cat: 'autos' }, { name: '' }, { proveedor: '00000000-0000-4000-8000-000000000000' }, { proveedor: 'x' }])
      assert.deepEqual(await guardar(producto(mal)), no, JSON.stringify(mal));
    const nuevo = await guardar(producto());
    assert.equal(nuevo.ok, true);
    assert.deepEqual(await guardar(producto()), { ok: false, motivo: 'slug_repetido' });
    const cat = await catalogo();
    const mon = cat.productos.find(p => p.id === nuevo.id);
    assert.deepEqual([mon.price, mon.costo, mon.umbral, mon.stock, mon.activo], [199999, 150000, 2, 3, true]);
    assert.deepEqual((await movs()).stock.filter(s => s.itemId === nuevo.id).map(s => [s.tipo, s.delta, s.despues]), [['alta', 3, 3]]);
    // Editar (pausar): no toca el stock
    assert.equal((await guardar({ ...producto({ activo: false, price: 189999 }), id: nuevo.id })).ok, true);
    assert.deepEqual((await guardar({ ...producto(), id: '00000000-0000-4000-8000-000000000000' })), { ok: false, motivo: 'no_existe' });
    await asAdmin(c);
    assert.deepEqual((await c.query('select active, price_ars, stock from public.products where id = $1', [nuevo.id])).rows[0], { active: false, price_ars: 189999, stock: 3 });
    // Pausado: la tienda (anon) ya no lo ve
    await setRole(c, 'anon');
    assert.equal((await c.query('select 1 from public.products where slug = $1', ['mon-24'])).rowCount, 0);

    await setRole(c, 'atc_panel');
    const prov = (id, nombre) => q1('select public.panel_proveedor_guardar($1, $2, $3, $4) as r', [id, nombre, 'Monitores', 'Juan, 342 000 0000']);
    assert.deepEqual(await prov(null, ' '), no);
    const pv = await prov(null, 'Mayorista Norte');
    assert.equal(pv.ok, true);
    assert.deepEqual(await prov(null, 'Mayorista Norte'), { ok: false, motivo: 'nombre_repetido' });
    assert.equal((await guardar({ ...producto({ proveedor: pv.id, activo: false, price: 189999 }), id: nuevo.id })).ok, true);
    assert.equal((await catalogo()).productos.find(p => p.id === nuevo.id).proveedor, pv.id);

    const gasto = (monto, cat = 'alquiler') => q1('select public.panel_gasto($1, $2, $3, $4, null) as r', [cat, 'Alquiler de octubre', monto, 'transferencia']);
    for (const m of [0, -1000]) assert.deepEqual(await gasto(m), no, `gasto ${m}`);
    assert.deepEqual(await gasto(1000, 'mercaderia'), no, 'la mercadería se resta al vender, no como gasto');
    assert.equal((await gasto(350000)).ok, true);
    const cobro = (monto, rep) => q1('select public.panel_cobro($1, $2, $3, $4, $5, $6, null) as r', ['AT-7KQ2-9M', 'Notebook HP', 'nb', monto, rep, 'efectivo']);
    for (const [m, r] of [[0, 0], [-500, 0], [45000, -1]]) assert.deepEqual(await cobro(m, r), no, `cobro ${m} ${r}`);
    assert.equal((await cobro(45000, 12000)).ok, true);
    assert.deepEqual((await movs()).dinero.filter(m => m.kind !== 'venta').map(m => [m.kind, m.amount]), [['gasto', 350000], ['reparacion', 45000]]);

    const precios = cambios => q1('select public.panel_precios($1) as r', [JSON.stringify(cambios)]);
    for (const cambios of [[], [{ id: nuevo.id, price: 0 }], [{ id: nuevo.id, price: -10 }], [{ id: nuevo.id, price: 1 }, { id: nuevo.id, price: 2 }]])
      assert.deepEqual(await precios(cambios), no, JSON.stringify(cambios));
    // Todo o nada: con un producto inexistente no cambia ninguno
    assert.deepEqual(await precios([{ id: nuevo.id, price: 209999 }, { id: '00000000-0000-4000-8000-000000000000', price: 5 }]), { ok: false, motivo: 'no_existe' });
    assert.equal((await catalogo()).productos.find(p => p.id === nuevo.id).price, 189999);
    assert.deepEqual(await precios([{ id: nuevo.id, price: 209999 }]), { ok: true, cambiados: 1 });
    assert.equal((await catalogo()).productos.find(p => p.id === nuevo.id).price, 209999);
  });
});
