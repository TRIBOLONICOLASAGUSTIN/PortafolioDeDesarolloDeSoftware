import { CONFIG } from './data/config';
import { byId } from './data/catalog';
import { fmt } from './format';

export const waLink = (text: string) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;

export const PAYS = [['efectivo', 'Efectivo'], ['transferencia', 'Transferencia'], ['mp', 'Mercado Pago'], ['tarjeta', 'Tarjeta']] as const;
export type PayId = (typeof PAYS)[number][0];

export type BagState = { items: Record<string, number>; entrega: 'retiro' | 'envio'; pago: PayId; nombre: string; dir: string };

export const bagCount = (b: BagState) => Object.values(b.items).reduce((a, n) => a + n, 0);
export const bagSubtotal = (b: BagState) => Object.entries(b.items).reduce((a, [id, q]) => a + (byId[id]?.price ?? 0) * q, 0);

/** Pedido registrado por el servidor (POST /api/pedidos): código, total y precios de la base. */
export type Registrado = { codigo: string; total: number; items: { slug: string; nombre: string; qty: number; precio: number }[] };

/**
 * Mensaje de compra que se abre en WhatsApp: no se cobra nada online. Si el pedido quedó registrado, lleva su código y
 * los precios de la base (el stock queda apartado 48 h); si no, el pedido sale igual, sin código.
 */
export function bagMessage(b: BagState, reg?: Registrado | null) {
  const lines = reg
    ? reg.items.map(i => `• ${i.qty} × ${byId[i.slug] ? `${byId[i.slug].brand} ${byId[i.slug].name}` : i.nombre} — ${fmt(i.precio * i.qty)}`).join('\n')
    : Object.entries(b.items).map(([id, q]) => `• ${q} × ${byId[id].brand} ${byId[id].name} — ${fmt(byId[id].price * q)}`).join('\n');
  const pay = PAYS.find(p => p[0] === b.pago)?.[1] ?? '';
  const ent = b.entrega === 'retiro' ? 'Retiro en el local' : `Envío a domicilio${b.dir.trim() ? ` (${b.dir.trim()})` : ''}`;
  const cabeza = reg ? `¡Hola AT Computación! 👋 Te escribo por mi pedido ${reg.codigo}:` : '¡Hola AT Computación! 👋 Quiero hacer este pedido:';
  const cierre = reg ? 'Me lo reservan hasta coordinar el pago (48 h). ¿Me confirman el total y cómo sigo?' : '¿Me confirman disponibilidad y el total?';
  return `${cabeza}\n${lines}\n\n${reg ? `Total: ${fmt(reg.total)}` : `Subtotal: ${fmt(bagSubtotal(b))}`}\nEntrega: ${ent}\nPago: ${pay}${b.nombre.trim() ? `\nNombre: ${b.nombre.trim()}` : ''}\n\n${cierre}`;
}

export const WA_OPTS = [
  ['bag', 'Consultar por un producto', '¡Hola! Quiero consultar por un producto: '],
  ['scan', 'Estado de mi reparación', '¡Hola! Quiero saber cómo va mi reparación. Mi código es AT-'],
  ['zap', 'Pedir un presupuesto', '¡Hola! Quiero pedir un presupuesto para '],
  ['msg', 'Otra consulta', '¡Hola AT Computación! Tengo una consulta: '],
] as const;
