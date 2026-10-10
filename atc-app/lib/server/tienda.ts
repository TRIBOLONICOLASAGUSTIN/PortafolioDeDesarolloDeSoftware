import 'server-only';
import pg from 'pg';

// Conexión como atc_tienda: un rol que SOLO puede ejecutar public.crear_pedido (seguridad.md §4 y §5, fila 21).
// La contraseña vive en ATC_TIENDA_DATABASE_URL, una variable de entorno del servidor: nunca en el repo.
// En producción, siempre por TLS verificado con la CA de Supabase (ATC_DB_CA), como el seguimiento.
const g = globalThis as unknown as { atcTiendaPool?: pg.Pool };
const pool = (url: string, mode: 'local' | 'prod') =>
  (g.atcTiendaPool ??= new pg.Pool({
    connectionString: url, max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 3_000, application_name: 'atc-web-pedidos',
    ssl: mode === 'prod' ? { ca: process.env.ATC_DB_CA, rejectUnauthorized: true } : false,
  }));

export type PedidoItem = { slug: string; qty: number };
export type PedidoRes =
  | { ok: true; codigo: string; total: number; vence: string; items: { slug: string; nombre: string; qty: number; precio: number }[] }
  | { ok: false; motivo: 'solicitud_invalida' | 'sin_stock' | 'demasiados_pedidos'; productos?: string[] };

export async function crearPedido(url: string, mode: 'local' | 'prod', p: { items: PedidoItem[]; entrega: string; pago: string; nombre: string; ip: string }): Promise<PedidoRes> {
  const { rows } = await pool(url, mode).query('select public.crear_pedido($1::jsonb, $2, $3, $4, $5) as r', [JSON.stringify(p.items), p.entrega, p.pago, p.nombre, p.ip]);
  return rows[0].r as PedidoRes;
}
