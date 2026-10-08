// Pruebas de seguridad de la base de AT Computación.
// Cada prueba empieza con un ID (RLS-n, FN-n, TRK-n, GEN-n, RET-n) que se cita en
// docs/atc/seguridad.md. `npm run check:docs` verifica que ninguno quede sin documentar.
// Correr con: npm run test:db
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connect, inTx, setRole, asAdmin, expectError, track, makeOwner, OWNER, STRANGER, CODE_RE } from './helpers.mjs';

let c;
before(async () => { c = await connect(); });
after(async () => { await c?.end(); });

const API_ROLES = ['anon', 'authenticated', 'atc_tracker', 'service_role'];

// ---------------------------------------------------------------------------
// RLS y permisos sobre tablas
// ---------------------------------------------------------------------------
test('RLS-1 · Todas las tablas tienen RLS activado y ningún rol del API es dueño de una tabla', async () => {
  const { rows } = await c.query(`
    select n.nspname || '.' || c.relname as tabla, c.relrowsecurity as rls, r.rolname as dueno
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_roles r on r.oid = c.relowner
     where n.nspname in ('public', 'private') and c.relkind = 'r'
     order by 1`);
  assert.deepEqual(rows.map(r => r.tabla), [
    'private.secrets', 'private.track_attempts',
    'public.order_events', 'public.orders', 'public.products', 'public.settings',
  ]);
  for (const r of rows) {
    assert.equal(r.rls, true, `${r.tabla} sin RLS`);
    assert.ok(!API_ROLES.includes(r.dueno), `${r.tabla} pertenece a ${r.dueno}`);
  }
});

test('RLS-2 · Permisos mínimos aun con los permisos de fábrica de Supabase', async () => {
  const { rows } = await c.query(`
    select grantee || ':' || table_schema || '.' || table_name || ':' || privilege_type as g
      from information_schema.role_table_grants
     where grantee in ('anon', 'authenticated', 'atc_tracker') and table_schema in ('public', 'private')
     order by 1`);
  assert.deepEqual(rows.map(r => r.g), [
    'anon:public.products:SELECT',
    'authenticated:public.order_events:INSERT',
    'authenticated:public.order_events:SELECT',
    'authenticated:public.orders:DELETE',
    'authenticated:public.orders:INSERT',
    'authenticated:public.orders:SELECT',
    'authenticated:public.orders:UPDATE',
    'authenticated:public.products:DELETE',
    'authenticated:public.products:INSERT',
    'authenticated:public.products:SELECT',
    'authenticated:public.products:UPDATE',
    'authenticated:public.settings:SELECT',
  ]);
  // settings: authenticated solo puede actualizar business_name (no owner_user_id).
  const cols = await c.query(`
    select column_name from information_schema.column_privileges
     where grantee = 'authenticated' and table_name = 'settings' and privilege_type = 'UPDATE'`);
  assert.deepEqual(cols.rows.map(r => r.column_name), ['business_name']);
  // Nadie del API entra al schema private ni usa secuencias.
  for (const role of ['anon', 'authenticated', 'atc_tracker']) {
    const { rows: [u] } = await c.query(`select has_schema_privilege($1, 'private', 'USAGE') as u`, [role]);
    assert.equal(u.u, false, `${role} tiene USAGE sobre private`);
  }
  const seq = await c.query(`
    select grantee from information_schema.role_usage_grants
     where object_type = 'SEQUENCE' and grantee in ('anon', 'authenticated', 'atc_tracker')`);
  assert.equal(seq.rowCount, 0);
});

test('RLS-3 · anon ve solo productos activos y no puede escribir el catálogo', async () => {
  await inTx(c, async () => {
    await c.query(`update public.products set active = false where slug = 'red-c6'`);
    await setRole(c, 'anon');
    const { rows } = await c.query('select slug from public.products');
    assert.equal(rows.length, 10);
    assert.ok(!rows.some(r => r.slug === 'red-c6'), 'se ve un producto inactivo');
    await expectError(c, `insert into public.products (slug, category, brand, name, price_ars) values ('x', 'pc', 'X', 'X', 1)`);
    await expectError(c, `update public.products set price_ars = 1`);
    await expectError(c, `delete from public.products`);
  });
});

test('RLS-4 · anon no puede leer órdenes, novedades ni configuración', async () => {
  await inTx(c, async () => {
    await setRole(c, 'anon');
    for (const t of ['public.orders', 'public.order_events', 'public.settings', 'private.track_attempts', 'private.secrets']) {
      await expectError(c, `select * from ${t}`);
    }
  });
});

test('RLS-5 · Un usuario autenticado que no es el dueño no ve ni escribe nada privado', async () => {
  await inTx(c, async () => {
    await makeOwner(c);
    await setRole(c, 'authenticated', STRANGER);
    assert.equal((await c.query('select * from public.orders')).rowCount, 0);
    assert.equal((await c.query('select * from public.order_events')).rowCount, 0);
    assert.equal((await c.query('select * from public.settings')).rowCount, 0);
    assert.equal((await c.query(`update public.orders set device = 'hackeado'`)).rowCount, 0);
    assert.equal((await c.query(`delete from public.orders`)).rowCount, 0);
    await expectError(c, `insert into public.orders (customer_first_name, customer_phone, device) values ('X', '3420000000', 'X')`);
    await expectError(c, `insert into public.products (slug, category, brand, name, price_ars) values ('x', 'pc', 'X', 'X', 1)`);
    assert.equal((await c.query(`update public.products set price_ars = 1`)).rowCount, 0);
    // Tampoco puede adueñarse del local.
    await expectError(c, `update public.settings set owner_user_id = $1`, [STRANGER]);
  });
});

test('RLS-6 · El dueño crea productos y órdenes; el código sale aleatorio y phone_last3 se deriva solo', async () => {
  await inTx(c, async () => {
    await makeOwner(c);
    await setRole(c, 'authenticated', OWNER);
    await c.query(`insert into public.products (slug, category, brand, name, price_ars, stock) values ('mouse-x', 'perifericos', 'Genius', 'Mouse X', 9999, 3)`);
    const { rows: [o] } = await c.query(`
      insert into public.orders (customer_first_name, customer_last_initial, customer_phone, device, problem)
      values ('Ana', 'P', '3425551234', 'Notebook Dell', 'No prende')
      returning public_code, phone_last3, status`);
    assert.match(o.public_code, CODE_RE);
    assert.equal(o.phone_last3, '234');
    assert.equal(o.status, 'ingresado');
    // phone_last3 no se puede escribir a mano (columna generada).
    await expectError(c, `insert into public.orders (customer_first_name, customer_phone, device, phone_last3) values ('A', '3425551234', 'X', '999')`, [], '428C9');
    // El dueño puede cambiar el nombre del negocio pero no transferir la propiedad por el API.
    assert.equal((await c.query(`update public.settings set business_name = 'AT Computación Santa Fe'`)).rowCount, 1);
    await expectError(c, `update public.settings set owner_user_id = $1`, [STRANGER]);
  });
});

test('RLS-7 · Las novedades son una bitácora: se agregan, no se editan ni se borran', async () => {
  await inTx(c, async () => {
    await makeOwner(c);
    await setRole(c, 'authenticated', OWNER);
    const { rows: [o] } = await c.query(`select id from public.orders where public_code = 'AT-9TR4-6P'`);
    const { rows: [e] } = await c.query(
      `insert into public.order_events (order_id, status, note_public) values ($1, 'aprobacion', 'Presupuesto enviado') returning id, created_by`, [o.id]);
    assert.equal(e.created_by, OWNER, 'el autor no quedó registrado');
    const { rows: [s] } = await c.query(`select status from public.orders where id = $1`, [o.id]);
    assert.equal(s.status, 'aprobacion', 'la novedad no actualizó el estado de la orden');
    await expectError(c, `update public.order_events set note_public = 'editada' where id = $1`, [e.id]);
    await expectError(c, `delete from public.order_events where id = $1`, [e.id]);
    // No se puede firmar una novedad a nombre de otro.
    await expectError(c, `insert into public.order_events (order_id, status, created_by) values ($1, 'reparacion', $2)`, [o.id, STRANGER]);
  });
});

// ---------------------------------------------------------------------------
// Funciones
// ---------------------------------------------------------------------------
test('FN-1 · Toda función de public y private fija su search_path (y las SECURITY DEFINER son las esperadas)', async () => {
  const { rows } = await c.query(`
    select n.nspname || '.' || p.proname as f, p.prosecdef as definer, coalesce(array_to_string(p.proconfig, ','), '') as cfg
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private')
     order by 1`);
  assert.deepEqual(rows.map(r => r.f), [
    'private.anonymize_closed_orders', 'private.purge_attempts',
    'public.gen_public_code', 'public.is_owner', 'public.normalize_code',
    'public.tg_event_updates_order', 'public.tg_set_updated_at', 'public.track_order',
  ]);
  for (const r of rows) assert.match(r.cfg, /search_path=pg_catalog, public, pg_temp/, `${r.f} sin search_path fijo`);
  assert.deepEqual(rows.filter(r => r.definer).map(r => r.f), ['public.is_owner', 'public.track_order']);
});

test('FN-2 · track_order solo la ejecuta atc_tracker (ni PUBLIC, ni anon, ni authenticated)', async () => {
  const fn = 'public.track_order(text,text,text)';
  const { rows: [pub] } = await c.query(`
    select exists (select 1 from pg_proc p, aclexplode(p.proacl) a where p.oid = $1::regprocedure and a.grantee = 0) as x`, [fn]);
  assert.equal(pub.x, false, 'PUBLIC puede ejecutar track_order');
  for (const [role, expected] of [['anon', false], ['authenticated', false], ['atc_tracker', true]]) {
    const { rows: [r] } = await c.query(`select has_function_privilege($1, $2, 'EXECUTE') as x`, [role, fn]);
    assert.equal(r.x, expected, `${role}: EXECUTE debería ser ${expected}`);
  }
  await inTx(c, async () => {
    await setRole(c, 'anon');
    await expectError(c, `select public.track_order('AT-7KQ2-9M', '321', '1.1.1.1')`);
    await setRole(c, 'authenticated', STRANGER);
    await expectError(c, `select public.track_order('AT-7KQ2-9M', '321', '1.1.1.1')`);
  });
});

test('FN-3 · atc_tracker no lee tablas ni ejecuta otras funciones; anon no ejecuta ninguna', async () => {
  const executable = async role => (await c.query(`
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and has_function_privilege($1, p.oid, 'EXECUTE')
     order by 1`, [role])).rows.map(r => r.proname);
  assert.deepEqual(await executable('atc_tracker'), ['track_order']);
  assert.deepEqual(await executable('anon'), []);
  assert.deepEqual(await executable('authenticated'), ['gen_public_code', 'is_owner']);
  await inTx(c, async () => {
    await setRole(c, 'atc_tracker');
    for (const t of ['public.orders', 'public.order_events', 'public.products', 'public.settings', 'private.track_attempts']) {
      await expectError(c, `select * from ${t}`);
    }
    await expectError(c, 'select public.gen_public_code()');
    await expectError(c, 'select private.purge_attempts()');
  });
});

// ---------------------------------------------------------------------------
// Seguimiento (track_order)
// ---------------------------------------------------------------------------
test('TRK-1 · Con datos correctos responde solo lo mínimo (sin teléfono, UUID ni problema)', async () => {
  await inTx(c, async () => {
    const { rows: [o] } = await c.query(`select id, customer_phone, problem from public.orders where public_code = 'AT-7KQ2-9M'`);
    await setRole(c, 'atc_tracker');
    const r = await track(c, 'AT-7KQ2-9M', '321');
    assert.equal(r.ok, true);
    assert.deepEqual(Object.keys(r).sort(), ['cliente', 'codigo', 'equipo', 'estado', 'garantia_hasta', 'novedades', 'ok', 'presupuesto']);
    assert.equal(r.cliente, 'Nicolás T.');
    assert.equal(r.estado, 'listo');
    assert.equal(r.novedades.length, 5);
    for (const n of r.novedades) assert.deepEqual(Object.keys(n).sort(), ['estado', 'fecha', 'nota']);
    const json = JSON.stringify(r);
    for (const secret of [o.id, o.customer_phone, o.problem]) assert.ok(!json.includes(secret), `se filtró: ${secret}`);
  });
});

test('TRK-2 · Normaliza el código como lo escribe la gente (minúsculas, sin guiones, I/L/O)', async () => {
  await inTx(c, async () => {
    await c.query(`insert into public.orders (public_code, customer_first_name, customer_phone, device) values ('AT-10K1-0P', 'Leo', '3420000123', 'Router')`);
    await setRole(c, 'atc_tracker');
    for (const variant of ['at-7kq2-9m', 'AT7KQ29M', ' 7kq2 9m ', 'AT-7KQ2-9M']) {
      assert.equal((await track(c, variant, '321', `192.0.2.${variant.length}`)).ok, true, variant);
    }
    // I y L se leen como 1, O como 0 (Crockford).
    assert.equal((await track(c, 'at-iOkL-oP', '123')).ok, true);
    // U no existe en el alfabeto.
    assert.equal((await track(c, 'AT-UUUU-UU', '123')).ok, false);
  });
  const { rows: [n] } = await c.query(`select public.normalize_code('at 7kq2 9m') as a, public.normalize_code(repeat('A', 65)) as b`);
  assert.equal(n.a, 'AT-7KQ2-9M');
  assert.equal(n.b, null);
});

test('TRK-3 · Teléfono incorrecto y código inexistente dan exactamente la misma respuesta', async () => {
  await inTx(c, async () => {
    await setRole(c, 'atc_tracker');
    const wrongPhone = await track(c, 'AT-7KQ2-9M', '999', '192.0.2.10');
    const unknownCode = await track(c, 'AT-ZZZZ-ZZ', '321', '192.0.2.11');
    const badFormat = await track(c, 'hola', '321', '192.0.2.12');
    assert.deepEqual(wrongPhone, { ok: false, motivo: 'no_encontrada' });
    assert.deepEqual(unknownCode, wrongPhone);
    assert.deepEqual(badFormat, wrongPhone);
  });
});

test('TRK-4 · Entradas maliciosas o absurdas responden "no_encontrada" sin romper nada', async () => {
  await inTx(c, async () => {
    await setRole(c, 'atc_tracker');
    const inputs = [
      ["' OR 1=1--", '321'],
      ["AT-7KQ2-9M'; drop table public.orders;--", '321'],
      ['A'.repeat(10000), '321'],
      [null, '321'],
      ['AT-7KQ2-9M', null],
      ['AT-7KQ2-9M', "' or '1'='1"],
      ['AT-7KQ2-9M', '3210'],
      ['７ＫＱ２-９Ｍ', '321'],
    ];
    for (const [i, [code, phone]] of inputs.entries()) {
      assert.deepEqual(await track(c, code, phone, `192.0.2.${100 + i}`), { ok: false, motivo: 'no_encontrada' }, String(code).slice(0, 40));
    }
  });
  const { rows: [n] } = await c.query('select count(*)::int as n from public.orders');
  assert.equal(n.n, 3, 'la tabla de órdenes cambió');
});

test('TRK-5 · Bloqueo por código: 5 fallas en 15 min y 10 en 24 h, aunque después pongan el teléfono correcto', async () => {
  await inTx(c, async () => {
    await setRole(c, 'atc_tracker');
    for (let i = 0; i < 5; i++) assert.equal((await track(c, 'AT-7KQ2-9M', '000', `198.51.100.${i}`)).motivo, 'no_encontrada');
    assert.deepEqual(await track(c, 'AT-7KQ2-9M', '321', '198.51.100.50'), { ok: false, motivo: 'demasiados_intentos' });
    // Otro código no se ve afectado.
    assert.equal((await track(c, 'AT-3FJ8-WX', '548', '198.51.100.51')).ok, true);
    // Pasados 15 minutos vuelve a andar (se simula moviendo las fechas).
    await asAdmin(c);
    await c.query(`update private.track_attempts set created_at = created_at - interval '16 minutes'`);
    await setRole(c, 'atc_tracker');
    assert.equal((await track(c, 'AT-7KQ2-9M', '321', '198.51.100.52')).ok, true);
    // Cinco fallas más completan 10 en 24 h: el bloqueo largo sigue aunque pasen 15 minutos.
    for (let i = 0; i < 5; i++) await track(c, 'AT-7KQ2-9M', '000', `198.51.100.${60 + i}`);
    await asAdmin(c);
    await c.query(`update private.track_attempts set created_at = created_at - interval '16 minutes'`);
    await setRole(c, 'atc_tracker');
    assert.deepEqual(await track(c, 'AT-7KQ2-9M', '321', '198.51.100.70'), { ok: false, motivo: 'demasiados_intentos' });
    // Pasadas 24 h se libera.
    await asAdmin(c);
    await c.query(`update private.track_attempts set created_at = created_at - interval '24 hours'`);
    await setRole(c, 'atc_tracker');
    assert.equal((await track(c, 'AT-7KQ2-9M', '321', '198.51.100.71')).ok, true);
  });
});

test('TRK-6 · Bloqueo por IP: 30 fallas en 1 h bloquean esa IP; otra IP sigue andando', async () => {
  await inTx(c, async () => {
    await setRole(c, 'atc_tracker');
    const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    for (let i = 0; i < 30; i++) {
      const code = `AT-ZZZZ-${alphabet[i]}${alphabet[i]}`;   // un código distinto por intento (no salta el bloqueo por código)
      assert.equal((await track(c, code, '111', '203.0.113.99')).motivo, 'no_encontrada');
    }
    assert.deepEqual(await track(c, 'AT-7KQ2-9M', '321', '203.0.113.99'), { ok: false, motivo: 'demasiados_intentos' });
    assert.equal((await track(c, 'AT-7KQ2-9M', '321', '203.0.113.100')).ok, true);
  });
});

test('TRK-7 · Los intentos se guardan solo como HMAC: ni códigos ni IP en crudo', async () => {
  await inTx(c, async () => {
    await setRole(c, 'atc_tracker');
    await track(c, 'AT-7KQ2-9M', '321', '203.0.113.7');
    await track(c, 'AT-ZZZZ-ZZ', '999', '203.0.113.8');
    await asAdmin(c);
    const { rows } = await c.query('select * from private.track_attempts');
    assert.ok(rows.length >= 2);
    const dump = JSON.stringify(rows);
    for (const raw of ['7KQ2', 'ZZZZ', '203.0.113', '321', '999']) assert.ok(!dump.includes(raw), `aparece en crudo: ${raw}`);
    for (const r of rows) { assert.match(r.code_hash, /^[0-9a-f]{64}$/); assert.match(r.ip_hash, /^[0-9a-f]{64}$/); }
  });
});

// ---------------------------------------------------------------------------
// Generación de códigos y retención
// ---------------------------------------------------------------------------
test('GEN-1 · Los códigos usan el alfabeto Crockford completo y nunca se repiten en la base', async () => {
  const { rows } = await c.query('select public.gen_public_code() as code from generate_series(1, 10000)');
  const codes = rows.map(r => r.code);
  for (const code of codes) assert.match(code, CODE_RE);
  const chars = new Set(codes.map(code => code.slice(3).replace('-', '')).join(''));   // solo el cuerpo, sin el prefijo AT-
  for (const ch of '0123456789ABCDEFGHJKMNPQRSTVWXYZ') assert.ok(chars.has(ch), `nunca aparece ${ch}`);
  for (const bad of 'ILOU') assert.ok(!chars.has(bad), `aparece ${bad}`);
  // 2^30 combinaciones: con 10.000 sorteos sueltos se esperan ~0,05 repeticiones; por eso la
  // garantía real está en la base: 2.000 órdenes nuevas reciben 2.000 códigos distintos.
  await inTx(c, async () => {
    await c.query(`insert into public.orders (customer_first_name, customer_phone, device)
                   select 'Test', '342000' || lpad(g::text, 4, '0'), 'Equipo ' || g from generate_series(1, 2000) g`);
    const { rows: [u] } = await c.query('select count(*)::int as n, count(distinct public_code)::int as d from public.orders');
    assert.equal(u.n, 2003);
    assert.equal(u.d, 2003);
  });
});

test('RET-1 · Retención: se purgan intentos viejos y se anonimizan órdenes entregadas hace más de 24 meses', async () => {
  await inTx(c, async () => {
    await c.query(`insert into private.track_attempts (code_hash, ip_hash, outcome, created_at) values
      (repeat('a', 64), repeat('b', 64), 'ok', now() - interval '31 days'),
      (repeat('c', 64), repeat('d', 64), 'ok', now() - interval '1 day')`);
    assert.equal((await c.query('select private.purge_attempts() as n')).rows[0].n, 1);
    assert.equal((await c.query('select count(*)::int as n from private.track_attempts')).rows[0].n, 1);

    await c.query(`update public.orders set status = 'entregado', delivered_at = now() - interval '25 months' where public_code = 'AT-7KQ2-9M'`);
    await c.query(`update public.orders set status = 'entregado', delivered_at = now() - interval '1 month'  where public_code = 'AT-3FJ8-WX'`);
    assert.equal((await c.query('select private.anonymize_closed_orders() as n')).rows[0].n, 1);
    const { rows: [a] } = await c.query(`select customer_first_name, customer_phone, phone_last3, problem, anonymized_at from public.orders where public_code = 'AT-7KQ2-9M'`);
    assert.deepEqual([a.customer_first_name, a.customer_phone, a.phone_last3, a.problem], [null, null, null, null]);
    assert.ok(a.anonymized_at);
    const { rows: [b] } = await c.query(`select customer_phone from public.orders where public_code = 'AT-3FJ8-WX'`);
    assert.equal(b.customer_phone, '3424000548');
    // Una orden anonimizada ya no se puede rastrear.
    await setRole(c, 'atc_tracker');
    assert.equal((await track(c, 'AT-7KQ2-9M', '321')).ok, false);
  });
});
