// Textos de los movimientos (título, medio de pago, tipo), compartidos por las listas y el detalle.
import { byId } from '@/lib/data/catalog';
import { PAYS } from '@/lib/whatsapp';
import { GASTO_CATS, type Movement } from './types';

export const payLabel = (id: string) => PAYS.find(([p]) => p === id)?.[1] ?? id;
export const gastoLabel = (id: string) => GASTO_CATS.find(([c]) => c === id)?.[1] ?? id;
/** Productos cargados o editados en esta visita (maqueta: viven solo en el navegador; en la etapa 2 salen de la base).
    Los registra el panel al crear o editar, y se vacía al salir. */
const sesion = new Map<string, { name: string; brand: string; cat: string }>();
export const registrarProducto = (id: string, p: { name: string; brand: string; cat: string }) => { sesion.set(id, p); };
export const olvidarProductos = () => sesion.clear();
export const producto = (id: string): { name: string; brand: string; cat: string } | undefined => sesion.get(id) ?? byId[id];
export const productName = (id: string) => producto(id)?.name ?? id;

/** Qué se vendió, qué equipo se reparó o en qué se gastó (el tipo va aparte, en la línea de abajo). */
export function titulo(m: Movement) {
  if (m.kind === 'venta') return `${productName(m.items[0].productId)}${m.items.length > 1 ? ` y ${m.items.length - 1} más` : ''}`;
  if (m.kind === 'reparacion') return m.equipo;
  return m.concept;
}
export const KIND_LABEL = { venta: 'Venta', reparacion: 'Reparación', gasto: 'Gasto' } as const;
export const tipo = (m: Movement) => (m.kind === 'venta' ? 'Venta de productos' : m.kind === 'reparacion' ? 'Reparación cobrada' : `Gasto · ${gastoLabel(m.cat)}`);
export const ICON = { venta: 'bag', reparacion: 'wrench', gasto: 'receipt' } as const;
export const ESTADO = { cobrado: 'Cobrado', pagado: 'Pagado', 'sin-guardar': 'Sin guardar' } as const;
