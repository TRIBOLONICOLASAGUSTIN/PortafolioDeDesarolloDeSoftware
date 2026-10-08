// Utilidades para las pruebas de seguridad de la base (node:test + pg).
// La base la prepara `bash scripts/db-local.sh reset` (shim de Supabase + migraciones + seed).
import pg from 'pg';

const port = process.env.ATC_PGPORT ?? '54329';
const db = process.env.ATC_DB ?? 'atc_test';
export const DB_URL = process.env.ATC_DB_URL ?? `postgres://postgres@127.0.0.1:${port}/${db}`;

// Solo estos roles se pueden asumir en las pruebas (evita interpolar texto arbitrario).
const ROLES = new Set(['anon', 'authenticated', 'atc_tracker', 'service_role']);

export async function connect() {
  const c = new pg.Client({ connectionString: DB_URL });
  await c.connect();
  return c;
}

// Ejecuta fn dentro de una transacción que SIEMPRE se deshace: las pruebas no dejan rastro.
export async function inTx(c, fn) {
  await c.query('begin');
  try {
    return await fn();
  } finally {
    await c.query('rollback');
  }
}

// Asume un rol del API con el JWT que mandaría Supabase (sub = id de usuario).
export async function setRole(c, role, sub = null) {
  if (!ROLES.has(role)) throw new Error(`Rol no permitido en pruebas: ${role}`);
  await c.query('reset role');
  await c.query(`select set_config('request.jwt.claims', $1, true)`, [sub ? JSON.stringify({ sub, role }) : '']);
  await c.query(`set local role ${role}`);
}

// Vuelve al superusuario dentro de la misma transacción (para preparar datos).
export const asAdmin = c => c.query('reset role');

// Espera que la consulta falle con el código SQLSTATE indicado, sin abortar la transacción.
export async function expectError(c, sql, params = [], code = '42501') {
  await c.query('savepoint expect_error');
  try {
    await c.query(sql, params);
  } catch (e) {
    await c.query('rollback to savepoint expect_error');
    if (code && e.code !== code) throw new Error(`Se esperaba SQLSTATE ${code} y vino ${e.code}: ${e.message}`);
    return e;
  }
  await c.query('release savepoint expect_error');
  throw new Error(`Se esperaba un error ${code} y la consulta funcionó: ${sql}`);
}

// Llama a track_order con el rol que esté activo.
export async function track(c, code, phone3, ip = '203.0.113.7') {
  const { rows } = await c.query('select public.track_order($1, $2, $3) as r', [code, phone3, ip]);
  return rows[0].r;
}

// Crea al dueño (usuario de Auth + settings.owner_user_id) dentro de la transacción actual.
export const OWNER = '11111111-1111-4111-8111-111111111111';
export const STRANGER = '22222222-2222-4222-8222-222222222222';
export async function makeOwner(c, id = OWNER) {
  await asAdmin(c);
  await c.query(`insert into auth.users (id, email) values ($1, 'dueno@example.com'), ($2, 'otro@example.com') on conflict do nothing`, [id, STRANGER]);
  await c.query('update public.settings set owner_user_id = $1 where id = 1', [id]);
}

export const CODE_RE = /^AT-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{2}$/;
