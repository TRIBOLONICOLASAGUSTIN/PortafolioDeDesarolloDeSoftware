// Pruebas de seguridad de /api/seguimiento y de los encabezados del sitio (Hito 2).
// Cada prueba empieza con un ID (API-n) que se cita en docs/atc/seguridad.md; `npm run check:docs` lo controla.
// Corren contra `next start` (app compilada) y la base local de pruebas. Correr con: npm run test:api
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, LOCAL_ENV } from '../helpers/server.mjs';
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
async function post(srv, body, { ip = nextIp(), headers = {}, raw } = {}) {
  const res = await fetch(`${srv.base}/api/seguimiento`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...headers },
    body: raw ?? JSON.stringify(body),
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, headers: res.headers, text, json };
}

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
