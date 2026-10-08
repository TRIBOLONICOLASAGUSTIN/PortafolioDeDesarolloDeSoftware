import 'server-only';
import { createHash } from 'node:crypto';

// Límite del servidor por IP, ANTES de tocar la base (la base tiene además sus propios bloqueos).
// Ventana fija de 10 minutos. Producción: Upstash Redis por REST (contador compartido entre instancias).
// Desarrollo y pruebas locales: en memoria (en serverless no serviría: cada instancia tendría el suyo).
const WINDOW_S = 600;
const max = () => Number(process.env.ATC_RL_MAX ?? 20);
const keyFor = (ip: string) => {
  const bucket = Math.floor(Date.now() / 1000 / WINDOW_S);
  // La IP se guarda como hash: el contador no necesita la IP en crudo.
  return { key: `atc:trk:${createHash('sha256').update(ip).digest('hex').slice(0, 32)}:${bucket}`, retry: WINDOW_S - (Math.floor(Date.now() / 1000) % WINDOW_S) };
};

const mem = new Map<string, { n: number; exp: number }>();

export type Limit = { allowed: boolean; retry: number } | 'error';

export async function limit(ip: string, mode: 'demo' | 'local' | 'prod'): Promise<Limit> {
  const { key, retry } = keyFor(ip);
  if (mode !== 'prod') {
    const now = Date.now();
    if (mem.size > 5000) for (const [k, v] of mem) if (v.exp < now) mem.delete(k);
    const e = mem.get(key) ?? { n: 0, exp: now + retry * 1000 };
    e.n += 1; mem.set(key, e);
    return { allowed: e.n <= max(), retry };
  }
  try {
    const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', key], ['EXPIRE', key, String(WINDOW_S), 'NX']]),
      signal: AbortSignal.timeout(1500),
      cache: 'no-store',
    });
    if (!res.ok) return 'error';
    const out = (await res.json()) as { result?: number }[];
    const n = Number(out?.[0]?.result);
    return Number.isFinite(n) ? { allowed: n <= max(), retry } : 'error';
  } catch {
    return 'error'; // sin contador compartido no se atiende (falla cerrado)
  }
}
