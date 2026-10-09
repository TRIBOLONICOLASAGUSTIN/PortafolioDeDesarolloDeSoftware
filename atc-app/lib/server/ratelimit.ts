import 'server-only';
import { createHash } from 'node:crypto';

// Límite del servidor por IP, ANTES de tocar la base (la base tiene además sus propios bloqueos).
// Ventana fija. Producción: Upstash Redis por REST (contador compartido entre instancias).
// Desarrollo y pruebas locales: en memoria (en serverless no serviría: cada instancia tendría el suyo).
// Seguimiento: 20 pedidos cada 10 minutos (ATC_RL_MAX). Ingreso del superadmin: lo fija la ruta (más estricto).
// Si ATC_RL_MAX no es un número positivo, se usa 20 (un valor inválido no debe bloquear todo el tráfico).
const maxTrk = () => { const m = Number(process.env.ATC_RL_MAX); return Number.isFinite(m) && m > 0 ? m : 20; };
const keyFor = (ip: string, ns: string, win: number) => {
  const bucket = Math.floor(Date.now() / 1000 / win);
  // La IP se guarda como hash: el contador no necesita la IP en crudo.
  return { key: `atc:${ns}:${createHash('sha256').update(ip).digest('hex').slice(0, 32)}:${bucket}`, retry: win - (Math.floor(Date.now() / 1000) % win) };
};
type Opts = { ns?: string; max?: number; window?: number };

const mem = new Map<string, { n: number; exp: number }>();

export type Limit = { allowed: boolean; retry: number } | 'error';

export async function limit(ip: string, mode: 'demo' | 'local' | 'prod', o: Opts = {}): Promise<Limit> {
  const win = o.window ?? 600, max = () => o.max ?? maxTrk();
  const { key, retry } = keyFor(ip, o.ns ?? 'trk', win);
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
      body: JSON.stringify([['INCR', key], ['EXPIRE', key, String(win), 'NX']]),
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

const seen = new Map<string, number>();

/**
 * Marca una clave como usada durante `ttl` segundos. true si es la primera vez; false si ya estaba (o si
 * Upstash no responde: falla cerrado). Sirve para que un código del celular no se pueda usar dos veces.
 */
export async function primeraVez(key: string, ttl: number, mode: 'demo' | 'local' | 'prod'): Promise<boolean> {
  if (mode !== 'prod') {
    const now = Date.now();
    for (const [k, exp] of seen) if (exp < now) seen.delete(k);
    if (seen.has(key)) return false;
    seen.set(key, now + ttl * 1000);
    return true;
  }
  try {
    const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['SET', `atc:${key}`, '1', 'NX', 'EX', String(ttl)]]),
      signal: AbortSignal.timeout(1500),
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const out = (await res.json()) as { result?: string | null }[];
    return out?.[0]?.result === 'OK';
  } catch {
    return false;
  }
}
