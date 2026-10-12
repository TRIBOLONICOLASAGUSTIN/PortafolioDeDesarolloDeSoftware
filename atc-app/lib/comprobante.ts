// Comprobantes de transferencia: qué se acepta y cómo se limpia. Lo usan el panel (vista previa) y POST /api/panel/pagos
// (que además lo guarda cifrado: lib/server/cifrado.ts). Del pago se guardan el nombre de quien pagó y el monto; el
// archivo lo ve solo el dueño y se borra a los 90 días (seguridad.md §5, fila 25).
export const COMPROBANTE_MAX = 2 * 1024 * 1024;
export const TIPOS_COMPROBANTE = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export type TipoComprobante = (typeof TIPOS_COMPROBANTE)[number];

/** El tipo sale de los primeros bytes del archivo, nunca de la extensión ni de lo que diga el navegador. */
export function tipoComprobante(b: Uint8Array): TipoComprobante | null {
  const empieza = (...xs: number[]) => b.length >= xs.length && xs.every((x, i) => b[i] === x);
  if (empieza(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (empieza(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
  if (empieza(0x25, 0x50, 0x44, 0x46, 0x2d)) return 'application/pdf';
  return null;
}

/* ---------- Datos ocultos (seguridad.md §5, fila 25) ----------
   Una foto de celular trae adentro la ubicación, la fecha, el modelo del teléfono y una miniatura (que puede mostrar
   la foto antes de recortarla). No hacen falta para ver el pago, así que se quitan antes de guardar y de mostrar.
   Se hace a mano, sin una librería de imágenes: no se decodifica ni se vuelve a comprimir la imagen, solo se copian
   los bloques que hacen falta para verla (la imagen queda idéntica). Los PDF quedan como vienen (limpiarlos bien exige
   una librería; los de los bancos traen el programa que los generó, no la ubicación). */
type Bytes = Uint8Array<ArrayBuffer>;
export type ComprobanteLimpio = { tipo: TipoComprobante; datos: Bytes; quitado: boolean };

/** Devuelve el archivo sin datos ocultos, o null si no es una foto o un PDF que se pueda leer. */
export function limpiarComprobante(b: Uint8Array): ComprobanteLimpio | null {
  const tipo = tipoComprobante(b);
  if (tipo === 'application/pdf') return { tipo, datos: unir([b]), quitado: false };
  const r = tipo === 'image/jpeg' ? limpiarJpeg(b) : tipo === 'image/png' ? limpiarPng(b) : null;
  return r && tipo ? { tipo, ...r } : null;
}

function unir(partes: Uint8Array[]): Bytes {
  const out = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of partes) { out.set(p, o); o += p.length; }
  return out;
}
const texto = (b: Uint8Array, desde: number, hasta: number) => String.fromCharCode(...b.subarray(desde, hasta));

/* JPEG: se copian solo las tablas, el encabezado de la imagen y los datos comprimidos. Se descartan los APP0–APP15
   (Exif con GPS y miniatura, XMP, IPTC, perfil de color, JFIF), los comentarios y todo lo que venga después del final
   (otras imágenes, el video de las "fotos en movimiento"). Si la foto estaba girada, se vuelve a escribir solo ese dato
   (si no, se vería de costado), y el bloque "Adobe" se rearma con su único dato necesario (los colores). */
const ES_SOF = (m: number) => m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;

/** ¿El largo del bloque es exactamente el que pide su contenido? Así un bloque con el largo alterado no puede arrastrar
 *  adentro el bloque siguiente (por ejemplo, el Exif) y pasar como parte de la imagen. Los archivos sanos siempre cumplen. */
function largoExacto(m: number, d: Uint8Array): boolean {
  if (ES_SOF(m)) return d.length >= 6 && d[5] >= 1 && d.length === 6 + 3 * d[5];
  if (m === 0xda) return d.length >= 1 && d[0] >= 1 && d[0] <= 4 && d.length === 4 + 2 * d[0];
  if (m === 0xdd || m === 0xdc) return d.length === 2;
  if (m === 0xcc) return d.length > 0 && d.length % 2 === 0;
  let p = 0;
  if (m === 0xdb) { // DQT: tablas de 1 + 64 o 1 + 128 bytes
    while (p < d.length) { const pq = d[p] >> 4; if (pq > 1) return false; p += 1 + 64 * (pq + 1); }
  } else if (m === 0xc4) { // DHT: tablas de 1 + 16 conteos + los valores
    while (p < d.length) { if (p + 17 > d.length) return false; let n = 0; for (let k = 1; k <= 16; k++) n += d[p + k]; p += 17 + n; }
  } else return false;
  return p === d.length && d.length > 0;
}

function limpiarJpeg(b: Uint8Array): { datos: Bytes; quitado: boolean } | null {
  const n = b.length, partes: Uint8Array[] = [];
  let i = 2, orient = 0, adobe = -1, sof = false, sos = false, quitado = false, fin = false;
  while (i < n && !fin) {
    if (b[i] !== 0xff) { i++; quitado = true; continue; } // bytes sueltos entre bloques: no se copian
    while (i < n && b[i] === 0xff) i++; // relleno
    if (i >= n) break;
    const m = b[i++];
    if (m === 0xd9) { fin = true; if (i < n) quitado = true; break; } // EOI: lo que sigue no se copia
    if (m >= 0xd0 && m <= 0xd7) { quitado = true; continue; } // reinicio fuera de los datos: se descarta
    if (m < 0xc0 || m === 0xc8 || m === 0xd8 || m === 0xde || m === 0xdf || (m >= 0xf0 && m <= 0xfd)) return null;
    if (i + 2 > n) return null;
    const largo = (b[i] << 8) | b[i + 1];
    if (largo < 2 || i + largo > n) return null;
    const bloque = b.subarray(i - 2, i + largo), datos = b.subarray(i + 2, i + largo);
    i += largo;
    if (m >= 0xe0 && m <= 0xef) {
      quitado = true;
      if (m === 0xe1 && !orient) orient = orientacionExif(datos);
      if (m === 0xee && adobe < 0 && datos.length >= 12 && texto(datos, 0, 5) === 'Adobe') adobe = datos[11];
      continue;
    }
    if (m === 0xfe) { quitado = true; continue; } // comentario
    if (m === 0xda && !sof) return null;
    if (!largoExacto(m, datos)) return null;
    if (ES_SOF(m)) sof = true;
    partes.push(bloque);
    if (m === 0xda) {
      // Datos comprimidos: hasta el próximo marcador. FF00 es un FF de los datos y FFD0–FFD7 son reinicios.
      sos = true;
      let j = i;
      while (j < n) {
        if (b[j] !== 0xff) { j++; continue; }
        let k = j + 1;
        while (k < n && b[k] === 0xff) k++;
        if (k < n && (b[k] === 0x00 || (b[k] >= 0xd0 && b[k] <= 0xd7))) { j = k + 1; continue; }
        if (k >= n) j = n;
        break;
      }
      partes.push(b.subarray(i, j));
      i = j;
    }
  }
  if (!sof || !sos) return null;
  const cabeza: Uint8Array[] = [Uint8Array.of(0xff, 0xd8)];
  if (orient >= 2 && orient <= 8) cabeza.push(Uint8Array.of(
    0xff, 0xe1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // APP1 "Exif"
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // TIFF big-endian, primer directorio en 8
    0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orient, 0x00, 0x00, // 1 dato: Orientation
    0x00, 0x00, 0x00, 0x00));
  if (adobe >= 0) cabeza.push(Uint8Array.of(0xff, 0xee, 0x00, 0x0e, 0x41, 0x64, 0x6f, 0x62, 0x65, 0x00, 0x64, 0x00, 0x00, 0x00, 0x00, adobe & 0xff));
  return { datos: unir([...cabeza, ...partes, Uint8Array.of(0xff, 0xd9)]), quitado };
}

/** Orientation (0x0112) del primer directorio del Exif, o 0 si no está o el bloque está roto. */
function orientacionExif(d: Uint8Array): number {
  if (d.length < 14 || texto(d, 0, 6) !== 'Exif\0\0') return 0;
  const t = d.subarray(6), le = texto(t, 0, 2) === 'II';
  if (!le && texto(t, 0, 2) !== 'MM') return 0;
  const u16 = (o: number) => (o + 2 > t.length ? -1 : le ? t[o] | (t[o + 1] << 8) : (t[o] << 8) | t[o + 1]);
  const u32 = (o: number) => (o + 4 > t.length ? -1 : le ? (t[o] | (t[o + 1] << 8) | (t[o + 2] << 16)) + t[o + 3] * 2 ** 24 : ((t[o + 1] << 16) | (t[o + 2] << 8) | t[o + 3]) + t[o] * 2 ** 24);
  if (u16(2) !== 42) return 0;
  const dir = u32(4), cant = dir < 0 ? -1 : u16(dir);
  for (let e = 0; e < cant && e < 512; e++) {
    const p = dir + 2 + e * 12;
    if (p + 12 > t.length) return 0;
    if (u16(p) === 0x0112) return u16(p + 2) === 3 && u32(p + 4) === 1 ? Math.max(0, u16(p + 8)) : 0;
  }
  return 0;
}

/* PNG: se copian solo los bloques de la imagen y del color. Se descartan los textos (XMP, comentarios), eXIf, la
   fecha, el perfil de color (en las capturas de la Mac trae el nombre de la pantalla), la animación y lo que venga
   después del final. Un bloque desconocido que la imagen necesita (con mayúscula inicial) no se puede quitar: se rechaza. */
const PNG_IMAGEN = new Set(['IHDR', 'PLTE', 'tRNS', 'gAMA', 'cHRM', 'sRGB', 'IDAT', 'IEND']);

function limpiarPng(b: Uint8Array): { datos: Bytes; quitado: boolean } | null {
  const n = b.length, partes: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8, idat = false, quitado = false;
  while (i + 12 <= n) {
    const largo = b[i] * 2 ** 24 + ((b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]);
    if (largo > n - i - 12) return null;
    const tipo = texto(b, i + 4, i + 8);
    if (!/^[A-Za-z]{4}$/.test(tipo) || (i === 8) !== (tipo === 'IHDR') || (tipo === 'IHDR' && largo !== 13)) return null;
    const bloque = b.subarray(i, i + 12 + largo);
    i += 12 + largo;
    if (PNG_IMAGEN.has(tipo)) partes.push(bloque);
    else if (tipo.charCodeAt(0) < 0x61) return null;
    else { quitado = true; continue; }
    if (tipo === 'IDAT') idat = true;
    if (tipo === 'IEND') return idat ? { datos: unir(partes), quitado: quitado || i < n } : null;
  }
  return null;
}
