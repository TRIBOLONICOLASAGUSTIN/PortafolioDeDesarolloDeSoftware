// Configura el superadmin del panel: usuario, contraseña (se guarda solo su hash scrypt), clave del código
// del celular (TOTP) y el secreto de las sesiones. Escribe atc-app/.env.local (git lo ignora: nunca se sube).
// Uso:  npm run admin:setup     (en Windows PowerShell: npm.cmd run admin:setup)
// Producción: claves PROPIAS, nunca las de la compu (una sesión o un código de desarrollo no deben servir en el sitio):
//        npm run admin:setup -- --prod
// genera otra contraseña, otra cuenta en la app del celular y otro secreto, y solo los muestra en la pantalla para
// copiarlos en el entorno del hosting (no escribe .env.local).
// También genera la llave de los comprobantes de transferencia (lib/cifrado-comprobante.ts), SOLO si todavía no existe:
// - ATC_COMPROBANTES_PUBLICA: con ella el servidor cifra; no sirve para abrir.
// - ATC_COMPROBANTES_PRIVADA: la que abre, bloqueada con una FRASE que se muestra una sola vez y no se guarda en ningún
//   lado: va en tu gestor de contraseñas. El panel la pide para ver un comprobante.
// Nunca se reemplazan solas (se perderían los comprobantes guardados). Para eso:
//        npm run admin:setup -- --cambiar-frase   (misma llave, frase nueva: pide la actual; los comprobantes siguen)
//        npm run admin:setup -- --frase-nueva     (llave y frase nuevas: los comprobantes guardados ya no se abren)
import { createHmac, randomBytes, scrypt, webcrypto } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import readline from 'node:readline';

const ENV = join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local');
const KEYS = ['ATC_ADMIN_USER', 'ATC_ADMIN_PASS_HASH', 'ATC_ADMIN_TOTP_SECRET', 'ATC_SESSION_SECRET'];
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Las respuestas se leen de a una línea, en orden (aunque se peguen varias juntas).
const tty = !!process.stdin.isTTY;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: tty });
const queue = [];
let waiting = null, muted = false;
rl.on('line', l => { if (waiting) { const w = waiting; waiting = null; w(l); } else queue.push(l); });
// Contraseña: en vez de lo que se escribe, se muestran asteriscos.
rl._writeToOutput = s => rl.output.write(muted && !/^[\r\n]+$/.test(s) ? '*' : s);
const ask = (q, hidden = false) => new Promise(res => {
  process.stdout.write(q);
  muted = hidden && tty;
  const done = a => { if (muted) process.stdout.write('\n'); muted = false; if (!tty) process.stdout.write('\n'); res(a); };
  if (queue.length) done(queue.shift()); else waiting = done;
});

const base32 = buf => { let bits = 0, val = 0, out = ''; for (const b of buf) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } } return bits ? out + B32[(val << (5 - bits)) & 31] : out; };
const totp = (key, step) => { const m = Buffer.alloc(8); m.writeBigUInt64BE(BigInt(step)); const h = createHmac('sha1', key).update(m).digest(); const o = h[19] & 15; return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0'); };

const PROD = process.argv.includes('--prod');
const CAMBIAR_FRASE = process.argv.includes('--cambiar-frase'), FRASE_NUEVA = process.argv.includes('--frase-nueva');
const current = existsSync(ENV) ? readFileSync(ENV, 'utf8') : '';
const salir = (codigo = 0) => { rl.close(); process.exit(codigo); };

// Next lee .env.local con dotenv, que acepta comillas, comentarios, `export`, espacios y BOM. Para leer una variable se
// usa el mismo parser (el de dotenv 16 que trae @next/env, copiado), y su línea se reconoce por el nombre.
const LINEA = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;
const valorEnv = (texto, nombre) => {
  let v;
  for (const m of texto.replace(/\r\n?/gm, '\n').matchAll(LINEA)) if (m[1] === nombre) v = (m[2] || '').trim().replace(/^(['"`])([\s\S]*)\1$/gm, '$2');
  return v;
};
const nombreDe = l => (/^﻿?\s*(?:export\s+)?([\w.-]+)\s*[=:]/.exec(l) ?? [])[1];
/** Reescribe .env.local: saca las líneas de `quitar` (por nombre, como las lee Next) y agrega `lineas` al final. */
const escribirEnv = (texto, quitar, lineas) =>
  writeFileSync(ENV, [...texto.split(/\r?\n/).filter(l => l.trim() && !quitar.includes(nombreDe(l))), ...lineas, ''].join('\n'), { mode: 0o600 });

/* ---------- Llave de los comprobantes (el mismo formato que lib/cifrado-comprobante.ts) ---------- */
const subtle = webcrypto.subtle;
const PUB = 'ATC_COMPROBANTES_PUBLICA', PRIV = 'ATC_COMPROBANTES_PRIVADA', VIEJA = 'ATC_COMPROBANTES_KEY';
const PRIVADA_RE = /^p1\.(\d{6,7})\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{16})\.([A-Za-z0-9_-]{100,400})$/;
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const nuevaFrase = () => [...randomBytes(20)].map(x => CROCKFORD[x & 31]).join('').match(/.{4}/g).join('-');
const normalizarFrase = f => f.toUpperCase().replace(/[IL]/g, '1').replace(/O/g, '0').replace(/[^0-9A-Z]/g, '');
const b64 = b => Buffer.from(b).toString('base64url');
async function llaveFrase(frase, sal, iteraciones, uso) {
  const base = await subtle.importKey('raw', new TextEncoder().encode(normalizarFrase(frase)), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteraciones }, base, { name: 'AES-GCM', length: 256 }, false, [uso]);
}
async function bloquear(pkcs8, frase) {
  const sal = randomBytes(16), iv = randomBytes(12);
  return ['p1', '600000', b64(sal), b64(iv), b64(await subtle.encrypt({ name: 'AES-GCM', iv }, await llaveFrase(frase, sal, 600000, 'encrypt'), pkcs8))].join('.');
}
async function desbloquear(bloqueada, frase) {
  const m = PRIVADA_RE.exec(bloqueada ?? '');
  if (!m) return null;
  try { return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(m[3], 'base64url') }, await llaveFrase(frase, Buffer.from(m[2], 'base64url'), Number(m[1]), 'decrypt'), Buffer.from(m[4], 'base64url'))); } catch { return null; }
}
async function nuevaLlave() {
  const par = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const frase = nuevaFrase();
  return { frase, publica: b64(await subtle.exportKey('spki', par.publicKey)), privada: await bloquear(new Uint8Array(await subtle.exportKey('pkcs8', par.privateKey)), frase) };
}
const lineasLlave = l => ['# Llave de los comprobantes: con la pública el servidor cifra; la privada está bloqueada con tu frase (que no se guarda acá).', `${PUB}=${l.publica}`, `${PRIV}=${l.privada}`];
function mostrarFrase(frase) {
  console.log('\n  ┌──────────────────────────────────────────────────────────────┐');
  console.log(`  │  Frase de comprobantes:  ${frase}            │`);
  console.log('  └──────────────────────────────────────────────────────────────┘');
  console.log('  Guardala YA en tu gestor de contraseñas. No se guarda en ningún otro lado: sin ella no se pueden abrir');
  console.log('  los comprobantes. El panel la pide para ver uno (una vez por visita).');
}

const pubActual = valorEnv(current, PUB), privActual = valorEnv(current, PRIV);
const tieneLlave = /^[A-Za-z0-9_-]{122}$/.test(pubActual ?? '') && PRIVADA_RE.test(privActual ?? '');
const tieneVieja = valorEnv(current, VIEJA) !== undefined;
if (PROD) console.log('Claves para PRODUCCIÓN: usá otra contraseña que la de la compu. Nada se guarda en este equipo.\n');

// Un valor que no se reconoce no se pisa nunca: podría ser la llave real escrita de otra forma.
if (!PROD && (pubActual || privActual) && !tieneLlave) {
  console.error(`${PUB} o ${PRIV} en .env.local no tienen la forma esperada. No se cambió nada: revisalas a mano`);
  console.error('(si son las de los comprobantes guardados, no las borres) y volvé a correr el comando.');
  salir(1);
}

if (CAMBIAR_FRASE) {
  // Misma llave, frase nueva: los comprobantes guardados se siguen abriendo (con la frase nueva).
  const bloqueada = PROD ? (await ask(`Pegá el valor actual de ${PRIV} (el del hosting): `)).trim() : privActual;
  if (!PRIVADA_RE.test(bloqueada ?? '')) { console.error(`No hay una ${PRIV} válida para cambiarle la frase.`); salir(1); }
  const pkcs8 = await desbloquear(bloqueada, await ask('Frase actual: ', true));
  if (!pkcs8) { console.error('Esa no es la frase. No se cambió nada.'); salir(1); }
  const frase = nuevaFrase(), privada = await bloquear(pkcs8, frase);
  if (PROD) console.log(`\nReemplazá en el hosting:\n\n${PRIV}=${privada}`);
  else { escribirEnv(current, [PRIV], [`${PRIV}=${privada}`]); console.log(`\nListo: se actualizó ${PRIV} en ${ENV}.`); }
  mostrarFrase(frase);
  console.log('  La frase anterior deja de servir.');
  salir(0);
}
if (FRASE_NUEVA) {
  if (!PROD && tieneLlave) {
    const r = (await ask('Se crea una llave nueva: los comprobantes guardados con la actual NO se van a poder abrir. ¿Seguir? (s/N): ')).trim().toLowerCase();
    if (r !== 's' && r !== 'si' && r !== 'sí') { console.log('Sin cambios.'); salir(0); }
  }
  const l = await nuevaLlave();
  if (PROD) console.log(`\nCopiá en el hosting:\n\n${PUB}=${l.publica}\n${PRIV}=${l.privada}`);
  else { escribirEnv(current, [PUB, PRIV, VIEJA], lineasLlave(l)); console.log(`\nListo: llave nueva en ${ENV}.`); }
  mostrarFrase(l.frase);
  salir(0);
}

if (!PROD && /^ATC_ADMIN_PASS_HASH=/m.test(current)) {
  const r = (await ask('Ya hay un superadmin en .env.local. ¿Reemplazarlo? Se cierran sus sesiones abiertas (s/N): ')).trim().toLowerCase();
  if (r !== 's' && r !== 'si' && r !== 'sí') {
    // Aunque no se cambie el superadmin, si falta la llave de los comprobantes se agrega (nunca se reemplaza).
    if (!tieneLlave || tieneVieja) {
      const l = tieneLlave ? null : await nuevaLlave();
      escribirEnv(current, [VIEJA, ...(l ? [PUB, PRIV] : [])], l ? lineasLlave(l) : []);
      if (tieneVieja) console.log(`Se quitó ${VIEJA}: ya no se usa (el servidor no tiene la llave que abre los comprobantes).`);
      if (l) { console.log(`Superadmin sin cambios. Se agregó la llave de los comprobantes en ${ENV}.`); mostrarFrase(l.frase); }
    } else console.log('Sin cambios.');
    salir(0);
  }
}
const user = (await ask('Usuario del superadmin: ')).trim();
if (!/^[\w.@+-]{3,80}$/.test(user)) { console.error('El usuario tiene que tener entre 3 y 80 caracteres (letras, números, . _ - @ +).'); rl.close(); process.exit(1); }
const pass = await ask('Contraseña (12 caracteres o más): ', true);
if (pass.length < 12) { console.error('La contraseña tiene que tener 12 caracteres o más.'); rl.close(); process.exit(1); }
if ((await ask('Repetí la contraseña: ', true)) !== pass) { console.error('Las contraseñas no coinciden.'); rl.close(); process.exit(1); }
rl.close();

console.log('\nCalculando el hash (tarda unos segundos a propósito)…');
const salt = randomBytes(16);
const hash = await promisify(scrypt)(pass.normalize('NFC'), salt, 32, { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
const totpKey = randomBytes(20);
const values = {
  ATC_ADMIN_USER: user,
  ATC_ADMIN_PASS_HASH: `scrypt:17:8:1:${salt.toString('base64url')}:${hash.toString('base64url')}`,
  ATC_ADMIN_TOTP_SECRET: base32(totpKey),
  ATC_SESSION_SECRET: randomBytes(32).toString('base64url'),
};
const issuer = encodeURIComponent(PROD ? 'AT Computación (prod)' : 'AT Computación');
// La llave de los comprobantes: en producción se muestra para copiarla (solo si el hosting todavía no la tiene); en la compu
// se conserva tal cual y, si falta, se agrega.
const llave = PROD || !tieneLlave ? await nuevaLlave() : null;
if (PROD) {
  console.log('\nCopiá estas 4 variables en la configuración de entorno del hosting (nunca en el repo ni en un chat):\n');
  for (const k of KEYS) console.log(`${k}=${values[k]}`);
  console.log(`\nY, SOLO si el hosting todavía no tiene ${PUB} (cambiarla deja sin abrir los comprobantes guardados), estas dos:\n`);
  console.log(`${PUB}=${llave.publica}\n${PRIV}=${llave.privada}`);
} else {
  escribirEnv(current, [...KEYS, VIEJA, ...(llave ? [PUB, PRIV] : [])], [...(llave ? lineasLlave(llave) : []),
    '# Superadmin del panel (generado con npm run admin:setup). NUNCA subir este archivo.', ...KEYS.map(k => `${k}=${values[k]}`)]);
  console.log(`\nListo: se guardó en ${ENV}${llave ? ' (con la llave de los comprobantes)' : ''}`);
  if (tieneVieja) console.log(`Se quitó ${VIEJA}: ya no se usa.`);
}
if (llave) mostrarFrase(llave.frase);
console.log('\nAhora agregá la cuenta en tu app de autenticación (Google Authenticator, Microsoft Authenticator…):');
console.log('  "Agregar código" → "Ingresar una clave de configuración" → tipo "Basado en tiempo".');
console.log(`  Nombre: AT Computación${PROD ? ' (prod)' : ''} (${user})`);
console.log(`  Clave:  ${values.ATC_ADMIN_TOTP_SECRET.match(/.{1,4}/g).join(' ')}`);
console.log(`\n  (o este enlace, si tu app lo acepta: otpauth://totp/${issuer}:${encodeURIComponent(user)}?secret=${values.ATC_ADMIN_TOTP_SECRET}&issuer=${issuer}&digits=6&period=30)`);
console.log(`\nPara comprobar: ahora mismo tu app debería mostrar ${totp(totpKey, Math.floor(Date.now() / 30000))}.`);
console.log(PROD ? '\nDespués: volvé a desplegar el sitio y entrá por /ingresar. Guardá la clave del celular en un lugar seguro:' : '\nDespués: reiniciá el servidor (npm run dev) y entrá por http://localhost:3000/ingresar. Guardá la clave del celular en un lugar seguro:');
console.log('si perdés el celular, volvé a correr este comando (genera una clave nueva y cierra las sesiones).');
