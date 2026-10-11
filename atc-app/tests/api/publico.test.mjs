// Pruebas de lo público para buscadores y de las páginas legales (robots, sitemap, metadatos y JSON-LD).
// Cada prueba empieza con un ID (API-n) que se cita en docs/atc/seguridad.md; `npm run check:docs` lo controla.
// Corren contra `next start`. Correr con: npm run test:api
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../helpers/server.mjs';

let cerrado, abierto;
before(async () => {
  [cerrado, abierto] = await Promise.all([
    // Con datos de ejemplo (sin ATC_INDEXAR): no se indexa nada.
    startServer({ port: 3137, env: { ATC_LOCAL: '1' } }),
    // Con los datos reales: se indexa lo público, con la dirección pública del sitio.
    startServer({ port: 3138, env: { ATC_LOCAL: '1', ATC_INDEXAR: '1', ATC_SITE_URL: 'https://www.ejemplo-atc.com.ar' } }),
  ]);
});
after(async () => { await Promise.all([cerrado?.stop(), abierto?.stop()]); });
const get = async (srv, path) => { const r = await fetch(srv.base + path, { redirect: 'manual' }); return { status: r.status, headers: r.headers, text: await r.text() }; };

test('API-28 · robots.txt y sitemap.xml: sin ATC_INDEXAR no se indexa nada; con él, solo las páginas públicas. Ninguno nombra el panel ni el ingreso', async () => {
  const r0 = await get(cerrado, '/robots.txt');
  assert.equal(r0.status, 200);
  assert.match(r0.text, /Disallow: \/\s*$/m);
  assert.doesNotMatch(r0.text, /Sitemap|panel|ingresar/i);
  const r1 = await get(abierto, '/robots.txt');
  assert.match(r1.text, /Allow: \//);
  assert.match(r1.text, /Sitemap: https:\/\/www\.ejemplo-atc\.com\.ar\/sitemap\.xml/);
  assert.doesNotMatch(r1.text, /Disallow|panel|ingresar/i);
  const s = await get(abierto, '/sitemap.xml');
  assert.equal(s.status, 200);
  const urls = [...s.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.deepEqual(urls, ['', '/privacidad', '/cookies', '/terminos', '/arrepentimiento'].map(p => `https://www.ejemplo-atc.com.ar${p}`));
  assert.doesNotMatch(s.text, /panel|ingresar/i);
});

test('API-29 · Las páginas públicas tienen título, descripción, canónica y Open Graph; la home lleva JSON-LD válido (sin reseñas inventadas) con el nonce de la CSP', async () => {
  for (const [path, titulo] of [['/', /AT Computación/], ['/privacidad', /^Privacidad · AT Computación$/], ['/cookies', /^Cookies · AT Computación$/], ['/terminos', /^Términos y condiciones · AT Computación$/], ['/arrepentimiento', /^Botón de arrepentimiento · AT Computación$/]]) {
    const r = await get(abierto, path);
    assert.equal(r.status, 200, path);
    const t = r.text.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
    assert.match(t.replace(/&amp;/g, '&'), titulo, path);
    assert.match(r.text, /<meta name="description" content="[^"]{40,}"/, `${path}: descripción`);
    assert.match(r.text, new RegExp(`<link rel="canonical" href="https://www\\.ejemplo-atc\\.com\\.ar${path === '/' ? '/?' : path}"`), `${path}: canónica`);
    assert.match(r.text, /<meta property="og:title"/, `${path}: Open Graph`);
    assert.doesNotMatch(r.text, /noindex/, `${path}: con ATC_INDEXAR=1 se indexa`);
  }
  const home = await get(abierto, '/');
  const nonce = home.headers.get('content-security-policy').match(/'nonce-([^']+)'/)[1];
  const m = home.text.match(/<script type="application\/ld\+json" nonce="([^"]*)">([^<]*)<\/script>/);
  assert.ok(m, 'hay JSON-LD');
  assert.equal(m[1], nonce, 'lleva el nonce del pedido');
  const ld = JSON.parse(m[2]);
  assert.equal(ld['@type'], 'ComputerStore');
  assert.equal(ld.address.addressCountry, 'AR');
  assert.ok(ld.openingHoursSpecification.length > 0);
  assert.equal(ld.aggregateRating, undefined, 'sin calificaciones inventadas');
  assert.equal(ld.review, undefined, 'sin reseñas inventadas');
  // Sin ATC_INDEXAR, todas las páginas siguen con noindex
  assert.match((await get(cerrado, '/terminos')).text, /<meta name="robots" content="noindex, nofollow"/);
});
