// Verificación del sitio de AT Computación (Next.js): flujos, responsive, contraste AA, movimiento y accesibilidad.
// Corre contra la app de producción (`npm run build` antes) con la base local de pruebas.
// Uso:   npm run test:e2e [-- --capturas]
// Requiere Playwright (en la nube está global: PW="$(npm root -g)/playwright/index.mjs").
// Sale con código 1 si algún chequeo falla. Los errores de consola incluyen las violaciones de CSP.

import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { startServer, LOCAL_ENV } from '../helpers/server.mjs';
import { ADMIN, adminEnv, stableNow, totpCode } from '../helpers/admin.mjs';

let pw;
try { pw = await import('playwright'); } catch { pw = await import(process.env.PW || 'playwright'); }
const { chromium } = pw;

// ATC_DEMO=1: botones de demo del seguimiento. El superadmin de prueba es para entrar al panel (tests/helpers/admin.mjs).
const server = await startServer({ port: 3110, env: { ...LOCAL_ENV, ATC_DEMO: '1', ...adminEnv() } });
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
    const guardada = await p.evaluate(() => localStorage.getItem('atc-bag') ?? '');
    check(v.id, 'la bolsa no guarda nombre ni dirección en el navegador (privacidad)', /"items"/.test(guardada) && !/Nico|Barrio Centro|"nombre"|"dir"/.test(guardada), guardada.slice(0, 120));
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

// La notebook del inicio entra en la primera pantalla: laptop con la barra del navegador y iPhone SE (V1). Es la notebook
// 3D cerrada (data-caja: dónde quedó dibujada en el canvas), junto al título en compu y debajo en el celular
for (const [w, h, min] of [[1440, 790, 230], [1280, 720, 160], [375, 667, 80]]) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.goto(HTML); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    const c = document.querySelector('.hero-canvas'), [, y0] = (c.dataset.caja ?? '').split(',').map(Number);
    return { h3d: document.getElementById('inicio').classList.contains('h3d'), vis: innerHeight - (c.getBoundingClientRect().top + y0) };
  });
  check('inicio', `notebook 3D visible en la primera pantalla a ${w}×${h}`, r.h3d && r.vis >= min, `${Math.round(r.vis)} px visibles`);
  await p.close();
}

// Inicio (escena): la notebook 3D cerrada al lado del título se abre con el scroll, se funde con la compu HTML (el
// seguimiento) y aparece su texto. Negro en los dos temas, con la barra oscura encima. Sin bucles: el rAF se detiene.
const inicio = async (p, f) => {
  await p.evaluate(f => { const el = document.getElementById('inicio'), pin = el.querySelector('.hero-pin'); scrollTo({ top: el.getBoundingClientRect().top + scrollY - 52 + f * (el.offsetHeight - pin.offsetHeight), behavior: 'instant' }); }, f);
  await p.waitForTimeout(1200);
  await p.waitForFunction(() => document.getElementById('inicio').dataset.raf !== '1', null, { timeout: 2000 }).catch(() => {});
  return p.evaluate(() => {
    const el = document.getElementById('inicio'), op = s => +getComputedStyle(el.querySelector(s)).opacity, c = el.querySelector('.hero-canvas');
    const [x0, y0, x1, y1] = (c.dataset.caja ?? '0,0,0,0').split(',').map(Number);
    const lid = el.querySelector('.lid').getBoundingClientRect(), end = el.querySelector('.hero-end').getBoundingClientRect();
    return { p: +el.dataset.p, h3d: el.classList.contains('h3d'), flat: el.classList.contains('hflat'), tris: +(c.dataset.tris ?? 0), alto: y1 - y0, ancho: x1 - x0,
      canvas: +getComputedStyle(c).opacity * op('.hero-obj'), stage: op('.stage'), copy: op('.hero-copy'), end: op('.hero-end'),
      copyInert: el.querySelector('.hero-copy').inert, endInert: el.querySelector('.hero-end').inert, raf: el.dataset.raf, lit: el.querySelector('.stage').classList.contains('lit'),
      bg: getComputedStyle(el).backgroundColor, navDark: document.querySelector('.nav').classList.contains('on-dark'),
      pisa: lid.right > end.left + 1 && end.right > lid.left + 1 && lid.bottom > end.top + 1 && end.bottom > lid.top + 1, dentro: end.bottom <= innerHeight + 1 && end.top >= 52 };
  });
};
for (const [w, h, scheme] of [[1440, 900, 'light'], [1440, 900, 'dark'], [390, 844, 'light']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
  const p = await ctx.newPage(); const errs = []; p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(e.message));
  await p.goto(HTML); await p.waitForTimeout(2500);
  const navLoad = await p.evaluate(() => document.querySelector('.nav').classList.contains('on-dark'));
  const a = await inicio(p, 0), b = await inicio(p, .35), c = await inicio(p, 1);
  const tagI = `inicio-${w}-${scheme === 'dark' ? 'oscuro' : 'claro'}`;
  check(tagI, 'en reposo: título y notebook 3D cerrada (la compu HTML todavía no)', a.h3d && a.tris > 1000 && a.copy > .95 && a.canvas > .95 && a.stage < .05 && !a.copyInert && a.endInert, JSON.stringify(a));
  check(tagI, 'al bajar, la tapa se abre (la notebook crece en alto)', b.alto > a.alto * 1.6 && b.copy < .5, JSON.stringify({ a: a.alto, b: b.alto, copy: b.copy }));
  check(tagI, 'al final: la compu HTML con el seguimiento y su texto, sin pisarse; el 3D se fue y el rAF se detuvo', c.p === 1 && c.canvas < .05 && c.stage > .95 && c.end > .95 && c.copy < .05 && c.copyInert && !c.endInert && c.raf === '0' && c.lit && !c.pisa && c.dentro, JSON.stringify(c));
  check(tagI, 'el inicio es negro y la barra va oscura encima (también al cargar)', a.bg === 'rgb(0, 0, 0)' && navLoad && a.navDark && b.navDark, JSON.stringify({ bg: a.bg, navLoad, a: a.navDark, b: b.navDark }));
  check(tagI, 'sin errores de consola ni scroll horizontal', errs.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, errs.slice(0, 2).join(' | '));
  await ctx.close();
}
{
  // Con "reducir movimiento": sin escena ni 3D arriba; título, compu y texto quietos, uno debajo del otro
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); await p.goto(HTML); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const el = document.getElementById('inicio'), op = s => +getComputedStyle(el.querySelector(s)).opacity;
    return { pin: getComputedStyle(el.querySelector('.hero-pin')).position, h3d: el.classList.contains('h3d'), obj: getComputedStyle(el.querySelector('.hero-obj')).display, stage: op('.stage'), end: op('.hero-end'), lit: el.querySelector('.stage').classList.contains('lit') }; });
  check('inicio', 'reducir movimiento: sin escena ni 3D arriba; la compu y su texto quietos', r.pin !== 'sticky' && !r.h3d && r.obj === 'none' && r.stage === 1 && r.end === 1 && r.lit, JSON.stringify(r));
  await ctx.close();
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

// Grilla bento: en compu "90 días" ocupa 2×2 y "Tu OK" 2×1; en celular, una sola columna
for (const w of [1440, 390]) {
  const p = await browser.newPage({ viewport: { width: w, height: 900 } }); await p.goto(HTML); await p.waitForTimeout(300);
  const r = await p.evaluate(() => [...document.querySelectorAll('.values .val')].map(v => { const b = v.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; }));
  const [big, wide, s1, s2] = r;
  const ok = w > 1068 ? big[0] > s1[0] * 2 && big[1] > s1[1] * 1.8 && wide[0] > s1[0] * 2 && Math.abs(s1[0] - s2[0]) < 2 : r.every(([x]) => Math.abs(x - big[0]) < 2);
  check('bento', w > 1068 ? 'mosaico grande 2×2 y ancho 2×1 en compu' : 'una sola columna en celular', ok, JSON.stringify(r));
  await p.close();
}

// Texto agrandado (zoom chico de Safari o tamaño mínimo de Accesibilidad): todo lo que mide < 18 px pasa a 18 px.
// Nada se sale de su caja, los links del menú no se parten (si no entran, aparece el menú del celular) y no hay scroll horizontal.
for (const w of [1440, 834, 390, 320]) {
  const p = await browser.newPage({ viewport: { width: w, height: 900 } }); await p.goto(HTML); await p.waitForTimeout(300);
  const normal = await p.evaluate(() => document.querySelector('.nav').classList.contains('tight'));
  await p.evaluate(() => {
    const els = [...document.querySelectorAll('main *, header *, .bag *')].filter(e => !e.closest('[aria-hidden="true"]') && parseFloat(getComputedStyle(e).fontSize) < 18);
    for (const e of els) e.style.fontSize = '18px';
  });
  await p.waitForTimeout(200);
  const r = await p.evaluate(() => {
    const hit = (a, b) => a.right > b.left + .5 && b.right > a.left + .5 && a.bottom > b.top + .5 && b.bottom > a.top + .5;
    const name = e => `${(e.className && e.className.toString().split(' ')[0]) || e.tagName}:${e.textContent.trim().slice(0, 18)}`;
    const cats = [...document.querySelectorAll('.cat')];
    const boxes = [...document.querySelectorAll('.cat, .hint button, .btn-sm, .sbadge, .ex, .ex b, .ex small, .btn-full, .pay-i')].filter(e => e.getClientRects().length && !e.closest('[aria-hidden="true"]'));
    const over = [...boxes.filter(e => e.scrollWidth > e.clientWidth + 1).map(name), ...cats.slice(1).filter((c, i) => hit(c.getBoundingClientRect(), cats[i].getBoundingClientRect())).map(name)];
    const nav = document.querySelector('.nav'), tight = nav.classList.contains('tight');
    const links = [...document.querySelectorAll('.links a')].filter(a => a.getClientRects().length && getComputedStyle(a).visibility === 'visible');
    const lines = a => { const g = document.createRange(); g.selectNodeContents(a); return new Set([...g.getClientRects()].map(x => Math.round(x.top))).size; };
    const side = [document.querySelector('.brand'), document.querySelector('.actions')].map(e => e.getBoundingClientRect());
    const navBad = links.filter((a, i) => lines(a) > 1 || side.some(b => hit(a.getBoundingClientRect(), b)) || (i && hit(a.getBoundingClientRect(), links[i - 1].getBoundingClientRect()))).map(a => a.textContent);
    const menu = getComputedStyle(document.querySelector('.menu-btn')).display !== 'none';
    return { over, navBad, links: links.length, tight, menu, ow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  check('texto-18px', `categorías, botones y tarjetas sin desbordes a ${w}px`, r.over.length === 0, r.over.slice(0, 6).join(' | '));
  check('texto-18px', `menú en una línea o menú del celular a ${w}px`, r.navBad.length === 0 && (r.links === 6 || r.menu) && (!r.tight || r.menu), JSON.stringify(r));
  check('texto-18px', `sin scroll horizontal a ${w}px`, r.ow <= 0, `${r.ow}px`);
  if (w === 834) check('texto-18px', 'con letra normal a 834px el menú muestra los links', !normal);
  await p.close();
}

// Centrado: las flechas del estante quedan en el eje de la sección (44 px), y los encabezados de servicio y reseñas
// van centrados como el resto; en celular la fila de categorías llega al borde sin scroll horizontal
for (const [w, scheme] of [[320, 'light'], [390, 'dark'], [820, 'light'], [1440, 'dark']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme });
  const p = await ctx.newPage(); await p.goto(HTML); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const mid = el => { const b = el.getBoundingClientRect(); return b.left + b.width / 2; };
    const axis = mid(document.querySelector('#tienda .head'));
    const btns = [...document.querySelectorAll('.shelf-nav .round')], bb = btns.map(b => b.getBoundingClientRect());
    const pair = (bb[0].left + bb[1].right) / 2;
    const heads = ['.svc-head h2', '#opiniones .head h2', '.svc-head .lnk', '#opiniones .head .lnk'].map(s => Math.round(mid(document.querySelector(s)) - innerWidth / 2));
    const cats = document.querySelector('.cats').getBoundingClientRect();
    return { arrows: Math.round(pair - axis), size: bb.map(b => Math.min(b.width, b.height)), heads, cats: [Math.round(cats.left), Math.round(innerWidth - cats.right)], ow: document.documentElement.scrollWidth - innerWidth };
  });
  const tagC = `centrado-${w}`;
  check(tagC, 'flechas del estante centradas en la sección y de 44 px', Math.abs(r.arrows) <= 1 && r.size.every(x => x >= 44), JSON.stringify(r));
  check(tagC, 'encabezados de servicio y reseñas centrados', r.heads.every(x => Math.abs(x) <= 2), JSON.stringify(r.heads));
  if (w <= 734) check(tagC, 'la fila de categorías llega a los bordes, sin scroll horizontal', r.cats[0] === 0 && r.cats[1] === 0 && r.ow <= 0, JSON.stringify(r));
  await ctx.close();
}

// Pantallas muy anchas: el estante no pasa de 1760 px, la primera tarjeta sigue alineada con el contenido y los bordes se funden
for (const [w, h] of [[2940, 1700], [1440, 900]]) {
  const p = await browser.newPage({ viewport: { width: w, height: h } }); await p.goto(HTML); await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const sh = document.getElementById('shelf'), b = sh.getBoundingClientRect(), cs = getComputedStyle(sh);
    const cards = [...sh.querySelectorAll('.pcard')].map(c => c.getBoundingClientRect()), card = cards[0].left, wrap = document.querySelector('#tienda .wrap').getBoundingClientRect().left;
    return { w: Math.round(b.width), center: Math.round(b.left + b.width / 2 - innerWidth / 2), align: Math.round(card - wrap), mask: (cs.maskImage || cs.webkitMaskImage || 'none') !== 'none', whole: cards.filter(c => c.left >= b.left + 120 && c.right <= b.right - 120).length, peek: cards.some(c => c.left < b.right && c.right > b.right), ow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  if (w > 1800) check('pantalla-ancha', `estante ≤ 1760 px, centrado, alineado, 4 tarjetas enteras y la siguiente asomando en el fundido a ${w}px`, r.w <= 1760 && Math.abs(r.center) <= 1 && Math.abs(r.align) <= 1 && r.mask && r.whole >= 4 && r.peek && r.ow <= 0, JSON.stringify(r));
  else check('pantalla-ancha', `a ${w}px el estante sigue igual (sin fundido, alineado)`, !r.mask && Math.abs(r.align) <= 1, JSON.stringify(r));
  await p.close();
}

// Despiece de la notebook (3D con WebGL): con el scroll se abre, se desarma y aparecen las etiquetas; con "reducir
// movimiento" queda desarmada y quieta (sin recorrido largo). La escena es decorativa (aria-hidden) y las piezas se leen
// como lista. En celular se lee solo la pieza actual, debajo del dibujo. Sin WebGL queda el despiece en CSS.
const despiece = async (p, f) => {
  await p.evaluate(f => { const td = document.getElementById('despiece'); const top = td.getBoundingClientRect().top + scrollY; const stage = td.querySelector('.td-stage').offsetHeight; scrollTo({ top: top - 52 + f * Math.max(0, td.offsetHeight - stage), behavior: 'instant' }); }, f);
  await p.waitForTimeout(1400);
  // Con la máquina cargada (WebGL por software), la inercia puede tardar un poco más en llegar: se espera hasta 2 s más.
  await p.waitForFunction(() => document.getElementById('despiece').dataset.raf !== '1', null, { timeout: 2000 }).catch(() => {});
  return p.evaluate(() => {
    const td = document.getElementById('despiece'), is3d = td.classList.contains('td-3d');
    const dotY = a => td.querySelector(`.td-tags li[data-a="${a}"] .dot`).getBoundingClientRect().top;
    const vis = [...td.querySelectorAll('.td-tags li')].filter(l => +getComputedStyle(l).opacity > .5);
    const draw = td.querySelector(is3d ? '.td-canvas' : '.td-rig').getBoundingClientRect();
    return { is3d, tris: +(td.querySelector('.td-canvas').dataset.tris || 0), spread: Math.round(dotY('ssd') - dotY('screen')),
      o: [...td.querySelectorAll('.td-tags li')].map(l => +(+getComputedStyle(l).opacity).toFixed(2)), h: +(td.offsetHeight / innerHeight).toFixed(2),
      under: vis.every(l => l.getBoundingClientRect().top >= draw.bottom - 2), drawH: Math.round(draw.height),
      fase: td.dataset.fase, pd: +(td.dataset.p || 0), raf: td.dataset.raf || '0', vis: vis.map(l => l.dataset.a).sort().join(','),
      fill: (getComputedStyle(td.querySelector('.td-prog-fill')).transform.match(/matrix\(([^)]+)\)/)?.[1].split(',').map(Number)[3]) ?? 0,
      glass: getComputedStyle(td.querySelector('.td-tags .tx')).backdropFilter, td_on: document.documentElement.classList.contains('td-on') };
  });
};
for (const [w, h, rm] of [[1440, 900, 'no-preference'], [1440, 900, 'reduce'], [390, 844, 'no-preference']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm });
  const p = await ctx.newPage(); await p.goto(HTML); await p.waitForTimeout(300);
  await p.evaluate(() => scrollTo({ top: document.getElementById('despiece').getBoundingClientRect().top + scrollY - 1200, behavior: 'instant' }));
  await p.waitForTimeout(1500);
  const a = await despiece(p, 0), b = await despiece(p, 1);
  const s = await p.evaluate(() => ({ hidden: [...document.querySelectorAll('.td-rig,.td-canvas')].every(e => e.getAttribute('aria-hidden') === 'true'), items: [...document.querySelectorAll('.td-tags li')].filter(l => l.textContent.trim().length > 10).length }));
  const tag = `${w}px${rm === 'reduce' ? ', reducir movimiento' : ''}`;
  check('despiece', `modelo 3D dibujado (${tag})`, b.is3d && b.tris > 1000 && b.drawH > 200, JSON.stringify({ is3d: b.is3d, tris: b.tris, drawH: b.drawH }));
  if (rm === 'reduce') check('despiece', `quieto y desarmado con etiquetas (${tag})`, b.h < 1.5 && Math.abs(a.spread - b.spread) < 2 && b.spread > 150 && b.o.every(o => o === 1), JSON.stringify({ a, b }));
  else if (w < 1069) check('despiece', `la pieza actual se lee debajo del dibujo (${tag})`, a.o.every(o => o === 0) && b.o.filter(o => o > .5).length === 1 && b.under, JSON.stringify({ a, b }));
  else {
    check('despiece', `con el scroll se abre, se desarma y aparecen las etiquetas (${tag})`, b.spread - a.spread > 150 && a.o.every(o => o === 0) && b.o.every(o => o === 1) && b.h > 2, JSON.stringify({ a, b }));
    // Tres fases: F1 cerrada sin etiquetas · F2 se ve la placa (conector de carga y disco) · F3 las cinco
    const f1 = await despiece(p, .1), f2 = await despiece(p, .42);
    check('despiece', `fases: F1 sin etiquetas, F2 placa y disco, F3 las cinco (${tag})`, f1.fase === '1' && f1.vis === '' && f2.fase === '2' && f2.vis === 'port,ssd' && b.fase === '3' && b.vis === 'fan,keys,port,screen,ssd', JSON.stringify({ f1: [f1.fase, f1.vis], f2: [f2.fase, f2.vis], f3: [b.fase, b.vis] }));
    check('despiece', `barra de progreso e inercia que se detiene al llegar (${tag})`, a.fill < .01 && b.fill > .99 && Math.abs(b.pd - 1) < .002 && b.raf === '0' && f2.raf === '0' && Math.abs(f2.pd - .42) < .005, JSON.stringify({ a: [a.fill, a.pd], f2: [f2.pd, f2.raf], b: [b.fill, b.pd, b.raf] }));
    check('despiece', `etiquetas de vidrio y saludo de WhatsApp oculto durante el despiece (${tag})`, /blur/.test(b.glass) && b.td_on, JSON.stringify({ glass: b.glass, td_on: b.td_on }));
  }
  check('despiece', `escena decorativa y piezas como lista (${tag})`, s.hidden && s.items === 5, JSON.stringify(s));
  await ctx.close();
}
{
  // Sin WebGL: queda el despiece en CSS, que también se desarma con el scroll
  const nogl = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
  const p = await nogl.newPage({ viewport: { width: 1440, height: 900 } }); await p.goto(HTML); await p.waitForTimeout(300);
  await p.evaluate(() => scrollTo({ top: document.getElementById('despiece').getBoundingClientRect().top + scrollY - 1200, behavior: 'instant' }));
  await p.waitForTimeout(1500);
  const a = await despiece(p, 0), b = await despiece(p, 1);
  check('despiece', 'sin WebGL queda el despiece en CSS y se desarma', !b.is3d && b.drawH > 200 && b.spread - a.spread > 150 && b.o.every(o => o === 1), JSON.stringify({ a, b }));
  // Inicio sin WebGL: no se descarga three.js (sin errores); la compu HTML hace el mismo recorrido y termina con su texto
  const q = await nogl.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; q.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await q.goto(HTML); await q.waitForTimeout(1500);
  const i0 = await inicio(q, 0), i1 = await inicio(q, 1);
  check('inicio', 'sin WebGL: la compu HTML recorre la escena y termina con su texto, sin errores', i0.flat && !i0.h3d && i0.stage > .95 && i1.end > .95 && !i1.pisa && errs.length === 0, JSON.stringify({ i0, i1, errs: errs.slice(0, 2) }));
  await nogl.close();
}

// Marcas: logos con nombre accesible, la copia del bucle oculta a lectores de pantalla y, con "reducir movimiento",
// los logos se ven (la regla que oculta la copia no debe ocultar los SVG de cada logo); nunca "oficial" ni "distribuidor"
for (const rm of ['no-preference', 'reduce']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: rm });
  const p = await ctx.newPage(); await p.goto(HTML); await p.waitForTimeout(400);
  const m = await p.evaluate(() => {
    const own = [...document.querySelectorAll('.mq-track>a.bl-a:not([aria-hidden])')];
    return { n: own.length, named: own.every(b => /^Ver productos /.test(b.getAttribute('aria-label') ?? '')), visible: own.filter(b => b.querySelector('svg').getBoundingClientRect().width > 0).length,
      copies: [...document.querySelectorAll('.mq-track>a.bl-a[aria-hidden]')].every(b => b.getAttribute('aria-hidden') === 'true' && b.tabIndex === -1),
      claim: /oficial|distribuidor|autorizado/i.test(document.querySelector('.brands').textContent) };
  });
  check('marcas', `logos visibles y con nombre${rm === 'reduce' ? ' (reducir movimiento)' : ''}`, m.n >= 10 && m.named && m.visible === m.n && m.copies && !m.claim, JSON.stringify(m));
  await ctx.close();
}

// Marcas que llevan a sus productos: el logo filtra la tienda (con píldora para quitarlo) y una marca sin productos
// muestra un vacío honesto. Con "reducir movimiento" el carrusel está quieto y se toca igual.
for (const [w, rm] of [[1440, 'no-preference'], [390, 'reduce']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: rm, hasTouch: w < 900 });
  const p = await ctx.newPage(); await p.goto(HTML); await p.waitForTimeout(400);
  // El carrusel se mueve: el clic se hace sobre el enlace (como un toque), sin esperar a que quede quieto.
  const tocar = b => p.evaluate(b => document.querySelector(`.mq-track>a.bl-a[data-brand="${b}"]:not([aria-hidden])`).click(), b);
  // Con movimiento, el salto a #tienda es suave: se espera a que llegue (hasta 3 s) en vez de un tiempo fijo.
  const llego = () => p.waitForFunction(() => Math.abs(document.querySelector('#tienda').getBoundingClientRect().top) < 120, null, { timeout: 3000 }).catch(() => {});
  await tocar('HP'); await llego(); await p.waitForTimeout(150);
  const hp = await p.evaluate(() => ({ brands: [...document.querySelectorAll('#shelf .pcard .p-brand')].map(e => e.textContent), pill: document.querySelector('.brand-pill')?.textContent ?? '', hash: location.hash,
    top: Math.round(document.querySelector('#tienda').getBoundingClientRect().top) }));
  await p.click('.brand-x'); await p.waitForTimeout(300);
  const todos = await p.evaluate(() => ({ n: document.querySelectorAll('#shelf .pcard').length, pill: !!document.querySelector('.brand-pill') }));
  await tocar('Samsung'); await p.waitForTimeout(700);
  const vacio = await p.evaluate(() => document.querySelector('#shelf .p-empty')?.textContent ?? '');
  check(`marcas-${w}`, 'tocar un logo lleva a la tienda con solo esa marca; la píldora lo quita; sin productos, vacío honesto', hp.brands.length === 2 && hp.brands.every(b => b === 'HP') && /HP/.test(hp.pill) && hp.hash === '#tienda' && Math.abs(hp.top) < 120 && todos.n === 11 && !todos.pill && /Samsung/.test(vacio) && /Consultanos/.test(vacio), JSON.stringify({ hp, todos, vacio: vacio.slice(0, 60) }));
  await ctx.close();
}

// Estante con barra de scroll visible (como en Windows): la primera tarjeta alineada con el título y las flechas en el
// eje de la sección (antes el relleno usaba 100vw, que incluye la barra, y las tarjetas quedaban corridas).
{
  const b2 = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  for (const [w, h] of [[1366, 768], [1440, 900], [1920, 1080]]) {
    const p = await b2.newPage({ viewport: { width: w, height: h } }); await p.goto(HTML); await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const mid = el => { const b = el.getBoundingClientRect(); return b.left + b.width / 2; };
      const head = document.querySelector('#tienda .head'), wrap = document.querySelector('#tienda .wrap').getBoundingClientRect();
      const card = document.querySelector('#shelf .pcard').getBoundingClientRect(), bb = [...document.querySelectorAll('.shelf-nav .round')].map(b => b.getBoundingClientRect());
      return { barra: innerWidth - document.documentElement.clientWidth, card: Math.round(card.left - wrap.left), flechas: Math.round((bb[0].left + bb[1].right) / 2 - mid(head)) };
    });
    check('estante-barra', `con barra de scroll a ${w}px: primera tarjeta alineada con el título y flechas centradas (±1 px)`, r.barra > 0 && Math.abs(r.card) <= 1 && Math.abs(r.flechas) <= 1, JSON.stringify(r));
    await p.close();
  }
  await b2.close();
}

// Pie: en compu se estira más allá del contenido (más ancho que la columna de 1120 px) y queda centrado; en celular no desborda
for (const w of [1440, 1920, 390]) {
  const p = await browser.newPage({ viewport: { width: w, height: 900 } }); await p.goto(HTML); await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const f = document.querySelector('footer .f-wrap').getBoundingClientRect(), c = document.querySelector('#tienda .wrap').getBoundingClientRect();
    return { pie: Math.round(f.width), contenido: Math.round(c.width), centro: Math.round(f.left + f.width / 2 - innerWidth / 2), ow: document.documentElement.scrollWidth - innerWidth, priv: !!document.querySelector('footer a[href="/privacidad"]') };
  });
  const ok = w >= 1069 ? r.pie > r.contenido + 100 && Math.abs(r.centro) <= 1 : r.ow <= 0;
  check('pie', `a ${w}px el pie ${w >= 1069 ? 'es más ancho que el contenido y está centrado' : 'no desborda'}, con enlace a Privacidad y cookies`, ok && r.priv, JSON.stringify(r));
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

// Panel del dueño: solo existe para el superadmin con sesión. Primero se entra por /ingresar y la sesión se reusa.
const PANEL = server.base + '/panel';
const PANEL_VPS = [[320, 568, 'light'], [390, 844, 'light'], [820, 1180, 'dark'], [1440, 900, 'light']];
let PANEL_COOKIES = [];
const panelPage = async (w, h, scheme, { anon, ...opts } = {}) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, hasTouch: w < 900, acceptDownloads: true, ...opts });
  if (!anon) await ctx.addCookies(PANEL_COOKIES);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  return { ctx, p, errs };
};
// "$ 1.154.800" / "−$ 12.000" → número
const PARSE_ARS = s => { const t = String(s ?? '').replace(/\s/g, ''); const n = +t.replace(/[^\d]/g, ''); return /^[−-]/.test(t) ? -n : n; };
const PANEL_RANGES = [['7d', 7, 'Últimos 7 días'], ['30d', 30, 'Últimos 30 días'], ['3m', 13, 'Últimos 3 meses'], ['12m', 12, 'Últimos 12 meses']];
const PANEL_COLORS = { light: ['rgb(29, 122, 53)', 'rgb(215, 0, 21)'], dark: ['rgb(48, 209, 88)', 'rgb(255, 69, 58)'] };
// Contraste de todo el texto visible del panel contra su fondo real (compone los fondos con transparencia)
const panelContrast = (sel = '.pn *') => {
  const rgba = c => { const m = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0]; return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1]; };
  const over = (top, under) => { const a = top[3]; return [0, 1, 2].map(i => top[i] * a + under[i] * (1 - a)).concat(1); };
  const bgOf = el => {
    const stack = [];
    for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 0) { stack.push(c); if (c[3] >= 1) break; } }
    let base = [255, 255, 255, 1];
    if (stack.length && stack[stack.length - 1][3] >= 1) base = stack.pop();
    else base = rgba(getComputedStyle(document.body).backgroundColor);
    while (stack.length) base = over(stack.pop(), base);
    return base;
  };
  const lum = c => { const [r, g, b] = c.slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
  const bad = [];
  for (const el of document.querySelectorAll(sel)) {
    if (el.closest('.sr') || !el.getClientRects().length) continue;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el); if (cs.visibility !== 'visible' || +cs.opacity === 0) continue;
    const bg = bgOf(el), fg = over(rgba(cs.color), bg), fs = parseFloat(cs.fontSize), big = fs >= 24 || (fs >= 18.66 && +cs.fontWeight >= 700);
    const r = ratio(fg, bg);
    if (r < (big ? 3 : 4.5)) bad.push(`${(el.className && el.className.toString().split(' ')[0]) || el.tagName}:"${el.textContent.trim().slice(0, 16)}" ${r.toFixed(2)}`);
  }
  // Líneas del gráfico: 3:1 contra la tarjeta (elemento gráfico)
  if (sel === '.pn *') for (const l of document.querySelectorAll('.pn-l')) { const r = ratio(rgba(getComputedStyle(l).stroke), bgOf(l.closest('.pn-card'))); if (r < 3) bad.push(`${l.getAttribute('class')} ${r.toFixed(2)}`); }
  return [...new Set(bad)];
};
// Letra mínima (13 px), áreas táctiles (44 px) y títulos sin saltos de nivel dentro del panel
const panelA11y = (root = '.pn') => {
  const tiny = [], small = [];
  for (const el of document.querySelectorAll(`${root} *`)) {
    if (el.closest('.sr') || !el.getClientRects().length) continue;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el); if (cs.visibility !== 'visible') continue;
    if (parseFloat(cs.fontSize) < 13) tiny.push(`${(el.className && el.className.toString().split(' ')[0]) || el.tagName}:${cs.fontSize}`);
  }
  for (const el of document.querySelectorAll(['a', 'button', 'summary', 'label.pn-chip', 'label.pn-seg', '[role="slider"]', 'select', 'input:not(.sr)'].map(x => `${root} ${x}`).join(', '))) {
    if (el.closest('p, .sr') && el.tagName === 'A' || !el.getClientRects().length || getComputedStyle(el).visibility !== 'visible') continue;
    const r = el.getBoundingClientRect(); if (r.width < 43.5 || r.height < 43.5) small.push(`${(el.className && el.className.toString().split(' ')[0]) || el.tagName}:${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  const hs = [...document.querySelectorAll('h1, h2, h3, h4')].filter(h => h.getClientRects().length || h.closest('.sr')).map(h => +h.tagName[1]);
  const jump = hs.some((l, i) => i > 0 && l > hs[i - 1] + 1);
  return { tiny: [...new Set(tiny)], small: [...new Set(small)], h1: hs.filter(l => l === 1).length, jump, hs: hs.join('') };
};
// Ingreso del superadmin: sin sesión /panel no existe; con datos incorrectos avisa sin decir cuál; con los correctos entra.
{
  const { ctx, p, errs } = await panelPage(390, 844, 'light', { anon: true });
  const nf = await p.goto(PANEL);
  const nfText = await p.evaluate(() => document.body.textContent);
  check('ingreso', 'sin sesión /panel responde "página no encontrada"', nf.status() === 404 && /No encontramos esta página/.test(nfText) && !/datos de ejemplo|ganancia/i.test(nfText), String(nf.status()));
  await p.goto(server.base + '/ingresar'); await p.waitForTimeout(400);
  const form = await p.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, noindex: /noindex/.test(document.querySelector('meta[name="robots"]')?.content ?? ''), labels: ['in-user', 'in-pass', 'in-code'].every(id => document.querySelector(`label[for="${id}"]`)), pass: document.querySelector('#in-pass').type }));
  check('ingreso', '/ingresar: formulario con etiquetas, contraseña oculta y noindex', form.h1 === 'Ingresar' && form.noindex && form.labels && form.pass === 'password', JSON.stringify(form));
  await p.fill('#in-user', ADMIN.user); await p.fill('#in-pass', ADMIN.pass); await p.fill('#in-code', '000000');
  await p.click('.in-form button[type="submit"]'); await p.waitForTimeout(600);
  const bad = await p.evaluate(() => ({ alert: document.querySelector('.in-err').textContent, focus: document.activeElement?.id, code: document.querySelector('#in-code').value, url: location.pathname }));
  check('ingreso', 'datos incorrectos: aviso sin decir cuál, código borrado y foco en el código', bad.alert === 'Los datos no son correctos.' && bad.focus === 'in-code' && bad.code === '' && bad.url === '/ingresar', JSON.stringify(bad));
  await p.fill('#in-code', totpCode(0, await stableNow()));
  await Promise.all([p.waitForURL('**/panel', { timeout: 15000 }), p.click('.in-form button[type="submit"]')]);
  await p.waitForTimeout(400);
  const inside = await p.evaluate(() => document.querySelector('h1')?.textContent);
  PANEL_COOKIES = await ctx.cookies();
  const sc = PANEL_COOKIES.find(c => c.name === 'atc_s');
  check('ingreso', 'con los datos correctos entra al panel con cookie HttpOnly y SameSite=Strict', inside === 'Resumen' && sc?.httpOnly && sc?.sameSite === 'Strict', JSON.stringify({ inside, sc: sc && { httpOnly: sc.httpOnly, sameSite: sc.sameSite } }));
  // El 404 de /panel y el 401 del intento con datos incorrectos son esperados (el navegador los anota como error de carga).
  check('ingreso', 'sin errores de consola (salvo el 404 y el 401 esperados)', errs.filter(e => !/status of (401|404)/.test(e)).length === 0, errs.slice(0, 3).join(' | '));
  await ctx.close();
  for (const scheme of ['light', 'dark']) {
    const v = await panelPage(390, 844, scheme, { anon: true });
    await v.p.goto(server.base + '/ingresar'); await v.p.waitForTimeout(700);
    const c = await v.p.evaluate(panelContrast, '.in *');
    const a = await v.p.evaluate(panelA11y, '.in');
    check('ingreso', `/ingresar en ${scheme === 'dark' ? 'oscuro' : 'claro'}: contraste AA, letra ≥ 13 px y 44 px`, c.length === 0 && a.tiny.length === 0 && a.small.length === 0 && a.h1 === 1, [...c, ...a.tiny, ...a.small].slice(0, 5).join(' | '));
    await v.ctx.close();
  }
}

// Privacidad y cookies: página propia, enlazada en el pie, legible (AA, letra ≥ 13 px, 44 px) y sin scroll horizontal
for (const [w, scheme] of [[390, 'light'], [1440, 'dark']]) {
  const { ctx, p, errs } = await panelPage(w, 900, scheme, { anon: true });
  const r = await p.goto(server.base + '/privacidad'); await p.waitForTimeout(400);
  const d = await p.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, claves: ['atc-theme', 'atc-bag', 'atc-greet'].every(k => document.body.textContent.includes(k)), ley: /25\.326/.test(document.body.textContent), ow: document.documentElement.scrollWidth - innerWidth }));
  const c = await p.evaluate(panelContrast, '.lg *'), a = await p.evaluate(panelA11y, '.lg');
  check(`privacidad-${w}`, '/privacidad explica qué se guarda (sin cartel), con la Ley 25.326, AA, letra ≥ 13 px y 44 px', r.status() === 200 && d.h1 === 'Privacidad y cookies' && d.claves && d.ley && d.ow <= 0 && c.length === 0 && a.tiny.length === 0 && a.small.length === 0 && a.h1 === 1 && !a.jump && errs.length === 0, JSON.stringify({ d, c: c.slice(0, 3), a: [...a.tiny, ...a.small].slice(0, 4), errs: errs.slice(0, 2) }));
  await ctx.close();
}

// F12: inventar un "admin" en el navegador (localStorage, sessionStorage, cookies) no abre el panel.
{
  const { ctx, p } = await panelPage(390, 844, 'light', { anon: true });
  await p.goto(HTML); await p.waitForTimeout(300);
  await p.evaluate(() => {
    for (const [k, v] of [['role', 'admin'], ['user', 'admin'], ['isAdmin', 'true'], ['atc-admin', '1']]) { try { localStorage.setItem(k, v); sessionStorage.setItem(k, v); } catch {} }
    for (const c of ['role=admin', 'user=admin', 'admin=true', 'atc_s=admin']) document.cookie = `${c}; path=/`;
  });
  const r = await p.goto(PANEL);
  const txt = await p.evaluate(() => document.body.textContent);
  check('seguridad', 'F12: un "admin" inventado en el navegador (localStorage y cookies) no abre el panel', r.status() === 404 && /No encontramos esta página/.test(txt) && !/datos de ejemplo|ganancia/i.test(txt), String(r.status()));
  await ctx.close();
}
// "Salir" cierra la sesión de verdad: vuelve a la tienda y en ese navegador el panel deja de existir.
{
  const { ctx, p } = await panelPage(1440, 900, 'light');
  await p.goto(PANEL); await p.waitForTimeout(500);
  await Promise.all([p.waitForURL(HTML, { timeout: 15000 }), p.click('.pn-salir')]);
  const queda = (await ctx.cookies()).some(c => /atc_s$/.test(c.name) && c.value);
  const r = await p.goto(PANEL);
  check('seguridad', '"Salir" borra la sesión, vuelve a la tienda y el panel da 404', !queda && r.status() === 404, JSON.stringify({ queda, st: r.status() }));
  await ctx.close();
}

// Espera a que el panel quede quieto: animaciones y transiciones de CSS terminadas y el monto grande ya contado.
const quieto = p => p.evaluate(async () => {
  await Promise.race([Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))), new Promise(r => setTimeout(r, 2500))]);
  const e = document.querySelector('#pn-total');
  for (let i = 0; e && i < 60 && +e.textContent.replace(/[^\d]/g, '') * (/[−-]/.test(e.textContent) ? -1 : 1) !== +e.dataset.v; i++) await new Promise(r => setTimeout(r, 50));
});

for (const [w, h, scheme] of PANEL_VPS) {
  const tag = `panel-${w}-${scheme === 'dark' ? 'oscuro' : 'claro'}`;
  const { ctx, p, errs } = await panelPage(w, h, scheme);
  try {
    await p.goto(PANEL); await quieto(p);
    const top = await p.evaluate(() => {
      const vis = s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility === 'visible' && +cs.opacity > 0; };
      return { h1: document.querySelector('h1')?.textContent, banner: vis('#pn-demo') && /datos de ejemplo/i.test(document.querySelector('#pn-demo').textContent), pill: vis('.pn-ej'), theme: document.documentElement.dataset.theme };
    });
    check(tag, 'carga la maqueta con el aviso "Datos de ejemplo" y la píldora "Ejemplo"', top.h1 === 'Resumen' && top.banner && top.pill && top.theme === scheme, JSON.stringify(top));

    // El desglose suma la ganancia, y la ganancia es la misma arriba y abajo
    const sum = await p.evaluate(() => ({ total: document.querySelector('#pn-total').textContent, des: document.querySelector('#pn-des-total').textContent, rows: [...document.querySelectorAll('.pn-des .pn-row .pn-amt')].map(e => e.textContent) }));
    const rowsSum = sum.rows.map(PARSE_ARS).reduce((a, b) => a + b, 0);
    check(tag, 'el desglose (ventas + servicio − gastos) suma la ganancia', sum.rows.length === 3 && rowsSum === PARSE_ARS(sum.total) && PARSE_ARS(sum.des) === PARSE_ARS(sum.total), JSON.stringify(sum));

    // Los períodos cambian el gráfico (puntos, tabla para lectores, título) y el cambio se anuncia
    const ranges = [];
    for (const [id, n, label] of PANEL_RANGES) {
      await p.click(`label.pn-chip:has(input[value="${id}"])`); await quieto(p);
      ranges.push(await p.evaluate(([id, n, label]) => {
        const hit = document.querySelector('.pn-hit');
        const rows = [...document.querySelectorAll('.pn-des .pn-row .pn-amt')].map(e => e.textContent);
        return { id, ok: document.querySelector(`input[value="${id}"]`).checked && +hit.getAttribute('aria-valuemax') + 1 === n && document.querySelectorAll('.pn-chart tbody tr').length === n && document.querySelector('.pn-chart').dataset.n === String(n) && document.querySelector('#pn-per').textContent.includes(label),
          total: document.querySelector('#pn-total').textContent, rows };
      }, [id, n, label]));
    }
    const sums = ranges.every(r => r.rows.map(PARSE_ARS).reduce((a, b) => a + b, 0) === PARSE_ARS(r.total));
    const announced = await p.evaluate(() => document.querySelector('#pn-anuncio').textContent);
    check(tag, 'los períodos cambian el gráfico (7/30/13/12 puntos) y el desglose sigue sumando', ranges.every(r => r.ok) && sums && new Set(ranges.map(r => r.total)).size > 1, JSON.stringify(ranges.map(r => [r.id, r.ok, r.total])));
    check(tag, 'el cambio de período se anuncia a lectores de pantalla', /Últimos 12 meses: ganancia/.test(announced), announced);
    await p.click('label.pn-chip:has(input[value="30d"])'); await quieto(p);

    // Teclado: Inicio, Fin y flechas recorren los puntos; el valor se lee con el monto
    await p.focus('.pn-hit');
    const kv = [];
    for (const k of ['Home', 'End', 'ArrowLeft']) { await p.keyboard.press(k); kv.push(await p.evaluate(() => [document.querySelector('.pn-hit').getAttribute('aria-valuenow'), document.querySelector('.pn-hit').getAttribute('aria-valuetext')])); }
    const tipKb = await p.evaluate(() => /Acumulado.*Período anterior/.test(document.querySelector('.pn-tip')?.textContent ?? ''));
    check(tag, 'el gráfico se recorre con el teclado (el detalle compara con el período anterior)', kv[0][0] === '0' && kv[1][0] === '29' && kv[2][0] === '28' && /\$/.test(kv[2][1]) && tipKb, JSON.stringify(kv));
    await p.evaluate(() => document.activeElement.blur());

    // Verde arriba del $ 0 y rojo abajo, con los colores del tema; la línea del $ 0 queda dentro del dibujo
    const col = await p.evaluate(() => ({ up: getComputedStyle(document.querySelector('.pn-l-up')).stroke, dn: getComputedStyle(document.querySelector('.pn-l-dn')).stroke, y0: +document.querySelector('.pn-zero').getAttribute('y1') }));
    check(tag, 'gráfico: verde arriba del $ 0, rojo abajo, colores del tema', col.up === PANEL_COLORS[scheme][0] && col.dn === PANEL_COLORS[scheme][1] && col.y0 >= 0 && col.y0 <= 300, JSON.stringify(col));
    // Estilo Bolsa: montos del eje ordenados (con $ 0), sin pisarse y dentro de la tarjeta; una línea de grilla por monto;
    // fechas a la vista sin pisarse dentro del dibujo; período anterior punteado con su leyenda; el último punto marcado
    const ch = await p.evaluate(() => {
      const R = e => e.getBoundingClientRect(), plot = R(document.querySelector('.pn-plot')), card = R(document.querySelector('.pn-gan'));
      const over = rs => rs.some((a, i) => rs.slice(i + 1).some(b => a.right > b.left + .5 && b.right > a.left + .5 && a.bottom > b.top + .5 && b.bottom > a.top + .5));
      const num = s => { const m = s.replace(/\s/g, '').match(/^([−-]?)\$(\d+(?:,\d+)?)(M|mil)?$/); return m ? (m[1] ? -1 : 1) * parseFloat(m[2].replace(',', '.')) * (m[3] === 'M' ? 1e6 : m[3] === 'mil' ? 1e3 : 1) : NaN; };
      // Cada monto se mide por su texto (el renglón mide 0 px de alto a propósito)
      const box = e => { const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect(); };
      const yt = [...document.querySelectorAll('.pn-yt')], yr = yt.map(box);
      const byTop = yt.map((e, i) => [yr[i].top, num(e.textContent)]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
      const xt = [...document.querySelectorAll('.pn-xt')].filter(e => e.getClientRects().length), xr = xt.map(R);
      const end = document.querySelector('.pn-end'), er = end && R(end), prev = document.querySelector('.pn-l-prev');
      return { ticks: yt.map(e => e.textContent), yOk: yt.length >= 3 && yt.length <= 6 && yt.some(e => e.textContent === '$ 0') && byTop.every((v, i) => !Number.isNaN(v) && (i === 0 || v < byTop[i - 1])) && !over(yr) && yr.every(r => r.left >= plot.right && r.right <= card.right),
        grid: document.querySelectorAll('.pn-gl').length === yt.length - 1,
        xOk: xr.length >= 3 && !over(xr) && xr[0].left >= plot.left - 1 && xr[xr.length - 1].right <= plot.right + 1, xs: xt.map(e => e.textContent),
        prev: !!prev && getComputedStyle(prev).strokeDasharray !== 'none' && document.querySelectorAll('.pn-leg li').length === 2 && /anteriores|año pasado/.test(document.querySelector('.pn-leg').textContent),
        end: !!er && Math.abs(er.left + er.width / 2 - plot.right) <= 2 && er.top + er.height / 2 >= plot.top - 1 && er.top + er.height / 2 <= plot.bottom + 1 };
    });
    check(tag, 'gráfico: montos del eje ordenados con $ 0, sin pisarse, y una línea de grilla por monto', ch.yOk && ch.grid, JSON.stringify(ch.ticks));
    check(tag, 'gráfico: fechas a la vista sin pisarse y dentro del dibujo', ch.xOk, JSON.stringify(ch.xs));
    check(tag, 'gráfico: período anterior punteado con leyenda y el último punto marcado', ch.prev && ch.end, JSON.stringify(ch));
    if (w >= 1069) {
      const hb = await p.locator('.pn-hit').boundingBox();
      await p.mouse.move(hb.x + hb.width * .5, hb.y + hb.height * .5); await p.waitForTimeout(150);
      const tip = await p.evaluate(() => document.querySelector('.pn-tip')?.textContent ?? '');
      check(tag, 'al pasar el mouse aparece el detalle del día', /Acumulado/.test(tip), tip);
      await p.mouse.move(2, 2); await p.waitForTimeout(100);
    }

    // Letra mínima 13 px, áreas táctiles de 44 px y títulos sin saltos
    const a11y = await p.evaluate(panelA11y);
    check(tag, 'sin texto visible menor a 13 px', a11y.tiny.length === 0, a11y.tiny.join(' | '));
    check(tag, 'áreas táctiles de 44 px o más', a11y.small.length === 0, a11y.small.join(' | '));
    check(tag, 'un solo h1 y títulos sin saltos de nivel', a11y.h1 === 1 && !a11y.jump, a11y.hs);
    const pisa = await p.evaluate(() => {
      const hit = (a, b) => a.right > b.left + .5 && b.right > a.left + .5 && a.bottom > b.top + .5 && b.bottom > a.top + .5;
      const bad = [];
      for (const r of document.querySelectorAll('.pn .pn-row, .pn .pn-mov, .pn .pn-rank li')) {
        const t = r.querySelector('.pn-rt b'), a = r.querySelector('.pn-amt, .pn-mamt b, .pn-rv');
        if (t && a && hit(t.getBoundingClientRect(), a.getBoundingClientRect())) bad.push(t.textContent.slice(0, 20));
      }
      for (const b of document.querySelectorAll('.pn-act')) if (b.scrollWidth > b.clientWidth + 1) bad.push(`acción ${b.textContent}`);
      // Mejor y peor tramo: el monto (con su signo) en una línea y dentro de su recuadro
      for (const b of document.querySelectorAll('.pn-ext dd b')) { const box = b.closest('div'), cs = getComputedStyle(box); if (b.getClientRects().length > 1 || b.getBoundingClientRect().right > box.getBoundingClientRect().right - parseFloat(cs.paddingRight) + .5) bad.push(`extremo ${b.textContent}`); }
      return bad;
    });
    check(tag, 'títulos y montos no se pisan; acciones sin desborde', pisa.length === 0, pisa.slice(0, 5).join(' | '));
    const grid = await p.evaluate(() => { const a = document.querySelector('.pn-gan').getBoundingClientRect(), b = document.querySelector('.pn-des').getBoundingClientRect(); return { same: Math.abs(a.top - b.top) < 1, below: b.top >= a.bottom }; });
    check(tag, w >= 1069 ? 'grilla: ganancia y desglose lado a lado' : 'grilla: tarjetas apiladas', w >= 1069 ? grid.same : grid.below, JSON.stringify(grid));

    // Diseño: el período arriba (a la derecha del título desde tablet); en compu las tarjetas de cada fila terminan juntas
    // y los espacios entre tarjetas son iguales; en cada fila de lista el monto va en la línea del título
    const lay = await p.evaluate(() => {
      const R = s => document.querySelector(s).getBoundingClientRect();
      const range = R('.pn-range'), h1 = R('h1'), gan = R('.pn-gan'), des = R('.pn-des'), acc = R('.pn-acc'), ult = R('.pn-ult'), top = R('.pn-top');
      const line = e => { const r = document.createRange(); r.selectNodeContents(e); return r.getClientRects()[0]; };
      const off = [];
      for (const row of document.querySelectorAll('.pn-des .pn-row, .pn-cat .pn-row, .pn-rank li, .pn-ult .pn-mov')) {
        if (!row.getClientRects().length) continue;
        const t = row.querySelector('.pn-rt b'), a = row.querySelector('.pn-amt, .pn-mamt b, .pn-rv');
        const d = Math.abs(line(t).bottom - line(a).bottom);
        if (d > 3) off.push(`${t.textContent.slice(0, 16)} ${d.toFixed(1)}`);
      }
      return { arriba: range.bottom <= gan.top, lado: range.top < h1.bottom && range.left > h1.right, filas: [Math.round(gan.bottom - acc.bottom), Math.round(ult.bottom - top.bottom)],
        gaps: [Math.round(acc.top - des.bottom), Math.round(ult.top - gan.bottom)], off };
    });
    check(tag, w >= 735 ? 'el período va arriba, a la derecha del título' : 'el período va arriba, debajo del título', lay.arriba && (w < 735 || lay.lado), JSON.stringify(lay));
    if (w >= 1069) check(tag, 'grilla: las tarjetas de cada fila terminan juntas y los espacios son iguales', lay.filas.every(x => Math.abs(x) <= 1) && lay.gaps.every(x => x === lay.gaps[0]), JSON.stringify(lay));
    check(tag, 'en cada fila de lista el monto va en la línea del título', lay.off.length === 0, lay.off.slice(0, 4).join(' | '));
    const tonos = await p.evaluate(() => [...document.querySelectorAll('.pn-share i')].map(i => getComputedStyle(i).backgroundColor));
    check(tag, 'categorías en un solo tono, sin el verde ni el rojo de subir y bajar', tonos.length > 2 && tonos.every(c => !PANEL_COLORS[scheme].includes(c)), tonos.join(' '));

    // Categorías: ordenadas por ganancia y suman lo de ventas + servicio técnico
    const cats = await p.evaluate(() => ({ v: [...document.querySelectorAll('.pn-cat .pn-row')].map(r => +r.dataset.v), rows: [...document.querySelectorAll('.pn-des .pn-row .pn-amt')].map(e => e.textContent) }));
    const catSum = cats.v.reduce((a, b) => a + b, 0), vs = PARSE_ARS(cats.rows[0]) + PARSE_ARS(cats.rows[1]);
    // Cada tarjeta con gráfico lleva su monto junto al título (en la misma línea desde 390 px), y el monto cuadra con su lista
    const heads = await p.evaluate(() => [['.pn-des', 'De dónde sale'], ['.pn-cat', 'Por categoría'], ['.pn-top', 'Más vendidos']].map(([s, title]) => {
      const h = document.querySelector(`${s} .pn-ch h2`), v = document.querySelector(`${s} .pn-ch-v b`);
      if (!h || !v) return { s, ok: false };
      const a = h.getBoundingClientRect(), b = v.getBoundingClientRect();
      return { s, ok: h.textContent === title && /\$|u\./.test(v.textContent), line: b.top < a.bottom && a.top < b.bottom, apart: b.left >= a.right, v: v.textContent };
    }));
    check(tag, 'monto junto al título de cada tarjeta con gráfico', heads.every(x => x.ok && (x.line ? x.apart : w < 390)), JSON.stringify(heads));
    const cuadra = await p.evaluate(() => ({
      cat: [...document.querySelectorAll('.pn-cat .pn-row')].reduce((a, r) => a + +r.dataset.v, 0),
      top5: [...document.querySelectorAll('.pn-rank li')].reduce((a, l) => a + +l.dataset.v, 0),
      metric: document.querySelector('input[name="pn-metrica"]:checked')?.value,
    }));
    check(tag, 'el monto de categorías es su suma y el de más vendidos cubre el top 5', PARSE_ARS(heads[1].v) === cuadra.cat && cuadra.metric === 'unidades' && parseInt(heads[2].v, 10) >= cuadra.top5, JSON.stringify({ ...cuadra, heads: heads.map(x => x.v) }));

    // Barra de reparto: un tramo por categoría con ganancia, en el mismo orden y color que su fila, de ancho proporcional
    const share = await p.evaluate(() => {
      const bar = document.querySelector('.pn-share'), segs = [...bar.children], rows = [...document.querySelectorAll('.pn-cat .pn-row')].filter(r => +r.dataset.v > 0);
      const sum = rows.reduce((a, r) => a + +r.dataset.v, 0), free = bar.clientWidth - 2 * (segs.length - 1);
      const off = segs.map((s, i) => Math.abs(s.offsetWidth - free * +rows[i]?.dataset.v / sum));
      const col = segs.map(s => getComputedStyle(s).backgroundColor);
      return { n: segs.length, rows: rows.length, order: segs.every((s, i) => s.dataset.cat === rows[i]?.dataset.cat), off: Math.max(...off),
        dots: rows.every((r, i) => getComputedStyle(r.querySelector('.pn-cdot')).backgroundColor === col[i]), distinct: new Set(col).size === col.length };
    });
    check(tag, 'barra de reparto: un tramo por categoría, orden, color y ancho proporcionales', share.n === share.rows && share.n > 2 && share.order && share.off <= 3.5 && share.dots && share.distinct, JSON.stringify(share));

    // Tendencias del desglose: una por fila, debajo del monto, con un punto por tramo del gráfico
    const spk = await p.evaluate(() => {
      const n = +document.querySelector('.pn-chart').dataset.n, s = [...document.querySelectorAll('.pn-des .pn-row .pn-spark')];
      return { n, len: s.length, pts: s.map(e => e.querySelector('polyline').getAttribute('points').split(' ').length), vis: s.map(e => e.getBoundingClientRect().width > 0),
        below: s.every(e => e.getBoundingClientRect().top >= e.parentElement.querySelector('.pn-amt').getBoundingClientRect().bottom) };
    });
    check(tag, 'tendencia en cada fila del desglose, debajo del monto', spk.len === 3 && spk.pts.every(x => x === spk.n) && spk.vis.every(Boolean) && spk.below, JSON.stringify(spk));

    check(tag, 'categorías ordenadas por ganancia y suman ventas + servicio', cats.v.length > 2 && cats.v.every((x, i) => i === 0 || x <= cats.v[i - 1]) && catSum === vs, JSON.stringify({ catSum, vs }));

    // Más vendidos: ordenado de mayor a menor en cada métrica y con barras proporcionales
    const tops = [];
    for (const m of ['ventas', 'ganancia', 'unidades']) {
      await p.click(`label.pn-seg:has(input[value="${m}"])`); await quieto(p);
      tops.push(await p.evaluate(m => {
        const li = [...document.querySelectorAll('.pn-rank li')], v = li.map(l => +l.dataset.v), max = Math.max(...v);
        const sc = li.map(l => new DOMMatrix(getComputedStyle(l.querySelector('.pn-bar')).transform).a);
        return { m, ok: li.length === 5 && v.every((x, i) => i === 0 || x <= v[i - 1]) && sc.every((x, i) => Math.abs(x - v[i] / max) < .01) && document.querySelector(`input[value="${m}"]`).checked, v };
      }, m));
    }
    check(tag, 'más vendidos: ordenado en cada métrica y barras proporcionales', tops.every(t => t.ok), JSON.stringify(tops));

    // Detalle: abre con el foco adentro y el panel inert; Escape lo cierra, queda oculto e inert y el foco vuelve a la fila
    const row = p.locator('.pn-ult .pn-mov').first();
    const rowId = await row.getAttribute('data-id');
    await row.click(); await p.waitForTimeout(450);
    const opened = await p.evaluate(id => {
      const sh = document.querySelector('.pn-sheet');
      return { open: sh.classList.contains('open') && !sh.inert && getComputedStyle(sh).visibility === 'visible', focusIn: sh.contains(document.activeElement), bgInert: document.querySelector('.pn').inert, same: document.querySelector('.pn-det')?.dataset.id === id, lock: document.documentElement.classList.contains('lock') };
    }, rowId);
    const sheetA11y = await p.evaluate(panelA11y, '.pn-layer');
    await p.keyboard.press('Escape'); await p.waitForTimeout(450);
    const closed = await p.evaluate(id => {
      const sh = document.querySelector('.pn-sheet');
      return { hidden: sh.inert && getComputedStyle(sh).visibility === 'hidden', focusBack: document.activeElement?.dataset?.id === id, bgFree: !document.querySelector('.pn').inert, unlock: !document.documentElement.classList.contains('lock') };
    }, rowId);
    check(tag, 'detalle: abre con el foco adentro y el resto inert', Object.values(opened).every(Boolean), JSON.stringify(opened));
    check(tag, 'detalle: Escape lo cierra, queda oculto y el foco vuelve a la fila', Object.values(closed).every(Boolean), JSON.stringify(closed));
    check(tag, 'detalle: letra ≥ 13 px y botones de 44 px', sheetA11y.tiny.length === 0 && sheetA11y.small.length === 0, [...sheetA11y.tiny, ...sheetA11y.small].join(' | '));

    // Formularios (maqueta: no guardan). Venta: vacía marca errores y lleva el foco al primero; completa se agrega
    // como "Sin guardar", suma su ganancia exacta y el foco vuelve al botón. La nota con "=" sale escapada en la planilla.
    const totalOf = () => p.evaluate(() => document.querySelector('#pn-total').textContent);
    const rowOf = k => p.evaluate(k => document.querySelector(`.pn-des .pn-row[data-k="${k}"] .pn-amt`).textContent, k);
    const t0 = PARSE_ARS(await totalOf());
    await p.click('.pn-act[data-act="venta"]'); await p.waitForTimeout(450);
    const firstField = await p.evaluate(() => document.activeElement.id);
    await p.click('.pn-sheet button[type="submit"]'); await p.waitForTimeout(150);
    const inval = await p.evaluate(() => ({ prod: document.querySelector('#f-prod').getAttribute('aria-invalid'), focus: document.activeElement.id, desc: document.querySelector('#f-prod').getAttribute('aria-describedby') }));
    await p.selectOption('#f-prod', 'ins-105a'); await p.fill('#f-qty', '2'); await p.fill('#f-note', '=HYPERLINK("x")'); await p.waitForTimeout(100);
    const prev = await p.evaluate(() => document.querySelector('#pn-prev').textContent);
    const gan = PARSE_ARS(prev.match(/Ganancia\s*([^()]+)/)[1]);
    await p.click('.pn-sheet button[type="submit"]'); await p.waitForTimeout(500);
    const venta = await p.evaluate(() => ({ closed: document.querySelector('.pn-sheet').inert, focus: document.activeElement?.dataset?.act, first: document.querySelector('.pn-ult .pn-mov')?.textContent ?? '', toast: document.querySelector('.pn-toasts').textContent }));
    const t1 = PARSE_ARS(await totalOf());
    check(tag, 'registrar venta: abre en el primer campo; vacía marca errores y enfoca el primero', firstField === 'f-prod' && inval.prod === 'true' && inval.focus === 'f-prod' && /f-prod-e/.test(inval.desc ?? ''), JSON.stringify({ firstField, ...inval }));
    check(tag, 'registrar venta: se agrega "Sin guardar", suma su ganancia y el foco vuelve', venta.closed && venta.focus === 'venta' && /Sin guardar/.test(venta.first) && /no se guardó/.test(venta.toast) && gan > 0 && t1 - t0 === gan, JSON.stringify({ ...venta, gan, t0, t1 }));

    // Gasto: resta exacto del total y suma en "Gastos"
    const g0 = PARSE_ARS(await rowOf('gastos'));
    await p.click('.pn-act[data-act="gasto"]'); await p.waitForTimeout(450);
    await p.click('.pn-sheet button[type="submit"]'); await p.waitForTimeout(150);
    const gInv = await p.evaluate(() => ['#f-cat', '#f-con', '#f-gamt'].every(s => document.querySelector(s).getAttribute('aria-invalid') === 'true'));
    await p.selectOption('#f-cat', 'servicios'); await p.fill('#f-con', 'Luz de prueba'); await p.fill('#f-gamt', '10.000'); await p.waitForTimeout(100);
    await p.click('.pn-sheet button[type="submit"]'); await p.waitForTimeout(500);
    const g1 = PARSE_ARS(await rowOf('gastos')), t2 = PARSE_ARS(await totalOf());
    check(tag, 'registrar gasto: valida, resta $ 10.000 del total y suma en gastos', gInv && g1 - g0 === -10000 && t1 - t2 === 10000, JSON.stringify({ gInv, g0, g1, t1, t2 }));

    // Cobro desde el aviso: viene completo, suma en "Servicio técnico" y el aviso desaparece
    const s0 = PARSE_ARS(await rowOf('servicio'));
    await p.click('.pn-aviso-btn'); await p.waitForTimeout(450);
    const cob = await p.evaluate(() => ({ ord: document.querySelector('#f-ord').value, amt: document.querySelector('#f-amt').value }));
    await p.click('.pn-sheet button[type="submit"]'); await p.waitForTimeout(500);
    const s1 = PARSE_ARS(await rowOf('servicio'));
    const avisoGone = await p.evaluate(() => !document.querySelector('.pn-aviso') && document.activeElement?.classList.contains('pn-t'));
    check(tag, 'cobrar desde el aviso: viene completo, suma en servicio y el aviso se va', cob.ord === 'AT-7KQ2-9M' && cob.amt === '45000' && s1 - s0 === 45000 && avisoGone, JSON.stringify({ cob, s0, s1, avisoGone }));

    // Exportar: planilla CSV con BOM, encabezado, lo cargado ("Sin guardar") y la fórmula escapada
    await p.click('.pn-act[data-act="exportar"]'); await p.waitForTimeout(450);
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.pn-sheet .btn')]);
    const csvTxt = (await import('node:fs')).readFileSync(await dl.path(), 'utf8');
    const lines = csvTxt.trim().split(/\r\n/);
    check(tag, 'exportar: planilla CSV con datos de ejemplo y fórmulas escapadas', /EJEMPLO/.test(dl.suggestedFilename()) && csvTxt.startsWith('﻿Fecha;Hora;N.º;Tipo') && lines.length > 20 && lines.filter(l => /Sin guardar/.test(l)).length === 3 && csvTxt.includes(`"'=HYPERLINK(""x"")"`) && !/;=/.test(csvTxt), JSON.stringify({ name: dl.suggestedFilename(), n: lines.length, first: lines[1] }));
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(150);
    const pillStill = await p.evaluate(() => { const r = document.querySelector('.pn-ej').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
    check(tag, 'la píldora "Ejemplo" queda a la vista al bajar', pillStill);
    const ow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(tag, 'sin scroll horizontal', ow <= 0, `${ow}px`);
    if (WANT_SHOTS) await p.screenshot({ path: `${SHOTS}${tag}--resumen.png`, fullPage: true });
    await p.goto(PANEL + '/movimientos'); await p.waitForTimeout(400);
    const mv = await p.evaluate(() => {
      const tabs = [...document.querySelectorAll('.pn-tab')], cur = document.querySelector('.pn-tab[aria-current="page"]'), r = cur?.getBoundingClientRect();
      return { h1: document.querySelector('h1')?.textContent, n: tabs.length, cur: cur?.getAttribute('href'), seen: !!r && r.bottom > 0 && r.top < innerHeight, banner: !!document.querySelector('#pn-demo') };
    });
    check(tag, 'movimientos carga con su pestaña marcada (Resumen · Movimientos · Inventario a la vista)', mv.h1 === 'Movimientos' && mv.n === 3 && mv.cur === '/panel/movimientos' && mv.seen && mv.banner, JSON.stringify(mv));
    if (w >= 1069) {
      const col = await p.evaluate(() => { const r = document.querySelector('main[data-tipo]').getBoundingClientRect(); return { w: Math.round(r.width), c: Math.round(r.left + r.width / 2 - innerWidth / 2) }; });
      check(tag, 'movimientos en una columna centrada de 760 px como máximo', col.w <= 760 && Math.abs(col.c) <= 1, JSON.stringify(col));
    }

    // Pestañas: cada una muestra solo su tipo, "Todos" es la suma y la dirección refleja el filtro
    const counts = {};
    for (const t of ['ventas', 'reparaciones', 'gastos', 'todos']) {
      await p.click(`label.pn-chip:has(input[value="${t}"])`); await p.waitForTimeout(200);
      counts[t] = await p.evaluate(t => {
        const k = { ventas: 'venta', reparaciones: 'reparacion', gastos: 'gasto' }[t], rows = [...document.querySelectorAll('.pn-mov')];
        return { n: rows.length, ok: rows.every(r => !k || r.dataset.kind === k), url: location.search };
      }, t);
    }
    check(tag, 'movimientos: las pestañas filtran y "Todos" es la suma', Object.values(counts).every(c => c.ok && c.n > 0) && counts.todos.n === counts.ventas.n + counts.reparaciones.n + counts.gastos.n && counts.gastos.url === '?tipo=gastos' && counts.todos.url === '', JSON.stringify(counts));
    // Agrupados por día, del más nuevo al más viejo; cada fila en su día
    const order = await p.evaluate(() => {
      const g = [...document.querySelectorAll('.pn-group')], ymd = g.map(x => x.dataset.ymd);
      return { n: g.length, dec: ymd.every((d, i) => i === 0 || d < ymd[i - 1]), match: g.every(x => [...x.querySelectorAll('.pn-mov')].every(r => r.dataset.ymd === x.dataset.ymd)) };
    });
    check(tag, 'movimientos: agrupados por día, del más nuevo al más viejo', order.n > 10 && order.dec && order.match, JSON.stringify(order));
    // La ganancia de 7 días del resumen es la suma de los movimientos de esos 7 días
    const sum7 = await p.evaluate(() => {
      const hoy = document.querySelector('.pn-movl').dataset.hoy;
      const from = new Date(Date.UTC(+hoy.slice(0, 4), +hoy.slice(5, 7) - 1, +hoy.slice(8, 10)) - 6 * 864e5).toISOString().slice(0, 10);
      return [...document.querySelectorAll('.pn-mov')].filter(r => r.dataset.ymd >= from).reduce((a, r) => a + +r.dataset.res, 0);
    });
    check(tag, 'la ganancia de 7 días coincide con la suma de sus movimientos', sum7 === PARSE_ARS(ranges[0].total), `${sum7} vs ${ranges[0].total}`);
    // "Mostrar 30 días más" suma filas
    const n0 = await p.evaluate(() => document.querySelectorAll('.pn-mov').length);
    await p.click('.pn-more'); await p.waitForTimeout(250);
    const more = await p.evaluate(() => ({ n: document.querySelectorAll('.pn-mov').length, txt: document.querySelector('.pn-count').textContent }));
    check(tag, 'movimientos: "Mostrar 30 días más" suma filas', more.n > n0 && /60 días/.test(more.txt), `${n0} → ${JSON.stringify(more)}`);
    const mvA11y = await p.evaluate(panelA11y);
    check(tag, 'movimientos: letra ≥ 13 px, 44 px y títulos sin saltos', mvA11y.tiny.length === 0 && mvA11y.small.length === 0 && mvA11y.h1 === 1 && !mvA11y.jump, JSON.stringify(mvA11y).slice(0, 300));
    await p.click('.pn-reg'); await p.waitForTimeout(450);
    const optFocus = await p.evaluate(() => document.activeElement?.dataset?.act);
    await p.click('.pn-opt[data-act="gasto"]'); await p.waitForTimeout(450);
    const chain = await p.evaluate(() => document.querySelector('#pn-sh-h').textContent);
    await p.keyboard.press('Escape'); await p.waitForTimeout(450);
    const back = await p.evaluate(() => document.activeElement?.classList.contains('pn-reg'));
    check(tag, 'movimientos: "Registrar" → opción → formulario; Escape vuelve a "Registrar"', optFocus === 'venta' && chain === 'Registrar gasto' && back, JSON.stringify({ optFocus, chain, back }));
    // ?tipo preselecciona; un valor desconocido cae en "Todos"
    await p.goto(PANEL + '/movimientos?tipo=gastos'); await p.waitForTimeout(300);
    const pre = await p.evaluate(() => document.querySelector('input[value="gastos"]').checked && [...document.querySelectorAll('.pn-mov')].every(r => r.dataset.kind === 'gasto'));
    await p.goto(PANEL + '/movimientos?tipo=%3Cscript%3E'); await p.waitForTimeout(300);
    const bad = await p.evaluate(() => document.querySelector('input[value="todos"]').checked);
    check(tag, 'movimientos: ?tipo=gastos preselecciona y un valor raro cae en "Todos"', pre && bad, JSON.stringify({ pre, bad }));
    if (WANT_SHOTS) await p.screenshot({ path: `${SHOTS}${tag}--movimientos.png`, fullPage: true });
    check(tag, 'sin errores de consola (incluidas CSP e hidratación)', errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (e) {
    check(tag, 'flujo del panel sin excepciones', false, e.message.split('\n')[0]);
  }
  await ctx.close();
}

// Inventario: lista con filtros y búsqueda; la ficha se abre desde la fila; vender, reponer, contar, editar y pausar
// cambian lo que se ve (sin guardar); vender una PC descuenta sus piezas; un producto nuevo tiene su ficha.
// Todo con navegación dentro del panel: lo cargado vive en la visita.
for (const [w, h, scheme] of [[320, 640, 'light'], [390, 844, 'dark'], [1440, 900, 'light']]) {
  const tag = `panel-inventario-${w}-${scheme === 'dark' ? 'oscuro' : 'claro'}`;
  const { ctx, p, errs } = await panelPage(w, h, scheme);
  const go = async sel => { await p.click(sel); await p.waitForTimeout(700); };
  const sheet = async (sel, fill) => {
    await go(sel);
    for (const [k, v] of fill) await p.fill(k, v);
    await p.click('.pn-sheet button[type="submit"]'); await p.waitForTimeout(600);
  };
  const ficha = () => p.evaluate(() => ({
    url: location.pathname, h1: document.querySelector('h1')?.textContent, stock: document.querySelector('#pn-f-stock')?.textContent,
    first: (r => r && { tipo: r.dataset.tipo, qty: +r.dataset.qty, despues: +r.dataset.despues, txt: r.textContent })(document.querySelector('.pn-sm')),
  }));
  const ow = () => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  try {
    await p.goto(PANEL); await quieto(p);
    await go('.pn-tab[href="/panel/inventario"]');
    const list = await p.evaluate(() => {
      const rows = [...document.querySelectorAll('.pn-inv')], bar = document.querySelector('.pn-tabs').getBoundingClientRect();
      return { h1: document.querySelector('h1')?.textContent, cur: document.querySelector('.pn-tab[aria-current]')?.getAttribute('href'), n: rows.length,
        bajo: +document.querySelector('#pn-inv-bajo').textContent, sin: +document.querySelector('#pn-inv-sin').textContent,
        nb: rows.filter(r => r.dataset.nivel === 'bajo').length, ns: rows.filter(r => r.dataset.nivel === 'sin').length,
        pc: rows.find(r => r.dataset.id === 'pc-office')?.dataset.stock, valor: document.querySelector('#pn-inv-valor').textContent,
        // En el celular la barra de pestañas va abajo; en la compu, en la barra de arriba
        bar: innerWidth < 735 ? Math.round(innerHeight - bar.bottom) : Math.round(bar.top) };
    });
    check(tag, 'inventario: 17 artículos con su estado, valor del stock y pestaña marcada; la PC tiene el stock de sus piezas', list.h1 === 'Inventario' && list.cur === '/panel/inventario' && list.n === 17 && list.bajo === list.nb && list.sin === list.ns && list.bajo > 0 && list.pc === '3' && PARSE_ARS(list.valor) > 0 && list.bar <= 4, JSON.stringify(list));
    const c = await p.evaluate(panelContrast), a = await p.evaluate(panelA11y);
    check(tag, 'inventario: contraste AA, letra ≥ 13 px, 44 px y títulos sin saltos', c.length === 0 && a.tiny.length === 0 && a.small.length === 0 && a.h1 === 1 && !a.jump, JSON.stringify({ c: c.slice(0, 4), tiny: a.tiny, small: a.small, hs: a.hs }));
    // Filtros (la dirección refleja el filtro) y búsqueda sin acentos
    const filt = {};
    for (const f of ['bajo', 'sin', 'piezas', 'todos']) {
      await p.click(`label.pn-chip:has(input[value="${f}"])`); await p.waitForTimeout(200);
      filt[f] = await p.evaluate(f => { const r = [...document.querySelectorAll('.pn-inv')]; return { n: r.length, ok: r.every(x => f === 'todos' || (f === 'piezas' ? x.dataset.id.startsWith('pz-') : x.dataset.nivel === f)), url: location.search }; }, f);
    }
    await p.fill('#pn-buscar', 'toner'); await p.waitForTimeout(200);
    const busca = await p.evaluate(() => [...document.querySelectorAll('.pn-inv')].map(r => r.dataset.id).join());
    await p.fill('#pn-buscar', '');
    check(tag, 'inventario: filtros (bajo, sin stock, piezas) y búsqueda sin acentos', filt.bajo.ok && filt.bajo.n === list.bajo && filt.sin.ok && filt.sin.n === list.sin && filt.piezas.ok && filt.piezas.n === 6 && filt.todos.n === 17 && filt.bajo.url === '?filtro=bajo' && filt.todos.url === '' && busca === 'ins-105a', JSON.stringify({ filt, busca }));
    check(tag, 'inventario: sin scroll horizontal (lista)', await ow() <= 0, `${await ow()}px`);
    if (WANT_SHOTS) await p.screenshot({ path: `${SHOTS}${tag}--lista.png`, fullPage: true });

    // Ficha del tóner: vender baja el stock (y no deja vender más de lo que hay)
    await go('.pn-inv[data-id="ins-105a"]');
    const f0 = await ficha();
    await go('.pn-facts [data-act="venta"]');
    const pre = await p.evaluate(() => ({ prod: document.querySelector('#f-prod').value, focus: document.activeElement?.id }));
    await p.fill('#f-qty', '99'); await p.click('.pn-sheet button[type="submit"]'); await p.waitForTimeout(150);
    const tope = await p.evaluate(() => document.querySelector('#f-qty-e')?.textContent);
    await p.fill('#f-qty', '2'); await p.click('.pn-sheet button[type="submit"]'); await p.waitForTimeout(600);
    const f1 = await ficha();
    check(tag, 'ficha: se abre desde la fila; vender 2 baja el stock de 18 a 16 y no deja vender más de lo que hay', f0.url === '/panel/inventario/ins-105a' && f0.h1 === 'Tóner 105A compatible' && f0.stock === '18 u.' && pre.prod === 'ins-105a' && pre.focus === 'f-qty' && tope === 'Hay 18 en stock' && f1.stock === '16 u.' && f1.first?.tipo === 'venta' && f1.first.qty === -2 && f1.first.despues === 16 && /Sin guardar/.test(f1.first.txt), JSON.stringify({ f0: f0.stock, pre, tope, f1 }));
    const fc = await p.evaluate(panelContrast), fa = await p.evaluate(panelA11y);
    check(tag, 'ficha: contraste AA, letra ≥ 13 px, 44 px y títulos sin saltos', fc.length === 0 && fa.tiny.length === 0 && fa.small.length === 0 && fa.h1 === 1 && !fa.jump, JSON.stringify({ c: fc.slice(0, 4), tiny: fa.tiny, small: fa.small, hs: fa.hs }));
    // Reponer suma; contar otra cantidad deja un ajuste; editar el precio cambia la ganancia; pausar la marca
    await sheet('.pn-facts [data-act="reponer"]', [['#f-rqty', '5']]);
    const f2 = await ficha();
    await sheet('.pn-facts [data-act="editar"]', [['#f-eprice', '30.000'], ['#f-estock', '20']]);
    const f3 = await p.evaluate(() => ({ stock: document.querySelector('#pn-f-stock').textContent, precio: document.querySelector('#pn-f-precio').textContent, gan: document.querySelector('#pn-f-gan').textContent, margen: document.querySelector('#pn-f-margen').textContent, tipo: document.querySelector('.pn-sm').dataset.tipo, qty: +document.querySelector('.pn-sm').dataset.qty }));
    await go('.pn-facts [data-act="pausar"]');
    const pausa = await p.evaluate(() => ({ tag: !!document.querySelector('#pn-f-pausa'), btn: document.querySelector('[data-act="pausar"]').textContent }));
    check(tag, 'ficha: reponer 5 suma (16 → 21), contar 20 deja un ajuste de −1, el precio nuevo cambia la ganancia y pausar la marca', f2.stock === '21 u.' && f2.first?.tipo === 'repo' && f2.first.qty === 5 && f3.stock === '20 u.' && f3.tipo === 'ajuste' && f3.qty === -1 && PARSE_ARS(f3.precio) === 30000 && PARSE_ARS(f3.gan) === 30000 - 16200 && /46/.test(f3.margen) && pausa.tag && pausa.btn === 'Mostrar en la tienda', JSON.stringify({ f2: f2.stock, f3, pausa }));
    await go('.pn-back');
    const vuelta = await p.evaluate(() => { const r = document.querySelector('.pn-inv[data-id="ins-105a"]'); return { stock: r?.dataset.stock, txt: r?.textContent }; });
    check(tag, 'la lista sigue a la ficha (stock 20, precio nuevo y "Pausado")', vuelta.stock === '20' && /30\.000/.test(vuelta.txt) && /Pausado/.test(vuelta.txt), JSON.stringify(vuelta));

    // PC armada: vender una descuenta una pieza de cada una
    await go('.pn-inv[data-id="pc-office"]');
    const pz0 = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.pn-pz .pn-inv')].map(r => [r.dataset.id, +r.dataset.stock])));
    await go('.pn-facts [data-act="venta"]');
    await p.click('.pn-sheet button[type="submit"]'); await p.waitForTimeout(600);
    const pc = await p.evaluate(() => ({ stock: document.querySelector('#pn-f-stock').textContent, pz: Object.fromEntries([...document.querySelectorAll('.pn-pz .pn-inv')].map(r => [r.dataset.id, +r.dataset.stock])) }));
    await go('.pn-pz .pn-inv[data-id="pz-cpu-8600g"]');
    const cpu = await ficha();
    check(tag, 'vender una PC: baja a 2 y descuenta una pieza de cada una (la pieza lo registra como armado)', pc.stock === '2 u.' && Object.keys(pz0).length === 6 && Object.entries(pz0).every(([k, v]) => pc.pz[k] === v - 1) && cpu.stock === `${pz0['pz-cpu-8600g'] - 1} u.` && /Armado de PC Oficina AT/.test(cpu.first?.txt) && /Sin guardar/.test(cpu.first?.txt), JSON.stringify({ pz0, pc, cpu: cpu.stock }));
    check(tag, 'inventario: sin scroll horizontal (ficha)', await ow() <= 0, `${await ow()}px`);
    if (WANT_SHOTS) await p.screenshot({ path: `${SHOTS}${tag}--ficha.png`, fullPage: true });

    // Producto nuevo: valida, se agrega y abre su ficha; queda en la lista y se puede vender
    await go('.pn-back');
    await go('.pn-head [data-act="nuevo"]');
    await p.click('.pn-sheet button[type="submit"]'); await p.waitForTimeout(150);
    const nInv = await p.evaluate(() => ['#f-ncat', '#f-nbrand', '#f-nname', '#f-nprice', '#f-ncost'].every(s => document.querySelector(s).getAttribute('aria-invalid') === 'true') && document.activeElement?.id === 'f-ncat');
    await p.selectOption('#f-ncat', 'perifericos');
    for (const [k, v] of [['#f-nbrand', 'Genius'], ['#f-nname', 'Mouse DX-110'], ['#f-nprice', '9.999'], ['#f-ncost', '6.000'], ['#f-nstock', '4']]) await p.fill(k, v);
    await Promise.all([p.waitForURL(/\/panel\/inventario\/nuevo-/, { timeout: 15000 }), p.click('.pn-sheet button[type="submit"]')]);
    await p.waitForTimeout(800);
    const nuevo = await ficha();
    await go('.pn-back');
    const enLista = await p.evaluate(() => { const r = [...document.querySelectorAll('.pn-inv')].find(x => /Mouse DX-110/.test(x.textContent)); return r && { stock: r.dataset.stock, txt: r.textContent }; });
    check(tag, 'producto nuevo: valida, abre su ficha con su stock y queda en la lista como "Sin guardar"', nInv && /^\/panel\/inventario\/nuevo-\d+$/.test(nuevo.url) && nuevo.h1 === 'Mouse DX-110' && nuevo.stock === '4 u.' && nuevo.first?.tipo === 'alta' && enLista?.stock === '4' && /Sin guardar/.test(enLista.txt), JSON.stringify({ nInv, nuevo, enLista }));
    check(tag, 'sin errores de consola (incluidas CSP e hidratación)', errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (e) {
    check(tag, 'flujo del inventario sin excepciones', false, e.message.split('\n')[0]);
  }
  await ctx.close();
}
{
  // Con sesión, un artículo que no existe da 404 (los ids se validan en el servidor)
  const { ctx, p } = await panelPage(390, 844, 'light');
  const r = await p.goto(PANEL + '/inventario/no-existe');
  check('panel-inventario', 'un artículo que no existe responde 404', r.status() === 404 && /No encontramos esta página/.test(await p.evaluate(() => document.body.textContent)), String(r.status()));
  await ctx.close();
}

// Panel: contraste AA en claro y oscuro (con el detalle del gráfico abierto) y sin animaciones infinitas
for (const scheme of ['light', 'dark']) for (const w of [1440, 390]) {
  const { ctx, p } = await panelPage(w, 900, scheme);
  await p.goto(PANEL); await p.waitForTimeout(500);
  await p.focus('.pn-hit'); await p.keyboard.press('Home');
  const bad = await p.evaluate(panelContrast);
  await p.evaluate(() => document.activeElement.blur());
  await p.locator('.pn-ult .pn-mov').first().click(); await p.waitForTimeout(450);
  bad.push(...await p.evaluate(panelContrast, '.pn-layer *'));
  check(`panel-contraste-${scheme === 'dark' ? 'oscuro' : 'claro'}`, `texto AA y líneas del gráfico ≥ 3:1 a ${w}px`, bad.length === 0, bad.slice(0, 6).join(' | '));
  await ctx.close();
}
{
  const { ctx, p } = await panelPage(1440, 900, 'light');
  await p.goto(PANEL); await p.waitForTimeout(400);
  await p.click('.pn-aviso-x'); await p.waitForTimeout(100);
  check('panel-1440-claro', 'el aviso del día se puede cerrar y el foco va al título', await p.evaluate(() => !document.querySelector('.pn-aviso') && document.activeElement?.classList.contains('pn-t')));
  await ctx.close();
}
for (const scheme of ['light', 'dark']) for (const w of [390, 1440]) {
  const { ctx, p } = await panelPage(w, 900, scheme);
  await p.goto(PANEL); await p.waitForTimeout(400);
  await p.click('.pn-act[data-act="venta"]'); await p.waitForTimeout(450);
  await p.click('.pn-sheet button[type="submit"]'); await p.waitForTimeout(150);
  await p.selectOption('#f-prod', 'ins-105a'); await p.fill('#f-cost', '99999'); await p.waitForTimeout(100);
  const bad = await p.evaluate(panelContrast, '.pn-layer *');
  const a = await p.evaluate(panelA11y, '.pn-layer');
  const tagF = `panel-formulario-${scheme === 'dark' ? 'oscuro' : 'claro'}`;
  check(tagF, `contraste AA con errores y aviso de pérdida a ${w}px`, bad.length === 0, bad.slice(0, 6).join(' | '));
  check(tagF, `letra ≥ 13 px y controles de 44 px a ${w}px`, a.tiny.length === 0 && a.small.length === 0, [...a.tiny, ...a.small].join(' | '));
  await ctx.close();
}
// Hojas prolijas: la X centrada con el título y al ras del contenido, sin barra de scroll nativa, Precio y Costo a la
// misma altura, campos que no son negros en oscuro y el botón principal siempre a la vista aunque el formulario scrollee
for (const [w, h, scheme] of [[390, 700, 'light'], [1440, 640, 'dark'], [1440, 1000, 'light']]) {
  const { ctx, p } = await panelPage(w, h, scheme);
  await p.goto(PANEL); await p.waitForTimeout(400);
  const geo = () => p.evaluate(() => {
    const sb = document.querySelector('.pn-sheet.open .pn-sheet-b'), x = document.querySelector('.pn-sheet.open .pn-close'), t = sb.querySelector('.pn-sh-t');
    const R = e => e.getBoundingClientRect(), s = R(sb), xr = R(x), tr = R(t), pad = parseFloat(getComputedStyle(x).paddingRight);
    const foot = sb.querySelector('.pn-foot button'), unit = sb.querySelector('#f-unit'), cost = sb.querySelector('#f-cost');
    return { mid: Math.round(xr.top + xr.height / 2 - (tr.top + parseFloat(getComputedStyle(t).lineHeight) / 2)), edge: Math.round(xr.right - pad - (s.right - parseFloat(getComputedStyle(sb).paddingRight))),
      hit: Math.min(xr.width, xr.height), bar: sb.offsetWidth - sb.clientWidth, foot: foot ? R(foot).bottom <= s.bottom + .5 && R(foot).top >= s.top : null,
      precio: unit && cost ? Math.round(R(unit).top - R(cost).top) : null, fondo: unit ? getComputedStyle(unit).backgroundColor : null };
  });
  await p.click('.pn-act[data-act="venta"]'); await p.waitForTimeout(450);
  const v = await geo();
  await p.keyboard.press('Escape'); await p.waitForTimeout(450);
  await p.locator('.pn-ult .pn-mov').first().click(); await p.waitForTimeout(450);
  const d = await geo();
  const tagS = `panel-hojas-${w}-${scheme === 'dark' ? 'oscuro' : 'claro'}`;
  check(tagS, 'la X centrada con el título (±2 px), al ras del contenido (±1 px) y de 44 px, en la venta y en el detalle', [v, d].every(g => Math.abs(g.mid) <= 2 && Math.abs(g.edge) <= 1 && g.hit >= 44), JSON.stringify({ v, d }));
  check(tagS, 'sin barra de scroll nativa y el botón "Agregar venta" a la vista', v.bar === 0 && d.bar === 0 && v.foot === true, JSON.stringify(v));
  check(tagS, w > 420 ? 'Precio y Costo a la misma altura' : 'Precio y Costo apilados', w > 420 ? v.precio === 0 : v.precio < 0, String(v.precio));
  if (scheme === 'dark') check(tagS, 'los campos no son negros en oscuro', v.fondo !== 'rgb(0, 0, 0)', v.fondo);
  await ctx.close();
}
for (const w of [768, 820, 900]) {
  const { ctx, p } = await panelPage(w, 1024, 'light');
  await p.goto(PANEL); await p.waitForTimeout(400);
  const vis = await p.evaluate(() => [...document.querySelectorAll('.pn-sheet, .pn-scrim')].map(e => getComputedStyle(e).visibility + (e.inert || e.classList.contains('pn-scrim') ? '' : '!inert')));
  check('panel-ventanas', `hojas cerradas ocultas e inert a ${w}px`, vis.length === 2 && vis.every(v => v === 'hidden'), vis.join(','));
  await ctx.close();
}
for (const rm of ['no-preference', 'reduce']) {
  const { ctx, p } = await panelPage(1440, 900, 'light', { reducedMotion: rm });
  await p.goto(PANEL); await p.waitForTimeout(400);
  await p.click('label.pn-chip:has(input[value="7d"])'); await p.waitForTimeout(100);
  const loops = await p.evaluate(() => document.getAnimations().filter(a => a.effect?.getTiming().iterations === Infinity).length);
  check('panel-movimiento', `sin animaciones infinitas${rm === 'reduce' ? ' (reducir movimiento)' : ''}`, loops === 0, String(loops));
  if (rm === 'reduce') {
    const still = await p.evaluate(() => ({ running: document.getAnimations().filter(a => a.playState === 'running').length,
      cards: [...document.querySelectorAll('.pn-grid>*')].every(c => getComputedStyle(c).opacity === '1'),
      veil: getComputedStyle(document.querySelector('.pn-plot'), '::after').transform }));
    check('panel-movimiento', 'reducir movimiento: tarjetas y gráfico a la vista de una, sin esperas', still.running === 0 && still.cards && /^matrix\(0, 0, 0, 1/.test(still.veil), JSON.stringify(still));
  }
  await ctx.close();
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
