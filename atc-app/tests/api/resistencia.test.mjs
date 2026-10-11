// Pruebas de resistencia a avalanchas y de configuración peligrosa (L11): cuerpos lentos o enormes, ATC_LOCAL en un
// hosting, verificador de Turnstile falso fuera de esta compu, los límites de la bolsa por /48 y para todo el sitio, y
// muchos ingresos a la vez (scrypt con tope).
// Cada prueba empieza con un ID (API-n) que se cita en docs/atc/seguridad.md; `npm run check:docs` lo controla.
// Corren contra `next start` y la base local de pruebas. Correr con: npm run test:api
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { startServer, LOCAL_ENV } from '../helpers/server.mjs';
import { adminEnv, ADMIN, login, totpCode } from '../helpers/admin.mjs';

let local, hosting, tsMal, tsBien, limites, ingreso, fakeTs;
const TS_PORT = 3145;
before(async () => {
  // Verificador de Turnstile falso (escucha en todo 127.0.0.0/8): "no-resuelto" falla; "ok-<acción>" dice de qué
  // formulario es el token, y cualquier otro, del seguimiento
  fakeTs = createServer((req, res) => {
    let b = ''; req.on('data', c => { b += c; }); req.on('end', () => {
      const tok = new URLSearchParams(b).get('response') ?? '';
      res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ success: tok !== 'no-resuelto', action: tok.startsWith('ok-') ? tok.slice(3) : 'seguimiento', hostname: '127.0.0.1' }));
    });
  }).listen(TS_PORT, '0.0.0.0');
  [local, hosting, tsMal, tsBien, limites, ingreso] = await Promise.all([
    startServer({ port: 3140, env: { ...LOCAL_ENV } }),
    // ATC_LOCAL=1 copiado por error a una plataforma de hosting (VERCEL=1): tiene que regir producción
    startServer({ port: 3141, env: { ...LOCAL_ENV, ...adminEnv(), VERCEL: '1' } }),
    // Verificador falso en otra dirección que no es esta compu (127.0.0.2): se ignora y se usa el de Cloudflare
    startServer({ port: 3142, env: { ...LOCAL_ENV, TURNSTILE_SECRET_KEY: 'prueba', ATC_TURNSTILE_URL: `http://127.0.0.2:${TS_PORT}/` } }),
    startServer({ port: 3143, env: { ...LOCAL_ENV, TURNSTILE_SECRET_KEY: 'prueba', ATC_TURNSTILE_URL: `http://127.0.0.1:${TS_PORT}/` } }),
    // Límites de la bolsa chicos para probarlos sin crear pedidos de verdad, con Turnstile exigido
    startServer({ port: 3144, env: { ...LOCAL_ENV, ATC_RL_PED48: '2', ATC_RL_PEDG: '4', TURNSTILE_SECRET_KEY: 'prueba', ATC_TURNSTILE_URL: `http://127.0.0.1:${TS_PORT}/` } }),
    // Superadmin con el hash de producción (128 MiB y unos cientos de ms por cálculo), en modo local
    startServer({ port: 3146, env: { ...adminEnv(17), ATC_LOCAL: '1', ATC_IP_HEADER: 'cf-connecting-ip' } }),
  ]);
});
after(async () => { await Promise.all([local, hosting, tsMal, tsBien, limites, ingreso].map(s => s?.stop())); fakeTs?.close(); });

let ipSeq = 10;
const nextIp = () => `192.0.2.${ipSeq++}`;
const seguimiento = (srv, body, ip = nextIp()) => fetch(`${srv.base}/api/seguimiento`, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify(body) });

test('API-30 · Un cuerpo que llega gota a gota se corta a los 5 s, y un POST enorme a una página no se copia entero en memoria (tope de 1 KB)', async () => {
  // Cuerpo lento: manda el principio y nunca termina
  let cerrar;
  const lento = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"codigo":"AT-')); cerrar = () => { try { c.close(); } catch {} }; } });
  const t0 = Date.now();
  const r = await fetch(`${local.base}/api/seguimiento`, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': nextIp() }, body: lento, duplex: 'half', signal: AbortSignal.timeout(12000) });
  const ms = Date.now() - t0;
  cerrar();
  assert.equal(r.status, 400);
  assert.ok(ms >= 4000 && ms < 9000, `cortó a los ${ms} ms`);
  // POST de 2 MB a la página: responde y el servidor sigue atendiendo; Next avisa que solo leyó el primer KB
  const grande = await fetch(`${local.base}/`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x'.repeat(2 * 1024 * 1024) });
  await grande.arrayBuffer();
  assert.equal((await fetch(`${local.base}/`)).status, 200);
  assert.match(local.log(), /exceeded 1\s?KB/i, 'el tope de cuerpo de proxy.ts no está en 1 KB');
});

test('API-31 · Ningún modo ni variable abre el sitio de más: ATC_LOCAL en un hosting se ignora (rige producción) y el verificador de Turnstile falso solo vale en esta compu', async () => {
  // Con VERCEL=1, ATC_LOCAL=1 no vale: sin la configuración de producción, el seguimiento y el ingreso fallan cerrado
  assert.equal((await seguimiento(hosting, { codigo: 'AT-3FJ8-WX', telefono3: '548' })).status, 503);
  const ing = await fetch(`${hosting.base}/api/ingresar`, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': nextIp(), host: '127.0.0.1:3141' }, body: JSON.stringify({ usuario: ADMIN.user, clave: ADMIN.pass, codigo: '000000' }) });
  assert.equal(ing.status, 503);
  assert.match((await fetch(`${hosting.base}/`)).headers.get('content-security-policy') ?? '', /upgrade-insecure-requests/, 'en un hosting la CSP pide https');
  assert.equal((await fetch(`${hosting.base}/panel`)).status, 404);
  // Verificador falso: en 127.0.0.1 se usa; en cualquier otra dirección se ignora (la clave secreta no sale de esta compu)
  assert.equal((await seguimiento(tsBien, { codigo: 'AT-0000-00', telefono3: '123', turnstileToken: 'cualquiera' })).status, 200);
  assert.equal((await seguimiento(tsMal, { codigo: 'AT-0000-00', telefono3: '123', turnstileToken: 'cualquiera' })).status, 403);
});

test('API-32 · La bolsa también limita por /48 en IPv6 y tiene un techo para todo el sitio que solo gasta quien pasó Turnstile (al pasarlo, 429 y la bolsa sigue por WhatsApp)', async () => {
  // Un producto que no existe pasa los límites y la base lo rechaza (409) sin crear nada
  const pedir = (ip, turnstileToken = 'ok-pedido') => fetch(`${limites.base}/api/pedidos`, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify({ items: [{ slug: 'zz-no-existe', qty: 1 }], entrega: 'retiro', pago: 'efectivo', turnstileToken }) }).then(r => r.status);
  // Sin resolver Turnstile (o con un token de otro formulario) no se gasta el techo del sitio
  const sinTs = [];
  for (let i = 0; i < 6; i++) sinTs.push(await pedir(`198.51.100.${210 + i}`, i % 2 ? 'ok-seguimiento' : 'no-resuelto'));
  assert.deepEqual(sinTs, [403, 403, 403, 403, 403, 403]);
  const st = [];
  for (const ip of ['2001:db8:aa:1::1', '2001:db8:aa:2::1', '2001:db8:aa:3::1', '2001:db8:bb:1::1', '198.51.100.200', '198.51.100.201']) st.push(await pedir(ip));
  // /48 2001:db8:aa: 2 pasan y el tercero (otra /64 del mismo /48) no; el techo del sitio (4) corta al sexto aunque sea otra red
  assert.deepEqual(st, [409, 409, 429, 409, 409, 429]);
  // Más de 3 unidades de un producto o más de 10 en total: inválido antes de tocar la base
  const malo = await fetch(`${local.base}/api/pedidos`, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': nextIp() }, body: JSON.stringify({ items: [{ slug: 'ins-105a', qty: 4 }], entrega: 'retiro', pago: 'efectivo' }) });
  assert.equal(malo.status, 400);
});

test('API-33 · Muchos ingresos a la vez no tiran el servidor: el scrypt corre de a 2 con 8 en espera (un doble clic no da error) y el resto recibe 503 sin calcular', async () => {
  // 16 intentos simultáneos, cada uno desde otra red (no los frena el límite por red)
  const body = { usuario: ADMIN.user, clave: 'clave-equivocada-123', codigo: '000000' };
  const rs = await Promise.all(Array.from({ length: 16 }, (_, i) => login(ingreso.base, body, { 'cf-connecting-ip': `2001:db8:c${i.toString(16)}::1` })));
  const st = rs.map(r => r.status), n = s => st.filter(x => x === s).length;
  assert.equal(n(401) + n(503), 16, st.join());
  assert.ok(n(401) >= 10, `2 calculando y 8 en espera tienen que recibir respuesta: ${st.join()}`);
  assert.ok(n(503) >= 1, `sin tope, 16 scrypt a la vez ocupan 2 GiB: ${st.join()}`);
  for (const r of rs.filter(r => r.status === 503)) assert.equal(r.text, '{"ok":false,"motivo":"no_disponible"}');
  // Pasada la avalancha, el dueño entra
  const ok = await login(ingreso.base, { usuario: ADMIN.user, clave: ADMIN.pass, codigo: totpCode() }, { 'cf-connecting-ip': '192.0.2.250' });
  assert.equal(ok.status, 200, ok.text);
});
