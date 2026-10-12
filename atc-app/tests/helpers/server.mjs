// Levanta `next start` (la app ya compilada con `npm run build`) con el entorno indicado, y lo apaga al final.
// Las pruebas corren contra la app real de producción: CSP, encabezados y la ruta /api/seguimiento.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { localDbUrl } from '../db/helpers.mjs';

const APP = fileURLToPath(new URL('../..', import.meta.url));

// Clave fija para cifrar los comprobantes en las pruebas (32 bytes en base64url). Solo pruebas: la real la genera
// `npm run admin:setup` y vive en el entorno del servidor.
export const CLAVE_PRUEBA = Buffer.from('clave-de-prueba-de-comprobantes!').toString('base64url');

// Entorno de la base local de pruebas (scripts/db-local.sh): atc_tracker con la contraseña al azar del cluster, solo en 127.0.0.1.
export const LOCAL_ENV = {
  ATC_TRACKER_DATABASE_URL: localDbUrl('atc_tracker'),
  ATC_TIENDA_DATABASE_URL: localDbUrl('atc_tienda'),
  ATC_PANEL_DATABASE_URL: localDbUrl('atc_panel'),
  ATC_COMPROBANTES_KEY: CLAVE_PRUEBA,
  ATC_LOCAL: '1',
  ATC_IP_HEADER: 'cf-connecting-ip',
};

export async function startServer({ port, env = {} }) {
  const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(ATC_|TURNSTILE_|UPSTASH_|NEXT_PUBLIC_TURNSTILE)/.test(k)));
  // Vacías a propósito: Next no pisa variables ya definidas, así un .env.local local (por ejemplo, el superadmin real
  // del dueño) nunca se mezcla con las pruebas. Cada prueba pasa lo que necesita en `env`.
  const blank = Object.fromEntries(['ATC_ADMIN_USER', 'ATC_ADMIN_PASS_HASH', 'ATC_ADMIN_TOTP_SECRET', 'ATC_SESSION_SECRET', 'ATC_TRACKER_DATABASE_URL', 'ATC_TIENDA_DATABASE_URL', 'ATC_PANEL_DATABASE_URL', 'ATC_COMPROBANTES_KEY', 'TURNSTILE_SECRET_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'ATC_DB_CA'].map(k => [k, '']));
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'], {
    cwd: APP, env: { ...clean, ...blank, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', ...env }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', d => { log += d; });
  child.stderr.on('data', d => { log += d; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error(`next start terminó:\n${log}`);
    try { const r = await fetch(base + '/'); if (r.ok) break; } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  return { base, log: () => log, stop: () => new Promise(r => { child.once('exit', r); child.kill('SIGTERM'); }) };
}
