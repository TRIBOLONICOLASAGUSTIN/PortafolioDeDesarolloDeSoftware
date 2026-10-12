// Pagos por transferencia del panel: POST /api/panel/pagos y GET/DELETE /api/panel/pagos/[id]/comprobante.
// Solo existen para el superadmin con sesión (sin ella, el mismo 404 que cualquier dirección de /api, con cualquier
// método); el monto nunca es negativo; el archivo se valida por sus primeros bytes, se le quitan los datos ocultos, se
// guarda cifrado y se sirve aislado; verlo o borrarlo pide haber ingresado hace menos de 15 minutos.
// Cada prueba empieza con un ID (API-n) que se cita en docs/atc/seguridad.md (`npm run check:docs`).
// Corren contra `next start` y la base local de pruebas. Correr con: npm run test:api
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { crc32 } from 'node:zlib';
import { startServer, LOCAL_ENV } from '../helpers/server.mjs';
import { abrirSobre, FRASE_PRUEBA, LLAVES_PRUEBA } from '../helpers/llaves.mjs';
import { adminEnv, forgeSession, sesionHace } from '../helpers/admin.mjs';
import { crudo, enOrden, postRuta } from '../helpers/http.mjs';
import { readFileSync } from 'node:fs';
import { connect } from '../db/helpers.mjs';

const ENV = { ...LOCAL_ENV, ...adminEnv() };
let srv;
before(async () => { srv = await startServer({ port: 3148, env: ENV }); });
after(async () => { await srv?.stop(); });

const ahora = () => Math.floor(Date.now() / 1000);
const sesion = () => `atc_s=${forgeSession(ENV, ahora() + 8 * 3600)}`;
// Un PNG real de 1×1 (solo IHDR, IDAT e IEND: limpiarlo no le cambia nada) y un PDF mínimo
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const PDF = Buffer.from('%PDF-1.7\nresto del pdf de prueba');
let ipSeq = 10;
// Un pedido real de la bolsa (pendiente), para adjuntarle la transferencia
async function pedido() {
  const r = await postRuta(srv.base, '/api/pedidos', { items: [{ slug: 'red-hdmi', qty: 1 }], entrega: 'retiro', pago: 'transferencia', nombre: 'Lucía Martínez' },
    { headers: { 'cf-connecting-ip': `198.51.100.${ipSeq++}` } });
  assert.equal(r.status, 200, r.text);
  return r.json;
}
async function pagar(campos, { cookie = sesion(), headers = {}, archivo = PNG, nombreArchivo = 'comprobante.png', base = srv.base } = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  if (archivo) f.set('comprobante', new Blob([archivo]), nombreArchivo);
  const res = await fetch(`${base}/api/panel/pagos`, { method: 'POST', body: f, headers: { ...(cookie ? { cookie } : {}), ...headers } });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, headers: res.headers, text, json };
}
const comprobante = (id, { cookie = sesion(), method = 'GET', headers = {}, base = srv.base } = {}) =>
  fetch(`${base}/api/panel/pagos/${id}/comprobante`, { method, headers: { ...(cookie ? { cookie } : {}), ...headers } });
/** El comprobante tal como lo abre el panel del dueño: pide el sobre y lo abre con la llave privada (de prueba). */
async function abierto(id) {
  const r = await comprobante(id);
  assert.equal(r.status, 200);
  const j = await r.json();
  return abrirSobre(Buffer.from(j.sobre, 'base64url'), j.tipo);
}
const pagoOk = async (archivo = PNG, nombreArchivo = 'comprobante.png') => {
  const p = await pedido();
  const r = await pagar({ codigo: p.codigo, pagador: 'Lucía Martínez', monto: '12499' }, { archivo, nombreArchivo });
  assert.equal(r.status, 200, r.text);
  return { ...r.json, codigo: p.codigo };
};

const SIN_VARIAR = ['date', 'content-length', 'etag', 'connection', 'keep-alive', 'transfer-encoding'];
const encabezados = r => Object.fromEntries([...r.headers].filter(([k]) => !SIN_VARIAR.includes(k)));

test('API-34 · Sin la sesión del superadmin, las rutas de pagos responden igual que una dirección inexistente de /api, con cualquier cookie y cualquier método (también por los caminos internos de Next y con la dirección en %XX)', async () => {
  const id = '3f2b8c1e-0000-4000-8000-000000000000';
  const rutas = [['/api/panel/pagos', '/api/zzzzz/aaaaa'], [`/api/panel/pagos/${id}/comprobante`, `/api/zzzzz/aaaaa/${id}/bbbbbbbbbbb`],
    ['/api/panel', '/api/zzzzz'], ['/api/panel/otra', '/api/zzzzz/aaaa']];
  const cookies = [null, 'atc_s=admin', 'role=admin; isAdmin=1', `atc_s=v1.1999999999.AAAAAAAAAAAAAAAA.${'A'.repeat(43)}`,
    `atc_s=${forgeSession({ ...ENV, ATC_SESSION_SECRET: 'otro-secreto-'.padEnd(43, 'x') }, ahora() + 3600)}`, `atc_s=${forgeSession(ENV, ahora() - 10)}`];
  const formulario = () => { const f = new FormData(); f.set('codigo', 'P-0000-00'); f.set('comprobante', new Blob([PNG]), 'c.png'); return f; };
  const json = { 'content-type': 'application/json' };
  const variantes = [{ method: 'GET' }, { method: 'HEAD' }, { method: 'OPTIONS' }, { method: 'PUT', body: '{}', headers: json }, { method: 'PATCH', body: '{}', headers: json },
    { method: 'DELETE' }, { method: 'PROPFIND' }, { method: 'POST', body: '{}', headers: json }, { method: 'POST', body: formulario },
    { method: 'POST', body: formulario, headers: { 'next-action': 'abc123' } }, { method: 'GET', headers: { rsc: '1' } }];
  let n = 0;
  for (const [ruta, inventada] of rutas) for (const cookie of cookies) for (const v of variantes) {
    const pedir = r => fetch(srv.base + r, { method: v.method, body: typeof v.body === 'function' ? v.body() : v.body, headers: { ...v.headers, ...(cookie ? { cookie } : {}) } });
    const [a, b] = await Promise.all([pedir(ruta), pedir(inventada)]);
    const que = `${v.method} ${ruta} ${JSON.stringify(v.headers ?? {})} cookie=${cookie?.slice(0, 20)}`;
    assert.equal(a.status, b.status, `${que}: estado`);
    if (v.method === 'GET') assert.equal(a.status, 404, `${que}: no es 404`);
    assert.deepEqual(encabezados(a), encabezados(b), `${que}: encabezados`);
    assert.equal(await a.text(), await b.text(), `${que}: cuerpo`);
    n++;
  }
  assert.equal(n, rutas.length * cookies.length * variantes.length);
  // Caminos internos de Next que nombraban la ruta encontrada (`x-matched-path` con el encabezado x-middleware-prefetch,
  // `x-nextjs-matched-path` en /_next/data) y direcciones con %XX (/api%2Fpanel…, /api/panel/%70agos): la misma respuesta
  // para la ruta del panel y para una inventada, con los encabezados en el mismo orden; el cuerpo solo repite la dirección
  const BID = readFileSync(new URL('../../.next/BUILD_ID', import.meta.url), 'utf8').trim();
  const sinEco = (b, ruta) => {
    const segs = ruta.split('?')[0].split('/').filter(Boolean).map(s => s.replace(/\.json$/, ''));
    let t = b.replace(/nonce-[A-Za-z0-9+/=]+/g, 'nonce-X').replace(/nonce\\?":\\?"[^"\\]*\\?"/g, 'nonce:X').replace(/nonce="[^"]*"/g, 'nonce=X')
      .replace(/\\?"[A-Za-z0-9_-]{20,24}\\?"/g, 'ID');
    // ?path=… repite la dirección pedida (entera, o sin /_next/data/<build>)
    for (const r of [segs.join('/'), segs.slice(3).join('/')]) if (r) t = t.replaceAll(encodeURIComponent(r), 'RUTA');
    segs.forEach((s, i) => { t = t.replaceAll(`"${s}"`, `"T${i}"`).replaceAll(`\\"${s}\\"`, `\\"T${i}\\"`); });
    return t;
  };
  const conForma = { cookie: cookies[3] };
  const internos = [
    ['/api/panel/pagos', '/api/zzzzz/aaaaa', { headers: { 'x-middleware-prefetch': '1' } }],
    [`/api/panel/pagos/${id}/comprobante`, `/api/zzzzz/aaaaa/${id}/bbbbbbbbbbb`, { method: 'DELETE', headers: { 'x-middleware-prefetch': '1', ...conForma } }],
    [`/_next/data/${BID}/api/panel/pagos.json`, `/_next/data/${BID}/api/zzzzz/aaaaa.json`, {}],
    [`/_next/data/${BID}/api/panel/pagos/${id}/comprobante.json`, `/_next/data/${BID}/api/zzzzz/aaaaa/${id}/bbbbbbbbbbb.json`, { headers: conForma }],
    ['/api%2Fpanel%2Fpagos', '/api%2Fzzzzz%2Faaaaa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
    ['/%61pi/panel/pagos', '/%61pi/zzzzz/aaaaa', {}],
    ['/api/panel/%70agos', '/api/zzzzz/%61aaaa', { headers: conForma }],
    [`/api/%70anel/pagos/${id}/comprobante`, `/api/%7Azzzz/aaaaa/${id}/bbbbbbbbbbb`, { method: 'OPTIONS' }],
  ];
  for (const [a, b, o] of internos) {
    const [x, y] = await Promise.all([crudo(srv.base, a, o), crudo(srv.base, b, o)]);
    const que = `${o.method ?? 'GET'} ${a} ${JSON.stringify(o.headers ?? {}).slice(0, 40)}`;
    assert.equal(x.status, y.status, `${que}: estado`);
    assert.deepEqual(enOrden(x.crudos), enOrden(y.crudos), `${que}: encabezados o su orden`);
    assert.ok(!enOrden(x.crudos).some(l => /matched-path: \/api\/panel/.test(l)), `${que}: nombra la ruta del panel`);
    assert.equal(sinEco(x.body, a), sinEco(y.body, b), `${que}: cuerpo`);
  }
  // Ninguno de esos intentos tocó la base; con sesión, desde otro sitio: 403; con sesión: se registra
  const p = await pedido();
  const campos = { codigo: p.codigo, pagador: 'Lucía Martínez', monto: '12499' };
  for (const cookie of cookies.slice(1)) assert.equal((await pagar(campos, { cookie })).status, 404, cookie);
  assert.equal((await pagar(campos, { headers: { origin: 'https://otro-sitio.example' } })).status, 403);
  const db = await connect();
  try {
    const estado = async () => (await db.query('select status from public.sales_orders where public_code = $1', [p.codigo])).rows[0].status;
    const pagos = async () => (await db.query('select count(*)::int as n from public.sales_payments s join public.sales_orders o on o.id = s.order_id where o.public_code = $1', [p.codigo])).rows[0].n;
    assert.equal(await estado(), 'pendiente', 'un intento sin sesión válida cambió el pedido');
    assert.equal(await pagos(), 0, 'un intento sin sesión válida registró un pago');
    assert.equal((await pagar(campos)).status, 200);
    assert.equal(await estado(), 'pagado');
  } finally { await db.end(); }
});

test('API-35 · Registrar un pago: montos de 0, negativos o con decimales, archivos falsos, rotos o de más de 2 MB y campos rotos dan 400; un pedido inexistente, 409; uno válido queda pagado', async () => {
  const p = await pedido();
  const ok = { codigo: p.codigo, pagador: 'Lucía Martínez', monto: '12499' };
  for (const monto of ['-500', '-1', '0', '12.5', '1e5', '', '999999999999']) assert.equal((await pagar({ ...ok, monto })).status, 400, `monto ${monto}`);
  assert.equal((await pagar(ok, { archivo: Buffer.from('<script>alert(1)</script>'), nombreArchivo: 'comprobante.png' })).status, 400, 'un texto con extensión .png');
  assert.equal((await pagar(ok, { archivo: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), nombreArchivo: 'c.svg' })).status, 400, 'SVG');
  assert.equal((await pagar(ok, { archivo: Buffer.concat([PNG.subarray(0, 8), Buffer.from('no hay bloques de imagen acá')]) })).status, 400, 'PNG roto');
  assert.equal((await pagar(ok, { archivo: Buffer.from('ffd8ffe000104a464946', 'hex'), nombreArchivo: 'c.jpg' })).status, 400, 'JPEG sin imagen');
  assert.equal((await pagar(ok, { archivo: Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]) })).status, 400, 'más de 2 MB');
  assert.equal((await pagar(ok, { archivo: null })).status, 400, 'sin archivo');
  assert.equal((await pagar({ ...ok, pagador: 'X' })).status, 400, 'nombre muy corto');
  assert.equal((await pagar({ ...ok, codigo: 'AT-7KQ2-9M' })).status, 400, 'código que no es de un pedido');
  const json = await postRuta(srv.base, '/api/panel/pagos', ok, { headers: { cookie: sesion() } });
  assert.equal(json.status, 400, 'JSON en vez de formulario');
  const inexistente = await pagar({ ...ok, codigo: 'P-0000-00' });
  assert.equal(inexistente.status, 409); assert.equal(inexistente.json.motivo, 'pedido');
  const r = await pagar(ok);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ok, true); assert.equal(r.json.estado, 'pagado'); assert.equal(r.json.monto, 12499);
  assert.match(r.headers.get('cache-control') ?? '', /no-store/);
  assert.match(r.json.pago, /^[0-9a-f-]{36}$/);
});

test('API-36 · El comprobante se entrega solo con sesión, sin caché y siempre cifrado: el servidor devuelve el sobre (lo abre el dueño con su frase) y nunca el archivo', async () => {
  const png = await pagoOk(), pdf = await pagoOk(PDF, 'c.pdf');
  const a = await comprobante(png.pago);
  assert.equal(a.status, 200);
  assert.match(a.headers.get('content-type') ?? '', /^application\/json/);
  assert.equal(a.headers.get('x-content-type-options'), 'nosniff');
  assert.match(a.headers.get('cache-control') ?? '', /no-store/);
  const j = await a.json();
  assert.equal(j.tipo, 'image/png');
  const sobre = Buffer.from(j.sobre, 'base64url');
  assert.equal(sobre[0], 2, 'sobre versión 2');
  assert.equal(sobre.indexOf(PNG.subarray(0, 8)), -1, 'la foto no viaja a la vista');
  assert.ok((await abrirSobre(sobre, j.tipo)).equals(PNG), 'con la llave del dueño se abre el archivo limpio');
  assert.ok((await abierto(pdf.pago)).equals(PDF), 'el PDF vuelve como vino');
  for (const [id, cookie] of [[png.pago, null], [png.pago, 'atc_s=admin'], ['3f2b8c1e-0000-4000-8000-000000000000', sesion()], ['no-es-un-id', sesion()]]) {
    const r = await comprobante(id, { cookie });
    assert.equal(r.status, 404, `${id} ${cookie}`);
    assert.doesNotMatch(await r.text(), /sobre|PNG|%PDF/);
  }
});

/* ---------- Archivos armados a mano, con datos ocultos ---------- */
const seg = (m, datos) => Buffer.concat([Buffer.of(0xff, m, (datos.length + 2) >> 8, (datos.length + 2) & 0xff), datos]);
const asc = s => Buffer.from(s, 'latin1');
// Exif (little-endian) con marca, Orientation = 6, puntero a GPS y un texto con la ubicación, más una miniatura
function exif() {
  const t = Buffer.alloc(120);
  t.write('II*\0', 0, 'latin1'); t.writeUInt32LE(8, 4);
  t.writeUInt16LE(3, 8);
  const entrada = (i, tag, tipo, cant, valor) => { const p = 10 + i * 12; t.writeUInt16LE(tag, p); t.writeUInt16LE(tipo, p + 2); t.writeUInt32LE(cant, p + 4); t.writeUInt32LE(valor, p + 8); };
  entrada(0, 0x010f, 2, 13, 50); // Make → 50
  entrada(1, 0x0112, 3, 1, 6); // Orientation = 6 (girada 90°)
  entrada(2, 0x8825, 4, 1, 70); // GPS → 70
  t.write('MarcaSecreta\0', 50, 'latin1');
  t.write('GPS-31.6333,-60.7000', 70, 'latin1');
  return Buffer.concat([asc('Exif\0\0'), t, Buffer.from('ffd8', 'hex'), asc('MINIATURA-SECRETA'), Buffer.from('ffd9', 'hex')]);
}
const SOS_A_EOI = Buffer.concat([
  seg(0xda, Buffer.from('03010002110311003f00', 'hex')),
  Buffer.from('a1b2c3ff00d4e5ffd0f6a7b8ffff00c9', 'hex'), // datos comprimidos con FF00, un reinicio y relleno
  Buffer.from('ffd9', 'hex'),
]);
const JPEG = Buffer.concat([
  Buffer.from('ffd8', 'hex'),
  seg(0xe0, Buffer.concat([asc('JFIF\0'), Buffer.from('0101000048004800', 'hex'), Buffer.of(1, 1), asc('JFIF-MINIATURA')])),
  seg(0xe1, exif()),
  seg(0xe1, asc('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>XMP-SECRETO</x:xmpmeta>')),
  seg(0xe2, asc('ICC_PROFILE\0\x01\x01PERFIL-SECRETO')),
  seg(0xed, asc('Photoshop 3.0\0IPTC-SECRETO')),
  seg(0xfe, asc('COMENTARIO-SECRETO')),
  seg(0xee, Buffer.concat([asc('Adobe'), Buffer.from('00640000000001', 'hex')])), // versión, 2 banderas, transform = 1
  seg(0xdb, Buffer.alloc(65, 1)),
  seg(0xc0, Buffer.from('080010000803012200021101031101', 'hex')), // 8×16 (alto 16, ancho 8), 3 componentes
  seg(0xc4, Buffer.from('0000000000000000000000000000000000', 'hex')),
  SOS_A_EOI,
  asc('MotionPhoto_Data VIDEO-SECRETO'), // lo que viene después del final (video de una "foto en movimiento")
]);
const SECRETOS_JPEG = ['MarcaSecreta', 'GPS-31', 'MINIATURA-SECRETA', 'JFIF', 'XMP-SECRETO', 'PERFIL-SECRETO', 'IPTC-SECRETO', 'COMENTARIO-SECRETO', 'VIDEO-SECRETO'];
const chunk = (tipo, datos) => { const td = Buffer.concat([asc(tipo), datos]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); const l = Buffer.alloc(4); l.writeUInt32BE(datos.length); return Buffer.concat([l, td, c]); };
const PNG_SUCIO = Buffer.concat([
  PNG.subarray(0, 33), // firma + IHDR
  chunk('tEXt', asc('Comment\0TEXTO-SECRETO')),
  chunk('iTXt', asc('XML:com.adobe.xmp\0\0\0\0\0XMP-SECRETO')),
  chunk('zTXt', asc('Author\0\0ZTXT-SECRETO')),
  chunk('eXIf', asc('MM\0*EXIF-SECRETO')),
  chunk('tIME', Buffer.from('07ea0a0b0c0000', 'hex')),
  chunk('iCCP', asc('Pantalla SECRETA\0\0xx')),
  PNG.subarray(33), // IDAT + IEND
  asc('COLA-SECRETA'),
]);
const SECRETOS_PNG = ['TEXTO-SECRETO', 'XMP-SECRETO', 'ZTXT-SECRETO', 'EXIF-SECRETO', 'tIME', 'Pantalla SECRETA', 'COLA-SECRETA'];
const marcadores = b => { const ms = []; for (let i = 2; i + 4 <= b.length;) { const m = b[i + 1]; if (m === 0xda) break; const l = b.readUInt16BE(i + 2); ms.push([m, b.subarray(i, i + 2 + l)]); i += 2 + l; } return ms; };

test('API-37 · Los datos ocultos se quitan antes de guardar: en un JPEG, Exif (marca, GPS, miniatura), XMP, ICC, IPTC, comentarios y lo que sigue al final; en un PNG, textos, eXIf, fecha, perfil y cola. La imagen queda igual y conserva su orientación; un bloque con el largo alterado se rechaza', async () => {
  const j = await pagoOk(JPEG, 'foto.jpg');
  const limpio = await abierto(j.pago);
  for (const s of SECRETOS_JPEG) assert.equal(limpio.indexOf(asc(s)), -1, `quedó ${s}`);
  assert.ok(limpio.subarray(0, 2).equals(Buffer.from('ffd8', 'hex')) && limpio.subarray(-2).equals(Buffer.from('ffd9', 'hex')), 'empieza y termina como un JPEG');
  const ms = marcadores(limpio);
  const app = ms.filter(([m]) => m >= 0xe0 && m <= 0xef);
  assert.deepEqual(app.map(([m]) => m), [0xe1, 0xee], 'solo queda la orientación y el bloque Adobe');
  assert.equal(app[0][1].toString('hex'), 'ffe10022457869660000' + '4d4d002a00000008' + '0001011200030000000100060000' + '00000000', 'Exif mínimo con Orientation = 6');
  assert.equal(app[1][1].toString('hex'), 'ffee000e41646f626500640000000001', 'Adobe con la transformación de colores (1)');
  assert.ok(limpio.subarray(limpio.indexOf(Buffer.from('ffda', 'hex'))).equals(SOS_A_EOI), 'la imagen (de SOS a EOI) quedó idéntica');
  assert.deepEqual(ms.filter(([m]) => m < 0xe0 || m > 0xef).map(([m]) => m), [0xdb, 0xc0, 0xc4], 'tablas y encabezado en orden');

  const p = await pagoOk(PNG_SUCIO);
  const png = await abierto(p.pago);
  for (const s of SECRETOS_PNG) assert.equal(png.indexOf(asc(s)), -1, `quedó ${s}`);
  assert.ok(png.equals(PNG), 'del PNG quedan solo IHDR, IDAT e IEND');
  // Un bloque desconocido que la imagen necesita no se puede quitar: se rechaza
  assert.equal((await pagar({ codigo: 'P-0000-00', pagador: 'Lucía Martínez', monto: '1' }, { archivo: Buffer.concat([PNG.subarray(0, 33), chunk('CgBI', Buffer.alloc(4)), PNG.subarray(33)]) })).status, 400, 'CgBI');

  // Un bloque de la imagen con el largo alterado podría arrastrar adentro el bloque siguiente (el Exif): se rechaza
  const cambiar = (de, a) => Buffer.from(JPEG.toString('hex').replace(de, a), 'hex');
  for (const [que, b] of [['SOF', cambiar('ffc00011080010000803012200021101031101', 'ffc00012080010000803012200021101031101')],
    ['SOS', cambiar('ffda000c03010002110311003f00', 'ffda000d03010002110311003f00')], ['DQT', cambiar('ffdb0043', 'ffdb0042')]]) {
    assert.ok(!b.equals(JPEG), `${que}: el reemplazo no cambió nada`);
    assert.equal((await pagar({ codigo: 'P-0000-00', pagador: 'Lucía Martínez', monto: '1' }, { archivo: b, nombreArchivo: 'f.jpg' })).status, 400, `${que} con el largo alterado`);
  }

  // Archivos mutados o cortados: siempre 400 (no se pudo leer) o 409 (se limpió y el pedido no existe); nunca un error
  let semilla = 7;
  const azar = n => { semilla = (semilla * 1103515245 + 12345) % 2 ** 31; return semilla % n; };
  const inicio = Date.now(), estados = {};
  for (let k = 0; k < 200; k++) {
    const base = Buffer.from(k % 2 ? JPEG : PNG_SUCIO);
    let b;
    switch (k % 4) {
      case 0: case 1: { b = base; for (let x = 0; x < 1 + azar(6); x++) b[2 + azar(b.length - 2)] = azar(256); break; }
      case 2: b = base.subarray(0, 3 + azar(base.length - 3)); break;
      default: { const i = 2 + azar(base.length - 4); b = Buffer.concat([base.subarray(0, i), Buffer.alloc(azar(40), 0xff), Buffer.of(azar(256), azar(256)), base.subarray(i)]); }
    }
    const r = await pagar({ codigo: 'P-0000-00', pagador: 'Lucía Martínez', monto: '1' }, { archivo: b });
    estados[r.status] = (estados[r.status] ?? 0) + 1;
    assert.ok(r.status === 400 || r.status === 409, `mutación ${k}: ${r.status} ${r.text.slice(0, 80)}`);
  }
  assert.ok(Date.now() - inicio < 30_000, `200 archivos tardaron ${Date.now() - inicio} ms`);
  assert.ok(estados[409] > 0 && estados[400] > 0, JSON.stringify(estados));
});

test('API-38 · El comprobante se guarda cifrado con la llave del dueño: ni la base ni el servidor lo pueden abrir, un cambio en la base lo invalida y sin la llave pública la ruta no funciona (503)', async () => {
  const r = await pagoOk();
  const db = await connect();
  try {
    const fila = (await db.query('select tipo, datos from private.comprobantes where payment_id = $1', [r.pago])).rows[0];
    assert.equal(fila.datos[0], 2, 'sobre versión 2');
    assert.equal(fila.datos.length, PNG.length + 94, 'el archivo + 94 bytes de sobre');
    assert.equal(fila.datos.indexOf(PNG.subarray(0, 8)), -1, 'la firma del PNG no está a la vista');
    assert.equal(fila.datos.indexOf(PNG.subarray(16, 33)), -1, 'ni el encabezado de la imagen');
    // Solo con la llave privada del dueño (que el servidor no tiene) se recupera el archivo limpio
    assert.ok((await abrirSobre(fila.datos, fila.tipo)).equals(PNG));
    const otra = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
    await assert.rejects(abrirSobre(fila.datos, fila.tipo, otra.privateKey), 'otra llave no lo abre');
    // Alguien cambia un byte o el tipo directamente en la base: ya no se abre
    const alterado = Buffer.from(fila.datos); alterado[100] ^= 1;
    await assert.rejects(abrirSobre(alterado, fila.tipo), 'un byte cambiado');
    await assert.rejects(abrirSobre(fila.datos, 'application/pdf'), 'el tipo cambiado');
  } finally { await db.end(); }
  // El servidor solo tiene la llave pública y la privada bloqueada: nunca la frase
  assert.ok(!Object.values(ENV).some(v => String(v).replaceAll('-', '').includes(FRASE_PRUEBA.replaceAll('-', ''))), 'la frase no está en el entorno');
  assert.match(LLAVES_PRUEBA.privada, /^p1\.600000\./);
  // Sin ATC_COMPROBANTES_PUBLICA (o inválida): 503, nunca se guarda sin cifrar
  for (const publica of ['', 'corta', 'A'.repeat(122)]) {
    const otro = await startServer({ port: 3149, env: { ...ENV, ATC_COMPROBANTES_PUBLICA: publica } });
    try {
      const p = await pedido();
      assert.equal((await pagar({ codigo: p.codigo, pagador: 'Lucía Martínez', monto: '1' }, { base: otro.base })).status, 503, `POST con la llave "${publica.slice(0, 8)}"`);
      if (publica.length !== 122) assert.equal((await comprobante(r.pago, { base: otro.base })).status, 503, `GET con la llave "${publica.slice(0, 8)}"`);
    } finally { await otro.stop(); }
  }
});

test('API-39 · Borrar un comprobante pide haber ingresado hace menos de 15 minutos (403 "reingresar"); verlo no (llega cifrado y hace falta la frase), ni registrar un pago', async () => {
  const r = await pagoOk();
  const vieja = sesionHace(ENV, 16), nueva = sesionHace(ENV, 1);
  const a = await comprobante(r.pago, { cookie: vieja, method: 'DELETE' });
  assert.equal(a.status, 403);
  assert.deepEqual(await a.json(), { ok: false, motivo: 'reingresar' });
  assert.match(a.headers.get('cache-control') ?? '', /no-store/);
  const v = await comprobante(r.pago, { cookie: vieja });
  assert.equal(v.status, 200, 'ver con una sesión de 16 minutos');
  assert.equal(Buffer.from((await v.json()).sobre, 'base64url')[0], 2, 'pero llega cifrado');
  const p = await pedido();
  assert.equal((await pagar({ codigo: p.codigo, pagador: 'Lucía Martínez', monto: '1' }, { cookie: vieja })).status, 200, 'registrar no pide volver a ingresar');
  assert.equal((await comprobante(r.pago, { cookie: nueva, method: 'DELETE' })).status, 200, 'con una sesión de 1 minuto se borra');
  // Una sesión de hace 16 minutos sigue siendo válida para el resto del panel
  assert.equal((await fetch(`${srv.base}/panel`, { headers: { cookie: vieja } })).status, 200);
});

test('API-40 · "Ya lo revisé": DELETE borra solo el comprobante (quedan el nombre y el monto), solo desde el mismo sitio y con sesión', async () => {
  const r = await pagoOk();
  assert.equal((await comprobante(r.pago, { method: 'DELETE', headers: { origin: 'https://otro-sitio.example' } })).status, 403, 'desde otro sitio');
  assert.equal((await comprobante(r.pago, { method: 'DELETE', cookie: null })).status, 404, 'sin sesión');
  assert.equal((await comprobante('no-es-un-id', { method: 'DELETE' })).status, 404, 'id inválido');
  assert.equal((await comprobante(r.pago)).status, 200, 'antes de borrar se ve');
  const a = await comprobante(r.pago, { method: 'DELETE' });
  assert.equal(a.status, 200); assert.deepEqual(await a.json(), { ok: true });
  assert.equal((await comprobante(r.pago)).status, 404, 'después de borrar no está');
  const b = await comprobante(r.pago, { method: 'DELETE' });
  assert.equal(b.status, 404); assert.equal((await b.json()).motivo, 'no_existe');
  const db = await connect();
  try {
    const pago = (await db.query('select pagador, monto_ars from public.sales_payments where id = $1', [r.pago])).rows[0];
    assert.deepEqual(pago, { pagador: 'Lucía Martínez', monto_ars: 12499 }, 'el pago queda para Ganancias');
    assert.equal((await db.query('select status from public.sales_orders where public_code = $1', [r.codigo])).rows[0].status, 'pagado');
  } finally { await db.end(); }
});
