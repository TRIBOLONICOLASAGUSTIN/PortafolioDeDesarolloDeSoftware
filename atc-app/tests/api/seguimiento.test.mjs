// Pruebas de seguridad de /api/seguimiento y de los encabezados del sitio (Hito 2).
// Cada prueba empieza con un ID (API-n) que se cita en docs/atc/seguridad.md; `npm run check:docs` lo controla.
// Corren contra `next start` (app compilada) y la base local de pruebas. Correr con: npm run test:api
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { startServer, LOCAL_ENV } from '../helpers/server.mjs';
import { fakeUpstash, PEM_PRUEBA } from '../helpers/upstash.mjs';
import { postRuta } from '../helpers/http.mjs';
import { connect } from '../db/helpers.mjs';

const RL_MAX = 8;
let local, prod, db;
before(async () => {
  [local, prod] = await Promise.all([
    startServer({ port: 3120, env: { ...LOCAL_ENV, ATC_RL_MAX: String(RL_MAX) } }),
    // "Producción" sin configuración: tiene que fallar cerrado.
    startServer({ port: 3121, env: {} }),
  ]);
  db = await connect();
});
after(async () => { await db?.end(); await Promise.all([local?.stop(), prod?.stop()]); });

let ipSeq = 10;
const nextIp = () => `198.51.100.${ipSeq++}`;
const post = (srv, body, { ip = nextIp(), headers = {}, raw } = {}) => postRuta(srv.base, '/api/seguimiento', body, { headers: { 'cf-connecting-ip': ip, ...headers }, raw });

test('API-1 · Con datos correctos responde 200 solo con las claves permitidas, sin teléfono ni datos internos y sin caché', async () => {
  const r = await post(local, { codigo: 'AT-3FJ8-WX', telefono3: '548' });
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.json).sort(), ['cliente', 'codigo', 'equipo', 'estado', 'garantia_hasta', 'novedades', 'ok', 'presupuesto']);
  assert.equal(r.json.cliente, 'María G.');
  for (const n of r.json.novedades) assert.deepEqual(Object.keys(n).sort(), ['estado', 'fecha', 'nota']);
  assert.doesNotMatch(r.text, /3424000548|problem|rayas|"id"/, 'la respuesta incluye datos que no corresponden');
  assert.match(r.headers.get('cache-control') ?? '', /no-store/);
});

test('API-2 · Teléfono incorrecto, código inexistente y formato inválido dan exactamente la misma respuesta', async () => {
  const a = await post(local, { codigo: 'AT-7KQ2-9M', telefono3: '000' });   // teléfono incorrecto
  const b = await post(local, { codigo: 'AT-ZZZZ-ZZ', telefono3: '321' });   // código inexistente
  const c = await post(local, { codigo: "' OR 1=1--", telefono3: '321' });   // formato inválido (pasa Zod, la base lo normaliza a nulo)
  for (const r of [a, b, c]) { assert.equal(r.status, 200); assert.equal(r.text, '{"ok":false,"motivo":"no_encontrada"}'); }
});

test('API-3 · Pedidos inválidos o de otro sitio se rechazan sin detalles (405/400/403), con forma uniforme { ok:false, motivo }', async () => {
  const get = await fetch(`${local.base}/api/seguimiento`);
  assert.equal(get.status, 405);
  const cases = [
    await post(local, null, { raw: 'codigo=AT-3FJ8-WX', headers: { 'content-type': 'application/x-www-form-urlencoded' } }),
    await post(local, null, { raw: '{"codigo":' }),
    await post(local, { codigo: 'AT-3FJ8-WX', telefono3: '548', extra: 1 }),
    await post(local, { codigo: 'A'.repeat(65), telefono3: '548' }),
    await post(local, { codigo: 'AT-3FJ8-WX', telefono3: 'ab' }),      // teléfono malformado (Zod estricto: 3 dígitos)
    await post(local, { codigo: 'AT-3FJ8-WX', telefono3: '5480' }),    // teléfono de 4 dígitos
    await post(local, null, { raw: JSON.stringify({ codigo: 'AT-3FJ8-WX', telefono3: '548', turnstileToken: 'x'.repeat(1500) }) }),
  ];
  for (const r of cases) { assert.equal(r.status, 400); assert.equal(r.text, '{"ok":false,"motivo":"solicitud_invalida"}'); }
  for (const headers of [{ origin: 'https://atacante.example' }, { 'sec-fetch-site': 'cross-site' }]) {
    const r = await post(local, { codigo: 'AT-3FJ8-WX', telefono3: '548' }, { headers });
    assert.equal(r.status, 403); assert.equal(r.text, '{"ok":false,"motivo":"origen"}');
  }
});

test('API-4 · El límite del servidor por IP corta con 429 y Retry-After, sin afectar a otra IP', async () => {
  const ip = nextIp();
  const codes = [];
  for (let i = 0; i < RL_MAX + 2; i++) codes.push((await post(local, { codigo: 'AT-9TR4-6P', telefono3: '777' }, { ip })).status);
  assert.deepEqual(codes.slice(0, RL_MAX), Array(RL_MAX).fill(200));
  assert.deepEqual(codes.slice(RL_MAX), [429, 429]);
  const last = await post(local, { codigo: 'AT-9TR4-6P', telefono3: '777' }, { ip });
  assert.ok(Number(last.headers.get('retry-after')) > 0);
  assert.equal(last.json.motivo, 'demasiados_intentos');
  assert.equal((await post(local, { codigo: 'AT-9TR4-6P', telefono3: '777' })).status, 200, 'otra IP sigue andando');
});

test('API-5 · La IP que llega a la base es la de la plataforma, no la de un X-Forwarded-For falso', async () => {
  const real = '203.0.113.201', fake = '192.0.2.250';
  await post(local, { codigo: 'AT-ZZZZ-ZZ', telefono3: '999' }, { ip: real, headers: { 'x-forwarded-for': fake } });
  const { rows: [r] } = await db.query(`
    with s as (select pepper from private.secrets where id = 1),
         h as (select encode(extensions.hmac(convert_to($1, 'UTF8'), s.pepper, 'sha256'), 'hex') as real_h,
                      encode(extensions.hmac(convert_to($2, 'UTF8'), s.pepper, 'sha256'), 'hex') as fake_h from s)
    select (select count(*) from private.track_attempts t, h where t.ip_hash = h.real_h)::int as real_n,
           (select count(*) from private.track_attempts t, h where t.ip_hash = h.fake_h)::int as fake_n`, [real, fake]);
  assert.equal(r.real_n, 1);
  assert.equal(r.fake_n, 0);
});

test('API-6 · En producción sin configuración responde 503 y nunca usa datos de demo', async () => {
  const r = await post(prod, { codigo: 'AT-7KQ2-9M', telefono3: '321' });
  assert.equal(r.status, 503);
  assert.equal(r.text, '{"ok":false,"motivo":"no_disponible"}');
});

test('API-7 · El sitio manda CSP con nonce por pedido y los encabezados de seguridad', async () => {
  const [a, b] = await Promise.all([fetch(local.base + '/'), fetch(local.base + '/')]);
  const csp = a.headers.get('content-security-policy') ?? '';
  const dir = Object.fromEntries(csp.split(';').map(d => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));
  assert.ok(dir['script-src'].some(v => v.startsWith("'nonce-")), 'script-src sin nonce');
  assert.ok(dir['script-src'].includes("'strict-dynamic'"));
  assert.ok(!dir['script-src'].includes("'unsafe-inline'") && !dir['script-src'].includes("'unsafe-eval'"), 'script-src permisivo');
  assert.deepEqual(dir['object-src'], ["'none'"]);
  assert.deepEqual(dir['frame-ancestors'], ["'none'"]);
  assert.deepEqual(dir['base-uri'], ["'self'"]);
  const nonce = dir['script-src'].find(v => v.startsWith("'nonce-")).slice(7, -1);
  const html = await a.text();
  const tags = [...html.matchAll(/<script\b[^>]*>/g)].map(m => m[0]);
  assert.ok(tags.length > 0 && tags.every(t => t.includes(`nonce="${nonce}"`)), 'hay scripts sin el nonce del pedido');
  assert.notEqual(nonce, (b.headers.get('content-security-policy') ?? '').match(/'nonce-([^']+)'/)?.[1], 'el nonce se repite entre pedidos');
  assert.equal(a.headers.get('x-frame-options'), 'DENY');
  assert.equal(a.headers.get('x-content-type-options'), 'nosniff');
  assert.match(a.headers.get('strict-transport-security') ?? '', /max-age=\d{7,}/);
  assert.equal(a.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(a.headers.get('x-powered-by'), null);
  await b.text();
});

// "Producción" completa con datos falsos: base remota (nunca se llega a usar), Upstash falso y CA de prueba.
const prodEnv = up => ({ ATC_TRACKER_DATABASE_URL: 'postgres://atc_tracker:x@db.invalid:6543/postgres', TURNSTILE_SECRET_KEY: 'prueba', NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'prueba',
  UPSTASH_REDIS_REST_URL: up.url, UPSTASH_REDIS_REST_TOKEN: 'prueba', ATC_IP_HEADER: 'cf-connecting-ip', ATC_DB_CA: PEM_PRUEBA, ATC_RL_MAX: '3' });

test('API-22 · Límite en producción: una IP que ya pasó el límite no sigue consumiendo Upstash (tampoco con pedidos simultáneos), y la clave guarda un HMAC de la red (nunca un hash reversible de la IP)', async () => {
  const up = await fakeUpstash();
  const srv = await startServer({ port: 3126, env: prodEnv(up) });
  try {
    const ip = '203.0.113.7', st = [];
    // Sin token de Turnstile: el límite corre antes y la verificación corta sin salir a internet (403).
    for (let i = 0; i < 9; i++) st.push((await post(srv, { codigo: 'AT-3FJ8-WX', telefono3: '548' }, { ip })).status);
    assert.deepEqual(st, [403, 403, 403, 429, 429, 429, 429, 429, 429]);
    const incr = up.cmds.filter(([op]) => op === 'INCR'), exp = up.cmds.filter(([op]) => op === 'EXPIRE');
    assert.equal(incr.length, 3, `INCR por pedido hasta el límite y después ninguno: el resto se corta en el servidor (hubo ${incr.length})`);
    assert.ok(exp.length === incr.length && exp.every(c => c[3] === 'NX'), 'el vencimiento va en la misma llamada y solo se fija si falta (NX)');
    // 12 pedidos simultáneos desde otra red: a Upstash llegan como mucho 3 (el resto se corta en el servidor)
    const antes = up.cmds.length;
    const sim = await Promise.all(Array.from({ length: 12 }, () => post(srv, { codigo: 'AT-3FJ8-WX', telefono3: '548' }, { ip: '203.0.113.99' })));
    assert.equal(sim.filter(r => r.status === 429).length, 9);
    assert.ok(up.cmds.slice(antes).filter(([op]) => op === 'INCR').length <= 3, 'los pedidos simultáneos gastaron de más el cupo de Upstash');
    const sha = createHash('sha256').update(ip).digest('hex').slice(0, 32);
    for (const [, key] of up.cmds) {
      assert.match(key, /^atc:trk:[0-9a-f]{32}:\d+$/);
      assert.ok(!key.includes(sha) && !key.includes(ip), 'la clave del límite se puede revertir a la IP');
    }
  } finally { await srv.stop(); up.close(); }
});

test('API-23 · En producción la base va siempre por TLS verificado: sin el certificado de la CA, con uno inválido o con sslmode en la URL, responde 503 antes de tocar Upstash', async () => {
  const up = await fakeUpstash();
  const casos = [{ ATC_DB_CA: '' }, { ATC_DB_CA: 'no es un certificado' }, { ATC_TRACKER_DATABASE_URL: 'postgres://atc_tracker:x@db.invalid:6543/postgres?sslmode=disable' }];
  try {
    for (const [i, extra] of casos.entries()) {
      const srv = await startServer({ port: 3131 + i, env: { ...prodEnv(up), ...extra } });
      try {
        const r = await post(srv, { codigo: 'AT-3FJ8-WX', telefono3: '548' });
        assert.equal(r.status, 503, `caso ${i}: respondió ${r.status}`);
        assert.deepEqual(r.json, { ok: false, motivo: 'no_disponible' });
      } finally { await srv.stop(); }
    }
    assert.equal(up.cmds.length, 0, 'con la configuración incompleta no se llega a Upstash');
  } finally { up.close(); }
});
