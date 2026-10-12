// Llaves de prueba para los comprobantes (solo pruebas): un par P-256 nuevo en cada corrida, con la llave privada
// bloqueada con FRASE_PRUEBA. Es una implementación propia (WebCrypto), separada de lib/cifrado-comprobante.ts: así las
// pruebas controlan que el formato del sobre y de la llave bloqueada sea el documentado, no que el código coincida consigo mismo.
const s = globalThis.crypto.subtle, te = new TextEncoder();
const b64 = b => Buffer.from(b).toString('base64url');
export const FRASE_PRUEBA = 'PRBA-0000-1111-2222-3333';

async function bloquear(pkcs8, frase, iteraciones = 600_000) {
  const sal = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await s.importKey('raw', te.encode(frase.replaceAll('-', '')), 'PBKDF2', false, ['deriveKey']);
  const k = await s.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteraciones }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  return ['p1', iteraciones, b64(sal), b64(iv), b64(await s.encrypt({ name: 'AES-GCM', iv }, k, pkcs8))].join('.');
}

const par = await s.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
/** publica y privada (bloqueada) como van en el entorno; privadaKey, para abrir sobres en las pruebas. */
export const LLAVES_PRUEBA = {
  publica: b64(await s.exportKey('spki', par.publicKey)),
  privada: await bloquear(new Uint8Array(await s.exportKey('pkcs8', par.privateKey)), FRASE_PRUEBA),
  privadaKey: par.privateKey,
};

/** Abre un sobre versión 2: 2 ‖ efímera (65) ‖ iv (12) ‖ cifrado + etiqueta, con ECDH + HKDF-SHA256 + AES-256-GCM. */
export async function abrirSobre(sobre, tipo, privada = LLAVES_PRUEBA.privadaKey) {
  if (sobre[0] !== 2) throw new Error('no es un sobre versión 2');
  const raw = sobre.subarray(1, 66), iv = sobre.subarray(66, 78), info = te.encode(`atc-comprobante.v2|${tipo}`);
  const efimera = await s.importKey('raw', raw, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const secreto = await s.deriveBits({ name: 'ECDH', public: efimera }, privada, 256);
  const base = await s.importKey('raw', secreto, 'HKDF', false, ['deriveKey']);
  const k = await s.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: raw, info }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  return Buffer.from(await s.decrypt({ name: 'AES-GCM', iv, additionalData: info }, k, sobre.subarray(78)));
}
