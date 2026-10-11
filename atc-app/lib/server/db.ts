import 'server-only';
import pg from 'pg';

// Conexiones a la base, una por rol del servidor: atc_tracker (seguimiento, solo ejecuta track_order) y atc_tienda
// (pedidos, solo ejecuta crear_pedido) — seguridad.md §4. Cada contraseña vive en su variable de entorno: nunca en el repo.
// En producción, siempre por TLS verificado con la CA de Supabase (ATC_DB_CA); en local (base en 127.0.0.1) no hace falta.
// Topes para que una avalancha no cuelgue el servidor: 3 conexiones por proceso, 3 s para conseguir una y 4 s por
// consulta (la base, además, corta cada sentencia a los 2-3 s y cada rol tiene un tope de 10 conexiones).
export type Rol = 'seguimiento' | 'pedidos';
const g = globalThis as unknown as { atcPools?: Map<string, pg.Pool> };

function pool(rol: Rol, url: string, mode: 'local' | 'prod') {
  const pools = (g.atcPools ??= new Map());
  const k = `${rol}\n${url}`;
  let p = pools.get(k);
  if (!p) {
    p = new pg.Pool({
      connectionString: url, max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 3_000, query_timeout: 4_000, application_name: `atc-web-${rol}`,
      ssl: mode === 'prod' ? { ca: process.env.ATC_DB_CA, rejectUnauthorized: true } : false,
    });
    pools.set(k, p);
  }
  return p;
}

/** Ejecuta la función de la base de ese rol y devuelve su resultado (la columna `r`). */
export async function rpc<T>(rol: Rol, url: string, mode: 'local' | 'prod', sql: string, params: unknown[]): Promise<T> {
  const { rows } = await pool(rol, url, mode).query(sql, params);
  return rows[0].r as T;
}
