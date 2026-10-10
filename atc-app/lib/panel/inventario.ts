// Inventario del panel (funciones puras). En la maqueta, el stock de hoy es el del catálogo (o el de las piezas) y el
// historial se reconstruye hacia atrás desde las ventas de ejemplo. En la etapa 2 sale de la tabla de movimientos de stock.
import { PRODUCTS } from '@/lib/data/catalog';
import { armables, BOM } from '@/lib/data/armado';
import { PIEZAS, TOPE, UMBRAL } from '@/lib/data/inventario';
import { COSTOS, precioEn } from '@/lib/data/panel';
import { addDays, dow } from './dates';
import type { Periodo } from './stats';
import type { Estado, Movement, Venta } from './types';

export type Item = {
  id: string; tipo: 'producto' | 'pieza'; cat: string; r?: string; icon?: string; brand: string; name: string; short?: string;
  /** Precio de venta (las piezas no se venden sueltas) */
  price: number | null;
  /** Costo por unidad; en una PC armada, la suma de sus piezas */
  cost: number;
  /** Stock bajo: desde estas unidades */
  umbral: number;
  /** Visible en la tienda (pausado: no se muestra, pero se puede vender en el local) */
  activo: boolean;
  /** Stock de hoy antes de lo cargado en esta visita */
  base: number;
  /** PC armada: [pieza, cantidad por PC] */
  kit?: [string, number][];
  nuevo?: boolean;
};
export type StockTipo = 'venta' | 'repo' | 'ajuste' | 'alta';
export type StockMov = {
  id: string; itemId: string; ymd: string; hm: string; tipo: StockTipo;
  /** Unidades: negativas si salen */
  qty: number;
  /** Precio por unidad (solo ventas de productos) */
  unit?: number;
  unitCost?: number;
  /** Venta que lo originó */
  ref?: string;
  /** Pieza usada para armar esta PC */
  para?: string;
  note?: string; status: Estado;
  /** Stock que quedó */
  despues: number;
};
export type StockIn = Omit<StockMov, 'despues'>;
export type Nivel = 'ok' | 'bajo' | 'sin';
export type Ajuste = Partial<Pick<Item, 'name' | 'price' | 'cost' | 'umbral' | 'activo'>>;

/** Productos del catálogo y piezas, como los ve el dueño (DATOS DE EJEMPLO). */
export const ITEMS: Item[] = [
  ...PRODUCTS.map((p): Item => ({ id: p.id, tipo: 'producto', cat: p.cat, r: p.r, brand: p.brand, name: p.name, short: p.short, price: p.price, cost: COSTOS[p.id], umbral: UMBRAL, activo: true, base: p.stock, kit: BOM[p.id] })),
  ...PIEZAS.map((z): Item => ({ id: z.id, tipo: 'pieza', cat: 'piezas', icon: z.icon, brand: z.brand, name: z.name, price: null, cost: z.cost, umbral: UMBRAL, activo: true, base: z.stock })),
];
export const ITEM_IDS = new Set(ITEMS.map(i => i.id));

/** Filtros de la lista (también llegan por ?filtro=) */
export type Filtro = 'todos' | 'bajo' | 'sin' | 'piezas';
export const FILTROS: [Filtro, string][] = [['todos', 'Todos'], ['bajo', 'Stock bajo'], ['sin', 'Sin stock'], ['piezas', 'Piezas']];

export const nivel = (stock: number, umbral: number): Nivel => (stock <= 0 ? 'sin' : stock <= umbral ? 'bajo' : 'ok');
export const NIVEL: Record<Nivel, string> = { ok: 'En stock', bajo: 'Stock bajo', sin: 'Sin stock' };

const pad = (n: number) => String(n).padStart(2, '0');
const menos1 = (hm: string) => { const t = Math.max(0, +hm.slice(0, 2) * 60 + +hm.slice(3) - 1); return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`; };
/** Del más nuevo al más viejo */
const nuevoPrimero = (a: StockIn, b: StockIn) => (a.ymd !== b.ymd ? (a.ymd < b.ymd ? 1 : -1) : a.hm !== b.hm ? (a.hm < b.hm ? 1 : -1) : a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

/** Lo que sale del stock con una venta, en el orden en que se aplica: una PC descuenta primero sus piezas. */
export function movsDeVenta(v: Venta, kitDe: (id: string) => [string, number][] | undefined, costoDe?: (id: string) => number): StockIn[] {
  const out: StockIn[] = [];
  const base = { ymd: v.ymd, hm: v.hm, tipo: 'venta' as const, ref: v.id, status: v.status };
  for (const it of v.items) {
    for (const [pid, q] of kitDe(it.productId) ?? []) out.push({ ...base, id: `${v.id}:${pid}`, itemId: pid, qty: -q * it.qty, unitCost: costoDe?.(pid), para: it.productId });
    out.push({ ...base, id: `${v.id}:${it.productId}`, itemId: it.productId, qty: -it.qty, unit: it.unit, unitCost: it.unitCost });
  }
  return out;
}

/**
 * Historial de ejemplo de cada producto y pieza, del más nuevo al más viejo, con el stock que quedó después de cada
 * movimiento. Parte del stock de hoy y recorre las ventas hacia atrás; cuando el stock reconstruido pasaría el tope de
 * la categoría, agrega la reposición que lo explica: a la mañana siguiente de la venta anterior (o justo antes, si las dos
 * ventas fueron el mismo día).
 */
export function historialBase(ms: Movement[]): Map<string, StockMov[]> {
  const costo = new Map(ITEMS.map(i => [i.id, i.cost]));
  const ev = new Map<string, StockIn[]>();
  for (const m of ms) {
    if (m.kind !== 'venta') continue;
    for (const e of movsDeVenta(m, id => BOM[id], id => precioEn(costo.get(id) ?? 0, m.ymd))) {
      const a = ev.get(e.itemId); if (a) a.push(e); else ev.set(e.itemId, [e]);
    }
  }
  const out = new Map<string, StockMov[]>();
  for (const it of ITEMS) {
    if (it.kit) continue;
    const list = (ev.get(it.id) ?? []).sort(nuevoPrimero), tope = TOPE[it.cat] ?? 12, res: StockMov[] = [];
    let s = it.base, n = 0;
    list.forEach((e, i) => {
      res.push({ ...e, despues: s });
      s -= e.qty;
      if (s > tope) {
        const low = 1 + (n % 2), prev = list[i + 1];
        let ymd = e.ymd, hm = e.hm <= '09:30' || prev?.ymd === e.ymd ? menos1(e.hm) : '09:30';
        if (prev && prev.ymd < e.ymd) {
          let d = addDays(prev.ymd, 1);
          if (dow(d) === 0) d = addDays(d, 1);
          if (d < e.ymd) { ymd = d; hm = '09:30'; }
        }
        res.push({ id: `RP-${it.id}-${++n}`, itemId: it.id, ymd, hm, tipo: 'repo', qty: s - low, unitCost: precioEn(it.cost, ymd), status: 'pagado', despues: s });
        s = low;
      }
    });
    out.set(it.id, res);
  }
  // PC armadas: sus ventas, con cuántas se podían armar después de cada una (según el stock de sus piezas)
  for (const it of ITEMS) {
    if (!it.kit) continue;
    const kit = it.kit, after = (pid: string, id: string) => out.get(pid)?.find(x => x.id === id)?.despues ?? 0;
    out.set(it.id, (ev.get(it.id) ?? []).sort(nuevoPrimero).map(e => ({ ...e, despues: Math.max(0, Math.min(...kit.map(([pid, q]) => Math.floor(after(pid, `${e.ref}:${pid}`) / q)))) })));
  }
  return out;
}

export type Inventario = {
  items: Item[]; byId: Map<string, Item>;
  stock: (id: string) => number;
  movs: (id: string) => StockMov[];
  nivel: (id: string) => Nivel;
  /** Cuántas PC alcanza a armar cada pieza (la que da menos es la que limita) */
  alcanza: (kitId: string) => { id: string; q: number; n: number }[];
  /** Valor del stock al costo (las PC armadas no suman: ya están sus piezas) */
  valor: number;
};

/**
 * Inventario de hoy: el historial de ejemplo más lo cargado en esta visita (`log`, en el orden en que se cargó),
 * con los cambios del dueño (`ajustes`) y los productos nuevos.
 */
export function inventario(base: Map<string, StockMov[]>, ajustes: Record<string, Ajuste>, nuevos: Item[], log: StockIn[]): Inventario {
  const items0 = [...ITEMS, ...nuevos].map(i => (ajustes[i.id] ? { ...i, ...ajustes[i.id] } : i));
  const by0 = new Map(items0.map(i => [i.id, i]));
  const items = items0.map(i => (i.kit ? { ...i, cost: i.kit.reduce((a, [pid, q]) => a + q * (by0.get(pid)?.cost ?? 0), 0) } : i));
  const byId = new Map(items.map(i => [i.id, i]));
  const st = new Map(items.map(i => [i.id, i.base]));
  const kitStock = (kit: [string, number][]) => armables(kit, id => st.get(id) ?? 0);
  const ses = new Map<string, StockMov[]>();
  for (const e of log) {
    const it = byId.get(e.itemId);
    let despues: number;
    if (it?.kit) despues = kitStock(it.kit);
    else { despues = (st.get(e.itemId) ?? 0) + e.qty; st.set(e.itemId, despues); }
    const m: StockMov = { ...e, unitCost: e.unitCost ?? it?.cost, despues };
    const a = ses.get(e.itemId); if (a) a.unshift(m); else ses.set(e.itemId, [m]);
  }
  const stock = (id: string) => { const k = byId.get(id)?.kit; return k ? kitStock(k) : st.get(id) ?? 0; };
  return {
    items, byId, stock,
    movs: id => [...(ses.get(id) ?? []), ...(base.get(id) ?? [])],
    nivel: id => nivel(stock(id), byId.get(id)?.umbral ?? UMBRAL),
    alcanza: kitId => (byId.get(kitId)?.kit ?? []).map(([id, q]) => ({ id, q, n: Math.floor(stock(id) / q) })),
    valor: items.reduce((a, i) => a + (i.kit ? 0 : Math.max(0, stock(i.id)) * i.cost), 0),
  };
}

/** Unidades, ventas y ganancia de un producto (o uso de una pieza) en cada tramo del período. */
export type Tramo = { from: string; to: string; label: string; unidades: number; ventas: number; ganancia: number };
export function porTramo(movs: StockMov[], p: Periodo): Tramo[] {
  const out: Tramo[] = p.buckets.map(b => ({ ...b, unidades: 0, ventas: 0, ganancia: 0 }));
  for (const m of movs) {
    if (m.tipo !== 'venta' || m.ymd < p.from || m.ymd > p.to) continue;
    const t = out.find(b => m.ymd >= b.from && m.ymd <= b.to);
    if (!t) continue;
    const u = -m.qty;
    t.unidades += u;
    if (m.unit !== undefined) { t.ventas += u * m.unit; t.ganancia += u * (m.unit - (m.unitCost ?? 0)); }
  }
  return out;
}
