// Pedidos de la tienda (funciones puras). La bolsa arma el pedido y lo manda por WhatsApp; el cobro sigue siendo por
// WhatsApp, nunca online. En la maqueta los pedidos son de ejemplo; en la etapa 2 salen de la base (crear_pedido).
// Estados:
// - pendiente: sin pago y con menos de 48 h. Reserva el stock: deja de estar disponible para otro cliente.
// - autocancelado: sin pago a las 48 h. La reserva se libera y el producto vuelve al stock.
// - pagado: con pago y sin entregar. La reserva pasa a ser una venta (entra en Ganancias).
// - retrasado: pagado y sin entregar hace N días (3 de ejemplo, lo cambia el dueño). Es solo un aviso para el dueño:
//   nunca se le promete un plazo al cliente (CLAUDE.md).
// - entregado, o cancelado por el dueño antes del pago (también libera la reserva).
// Fechas como "YYYY-MM-DD HH:MM" en hora del local, con aritmética en UTC (igual en el servidor y en el navegador).
import type { BagState, PayId } from '@/lib/whatsapp';
import type { TipoComprobante } from '@/lib/comprobante';

export type EstadoPedido = 'pendiente' | 'pagado' | 'retrasado' | 'autocancelado' | 'entregado' | 'cancelado';
export type PedidoItem = { productId: string; qty: number; unit: number };
/**
 * Transferencia registrada por el dueño: nombre de quien pagó y monto (siempre mayor a 0). El comprobante lo ve solo el
 * dueño (en la maqueta queda en memoria durante la visita; en la base se borra a los 90 días). Nunca CBU, alias ni cuenta.
 */
export type Transferencia = { pagador: string; monto: number; comprobante: { url: string; tipo: TipoComprobante; nombre: string } };
export type Pedido = {
  codigo: string; creado: string; cliente: string; entrega: BagState['entrega']; pago: PayId; items: PedidoItem[];
  pagado?: string; entregado?: string; cancelado?: string; transferencia?: Transferencia;
};
export type Reglas = { autoH: number; retrasoD: number };
/** Autocancelación a las 48 h (decisión del dueño); "retrasado" desde los 3 días (de ejemplo, editable). */
export const REGLAS: Reglas = { autoH: 48, retrasoD: 3 };

/** Los que se ven en el menú y en las pestañas, en este orden */
export type Vista = Exclude<EstadoPedido, 'entregado' | 'cancelado'>;
export const ESTADOS: [Vista, string][] = [['pendiente', 'Pendientes'], ['pagado', 'Pagados'], ['retrasado', 'Retrasados'], ['autocancelado', 'Autocancelados']];
export const ESTADO_PEDIDO: Record<EstadoPedido, string> = { pendiente: 'Pendiente de pago', pagado: 'Pagado', retrasado: 'Retrasado', autocancelado: 'Autocancelado', entregado: 'Entregado', cancelado: 'Cancelado' };
export const ESTADO_IDS = ESTADOS.map(([e]) => e);

const min = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13), +s.slice(14, 16)) / 60000;
export const stamp = (ymd: string, hm: string) => `${ymd} ${hm}`;
/** Suma (o resta) minutos a una fecha "YYYY-MM-DD HH:MM". */
export const sumarMin = (s: string, n: number) => { const d = new Date((min(s) + n) * 60000).toISOString(); return `${d.slice(0, 10)} ${d.slice(11, 16)}`; };
export const minutosEntre = (a: string, b: string) => min(b) - min(a);
/** Cuándo se autocancela si no se paga */
export const vence = (p: Pedido, r: Reglas = REGLAS) => sumarMin(p.creado, r.autoH * 60);

export function estado(p: Pedido, ahora: string, r: Reglas = REGLAS): EstadoPedido {
  if (p.entregado) return 'entregado';
  if (p.cancelado) return 'cancelado';
  if (p.pagado) return minutosEntre(p.pagado, ahora) >= r.retrasoD * 1440 ? 'retrasado' : 'pagado';
  return minutosEntre(p.creado, ahora) >= r.autoH * 60 ? 'autocancelado' : 'pendiente';
}

export const total = (p: Pedido) => p.items.reduce((a, i) => a + i.qty * i.unit, 0);
export const unidades = (p: Pedido) => p.items.reduce((a, i) => a + i.qty, 0);

/** Unidades reservadas de cada producto: las de los pedidos pendientes (todavía sin pago y sin vencer). */
export function reservado(ps: Pedido[], ahora: string, r: Reglas = REGLAS) {
  const out = new Map<string, number>();
  for (const p of ps) if (estado(p, ahora, r) === 'pendiente') for (const it of p.items) out.set(it.productId, (out.get(it.productId) ?? 0) + it.qty);
  return out;
}

/**
 * Lo que cada pedido le hace al stock, en orden: al crearlo, la reserva (sale del stock disponible); si se paga, esa
 * misma salida pasa a ser la venta; si vence sin pago (o el dueño lo cancela), la liberación (vuelve al stock).
 */
export type EventoStock = { productId: string; at: string; qty: number; tipo: 'reserva' | 'venta' | 'libera'; ref: string; unit?: number; auto?: boolean };
export function eventosStock(p: Pedido, ahora: string, r: Reglas = REGLAS): EventoStock[] {
  const e = estado(p, ahora, r), out: EventoStock[] = [];
  const vendido = !!p.pagado;
  for (const it of p.items) out.push({ productId: it.productId, at: p.creado, qty: -it.qty, tipo: vendido ? 'venta' : 'reserva', ref: p.codigo, unit: it.unit });
  const fin = e === 'autocancelado' ? vence(p, r) : e === 'cancelado' && !vendido ? p.cancelado! : null;
  if (fin) for (const it of p.items) out.push({ productId: it.productId, at: fin, qty: it.qty, tipo: 'libera', ref: p.codigo, auto: e === 'autocancelado' });
  return out;
}

/** Cuántos hay en cada estado (para el menú y las pestañas) */
export function contar(ps: Pedido[], ahora: string, r: Reglas = REGLAS) {
  const n: Record<EstadoPedido, number> = { pendiente: 0, pagado: 0, retrasado: 0, autocancelado: 0, entregado: 0, cancelado: 0 };
  for (const p of ps) n[estado(p, ahora, r)]++;
  return n;
}
