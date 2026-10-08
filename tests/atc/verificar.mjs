// Verificación del prototipo de AT Computación.
// Uso:   node tests/atc/verificar.mjs [--capturas]
// Requiere Playwright: `npm i -D playwright && npx playwright install chromium`
// (o la variable PW con la ruta a playwright/index.mjs).
// Sale con código 1 si algún chequeo falla.

import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

let pw;
try { pw = await import('playwright'); } catch { pw = await import(process.env.PW || 'playwright'); }
const { chromium } = pw;

const HTML = pathToFileURL(fileURLToPath(new URL('../../preview/fase-0-inicio.html', import.meta.url))).href;
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

await browser.close();

const bad = results.filter(r => !r.ok);
let last = '';
for (const r of results) {
  if (r.vp !== last) { console.log(`\n${r.vp}`); last = r.vp; }
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}${r.detail && !r.ok ? `  → ${r.detail}` : r.detail && r.vp.startsWith('contraste') ? `  (${r.detail})` : ''}`);
}
console.log(`\n${results.length - bad.length}/${results.length} chequeos OK${WANT_SHOTS ? ` · capturas en ${SHOTS}` : ''}`);
process.exit(bad.length ? 1 : 0);
