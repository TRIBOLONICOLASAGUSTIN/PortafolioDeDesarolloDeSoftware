// Panel del dueño: solo existe para el superadmin con sesión (contraseña + código del celular). Para cualquier otro, 404.
// Cada prueba empieza con un ID (API-n) que se cita en docs/atc/seguridad.md; `npm run check:docs` lo controla.
// Corren contra `next start` (app compilada). Correr con: npm run test:api
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../helpers/server.mjs';
import { ADMIN, adminEnv, forgeSession, login, stableNow, totpCode } from '../helpers/admin.mjs';

const ENV = adminEnv();
let adm, prod;
before(async () => {
  [adm, prod] = await Promise.all([
    // Superadmin configurado (modo local: límite en memoria, sin Turnstile); ATC_INDEXAR=1 para comprobar que el panel igual no se indexa.
    startServer({ port: 3122, env: { ...ENV, ATC_LOCAL: '1', ATC_IP_HEADER: 'cf-connecting-ip', ATC_INDEXAR: '1' } }),
    // "Producción" sin configuración: no hay ingreso posible y el panel no existe.
    startServer({ port: 3123, env: {} }),
  ]);
});
after(async () => { await Promise.all([adm?.stop(), prod?.stop()]); });

const PATHS = ['/panel', '/panel/movimientos', '/panel/movimientos?tipo=gastos'];
const PANEL_TEXT = /datos de ejemplo|maqueta|ganancia|registrar venta/i;
let ipSeq = 20;
const nextIp = () => ({ 'cf-connecting-ip': `198.51.100.${ipSeq++}` });
const get = (srv, p, cookie) => fetch(srv.base + p, { headers: cookie ? { cookie } : {}, redirect: 'manual' });
const expectNotFound = async (srv, cookie, why) => {
  for (const p of PATHS) {
    const r = await get(srv, p, cookie);
    const html = await r.text();
    assert.equal(r.status, 404, `${why}: ${p} respondió ${r.status}`);
    assert.doesNotMatch(html, PANEL_TEXT, `${why}: ${p} muestra contenido del panel`);
    assert.match(html, /No encontramos esta página/, `${why}: ${p} sin la página 404 en castellano`);
  }
};
// Cada código del celular sirve una sola vez: cada ingreso exitoso usa un paso de 30 s que no se haya usado.
const used = new Set();
async function freshCode() {
  for (;;) {
    const now = await stableNow(), t = Math.floor(now / 30000);
    for (const o of [0, 1, -1]) if (!used.has(t + o)) { used.add(t + o); return totpCode(o, now); }
    await new Promise(r => setTimeout(r, 30000 - (now % 30000) + 500));
  }
}
// Una sola sesión válida para las pruebas que la necesitan.
let session = '';
async function sesion() {
  if (session) return session;
  const r = await login(adm.base, { usuario: ADMIN.user, clave: ADMIN.pass, codigo: await freshCode() }, nextIp());
  assert.equal(r.status, 200, `no se pudo ingresar: ${r.text}`);
  session = r.cookie.split(';')[0];
  return session;
}

test('API-8 · Sin sesión de superadmin el panel no existe (404 sin contenido del panel), tampoco con una sesión inventada, alterada o vencida', async () => {
  await expectNotFound(prod, null, 'producción sin configuración');
  await expectNotFound(adm, null, 'sin cookie');
  await expectNotFound(adm, `atc_s=v1.9999999999.AAAAAAAAAAAAAAAA.${'A'.repeat(43)}`, 'cookie inventada');
  const valid = forgeSession(ENV, Math.floor(Date.now() / 1000) + 3600);
  const tampered = valid.slice(0, -1) + (valid.endsWith('A') ? 'B' : 'A');
  await expectNotFound(adm, `atc_s=${tampered}`, 'firma alterada');
  await expectNotFound(adm, `atc_s=${forgeSession(ENV, Math.floor(Date.now() / 1000) - 5)}`, 'sesión vencida');
  await expectNotFound(adm, `atc_s=${forgeSession({ ...ENV, ATC_SESSION_SECRET: Buffer.alloc(32, 7).toString('base64url') }, Math.floor(Date.now() / 1000) + 3600)}`, 'firmada con otro secreto');
  // Una sesión válida de verdad sí entra (control de la prueba).
  assert.equal((await get(adm, '/panel', `atc_s=${valid}`)).status, 200);
});

test('API-9 · Con sesión: el panel responde 200, noindex (meta y X-Robots-Tag) aunque ATC_INDEXAR=1, sin caché y con CSP con nonce; la tienda no enlaza al panel ni al ingreso', async () => {
  const cookie = await sesion();
  for (const p of PATHS) {
    const r = await get(adm, p, cookie);
    const html = await r.text();
    assert.equal(r.status, 200, `${p} respondió ${r.status}`);
    assert.match(r.headers.get('x-robots-tag') ?? '', /noindex/, `${p} sin X-Robots-Tag`);
    assert.match(r.headers.get('cache-control') ?? '', /no-store/, `${p} se puede guardar en caché`);
    assert.match(html, /<meta name="robots" content="noindex, nofollow/, `${p} sin meta noindex`);
    assert.match(html, /datos de ejemplo/i, `${p} sin el aviso de datos de ejemplo`);
    const nonce = (r.headers.get('content-security-policy') ?? '').match(/'nonce-([^']+)'/)?.[1];
    assert.ok(nonce, `${p} sin CSP con nonce`);
    const tags = [...html.matchAll(/<script\b[^>]*>/g)].map(m => m[0]);
    assert.ok(tags.length > 0 && tags.every(t => t.includes(`nonce="${nonce}"`)), `${p} tiene scripts sin el nonce`);
  }
  const bad = await (await get(adm, '/panel/movimientos?tipo=%3Cscript%3E', cookie)).text();
  assert.match(bad, /data-tipo="todos"/);
  const home = await (await get(adm, '/')).text();
  assert.doesNotMatch(home, /href="\/(panel|ingresar)/);
});

test('API-10 · Ingreso: usuario, contraseña o código incorrectos responden exactamente lo mismo; con los tres correctos, cookie HttpOnly, SameSite=Strict, 8 h', async () => {
  const ok = { usuario: ADMIN.user, clave: ADMIN.pass, codigo: await freshCode() };
  const fails = await Promise.all([
    login(adm.base, { ...ok, usuario: 'otro' }, nextIp()),
    login(adm.base, { ...ok, clave: 'clave-equivocada-123' }, nextIp()),
    login(adm.base, { ...ok, codigo: ok.codigo === '000000' ? '111111' : '000000' }, nextIp()),
    login(adm.base, { ...ok, codigo: totpCode(-6) }, nextIp()),
  ]);
  for (const f of fails) {
    assert.equal(f.status, 401);
    assert.equal(f.text, '{"ok":false,"motivo":"credenciales"}');
    assert.equal(f.cookie, null);
    assert.match(f.headers.get('cache-control') ?? '', /no-store/);
  }
  const r = await login(adm.base, ok, nextIp());
  assert.equal(r.status, 200, r.text);
  assert.equal(r.text, '{"ok":true}');
  const attrs = r.cookie.split(';').map(s => s.trim());
  assert.match(attrs[0], /^atc_s=v1\.\d{10}\.[\w-]{16}\.[\w-]{43}$/);
  for (const a of ['Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=28800']) assert.ok(attrs.includes(a), `falta ${a}`);
  assert.ok(!attrs.includes('Secure'), 'en local (http) la cookie no puede ser Secure');
  assert.equal((await get(adm, '/panel', attrs[0])).status, 200);
});

test('API-11 · El código del celular sirve una sola vez', async () => {
  const code = await freshCode();
  const body = { usuario: ADMIN.user, clave: ADMIN.pass, codigo: code };
  const first = await login(adm.base, body, nextIp());
  assert.equal(first.status, 200, first.text);
  const again = await login(adm.base, body, nextIp());
  assert.equal(again.status, 401, 'el mismo código entró dos veces');
  assert.equal(again.cookie, null);
});

test('API-12 · Ingreso: desde otro sitio 403; cuerpo de más de 1 KB, JSON roto o claves de más 400; 6 intentos desde la misma IP en 15 min 429', async () => {
  const body = { usuario: ADMIN.user, clave: 'x'.repeat(20), codigo: '123456' };
  assert.equal((await login(adm.base, body, { ...nextIp(), 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal((await login(adm.base, body, { ...nextIp(), origin: 'https://otro-sitio.example' })).status, 403);
  assert.equal((await login(adm.base, { ...body, clave: 'x'.repeat(1100) }, nextIp())).status, 400);
  assert.equal((await login(adm.base, '{"usuario":', nextIp())).status, 400);
  assert.equal((await login(adm.base, { ...body, admin: true }, nextIp())).status, 400);
  assert.equal((await login(adm.base, { ...body, codigo: '12a456' }, nextIp())).status, 400);
  const ip = { 'cf-connecting-ip': '203.0.113.77' };
  const codes = [];
  for (let i = 0; i < 6; i++) codes.push((await login(adm.base, body, ip)).status);
  assert.deepEqual(codes, [401, 401, 401, 401, 401, 429]);
  const last = await login(adm.base, body, ip);
  assert.ok(Number(last.headers.get('retry-after')) > 0);
});

test('API-13 · En producción sin la configuración del superadmin el ingreso falla cerrado (503) y el panel sigue sin existir', async () => {
  const r = await login(prod.base, { usuario: ADMIN.user, clave: ADMIN.pass, codigo: totpCode() });
  assert.equal(r.status, 503);
  assert.equal(r.text, '{"ok":false,"motivo":"no_disponible"}');
  assert.equal(r.cookie, null);
  assert.equal((await get(prod, '/panel')).status, 404);
  assert.equal((await get(prod, '/ingresar')).status, 200, 'la página de ingreso igual existe (sin datos)');
});

test('API-14 · Salir borra la cookie (solo desde el mismo sitio); /ingresar lleva noindex, sin caché y CSP con nonce, y con sesión manda al panel', async () => {
  const cookie = await sesion();
  const cross = await fetch(`${adm.base}/api/salir`, { method: 'POST', headers: { cookie, 'sec-fetch-site': 'cross-site' } });
  assert.equal(cross.status, 403);
  assert.equal(cross.headers.get('set-cookie'), null);
  const out = await fetch(`${adm.base}/api/salir`, { method: 'POST', headers: { cookie } });
  assert.equal(out.status, 200);
  assert.match(out.headers.get('set-cookie') ?? '', /^atc_s=;.*Max-Age=0/);
  const page = await get(adm, '/ingresar');
  const html = await page.text();
  assert.equal(page.status, 200);
  assert.match(page.headers.get('x-robots-tag') ?? '', /noindex/);
  assert.match(page.headers.get('cache-control') ?? '', /no-store/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow/);
  const nonce = (page.headers.get('content-security-policy') ?? '').match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce && [...html.matchAll(/<script\b[^>]*>/g)].every(m => m[0].includes(`nonce="${nonce}"`)));
  assert.doesNotMatch(html, PANEL_TEXT);
  const logged = await get(adm, '/ingresar', cookie);
  assert.ok([303, 307, 308].includes(logged.status) && /\/panel$/.test(logged.headers.get('location') ?? ''), `con sesión /ingresar respondió ${logged.status}`);
});
