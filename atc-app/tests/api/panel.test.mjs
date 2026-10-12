// Panel del dueño: solo existe para el superadmin con sesión (contraseña + código del celular). Para cualquier otro, 404.
// Cada prueba empieza con un ID (API-n) que se cita en docs/atc/seguridad.md; `npm run check:docs` lo controla.
// Corren contra `next start` (app compilada). Correr con: npm run test:api
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { startServer, LOCAL_ENV } from '../helpers/server.mjs';
import { ADMIN, adminEnv, forgeSession, login, stableNow, totpCode } from '../helpers/admin.mjs';
import { crudo, enOrden } from '../helpers/http.mjs';
import { readFileSync } from 'node:fs';

const ENV = adminEnv();
let adm, prod, ts, fakeTs;
// Verificador de Turnstile falso (solo pruebas, ATC_LOCAL=1): el token dice qué contestar.
const TS_PORT = 3129;
const TOKENS = {
  'ok-ingresar': { success: true, action: 'ingresar', hostname: '127.0.0.1' },
  'ok-seguimiento': { success: true, action: 'seguimiento', hostname: '127.0.0.1' },
  'otro-sitio': { success: true, action: 'ingresar', hostname: 'otro-sitio.example' },
  'fallido': { success: false },
};
before(async () => {
  fakeTs = createServer((req, res) => {
    let b = ''; req.on('data', c => { b += c; }); req.on('end', () => {
      const tok = new URLSearchParams(b).get('response') ?? '';
      res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(TOKENS[tok] ?? { success: false }));
    });
  }).listen(TS_PORT, '127.0.0.1');
  [adm, prod, ts] = await Promise.all([
    // Superadmin configurado (modo local: límite en memoria, sin Turnstile); ATC_INDEXAR=1 para comprobar que el panel igual no se indexa.
    startServer({ port: 3122, env: { ...ENV, ATC_LOCAL: '1', ATC_IP_HEADER: 'cf-connecting-ip', ATC_INDEXAR: '1' } }),
    // "Producción" sin configuración: no hay ingreso posible y el panel no existe.
    startServer({ port: 3123, env: {} }),
    // Con Turnstile exigido (verificador falso) y la base local para el seguimiento.
    startServer({ port: 3124, env: { ...adminEnv(), ...LOCAL_ENV, TURNSTILE_SECRET_KEY: 'prueba', ATC_TURNSTILE_URL: `http://127.0.0.1:${TS_PORT}/` } }),
  ]);
});
after(async () => { await Promise.all([adm?.stop(), prod?.stop(), ts?.stop()]); fakeTs?.close(); });

const PATHS = ['/panel', '/panel/movimientos', '/panel/movimientos?tipo=gastos', '/panel/inventario', '/panel/inventario?filtro=bajo', '/panel/inventario/ins-105a', '/panel/inventario/pc-office',
  '/panel/productos', '/panel/productos?estado=pausados&cat=insumos&marca=HP', '/panel/productos/ins-105a', '/panel/proveedores', '/panel/precios', '/panel/categorias', '/panel/marcas', '/panel/pedidos', '/panel/pedidos?estado=retrasado'];
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

test('API-9 · Con sesión: el panel (resumen, movimientos, catálogo, inventario y fichas) responde 200, noindex (meta y X-Robots-Tag) aunque ATC_INDEXAR=1, sin caché y con CSP con nonce; filtros e ids desconocidos no pasan; sin sesión la tienda no enlaza al panel ni al ingreso, y con la del dueño solo muestra su botón al panel', async () => {
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
  assert.match(await (await get(adm, '/panel/inventario?filtro=%3Cscript%3E', cookie)).text(), /data-filtro="todos"/);
  // Solo artículos conocidos (o los cargados en la visita, nuevo-N): cualquier otro id da 404
  for (const p of ['/panel/inventario/no-existe', '/panel/inventario/%3Cscript%3E', '/panel/inventario/nuevo-x']) assert.equal((await get(adm, p, cookie)).status, 404, `${p} no dio 404`);
  // Catálogo: filtros desconocidos se ignoran; en Productos solo hay productos (las piezas viven en Inventario)
  assert.match(await (await get(adm, '/panel/productos?estado=%3Cscript%3E&cat=x&marca=%3Cb%3E', cookie)).text(), /data-estado="todos" data-cat="" data-marca=""/);
  assert.match(await (await get(adm, '/panel/productos?estado=pausados&cat=insumos&marca=HP', cookie)).text(), /data-estado="pausados" data-cat="insumos" data-marca="HP"/);
  assert.match(await (await get(adm, '/panel/pedidos?estado=%3Cscript%3E', cookie)).text(), /data-estado="pendiente"/);
  for (const p of ['/panel/productos/pz-cpu-8600g', '/panel/productos/no-existe', '/panel/productos/%3Cscript%3E']) assert.equal((await get(adm, p, cookie)).status, 404, `${p} no dio 404`);
  const home = await (await get(adm, '/')).text();
  assert.doesNotMatch(home, /href="\/(panel|ingresar)/);
  // Una cookie inventada (F12) no hace aparecer el botón: lo decide el servidor verificando la firma
  assert.doesNotMatch(await (await get(adm, '/', 'atc_s=admin; role=admin')).text(), /own-sw|href="\/(panel|ingresar)/);
  // Con la sesión del dueño, el servidor dibuja el botón al panel (abajo a la izquierda) y nunca enlaza al ingreso
  const dueno = await (await get(adm, '/', cookie)).text();
  assert.match(dueno, /<a\b[^>]*\bclass="own-sw"[^>]*\bhref="\/panel"/);
  assert.doesNotMatch(dueno, /href="\/ingresar/);
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

// Un 404 del panel tiene que ser igual al de cualquier dirección inventada: se comparan encabezados y página
// (sin el nonce ni los identificadores al azar de cada pedido, y con la ruta reemplazada).
const SIN_VARIAR = ['date', 'content-security-policy', 'content-length', 'etag', 'connection', 'keep-alive', 'transfer-encoding'];
// En un pedido armado a mano como navegación interna del router (encabezado rsc), Next agrega x-nextjs-rewritten-path:
// aceptado y documentado (seguridad.md §10; el código del sitio es público de todos modos).
const encabezados = (r, rsc) => Object.fromEntries([...r.headers].filter(([k]) => !SIN_VARIAR.includes(k) && !(rsc && k === 'x-nextjs-rewritten-path')));
const pagina = (html, ruta) => ruta.slice(1).split('/').reduce((h, seg, i) => h.replaceAll(`"${seg}"`, `"T${i}"`).replaceAll(`\\"${seg}\\"`, `\\"T${i}\\"`),
  html.replace(/\\?"[A-Za-z0-9_-]{20,24}\\?"/g, 'ID').replace(/nonce="[^"]*"/g, 'nonce=""').replace(/"nonce":"[^"]*"/g, '"nonce":""').replace(/nonce\\":\\"[^\\]*\\"/g, 'nonce\\":\\"\\"').replaceAll(ruta.slice(1), 'RUTA'));

test('API-15 · Manipular el navegador (F12) no da acceso: cookies, encabezados y parámetros inventados dan el mismo 404 que una dirección cualquiera', async () => {
  const intentos = [
    ['/panel', {}],
    ['/panel', { cookie: 'role=admin; admin=true; user=admin; isAdmin=1' }],
    ['/panel', { cookie: 'atc_s=admin' }],
    ['/panel', { cookie: `__Host-atc_s=v1.9999999999.AAAAAAAAAAAAAAAA.${'A'.repeat(43)}` }],
    ['/panel', { 'x-user': 'admin', 'x-role': 'admin', 'x-admin': '1', 'x-forwarded-user': 'admin', authorization: 'Bearer admin' }],
    ['/panel', { 'x-middleware-subrequest': 'proxy:proxy:proxy:proxy:proxy' }],
    ['/panel', { 'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware' }],
    ['/panel?admin=1&role=admin', {}],
    ['/panel/inventario/ins-105a', { cookie: 'role=admin' }],
  ];
  for (const [p, headers] of intentos) {
    const r = await fetch(adm.base + p, { headers, redirect: 'manual' });
    const html = await r.text();
    assert.equal(r.status, 404, `${p} ${JSON.stringify(headers)} respondió ${r.status}`);
    assert.doesNotMatch(html, PANEL_TEXT, `${p} muestra contenido del panel`);
  }
  // Sin cookie de sesión, o con una que no tiene la forma de una sesión (inventada): idéntico a cualquier 404 (encabezados
  // y página), también en una navegación del router (rsc).
  for (const [p, q, extra] of [['/panel', '/zzzzz', {}], ['/panel/inventario/ins-105a', '/zzzzz/aaaaaaaaa/bbbbbbbb', {}], ['/panel', '/zzzzz', { rsc: '1' }],
    ['/panel', '/zzzzz', { cookie: 'atc_s=admin' }], ['/panel/pedidos', '/zzzzz/aaaaaaa', { cookie: 'atc_s=v1.123.abc.def; __Host-atc_s=admin' }]]) {
    const [a, b] = await Promise.all([fetch(adm.base + p, { headers: extra }), fetch(adm.base + q, { headers: extra })]);
    assert.deepEqual(encabezados(a, !!extra.rsc), encabezados(b, !!extra.rsc), `encabezados distintos entre ${p} y ${q}`);
    assert.equal(pagina(await a.text(), p), pagina(await b.text(), q), `la página de ${p} se distingue de la de ${q}`);
  }
  // Por caminos que se saltean la reescritura: la dirección en %XX (/%70anel), el encabezado x-middleware-prefetch y
  // /_next/data (Next nombraba la ruta encontrada) con una cookie que tiene la forma de una sesión. Mismo estado, mismos
  // encabezados en el mismo orden y la misma página (salvo el eco de la dirección)
  const BID = readFileSync(new URL('../../.next/BUILD_ID', import.meta.url), 'utf8').trim();
  const forma = { cookie: `atc_s=v1.1999999999.AAAAAAAAAAAAAAAA.${'A'.repeat(43)}` };
  for (const [p, q, o, rp, rq] of [['/%70anel', '/%7Azzzz', {}], ['/%70anel/pedidos', '/%7Azzzz/aaaaaaa', { headers: forma }], ['/%69ngresar', '/%69zzzzzzz', {}],
    ['/panel', '/zzzzz', { headers: { 'x-middleware-prefetch': '1', ...forma } }], ['/panel/pedidos', '/zzzzz/aaaaaaa', { headers: { 'x-middleware-prefetch': '1' } }],
    [`/_next/data/${BID}/panel.json`, `/_next/data/${BID}/zzzzz.json`, { headers: forma }, '/panel', '/zzzzz']]) {
    const [a, b] = await Promise.all([crudo(adm.base, p, o), crudo(adm.base, q, o)]);
    assert.equal(a.status, b.status, `${p}: estado`);
    assert.deepEqual(enOrden(a.crudos), enOrden(b.crudos), `${p}: encabezados o su orden`);
    assert.ok(!enOrden(a.crudos).some(l => /matched-path: \/panel/.test(l)), `${p}: nombra el panel`);
    const eco = (h, r) => h.replaceAll(encodeURIComponent(r.slice(1)), r.slice(1)); // ?path=… repite la dirección pedida
    assert.equal(pagina(eco(a.body, rp ?? p), rp ?? p), pagina(eco(b.body, rq ?? q), rq ?? q), `${p}: la página se distingue`);
  }
});

test('API-16 · Cada intento de ingreso queda registrado sin datos personales (ni usuario, ni clave, ni IP)', async () => {
  const ip = '198.51.100.201', clave = 'clave-equivocada-registro';
  const r = await login(adm.base, { usuario: ADMIN.user, clave, codigo: '000000' }, { 'cf-connecting-ip': ip });
  assert.equal(r.status, 401);
  await new Promise(res => setTimeout(res, 200));
  const lineas = adm.log().split('\n').filter(l => l.includes('"evento":"ingreso"'));
  const ultima = lineas.at(-1) ?? '';
  assert.match(ultima, /"resultado":"credenciales"/);
  assert.match(ultima, /"red":"[0-9a-f]{16}"/);
  for (const dato of [ip, clave, ADMIN.user, '000000']) assert.ok(!ultima.includes(dato), `el registro incluye ${dato}`);
});

test('API-17 · Turnstile: un token de otro formulario o resuelto en otro sitio no sirve (ingreso y seguimiento)', async () => {
  const body = t => ({ usuario: ADMIN.user, clave: 'clave-equivocada-123', codigo: '000000', turnstileToken: t });
  const h = () => ({ 'cf-connecting-ip': `198.51.100.${ipSeq++}` });
  assert.equal((await login(ts.base, body('ok-seguimiento'), h())).status, 403, 'el token del seguimiento entró al ingreso');
  assert.equal((await login(ts.base, body('otro-sitio'), h())).status, 403, 'un token de otro sitio entró al ingreso');
  assert.equal((await login(ts.base, body('fallido'), h())).status, 403);
  assert.equal((await login(ts.base, body('ok-ingresar'), h())).status, 401, 'con el token correcto se llega a las credenciales');
  const seg = t => fetch(`${ts.base}/api/seguimiento`, { method: 'POST', headers: { 'content-type': 'application/json', ...h() }, body: JSON.stringify({ codigo: 'AT-0000-00', telefono3: '123', turnstileToken: t }) });
  assert.equal((await seg('ok-ingresar')).status, 403, 'el token del ingreso sirvió en el seguimiento');
  assert.equal((await seg('ok-seguimiento')).status, 200);
});

test('API-18 · El límite de ingresos cuenta la red IPv6 entera (/64): cambiar los últimos bits no lo esquiva', async () => {
  const body = { usuario: ADMIN.user, clave: 'clave-equivocada-123', codigo: '000000' };
  const st = [];
  for (let i = 1; i <= 6; i++) st.push((await login(adm.base, body, { 'cf-connecting-ip': `2001:db8:77:1::${i.toString(16)}` })).status);
  assert.deepEqual(st, [401, 401, 401, 401, 401, 429]);
  assert.equal((await login(adm.base, body, { 'cf-connecting-ip': '2001:db8:77:1:ffff:eeee:dddd:cccc' })).status, 429);
  assert.equal((await login(adm.base, body, { 'cf-connecting-ip': '2001:db8:77:2::1' })).status, 401, 'otra red /64 no debería estar limitada');
});

// Un código de 6 dígitos que seguro no sirve ahora (ni el paso anterior, ni el actual, ni el siguiente).
const codigoMalo = now => { const ok = new Set([-1, 0, 1].map(o => totpCode(o, now))); for (let i = 0; ; i++) { const c = String(123456 + i * 7919).slice(-6); if (!ok.has(c)) return c; } };

test('API-19 · Con la contraseña correcta, 10 códigos del celular fallidos (cada uno desde otra red) bloquean el ingreso 24 h; las contraseñas incorrectas no bloquean al dueño', async () => {
  // Servidor propio: el bloqueo no afecta a las otras pruebas.
  const srv = await startServer({ port: 3125, env: { ...adminEnv(), ATC_LOCAL: '1', ATC_IP_HEADER: 'cf-connecting-ip' } });
  try {
    let now = await stableNow();
    // 15 contraseñas incorrectas (desde redes distintas) no cuentan: alguien sin la contraseña no puede bloquear al dueño
    for (let i = 0; i < 15; i++) assert.equal((await login(srv.base, { usuario: ADMIN.user, clave: `mala-${i}`, codigo: codigoMalo(now) }, nextIp())).status, 401);
    // 10 códigos fallidos con la contraseña correcta, cada uno desde otra red (el límite por IP no los frena)
    for (let i = 0; i < 10; i++) assert.equal((await login(srv.base, { usuario: ADMIN.user, clave: ADMIN.pass, codigo: codigoMalo(now) }, nextIp())).status, 401);
    now = await stableNow();
    const r = await login(srv.base, { usuario: ADMIN.user, clave: ADMIN.pass, codigo: totpCode(0, now) }, nextIp());
    assert.equal(r.status, 401, 'con el bloqueo, ni el código correcto entra');
    assert.deepEqual(r.json, { ok: false, motivo: 'credenciales' }, 'la respuesta no delata que la contraseña es correcta');
    assert.equal(r.cookie, null);
    await new Promise(res => setTimeout(res, 200));
    assert.match(srv.log(), /"resultado":"bloqueo_2fa"/);
    assert.match(srv.log(), /admin:setup/);
  } finally { await srv.stop(); }
});

// Pedido con otro Host (como si el dueño entrara desde la red Wi-Fi: http://192.168.x.x:3000)
const conHost = (base, path, host, body) => new Promise((res, rej) => {
  const u = new URL(base + path);
  const req = request({ host: u.hostname, port: u.port, path, method: 'POST', headers: { host, 'content-type': 'application/json', 'cf-connecting-ip': nextIp()['cf-connecting-ip'] } }, r => {
    let t = ''; r.on('data', c => { t += c; }); r.on('end', () => res({ status: r.statusCode, json: JSON.parse(t || 'null'), cookie: r.headers['set-cookie'] ?? null }));
  });
  req.on('error', rej); req.end(JSON.stringify(body));
});

test('API-20 · La sesión vale solo en el entorno que la emitió (una de `npm run dev` no abre producción), y en modo local el ingreso solo se acepta desde esta compu', async () => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  // Mismas claves, firmada como la firmaría un servidor en modo producción: en el local no sirve (y al revés)
  assert.equal((await get(adm, '/panel', `atc_s=${forgeSession(ENV, exp, 'prod')}`)).status, 404);
  assert.equal((await get(adm, '/panel', `atc_s=${forgeSession(ENV, exp, 'local')}`)).status, 200);
  // Desde la red (Host que no es localhost): 403, sin cookie, aunque los datos sean correctos
  const lan = await conHost(adm.base, '/api/ingresar', '192.168.1.20:3122', { usuario: ADMIN.user, clave: ADMIN.pass, codigo: '000000' });
  assert.equal(lan.status, 403);
  assert.deepEqual(lan.json, { ok: false, motivo: 'solo_local' });
  assert.equal(lan.cookie, null);
});

test('API-21 · El formulario de ingreso nunca manda las credenciales en la URL: va por POST, el botón espera a que cargue la página y un envío sin JavaScript se rechaza', async () => {
  const html = await (await get(adm, '/ingresar')).text();
  const form = html.match(/<form\b[^>]*class="in-form"[^>]*>/)?.[0] ?? '';
  assert.match(form, /method="post"/);
  assert.match(form, /action="\/api\/ingresar"/);
  assert.match(html, /<button[^>]*type="submit"[^>]*disabled=""/, 'el botón tiene que llegar deshabilitado hasta hidratar');
  const r = await fetch(adm.base + '/api/ingresar', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', ...nextIp() }, body: `usuario=${ADMIN.user}&clave=${ADMIN.pass}&codigo=000000` });
  assert.equal(r.status, 400);
  assert.equal(r.headers.get('set-cookie'), null);
});
