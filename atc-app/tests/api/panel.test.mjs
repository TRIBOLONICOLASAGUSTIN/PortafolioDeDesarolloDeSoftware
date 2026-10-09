// Panel del dueño, etapa 1 (maqueta con datos de ejemplo): solo existe con ATC_DEMO=1 y nunca se indexa.
// Cada prueba empieza con un ID (API-n) que se cita en docs/atc/seguridad.md; `npm run check:docs` lo controla.
// Corren contra `next start` (app compilada). Correr con: npm run test:api
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../helpers/server.mjs';

let demo, prod;
before(async () => {
  [demo, prod] = await Promise.all([
    // Maqueta habilitada; ATC_INDEXAR=1 para comprobar que el panel igual no se indexa.
    startServer({ port: 3122, env: { ATC_DEMO: '1', ATC_INDEXAR: '1' } }),
    // "Producción" (sin ATC_DEMO): el panel no tiene que existir.
    startServer({ port: 3123, env: {} }),
  ]);
});
after(async () => { await Promise.all([demo?.stop(), prod?.stop()]); });

const PATHS = ['/panel', '/panel/movimientos', '/panel/movimientos?tipo=gastos'];

test('API-8 · Sin ATC_DEMO (producción) el panel no existe: /panel y /panel/movimientos dan 404 sin datos de ejemplo', async () => {
  for (const p of PATHS) {
    const r = await fetch(prod.base + p);
    const html = await r.text();
    assert.equal(r.status, 404, `${p} respondió ${r.status}`);
    assert.doesNotMatch(html, /Datos de ejemplo|Maqueta|Ganancia|Registrar venta/, `${p} muestra contenido del panel`);
    assert.match(html, /<meta name="robots" content="noindex/, `${p} sin noindex`);
    assert.match(html, /No encontramos esta página/, `${p} sin la página 404 en castellano`);
  }
});

test('API-9 · Con ATC_DEMO=1 el panel es una maqueta: noindex (meta y X-Robots-Tag) aunque ATC_INDEXAR=1, sin caché, CSP con nonce y sin enlaces desde la tienda', async () => {
  for (const p of PATHS) {
    const r = await fetch(demo.base + p);
    const html = await r.text();
    assert.equal(r.status, 200, `${p} respondió ${r.status}`);
    assert.match(r.headers.get('x-robots-tag') ?? '', /noindex/, `${p} sin X-Robots-Tag`);
    assert.match(r.headers.get('cache-control') ?? '', /no-store/, `${p} se puede guardar en caché`);
    assert.match(html, /<meta name="robots" content="noindex, nofollow/, `${p} sin meta noindex`);
    assert.match(html, /Maqueta con datos de ejemplo/, `${p} sin el aviso de datos de ejemplo`);
    const nonce = (r.headers.get('content-security-policy') ?? '').match(/'nonce-([^']+)'/)?.[1];
    assert.ok(nonce, `${p} sin CSP con nonce`);
    const tags = [...html.matchAll(/<script\b[^>]*>/g)].map(m => m[0]);
    assert.ok(tags.length > 0 && tags.every(t => t.includes(`nonce="${nonce}"`)), `${p} tiene scripts sin el nonce`);
  }
  // Un ?tipo desconocido no se refleja: cae en "todos".
  const bad = await (await fetch(demo.base + '/panel/movimientos?tipo=%3Cscript%3E')).text();
  assert.match(bad, /data-tipo="todos"/);
  assert.doesNotMatch(bad, /<script>/);
  // La tienda no enlaza al panel.
  const home = await (await fetch(demo.base + '/')).text();
  assert.doesNotMatch(home, /href="\/panel/);
});
