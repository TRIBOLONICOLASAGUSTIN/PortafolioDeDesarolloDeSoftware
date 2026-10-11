// POST a las rutas del sitio de pruebas (seguimiento, pedidos e ingreso), con la respuesta ya leída.

/** POST JSON a `base` + `ruta`; un `body` de texto (o `raw`) se manda tal cual. Devuelve estado, encabezados, texto, JSON (o null) y la cookie. */
export async function postRuta(base, ruta, body, { headers = {}, raw } = {}) {
  const res = await fetch(base + ruta, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: raw ?? (typeof body === 'string' ? body : JSON.stringify(body)) });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, headers: res.headers, text, json, cookie: res.headers.get('set-cookie') };
}
