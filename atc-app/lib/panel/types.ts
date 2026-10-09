// Movimientos del panel del dueño. Es el contrato que en la etapa 2 se arma con las filas de la base.
// Montos en pesos enteros. Precio y costo se guardan al momento de vender (si cambian después, no altera el pasado).
import type { PayId } from '@/lib/whatsapp';

export type Estado = 'cobrado' | 'pagado' | 'sin-guardar';
type Base = { id: string; ymd: string; hm: string; pay: PayId; note?: string; status: Estado };

export type SaleItem = { productId: string; qty: number; unit: number; unitCost: number };
export type Venta = Base & { kind: 'venta'; items: SaleItem[] };
export type Reparacion = Base & { kind: 'reparacion'; orderCode: string; equipo: string; svcId: string; amount: number; partsCost: number };
// Sin "mercadería": su costo ya se resta al vender (si no, se contaría dos veces).
export type GastoCat = 'alquiler' | 'servicios' | 'impuestos' | 'taller' | 'envios' | 'publicidad' | 'otros';
export type Gasto = Base & { kind: 'gasto'; cat: GastoCat; concept: string; amount: number };
export type Movement = Venta | Reparacion | Gasto;
export type Kind = Movement['kind'];

export const GASTO_CATS: [GastoCat, string][] = [
  ['alquiler', 'Alquiler'], ['servicios', 'Servicios (luz, internet)'], ['impuestos', 'Impuestos y monotributo'],
  ['taller', 'Herramientas e insumos del taller'], ['envios', 'Envíos'], ['publicidad', 'Publicidad'], ['otros', 'Otros'],
];

/** Lo que entró por el movimiento. */
export const ingreso = (m: Movement) => m.kind === 'venta' ? m.items.reduce((a, i) => a + i.qty * i.unit, 0) : m.kind === 'reparacion' ? m.amount : 0;
/** Lo que costó: mercadería vendida, repuestos o el gasto. */
export const costo = (m: Movement) => m.kind === 'venta' ? m.items.reduce((a, i) => a + i.qty * i.unitCost, 0) : m.kind === 'reparacion' ? m.partsCost : m.amount;
/** Ganancia del movimiento (negativa en los gastos). */
export const resultado = (m: Movement) => ingreso(m) - costo(m);
