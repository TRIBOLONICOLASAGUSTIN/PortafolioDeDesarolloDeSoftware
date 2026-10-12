// POST a las rutas del sitio de pruebas (seguimiento, pedidos e ingreso), con la respuesta ya leída.
import { request } from 'node:http';

/** POST JSON a `base` + `ruta`; un `body` de texto (o `raw`) se manda tal cual. Devuelve estado, encabezados, texto, JSON (o null) y la cookie. */
export async function postRuta(base, ruta, body, { headers = {}, raw } = {}) {
  const res = await fetch(base + ruta, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: raw ?? (typeof body === 'string' ? body : JSON.stringify(body)) });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, headers: res.headers, text, json, cookie: res.headers.get('set-cookie') };
}

/** Pedido sin tocar la dirección (va tal cual, con sus %XX) y con los encabezados en el orden en que llegan (fetch los ordena). */
export function crudo(base, ruta, { method = 'GET', headers = {}, body } = {}) {
  const u = new URL(base);
  return new Promise((res, rej) => {
    const r = request({ host: u.hostname, port: u.port, path: ruta, method, headers }, s => {
      let b = ''; s.setEncoding('utf8'); s.on('data', d => (b += d)); s.on('end', () => res({ status: s.statusCode, crudos: s.rawHeaders, body: b }));
    });
    r.on('error', rej); if (body) r.write(body); r.end();
  });
}
/** Encabezados de `crudo`, en orden, sin los que cambian en cada respuesta y con el nonce neutralizado. */
export function enOrden(crudos, fuera = ['date', 'content-length', 'etag', 'connection', 'keep-alive', 'transfer-encoding']) {
  const out = [];
  for (let i = 0; i < crudos.length; i += 2) {
    const k = crudos[i].toLowerCase();
    if (!fuera.includes(k)) out.push(`${k}: ${crudos[i + 1].replace(/nonce-[A-Za-z0-9+/=]+/g, 'nonce-X').replace(/nonce="[^"]*"/g, 'nonce=""')}`);
  }
  return out;
}
