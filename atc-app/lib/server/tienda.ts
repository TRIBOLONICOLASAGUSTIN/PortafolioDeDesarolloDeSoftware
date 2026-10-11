import 'server-only';
import { rpc } from './db';
import type { PedidoRes } from '@/lib/whatsapp';

// Conexión como atc_tienda (lib/server/db.ts): un rol que SOLO puede ejecutar public.crear_pedido (seguridad.md §4 y §5, fila 21).

type PedidoItem = { slug: string; qty: number };

export async function crearPedido(url: string, mode: 'local' | 'prod', p: { items: PedidoItem[]; entrega: string; pago: string; nombre: string; ip: string }): Promise<PedidoRes> {
  return rpc<PedidoRes>('pedidos', url, mode, 'select public.crear_pedido($1::jsonb, $2, $3, $4, $5) as r', [JSON.stringify(p.items), p.entrega, p.pago, p.nombre, p.ip]);
}
