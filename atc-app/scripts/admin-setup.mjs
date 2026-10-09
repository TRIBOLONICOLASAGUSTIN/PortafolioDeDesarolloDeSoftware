// Configura el superadmin del panel: usuario, contraseña (se guarda solo su hash scrypt), clave del código
// del celular (TOTP) y el secreto de las sesiones. Escribe atc-app/.env.local (git lo ignora: nunca se sube).
// Uso:  npm run admin:setup     (en Windows PowerShell: npm.cmd run admin:setup)
// Para producción, copiá las mismas 4 variables en la configuración de entorno del hosting.
import { createHmac, randomBytes, scrypt } from 'node:crypto';
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

const current = existsSync(ENV) ? readFileSync(ENV, 'utf8') : '';
if (/^ATC_ADMIN_PASS_HASH=/m.test(current)) {
  const r = (await ask('Ya hay un superadmin en .env.local. ¿Reemplazarlo? Se cierran sus sesiones abiertas (s/N): ')).trim().toLowerCase();
  if (r !== 's' && r !== 'si' && r !== 'sí') { console.log('Sin cambios.'); rl.close(); process.exit(0); }
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
const kept = current.split(/\r?\n/).filter(l => l.trim() && !KEYS.some(k => l.startsWith(`${k}=`)));
writeFileSync(ENV, [...kept, '# Superadmin del panel (generado con npm run admin:setup). NUNCA subir este archivo.', ...KEYS.map(k => `${k}=${values[k]}`), ''].join('\n'), { mode: 0o600 });

const issuer = encodeURIComponent('AT Computación');
console.log(`\nListo: se guardó en ${ENV}`);
console.log('\nAhora agregá la cuenta en tu app de autenticación (Google Authenticator, Microsoft Authenticator…):');
console.log('  "Agregar código" → "Ingresar una clave de configuración" → tipo "Basado en tiempo".');
console.log(`  Nombre: AT Computación (${user})`);
console.log(`  Clave:  ${values.ATC_ADMIN_TOTP_SECRET.match(/.{1,4}/g).join(' ')}`);
console.log(`\n  (o este enlace, si tu app lo acepta: otpauth://totp/${issuer}:${encodeURIComponent(user)}?secret=${values.ATC_ADMIN_TOTP_SECRET}&issuer=${issuer}&digits=6&period=30)`);
console.log(`\nPara comprobar: ahora mismo tu app debería mostrar ${totp(totpKey, Math.floor(Date.now() / 30000))}.`);
console.log('\nDespués: reiniciá el servidor (npm run dev) y entrá por /ingresar. Guardá la clave del celular en un lugar seguro:');
console.log('si perdés el celular, volvé a correr este comando (genera una clave nueva y cierra las sesiones).');
