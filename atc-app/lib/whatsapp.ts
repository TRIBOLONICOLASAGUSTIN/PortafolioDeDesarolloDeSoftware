import { CONFIG } from './data/config';
import { byId } from './data/catalog';
import { fmt } from './format';

export const waLink = (text: string) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;

export const PAYS = [['efectivo', 'Efectivo'], ['transferencia', 'Transferencia'], ['mp', 'Mercado Pago'], ['tarjeta', 'Tarjeta']] as const;
export type PayId = (typeof PAYS)[number][0];

export type BagState = { items: Record<string, number>; entrega: 'retiro' | 'envio'; pago: PayId; nombre: string; dir: string };

export const bagCount = (b: BagState) => Object.values(b.items).reduce((a, n) => a + n, 0);
export const bagSubtotal = (b: BagState) => Object.entries(b.items).reduce((a, [id, q]) => a + (byId[id]?.price ?? 0) * q, 0);

/** Mensaje de compra que se abre en WhatsApp: no se cobra nada online. */
export function bagMessage(b: BagState) {
  const lines = Object.entries(b.items).map(([id, q]) => `• ${q} × ${byId[id].brand} ${byId[id].name} — ${fmt(byId[id].price * q)}`).join('\n');
  const pay = PAYS.find(p => p[0] === b.pago)?.[1] ?? '';
  const ent = b.entrega === 'retiro' ? 'Retiro en el local' : `Envío a domicilio${b.dir.trim() ? ` (${b.dir.trim()})` : ''}`;
  return `¡Hola AT Computación! 👋 Quiero hacer este pedido:\n${lines}\n\nSubtotal: ${fmt(bagSubtotal(b))}\nEntrega: ${ent}\nPago: ${pay}${b.nombre.trim() ? `\nNombre: ${b.nombre.trim()}` : ''}\n\n¿Me confirman disponibilidad y el total?`;
}

export const WA_OPTS = [
  ['bag', 'Consultar por un producto', '¡Hola! Quiero consultar por un producto: '],
  ['scan', 'Estado de mi reparación', '¡Hola! Quiero saber cómo va mi reparación. Mi código es AT-'],
  ['zap', 'Pedir un presupuesto', '¡Hola! Quiero pedir un presupuesto para '],
  ['msg', 'Otra consulta', '¡Hola AT Computación! Tengo una consulta: '],
] as const;
