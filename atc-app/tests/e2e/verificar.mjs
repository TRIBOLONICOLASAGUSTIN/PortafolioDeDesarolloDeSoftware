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
  await nogl.close();
}

// Marcas: logos con nombre accesible, la copia del bucle oculta a lectores de pantalla y, con "reducir movimiento",
// los logos se ven (la regla que oculta la copia no debe ocultar los SVG de cada logo); nunca "oficial" ni "distribuidor"
for (const rm of ['no-preference', 'reduce']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: rm });
  const p = await ctx.newPage(); await p.goto(HTML); await p.waitForTimeout(400);
  const m = await p.evaluate(() => {
    const own = [...document.querySelectorAll('.mq-track>.bl[role="img"]')];
    return { n: own.length, named: own.every(b => b.getAttribute('aria-label')), visible: own.filter(b => b.querySelector('svg').getBoundingClientRect().width > 0).length,
      copies: [...document.querySelectorAll('.mq-track>.bl:not([role])')].every(b => b.getAttribute('aria-hidden') === 'true'),
      claim: /oficial|distribuidor|autorizado/i.test(document.querySelector('.brands').textContent) };
  });
  check('marcas', `logos visibles y con nombre${rm === 'reduce' ? ' (reducir movimiento)' : ''}`, m.n >= 10 && m.named && m.visible === m.n && m.copies && !m.claim, JSON.stringify(m));
  await ctx.close();
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

// Panel del dueño (etapa 1, maqueta con datos de ejemplo): solo existe con ATC_DEMO=1 (este servidor lo tiene).
const PANEL = server.base + '/panel';
const PANEL_VPS = [[390, 844, 'light'], [820, 1180, 'dark'], [1440, 900, 'light']];
const panelPage = async (w, h, scheme, opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, hasTouch: w < 900, ...opts });
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
const panelContrast = () => {
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
  for (const el of document.querySelectorAll('.pn *')) {
    if (el.closest('.sr') || !el.getClientRects().length) continue;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el); if (cs.visibility !== 'visible' || +cs.opacity === 0) continue;
    const bg = bgOf(el), fg = over(rgba(cs.color), bg), fs = parseFloat(cs.fontSize), big = fs >= 24 || (fs >= 18.66 && +cs.fontWeight >= 700);
    const r = ratio(fg, bg);
    if (r < (big ? 3 : 4.5)) bad.push(`${(el.className && el.className.toString().split(' ')[0]) || el.tagName}:"${el.textContent.trim().slice(0, 16)}" ${r.toFixed(2)}`);
  }
  // Líneas del gráfico: 3:1 contra la tarjeta (elemento gráfico)
  for (const l of document.querySelectorAll('.pn-l')) { const r = ratio(rgba(getComputedStyle(l).stroke), bgOf(l.closest('.pn-card'))); if (r < 3) bad.push(`${l.getAttribute('class')} ${r.toFixed(2)}`); }
  return [...new Set(bad)];
};
// Letra mínima (13 px), áreas táctiles (44 px) y títulos sin saltos de nivel dentro del panel
const panelA11y = () => {
  const tiny = [], small = [];
  for (const el of document.querySelectorAll('.pn *')) {
    if (el.closest('.sr') || !el.getClientRects().length) continue;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el); if (cs.visibility !== 'visible') continue;
    if (parseFloat(cs.fontSize) < 13) tiny.push(`${(el.className && el.className.toString().split(' ')[0]) || el.tagName}:${cs.fontSize}`);
  }
  for (const el of document.querySelectorAll('.pn a, .pn button, .pn summary, .pn label.pn-chip, .pn label.pn-seg, .pn [role="slider"]')) {
    if (el.closest('p, .sr') && el.tagName === 'A' || !el.getClientRects().length || getComputedStyle(el).visibility !== 'visible') continue;
    const r = el.getBoundingClientRect(); if (r.width < 43.5 || r.height < 43.5) small.push(`${(el.className && el.className.toString().split(' ')[0]) || el.tagName}:${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  const hs = [...document.querySelectorAll('h1, h2, h3, h4')].filter(h => h.getClientRects().length || h.closest('.sr')).map(h => +h.tagName[1]);
  const jump = hs.some((l, i) => i > 0 && l > hs[i - 1] + 1);
  return { tiny: [...new Set(tiny)], small: [...new Set(small)], h1: hs.filter(l => l === 1).length, jump, hs: hs.join('') };
};
for (const [w, h, scheme] of PANEL_VPS) {
  const tag = `panel-${w}-${scheme === 'dark' ? 'oscuro' : 'claro'}`;
  const { ctx, p, errs } = await panelPage(w, h, scheme);
  try {
    await p.goto(PANEL); await p.waitForTimeout(500);
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
      await p.click(`label.pn-chip:has(input[value="${id}"])`); await p.waitForTimeout(250);
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
    await p.click('label.pn-chip:has(input[value="30d"])'); await p.waitForTimeout(250);

    // Teclado: Inicio, Fin y flechas recorren los puntos; el valor se lee con el monto
    await p.focus('.pn-hit');
    const kv = [];
    for (const k of ['Home', 'End', 'ArrowLeft']) { await p.keyboard.press(k); kv.push(await p.evaluate(() => [document.querySelector('.pn-hit').getAttribute('aria-valuenow'), document.querySelector('.pn-hit').getAttribute('aria-valuetext')])); }
    const tipKb = await p.evaluate(() => !!document.querySelector('.pn-tip'));
    check(tag, 'el gráfico se recorre con el teclado', kv[0][0] === '0' && kv[1][0] === '29' && kv[2][0] === '28' && /\$/.test(kv[2][1]) && tipKb, JSON.stringify(kv));
    await p.evaluate(() => document.activeElement.blur());

    // Verde arriba del $ 0 y rojo abajo, con los colores del tema; la línea del $ 0 queda dentro del dibujo
    const col = await p.evaluate(() => ({ up: getComputedStyle(document.querySelector('.pn-l-up')).stroke, dn: getComputedStyle(document.querySelector('.pn-l-dn')).stroke, y0: +document.querySelector('.pn-zero').getAttribute('y1') }));
    check(tag, 'gráfico: verde arriba del $ 0, rojo abajo, colores del tema', col.up === PANEL_COLORS[scheme][0] && col.dn === PANEL_COLORS[scheme][1] && col.y0 >= 0 && col.y0 <= 300, JSON.stringify(col));
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
    const grid = await p.evaluate(() => { const a = document.querySelector('.pn-gan').getBoundingClientRect(), b = document.querySelector('.pn-des').getBoundingClientRect(); return { same: Math.abs(a.top - b.top) < 1, below: b.top >= a.bottom }; });
    check(tag, w >= 1069 ? 'grilla: ganancia y desglose lado a lado' : 'grilla: tarjetas apiladas', w >= 1069 ? grid.same : grid.below, JSON.stringify(grid));
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(150);
    const pillStill = await p.evaluate(() => { const r = document.querySelector('.pn-ej').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
    check(tag, 'la píldora "Ejemplo" queda a la vista al bajar', pillStill);
    const ow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(tag, 'sin scroll horizontal', ow <= 0, `${ow}px`);
    if (WANT_SHOTS) await p.screenshot({ path: `${SHOTS}${tag}--resumen.png`, fullPage: true });
    await p.goto(PANEL + '/movimientos'); await p.waitForTimeout(400);
    const mv = await p.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, back: document.querySelector('.pn-back')?.getAttribute('href'), banner: !!document.querySelector('#pn-demo') }));
    check(tag, 'movimientos carga con la vuelta al resumen', mv.h1 === 'Movimientos' && mv.back === '/panel' && mv.banner, JSON.stringify(mv));
    if (WANT_SHOTS) await p.screenshot({ path: `${SHOTS}${tag}--movimientos.png`, fullPage: true });
    check(tag, 'sin errores de consola (incluidas CSP e hidratación)', errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (e) {
    check(tag, 'flujo del panel sin excepciones', false, e.message.split('\n')[0]);
  }
  await ctx.close();
}

// Panel: contraste AA en claro y oscuro (con el detalle del gráfico abierto) y sin animaciones infinitas
for (const scheme of ['light', 'dark']) for (const w of [1440, 390]) {
  const { ctx, p } = await panelPage(w, 900, scheme);
  await p.goto(PANEL); await p.waitForTimeout(500);
  await p.focus('.pn-hit'); await p.keyboard.press('Home');
  const bad = await p.evaluate(panelContrast);
  check(`panel-contraste-${scheme === 'dark' ? 'oscuro' : 'claro'}`, `texto AA y líneas del gráfico ≥ 3:1 a ${w}px`, bad.length === 0, bad.slice(0, 6).join(' | '));
  await ctx.close();
}
for (const rm of ['no-preference', 'reduce']) {
  const { ctx, p } = await panelPage(1440, 900, 'light', { reducedMotion: rm });
  await p.goto(PANEL); await p.waitForTimeout(400);
  await p.click('label.pn-chip:has(input[value="7d"])'); await p.waitForTimeout(100);
  const loops = await p.evaluate(() => document.getAnimations().filter(a => a.effect?.getTiming().iterations === Infinity).length);
  check('panel-movimiento', `sin animaciones infinitas${rm === 'reduce' ? ' (reducir movimiento)' : ''}`, loops === 0, String(loops));
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
