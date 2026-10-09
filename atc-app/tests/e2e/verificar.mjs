// Verificación del sitio de AT Computación (Next.js): flujos, responsive, contraste AA, movimiento y accesibilidad.
// Corre contra la app de producción (`npm run build` antes) con la base local de pruebas.
// Uso:   npm run test:e2e [-- --capturas]
// Requiere Playwright (en la nube está global: PW="$(npm root -g)/playwright/index.mjs").
// Sale con código 1 si algún chequeo falla. Los errores de consola incluyen las violaciones de CSP.

import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { startServer, LOCAL_ENV } from '../helpers/server.mjs';

let pw;
try { pw = await import('playwright'); } catch { pw = await import(process.env.PW || 'playwright'); }
const { chromium } = pw;

const server = await startServer({ port: 3110, env: { ...LOCAL_ENV, ATC_DEMO: '1' } });
const HTML = server.base + '/';
const SHOTS = fileURLToPath(new URL('./capturas/', import.meta.url));
const WANT_SHOTS = process.argv.includes('--capturas');
if (WANT_SHOTS) mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (vp, name, ok, detail = '') => results.push({ vp, name, ok: !!ok, detail });
const nb = s => String(s ?? '').replace(/ /g, ' ').trim();

const VIEWPORTS = [
  { id: 'cel-320-claro', w: 320, h: 640, scheme: 'light' },
  { id: 'cel-375-oscuro', w: 375, h: 780, scheme: 'dark' },
  { id: 'tablet-820-oscuro', w: 820, h: 1100, scheme: 'dark' },
  { id: 'compu-1440-claro', w: 1440, h: 900, scheme: 'light' },
];

const browser = await chromium.launch();

for (const v of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, colorScheme: v.scheme, hasTouch: v.w < 900 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  try {
    await p.goto(HTML); await p.waitForTimeout(600);

    // Tema: arranca según el sistema, alterna y se guarda
    const t0 = await p.evaluate(() => document.documentElement.dataset.theme);
    check(v.id, 'tema inicial según el sistema', t0 === (v.scheme === 'dark' ? 'dark' : 'light'), t0);
    await p.click('#themeBtn'); await p.waitForTimeout(700);
    const t1 = await p.evaluate(() => [document.documentElement.dataset.theme, localStorage.getItem('atc-theme')]);
    check(v.id, 'botón de tema alterna y guarda', t1[0] !== t0 && t1[0] === t1[1], t1.join('/'));
    await p.click('#themeBtn'); await p.waitForTimeout(700);

    // Tienda: agregar, filtrar, ficha
    await p.locator('#tienda').scrollIntoViewIfNeeded();
    await p.locator('#shelf [data-add]').first().click(); await p.waitForTimeout(300);
    check(v.id, 'agregar a la bolsa desde la tienda', nb(await p.textContent('#badge')) === '1');
    await p.click('[data-cat="insumos"]'); await p.waitForTimeout(200);
    check(v.id, 'filtro de categoría (Insumos = 2)', (await p.$$eval('#shelf .pcard', e => e.length)) === 2);
    await p.click('[data-cat="todo"]'); await p.waitForTimeout(200);
    await p.click('[data-open="imp-l3250"]'); await p.waitForTimeout(500);
    check(v.id, 'ficha de producto abre', await p.evaluate(() => document.querySelector('#qv').classList.contains('open')));
    await p.click('[data-qq="1"]'); await p.click('[data-qv-add]'); await p.waitForTimeout(400);
    check(v.id, 'agregar 2 desde la ficha', nb(await p.textContent('#badge')) === '3');

    // Bolsa: entrega, pago, nombre → mensaje de WhatsApp
    await p.click('#bagBtn'); await p.waitForTimeout(600);
    await p.click('[data-ent="envio"]'); await p.fill('#bDir', 'Barrio Centro');
    await p.click('[data-pay="mp"]'); await p.fill('#bName', 'Nico');
    const msg = decodeURIComponent((await p.getAttribute('#checkout', 'href')).split('text=')[1] || '');
    check(v.id, 'mensaje de compra completo', /Envío a domicilio \(Barrio Centro\)/.test(msg) && /Pago: Mercado Pago/.test(msg) && /Nombre: Nico/.test(msg));
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);

    // Búsqueda (Ctrl+K)
    await p.keyboard.press('Control+k'); await p.keyboard.type('toner'); await p.waitForTimeout(200);
    const found = await p.$$eval('.si b', e => e.map(x => x.textContent));
    check(v.id, 'búsqueda filtra (toner)', found.length >= 1 && found.every(t => /t[oó]ner/i.test(t)), found.join(' | '));
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);

    // Seguimiento (segunda orden de la demo = esperando aprobación)
    await p.locator('#seguimiento').scrollIntoViewIfNeeded();
    await p.locator('[data-demo]').nth(1).click(); await p.waitForTimeout(1200);
    check(v.id, 'seguimiento muestra el estado', /Esperando aprobación/.test(await p.textContent('#tOut')));

    // Celular fijo de Servicio técnico sincronizado con el paso
    await p.locator('.stx[data-st="2"]').scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, innerHeight * .12)); await p.waitForTimeout(800);
    const st = await p.evaluate(() => [document.querySelector('.stx.on')?.dataset.st, document.querySelector('.ps.on')?.dataset.ps]);
    check(v.id, 'paso y pantalla del celular sincronizados', st[0] && st[0] === st[1], st.join('/'));

    // Cotizador: Impresora + Backup = $ 37.000 – $ 72.000
    await p.locator('#config').scrollIntoViewIfNeeded(); await p.waitForTimeout(700);
    await p.click('[data-svc="imp"]'); await p.click('[data-ex="bkp"]'); await p.waitForTimeout(900);
    const est = [nb(await p.textContent('#eMin')), nb(await p.textContent('#eMax'))];
    check(v.id, 'cotizador suma bien', est[0] === '$ 37.000' && est[1] === '$ 72.000', est.join(' – '));

    // Desborde lateral y errores
    const ow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(v.id, 'sin scroll horizontal', ow <= 0, `${ow}px`);
    check(v.id, 'sin errores de consola', errs.length === 0, errs.slice(0, 3).join(' | '));

    if (WANT_SHOTS) {
      await p.evaluate(() => scrollTo(0, 0));
      const secs = await p.evaluate(() => [...document.querySelectorAll('.hero, main > section, footer')].map(e => ({ id: e.id || e.className.split(' ')[0] || 'pie', y: e.getBoundingClientRect().top + scrollY, h: e.getBoundingClientRect().height })));
      for (const [i, s] of secs.entries()) await p.screenshot({ path: `${SHOTS}${v.id}--${String(i).padStart(2, '0')}-${s.id}.png`, fullPage: true, clip: { x: 0, y: s.y, width: v.w, height: Math.min(s.h, 2400) } });
    }
  } catch (e) {
    check(v.id, 'flujo completo sin excepciones', false, e.message.split('\n')[0]);
  }
  await ctx.close();
}

// La notebook del inicio entra en la primera pantalla: laptop con la barra del navegador y iPhone SE (V1)
for (const [w, h, min] of [[1440, 790, 230], [1280, 720, 160], [375, 667, 80]]) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.goto(HTML); await p.waitForTimeout(1200);
  const vis = await p.evaluate(() => innerHeight - document.querySelector('.laptop').getBoundingClientRect().top);
  check('inicio', `notebook visible en la primera pantalla a ${w}×${h}`, vis >= min, `${Math.round(vis)} px visibles`);
  await p.close();
}

// Lectores de pantalla y bordes: búsqueda anunciada, campos de la bolsa con nombre, bolsa vacía sin pie (A11, K12)
{
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(HTML); await p.waitForTimeout(400);
  await p.click('#bagBtn'); await p.waitForTimeout(500);
  check('accesibilidad', 'bolsa vacía sin línea ni pie sueltos', await p.evaluate(() => getComputedStyle(document.querySelector('#bagFoot')).display === 'none'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await p.keyboard.press('Control+k'); await p.keyboard.type('a'); await p.waitForTimeout(200);
  const a0 = await p.getAttribute('#sIn', 'aria-activedescendant');
  await p.keyboard.press('ArrowDown');
  const a1 = await p.getAttribute('#sIn', 'aria-activedescendant');
  check('accesibilidad', 'la búsqueda anuncia el resultado elegido', a0 && a1 && a0 !== a1 && !!(await p.$(`#${a1}[aria-selected="true"]`)), `${a0} → ${a1}`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await p.locator('#tienda').scrollIntoViewIfNeeded();
  await p.locator('#shelf [data-add]').first().click(); await p.waitForTimeout(300);
  await p.click('#bagBtn'); await p.waitForTimeout(500); await p.click('[data-ent="envio"]');
  const named = [await p.getByLabel('Tu nombre').count(), await p.getByLabel('Dirección de entrega').count()];
  check('accesibilidad', 'campos de la bolsa con nombre accesible', named[0] === 1 && named[1] === 1, named.join('/'));
  await p.close();
}

// Contraste AA de los tokens (claro y oscuro)
{
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(HTML);
  for (const theme of ['light', 'dark']) {
    const rows = await p.evaluate(theme => {
      document.documentElement.dataset.theme = theme;
      const cs = getComputedStyle(document.documentElement);
      const tok = n => cs.getPropertyValue(n).trim();
      const hex = c => { c = c.replace('#', ''); if (c.length === 3) c = [...c].map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); };
      const lum = rgb => { const [r, g, b] = rgb.map(x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
      const ratio = (a, b) => { const [x, y] = [lum(hex(a)), lum(hex(b))].sort((m, n) => n - m); return (x + .05) / (y + .05); };
      const pairs = [
        ['--text', '--bg'], ['--text', '--bg-alt'], ['--text-2', '--bg'], ['--text-2', '--bg-alt'], ['--text-2', '--tile'],
        ['--link', '--bg'], ['--link', '--bg-alt'], ['#ffffff', '--accent'], ['#ffffff', '--accent-h'], ['#ffffff', '--wa'],
      ];
      return pairs.map(([f, b]) => { const fc = f.startsWith('#') ? f : tok(f), bc = b.startsWith('#') ? b : tok(b); return { pair: `${f} sobre ${b}`, r: +ratio(fc, bc).toFixed(2) }; });
    }, theme);
    for (const r of rows) check(`contraste-${theme === 'light' ? 'claro' : 'oscuro'}`, r.pair, r.r >= 4.5, `${r.r}:1`);
  }
  await p.close();
}

// Movimiento: solo el carrusel de marcas puede ser infinito; con "reducir movimiento", nada corre en bucle
for (const reduced of [false, true]) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await p.goto(HTML); await p.waitForTimeout(400);
  await p.locator('.brands').scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
  const loops = await p.evaluate(() => document.getAnimations()
    .filter(a => a.effect?.getTiming().iterations === Infinity && a.playState === 'running')
    .map(a => ({ name: a.animationName || 'anim', allowed: !!a.effect.target?.closest?.('.mq-track') })));
  if (reduced) check('movimiento', 'con "reducir movimiento" no hay bucles', loops.length === 0, loops.map(l => l.name).join(', '));
  else check('movimiento', 'solo bucles aprobados (carrusel de marcas)', loops.every(l => l.allowed), loops.filter(l => !l.allowed).map(l => l.name).join(', '));
  await p.close();
}

// Ventanas cerradas (bolsa/ficha/búsqueda) no se pintan en tablet (bug de la bolsa asomada, 735–900 px)
for (const w of [768, 820, 900]) {
  const p = await browser.newPage({ viewport: { width: w, height: 1000 } });
  await p.goto(HTML); await p.waitForTimeout(500);
  const vis = await p.evaluate(() => ['.bag', '.qv', '.spot'].map(s => getComputedStyle(document.querySelector(s)).visibility));
  check('ventanas', `cerradas ocultas a ${w}px`, vis.every(v => v === 'hidden'), vis.join(','));
  await p.close();
}

// Encabezado de Contacto centrado + tipografía: nada de texto visible < 12px fuera del pie (maquetas aria-hidden excluidas)
{
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(HTML); await p.waitForTimeout(400);
  const centered = await p.evaluate(() => {
    const h = document.querySelector('#contacto .head');
    return !!h && getComputedStyle(h).textAlign === 'center';
  });
  check('centrado', 'encabezado de Contacto centrado', centered);
  const tiny = await p.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('main *, header *, .ribbon *')) {
      if (el.closest('[aria-hidden="true"]') || el.closest('footer')) continue;
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
      const fs = parseFloat(cs.fontSize); if (fs < 12) bad.push(`${(el.className && el.className.toString().split(' ')[0]) || el.tagName}:${fs}`);
    }
    return [...new Set(bad)].slice(0, 10);
  });
  check('tipografia', 'sin texto visible < 12px fuera del pie', tiny.length === 0, tiny.join(' | '));
  await p.close();
}

// La banda "Servicio técnico" queda oscura en ambos temas (decisión de diseño: banda oscura prolija)
for (const scheme of ['light', 'dark']) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
  await p.goto(HTML); await p.waitForTimeout(300);
  const bg = await p.evaluate(() => getComputedStyle(document.getElementById('servicio')).backgroundColor);
  check('banda', `#servicio oscura en ${scheme}`, bg === 'rgb(0, 0, 0)', bg);
  await p.close();
}

// Modo oscuro: la barra del navegador sigue al botón de la luna, el cambio se aplica sin transiciones a destiempo,
// los equipos negros se aclaran con luz de borde (solo en oscuro), el pin del mapa cumple AA y la banda marca su borde
{
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await p.goto(HTML); await p.waitForTimeout(500);
  const meta = () => p.evaluate(() => [...document.querySelectorAll('meta[name="theme-color"]')].map(m => m.content));
  const look = () => p.evaluate(() => ({
    k3: getComputedStyle(document.documentElement).getPropertyValue('--k3').trim(),
    filter: getComputedStyle(document.querySelector('.p-img svg.r')).filter,
    band: getComputedStyle(document.getElementById('servicio')).boxShadow,
  }));
  const m0 = await meta(), claro = await look();
  const during = await p.evaluate(() => new Promise(res => {
    const root = document.documentElement;
    const mo = new MutationObserver(() => { if (root.classList.contains('theme-sw')) { mo.disconnect(); res(getComputedStyle(document.querySelector('.nav')).transitionDuration); } });
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    document.getElementById('themeBtn').click();
    setTimeout(() => res('sin theme-sw'), 1500);
  }));
  await p.waitForTimeout(700);
  const m1 = await meta(), oscuro = await look();
  const sw = await p.evaluate(() => document.documentElement.classList.contains('theme-sw'));
  check('oscuro', 'la barra del navegador (theme-color) sigue al botón de la luna', m0.every(c => c === '#ffffff') && m1.every(c => c === '#000000'), `${m0} → ${m1}`);
  check('oscuro', 'el cambio de tema se aplica sin transiciones a destiempo', /^0s(, 0s)*$/.test(during) && !sw, during);
  check('oscuro', 'equipos negros aclarados con luz de borde solo en oscuro', claro.k3 === '' && claro.filter === 'none' && oscuro.k3 !== '' && oscuro.filter.includes('drop-shadow'), `${JSON.stringify(claro)} / ${JSON.stringify(oscuro)}`);
  check('oscuro', 'la banda de servicio marca su borde en oscuro', claro.band === 'none' && oscuro.band.includes('inset'), oscuro.band);
  const pin = await p.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.mpin span'));
    const lum = c => { const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
    const [x, y] = [lum(cs.color), lum(cs.backgroundColor)].sort((m, n) => n - m); return +((x + .05) / (y + .05)).toFixed(2);
  });
  check('oscuro', 'el "AT" del pin del mapa cumple AA', pin >= 4.5, `${pin}:1`);
  await p.close();
}

await browser.close();
await server.stop();

const bad = results.filter(r => !r.ok);
let last = '';
for (const r of results) {
  if (r.vp !== last) { console.log(`\n${r.vp}`); last = r.vp; }
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}${r.detail && !r.ok ? `  → ${r.detail}` : r.detail && r.vp.startsWith('contraste') ? `  (${r.detail})` : ''}`);
}
console.log(`\n${results.length - bad.length}/${results.length} chequeos OK${WANT_SHOTS ? ` · capturas en ${SHOTS}` : ''}`);
process.exit(bad.length ? 1 : 0);
