import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Comprobantes cifrados en la base (seguridad.md §5, fila 25): AES-256-GCM con ATC_COMPROBANTES_KEY, que vive solo en el
// entorno del servidor. Quien lea la base (el panel de Supabase, un backup, una clave filtrada) ve bytes sin sentido, y
// la base rechaza un archivo sin cifrar (migración 20261011000300_comprobantes_cifrados.sql).
// Sobre: versión (1) ‖ iv (12 bytes al azar) ‖ archivo cifrado ‖ etiqueta (16). La etiqueta detecta cualquier cambio, y
// la AAD ata el sobre al tipo de archivo (cambiar el tipo en la base hace fallar el descifrado).
const VERSION = 1, IV = 12, TAG = 16;
/** Bytes que el sobre suma al archivo. */
export const SOBRE_EXTRA = 1 + IV + TAG;
const aad = (tipo: string) => Buffer.from(`atc-comprobante.v1|${tipo}`);

export function cifrar(clave: Buffer, tipo: string, plano: Uint8Array): Buffer {
  const iv = randomBytes(IV);
  const c = createCipheriv('aes-256-gcm', clave, iv, { authTagLength: TAG });
  c.setAAD(aad(tipo));
  const cuerpo = Buffer.concat([c.update(plano), c.final()]);
  return Buffer.concat([Buffer.of(VERSION), iv, cuerpo, c.getAuthTag()]);
}

/** El archivo original, o null si el sobre está alterado, es de otra versión o se cifró con otra clave. */
export function descifrar(clave: Buffer, tipo: string, sobre: Uint8Array): Buffer | null {
  if (sobre.length <= SOBRE_EXTRA || sobre[0] !== VERSION) return null;
  try {
    const d = createDecipheriv('aes-256-gcm', clave, sobre.subarray(1, 1 + IV), { authTagLength: TAG });
    d.setAAD(aad(tipo));
    d.setAuthTag(sobre.subarray(sobre.length - TAG));
    return Buffer.concat([d.update(sobre.subarray(1 + IV, sobre.length - TAG)), d.final()]);
  } catch {
    return null;
  }
}
