// Levanta `next start` (la app ya compilada con `npm run build`) con el entorno indicado, y lo apaga al final.
// Las pruebas corren contra la app real de producción: CSP, encabezados y la ruta /api/seguimiento.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('../..', import.meta.url));

// Entorno de la base local de pruebas (scripts/db-local.sh): atc_tracker sin contraseña, solo en 127.0.0.1.
export const LOCAL_ENV = {
  ATC_TRACKER_DATABASE_URL: `postgres://atc_tracker@127.0.0.1:${process.env.ATC_PGPORT ?? '54329'}/${process.env.ATC_DB ?? 'atc_test'}`,
  ATC_LOCAL: '1',
  ATC_IP_HEADER: 'cf-connecting-ip',
};

export async function startServer({ port, env = {} }) {
  const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(ATC_|TURNSTILE_|UPSTASH_|NEXT_PUBLIC_TURNSTILE)/.test(k)));
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'], {
    cwd: APP, env: { ...clean, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', ...env }, stdio: ['ignore', 'pipe', 'pipe'],
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
