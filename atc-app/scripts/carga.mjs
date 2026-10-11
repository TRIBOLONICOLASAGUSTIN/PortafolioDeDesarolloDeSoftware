// Prueba de carga (fuera de npm test): una sola compu contra `next start`. Mide que las rutas cortan una avalancha con
// 429 antes de tocar la base, cuántas llamadas llegan a Upstash y si un visitante de otra red sigue siendo atendido.
// NO prueba resistencia a DDoS: eso depende del borde (CDN/WAF, docs/atc/seguridad.md §8 punto 10).
// Requisitos: Linux o WSL (mide la memoria con `ps`), `npm run build` y la base local (`npm run test:db` la deja lista).
// Usa autocannon, que no es dependencia del proyecto: la primera vez npx pregunta si lo descarga.
// Uso: npm run carga
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer, LOCAL_ENV } from '../tests/helpers/server.mjs';
import { fakeUpstash, PEM_PRUEBA } from '../tests/helpers/upstash.mjs';

const AC = 'autocannon@7.15.0', D = '15', C = '50';
if (spawnSync('npx', [AC, '--version'], { stdio: 'inherit' }).status !== 0) process.exit(1);
// Ya quedó descargado arriba (con la pregunta de npx): de acá en adelante no descarga nada
const ac = args => new Promise(res => {
  const p = spawn('npx', [AC, '-j', ...args], { stdio: ['ignore', 'pipe', 'ignore'] });
  let o = ''; p.stdout.on('data', d => { o += d; });
  p.on('exit', () => { try { res(JSON.parse(o)); } catch { res({}); } });
});
const resumen = r => ({
  pedidos: r.requests?.total, por_segundo: Math.round(r.requests?.average ?? 0), ms_p50: r.latency?.p50, ms_p99: r.latency?.p99,
  codigos: Object.fromEntries(Object.entries(r.statusCodeStats ?? {}).map(([k, v]) => [k, v.count])), errores: r.errors, timeouts: r.timeouts,
});

// Memoria (MB) de next start: Next renombra su proceso a "next-server"
function memoria() {
  const ps = execFileSync('ps', ['-eo', 'rss=,args=']).toString().trim().split('\n').map(l => l.trim().split(/\s+/));
  return Math.round(ps.filter(([, a]) => a === 'next-server').reduce((t, [kb]) => t + Number(kb), 0) / 1024);
}
// Durante la avalancha, un visitante de otra red pide la home y hace un pedido; y se mide el pico de memoria
function visitante(base) {
  let sigue = true, pico = 0, n = 1;
  const home = [], pedido = [];
  const reloj = setInterval(() => { pico = Math.max(pico, memoria()); }, 250);
  const medir = async (lista, url, init) => {
    const t0 = performance.now();
    const r = await fetch(url, init).catch(() => null); await r?.arrayBuffer();
    lista.push({ ms: Math.round(performance.now() - t0), st: r?.status ?? 'error' });
  };
  (async () => {
    while (sigue) {
      await medir(home, base + '/');
      await medir(pedido, base + '/api/pedidos', { method: 'POST', headers: { 'content-type': 'application/json', origin: base, 'cf-connecting-ip': `198.18.0.${n++ % 250}` }, body: JSON.stringify({ items: [{ slug: 'zz-no-existe', qty: 1 }], entrega: 'retiro', pago: 'efectivo' }) });
      await new Promise(r => setTimeout(r, 700));
    }
  })();
  const stats = xs => { const ms = xs.map(x => x.ms).sort((a, b) => a - b); return { veces: xs.length, ms_p50: ms[Math.floor(ms.length / 2)], ms_max: ms.at(-1), estados: [...new Set(xs.map(x => x.st))].join('/') }; };
  return () => { sigue = false; clearInterval(reloj); return { home: stats(home), pedido_de_otra_red: stats(pedido), memoria_pico_mb: pico }; };
}

const out = { conexiones: +C, segundos: +D };
const local = await startServer({ port: 3150, env: { ...LOCAL_ENV } });
const L = local.base;
out.memoria_en_reposo_mb = memoria();
const json = (ip, body) => ['-m', 'POST', '-H', 'content-type=application/json', '-H', `origin=${L}`, '-H', `cf-connecting-ip=${ip}`, '-b', JSON.stringify(body)];
const grande = join(tmpdir(), 'atc-carga-1mb.txt');
writeFileSync(grande, 'x'.repeat(1024 * 1024));
const casos = [
  // La home: se arma en cada pedido (nonce de la CSP)
  ['home', [`${L}/`]],
  // La bolsa desde una sola red: 5 llegan a la base y el resto recibe 429 sin tocarla
  ['bolsa_una_red', [...json('203.0.113.7', { items: [{ slug: 'zz-no-existe', qty: 1 }], entrega: 'retiro', pago: 'efectivo' }), `${L}/api/pedidos`]],
  // El seguimiento desde una sola red, con un código al azar: lo corta el bloqueo por código de la base o el límite del servidor
  ['seguimiento_una_red', [...json('203.0.113.8', { codigo: `AT-${Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[ILOU]/g, 'X')}-9Z`, telefono3: '123' }), `${L}/api/seguimiento`]],
  // POST de 1 MB a la home: Next copia como mucho 1 KB (next.config.ts)
  ['post_1mb_a_la_home', ['-m', 'POST', '-H', 'content-type=text/plain', '-i', grande, `${L}/`]],
];
try {
  for (const [nombre, args] of casos) {
    const fin = visitante(L);
    const r = await ac(['-c', C, '-d', D, ...args]);
    out[nombre] = { avalancha: resumen(r), mientras_tanto: fin() };
    console.error(`listo: ${nombre}`);
  }
} finally { await local.stop(); rmSync(grande, { force: true }); }

// "Producción" con Upstash falso: cuántas llamadas le llegan con 50 conexiones simultáneas desde una sola red
const up = await fakeUpstash();
const prod = await startServer({ port: 3151, env: { ATC_TRACKER_DATABASE_URL: 'postgres://atc_tracker:x@db.invalid:6543/postgres', TURNSTILE_SECRET_KEY: 'prueba', NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'prueba', UPSTASH_REDIS_REST_URL: up.url, UPSTASH_REDIS_REST_TOKEN: 'prueba', ATC_IP_HEADER: 'cf-connecting-ip', ATC_DB_CA: PEM_PRUEBA } });
try {
  const r = await ac(['-c', C, '-d', D, '-m', 'POST', '-H', 'content-type=application/json', '-H', `origin=${prod.base}`, '-H', 'cf-connecting-ip=203.0.113.9', '-b', JSON.stringify({ codigo: 'AT-ZZZZ-Z9', telefono3: '123' }), `${prod.base}/api/seguimiento`]);
  out.produccion_upstash_una_red = { avalancha: resumen(r), llamadas_a_upstash: up.llamadas() };
} finally { await prod.stop(); up.close(); }
console.log(JSON.stringify(out, null, 2));
