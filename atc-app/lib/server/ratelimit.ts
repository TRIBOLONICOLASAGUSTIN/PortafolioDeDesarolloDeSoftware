import 'server-only';
import { createHmac, randomBytes } from 'node:crypto';
import { redLimite } from './config';

// Límite del servidor por IP, ANTES de tocar la base (la base tiene además sus propios bloqueos).
// Ventana fija. Producción: Upstash Redis por REST (contador compartido entre instancias).
// Desarrollo y pruebas locales: en memoria (en serverless no serviría: cada instancia tendría el suyo).
// Seguimiento: 20 pedidos cada 10 minutos (ATC_RL_MAX). Ingreso del superadmin: lo fija la ruta (más estricto).
// Si ATC_RL_MAX no es un número positivo, se usa 20 (un valor inválido no debe bloquear todo el tráfico).
const maxTrk = () => { const m = Number(process.env.ATC_RL_MAX); return Number.isFinite(m) && m > 0 ? m : 20; };
// La red se guarda como HMAC con un secreto del servidor: un SHA-256 sin secreto de una IPv4 se revierte probando las
// 2^32 direcciones. En producción el secreto sale de TURNSTILE_SECRET_KEY (obligatoria, nunca viaja a Upstash), con
// su propio dominio; fuera de producción el contador está en memoria y alcanza con uno al azar por proceso.
const LOCAL_KEY = randomBytes(32);
const rlKey = () => { const t = process.env.TURNSTILE_SECRET_KEY; return t ? createHmac('sha256', t).update('atc-rl-v1').digest() : LOCAL_KEY; };
const red = (ip: string, bits: 48 | 64) => createHmac('sha256', rlKey()).update(`rl-v1\n${redLimite(ip, bits)}`).digest('hex').slice(0, 32);
const keyFor = (ip: string, ns: string, win: number, bits: 48 | 64) => {
  const bucket = Math.floor(Date.now() / 1000 / win);
  // En IPv6 cuenta el /64 entero (o el /48, si la ruta lo pide: redLimite).
  return { key: `atc:${ns}:${red(ip, bits)}:${bucket}`, retry: win - (Math.floor(Date.now() / 1000) % win) };
};
const upstash = (cmds: string[][]) => fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(cmds),
  signal: AbortSignal.timeout(1500),
  cache: 'no-store',
});
// Redes que ya pasaron el límite en esta ventana: hasta que vence, no se le pregunta a Upstash (un atacante con una
// sola IP no puede gastar el cupo de Upstash ni, por la falla cerrada, tirar el servicio para todos).
const bloqueadas = new Map<string, number>();
type Opts = { ns?: string; max?: number; window?: number; bits?: 48 | 64 };

type Cuenta = { n: number; exp: number };
const mem = new Map<string, Cuenta>();
// En producción, primero se cuenta en este proceso (sin esperar a nadie): con muchos pedidos simultáneos de la misma
// red, como mucho `max` llegan a Upstash por instancia y el resto se corta acá (antes, todos consultaban a la vez).
const locales = new Map<string, Cuenta>();

// Memoria acotada: lo vencido se saca como mucho una vez por segundo; si igual queda demasiado (direcciones IPv6 que
// rotan), se descarta lo más viejo. Así cada pedido cuesta lo mismo aunque haya miles de redes distintas.
const TOPE = 20_000;
const podas = new WeakMap<Map<string, unknown>, number>();
function podar<V>(m: Map<string, V>, now: number, exp: (v: V) => number) {
  if (m.size <= 5000 || now - (podas.get(m) ?? 0) < 1000) return;
  podas.set(m, now);
  for (const [k, v] of m) if (exp(v) < now) m.delete(k);
  let sobran = m.size - TOPE;
  for (const k of m.keys()) { if (sobran-- <= 0) break; m.delete(k); }
}
function contar(m: Map<string, Cuenta>, key: string, now: number, exp: number) {
  podar(m, now, v => v.exp);
  const e = m.get(key);
  const v = e && e.exp > now ? e : { n: 0, exp };
  v.n += 1; m.set(key, v);
  return v.n;
}

export type Limit = { allowed: boolean; retry: number } | 'error';

export async function limit(ip: string, mode: 'demo' | 'local' | 'prod', o: Opts = {}): Promise<Limit> {
  const win = o.window ?? 600, max = () => o.max ?? maxTrk();
  const { key, retry } = keyFor(ip, o.ns ?? 'trk', win, o.bits ?? 64);
  const now = Date.now(), exp = now + retry * 1000;
  if (mode !== 'prod') return { allowed: contar(mem, key, now, exp) <= max(), retry };
  podar(bloqueadas, now, v => v);
  if ((bloqueadas.get(key) ?? 0) > now) return { allowed: false, retry };
  if (contar(locales, key, now, exp) > max()) { bloqueadas.set(key, exp); return { allowed: false, retry }; }
  try {
    // Una sola llamada por pedido: suma uno y fija el vencimiento si todavía no lo tiene (NX), juntos.
    const res = await upstash([['INCR', key], ['EXPIRE', key, String(win), 'NX']]);
    if (!res.ok) return 'error';
    const n = Number(((await res.json()) as { result?: number }[])?.[0]?.result);
    if (!Number.isFinite(n)) return 'error';
    if (n > max()) bloqueadas.set(key, exp);
    return { allowed: n <= max(), retry };
  } catch {
    return 'error'; // sin contador compartido no se atiende (falla cerrado)
  }
}

const fallas = new Map<string, Cuenta>();
/**
 * Códigos del celular fallidos con la contraseña correcta, por cuenta y desde cualquier red, en 24 h. Solo los puede
 * provocar quien ya tiene la contraseña, así que no sirve para bloquear al dueño desde afuera. `sumar`: cuenta uno más;
 * si no, solo lee (la ruta consulta siempre, para que el tiempo de respuesta no delate si la contraseña era correcta).
 * 'error' si Upstash no responde (falla cerrado).
 */
export async function fallos2fa(cuenta: string, mode: 'demo' | 'local' | 'prod', sumar: boolean): Promise<number | 'error'> {
  const key = `atc:adm:2fa:${cuenta}`, ttl = 86400;
  if (mode !== 'prod') {
    const now = Date.now();
    podar(fallas, now, v => v.exp);
    const e = fallas.get(key);
    const v = e && e.exp > now ? e : { n: 0, exp: now + ttl * 1000 };
    if (sumar) v.n += 1;
    fallas.set(key, v);
    return v.n;
  }
  try {
    const res = await upstash(sumar ? [['INCR', key], ['EXPIRE', key, String(ttl), 'NX']] : [['GET', key]]);
    if (!res.ok) return 'error';
    const v = ((await res.json()) as { result?: number | string | null }[])?.[0]?.result;
    const n = v === null || v === undefined ? 0 : Number(v);
    return Number.isFinite(n) ? n : 'error';
  } catch {
    return 'error';
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
    podar(seen, now, v => v);
    if ((seen.get(key) ?? 0) > now) return false;
    seen.set(key, now + ttl * 1000);
    return true;
  }
  try {
    const res = await upstash([['SET', `atc:${key}`, '1', 'NX', 'EX', String(ttl)]]);
    if (!res.ok) return false;
    const out = (await res.json()) as { result?: string | null }[];
    return out?.[0]?.result === 'OK';
  } catch {
    return false;
  }
}
