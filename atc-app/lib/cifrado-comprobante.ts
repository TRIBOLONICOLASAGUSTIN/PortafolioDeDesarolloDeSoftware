// Comprobantes cifrados con la llave del dueño (seguridad.md §5, fila 25). Lo usan el servidor (al guardar) y el panel
// (al guardar en la maqueta y al abrir): solo WebCrypto, igual en Node y en el navegador.
// - El servidor tiene únicamente la llave PÚBLICA (ATC_COMPROBANTES_PUBLICA): puede cifrar, nunca abrir. Quien entre a la
//   base o al servidor no puede leer los comprobantes guardados.
// - La llave PRIVADA está guardada bloqueada (ATC_COMPROBANTES_PRIVADA) con una frase que sabe solo el dueño; se
//   desbloquea en su navegador, que es donde se abre el comprobante. La frase nunca viaja al servidor.
// Sobre (versión 2): 2 ‖ llave efímera P-256 (65 bytes) ‖ iv (12) ‖ archivo cifrado con AES-256-GCM ‖ etiqueta (16).
// La llave del AES sale de ECDH (efímera × pública del dueño) con HKDF-SHA256; la AAD ata el sobre al tipo de archivo.
// La llave privada bloqueada: "p1.<iteraciones>.<sal>.<iv>.<pkcs8 cifrado>" (PBKDF2-SHA256 → AES-256-GCM), en base64url.
type Bytes = Uint8Array<ArrayBuffer>;
const VERSION = 2, PUB = 65, IV = 12, TAG = 16;
/** Bytes que el sobre suma al archivo. */
export const SOBRE_EXTRA = 1 + PUB + IV + TAG;
const te = new TextEncoder();
const subtle = () => globalThis.crypto.subtle;
const azar = (n: number): Bytes => globalThis.crypto.getRandomValues(new Uint8Array(n));
const etiqueta = (tipo: string): Bytes => te.encode(`atc-comprobante.v2|${tipo}`);

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export function aB64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : '') + (i + 2 < b.length ? B64[n & 63] : '');
  }
  return s;
}
export function deB64(s: string): Bytes | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length % 4 === 1) return null;
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < s.length; i += 4) {
    const n = (B64.indexOf(s[i]) << 18) | (B64.indexOf(s[i + 1]) << 12) | ((i + 2 < s.length ? B64.indexOf(s[i + 2]) : 0) << 6) | (i + 3 < s.length ? B64.indexOf(s[i + 3]) : 0);
    out[o++] = (n >> 16) & 255;
    if (i + 2 < s.length) out[o++] = (n >> 8) & 255;
    if (i + 3 < s.length) out[o++] = n & 255;
  }
  return out;
}

/** La llave pública del dueño (SPKI en base64url), lista para cifrar; null si no es una llave P-256 válida. */
export async function importarPublica(spkiB64: string): Promise<CryptoKey | null> {
  const spki = deB64(spkiB64);
  if (!spki) return null;
  try { return await subtle().importKey('spki', spki, { name: 'ECDH', namedCurve: 'P-256' }, true, []); } catch { return null; }
}

async function llaveAes(privada: CryptoKey, publica: CryptoKey, efimeraRaw: Bytes, tipo: string, uso: KeyUsage) {
  const secreto = await subtle().deriveBits({ name: 'ECDH', public: publica }, privada, 256);
  const base = await subtle().importKey('raw', secreto, 'HKDF', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: efimeraRaw, info: etiqueta(tipo) }, base, { name: 'AES-GCM', length: 256 }, false, [uso]);
}

/** Cifra el archivo para el dueño. Solo hace falta la llave pública: quien cifra no puede volver a abrirlo. */
export async function cifrarComprobante(publica: CryptoKey, tipo: string, plano: Uint8Array): Promise<Bytes> {
  const efimera = await subtle().generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const raw = new Uint8Array(await subtle().exportKey('raw', efimera.publicKey));
  const iv = azar(IV);
  const llave = await llaveAes(efimera.privateKey, publica, raw, tipo, 'encrypt');
  const cifrado = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: etiqueta(tipo), tagLength: 128 }, llave, new Uint8Array(plano)));
  const sobre = new Uint8Array(1 + PUB + IV + cifrado.length);
  sobre[0] = VERSION; sobre.set(raw, 1); sobre.set(iv, 1 + PUB); sobre.set(cifrado, 1 + PUB + IV);
  return sobre;
}

/** Abre un sobre con la llave privada ya desbloqueada; null si está alterado, es de otra versión o de otra llave. */
export async function descifrarComprobante(privada: CryptoKey, tipo: string, sobre: Uint8Array): Promise<Bytes | null> {
  if (sobre.length <= SOBRE_EXTRA || sobre[0] !== VERSION) return null;
  try {
    const raw = new Uint8Array(sobre.subarray(1, 1 + PUB));
    const efimera = await subtle().importKey('raw', raw, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const llave = await llaveAes(privada, efimera, raw, tipo, 'decrypt');
    return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: new Uint8Array(sobre.subarray(1 + PUB, 1 + PUB + IV)), additionalData: etiqueta(tipo), tagLength: 128 }, llave, new Uint8Array(sobre.subarray(1 + PUB + IV))));
  } catch {
    return null;
  }
}

/* ---------- La frase del dueño ---------- */
// La genera `npm run admin:setup`: 20 caracteres Crockford (100 bits), en 5 grupos de 4. Se escribe con o sin guiones,
// en mayúsculas o minúsculas, y las letras que se confunden (I, L, O) valen como 1 y 0.
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const normalizarFrase = (f: string) => f.toUpperCase().replace(/[IL]/g, '1').replace(/O/g, '0').replace(/[^0-9A-Z]/g, '');
export const fraseValida = (f: string) => normalizarFrase(f).length === 20 && [...normalizarFrase(f)].every(c => CROCKFORD.includes(c));
export function nuevaFrase(): string {
  const b = azar(20);
  return [...b].map(x => CROCKFORD[x & 31]).join('').match(/.{4}/g)!.join('-');
}

async function llaveFrase(frase: string, sal: Bytes, iteraciones: number, uso: KeyUsage) {
  const base = await subtle().importKey('raw', te.encode(normalizarFrase(frase)), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteraciones }, base, { name: 'AES-GCM', length: 256 }, false, [uso]);
}
export const ITERACIONES = 600_000;

/** Bloquea la llave privada (PKCS8) con la frase. Lo usa admin:setup. */
export async function bloquearPrivada(pkcs8: Uint8Array, frase: string, iteraciones = ITERACIONES): Promise<string> {
  const sal = azar(16), iv = azar(IV);
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv }, await llaveFrase(frase, sal, iteraciones, 'encrypt'), new Uint8Array(pkcs8)));
  return ['p1', String(iteraciones), aB64(sal), aB64(iv), aB64(ct)].join('.');
}

/** Forma de la llave privada bloqueada (sin abrirla). */
export const PRIVADA_RE = /^p1\.(\d{6,7})\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{16})\.([A-Za-z0-9_-]{100,400})$/;

/** Desbloquea la llave privada con la frase. Devuelve una llave que no se puede exportar, o null si la frase no es. */
export async function desbloquearPrivada(bloqueada: string, frase: string): Promise<CryptoKey | null> {
  const m = PRIVADA_RE.exec(bloqueada);
  if (!m || !fraseValida(frase)) return null;
  const [sal, iv, ct] = [deB64(m[2]), deB64(m[3]), deB64(m[4])];
  if (!sal || !iv || !ct) return null;
  try {
    const pkcs8 = await subtle().decrypt({ name: 'AES-GCM', iv }, await llaveFrase(frase, sal, Number(m[1]), 'decrypt'), ct);
    return await subtle().importKey('pkcs8', pkcs8, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  } catch {
    return null;
  }
}
