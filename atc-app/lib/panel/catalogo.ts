// Catálogo del panel (funciones puras): resúmenes por categoría, por marca y por proveedor, y los filtros de Productos.
// Todo sale del inventario de la visita (ejemplo + lo cargado), así un cambio de precio o de stock se ve en todas partes.
import { PROVEEDORES, proveedorDe, type Proveedor } from '@/lib/data/proveedores';
import { addDays } from './dates';
import { margenDe } from './precios';
import type { Inventario, Item, StockMov } from './inventario';

/** Estado en la tienda (también llega por ?estado=) */
export type EstadoProd = 'todos' | 'activos' | 'pausados';
export const ESTADOS_PROD: [EstadoProd, string][] = [['todos', 'Todos'], ['activos', 'En la tienda'], ['pausados', 'Pausados']];

/** Solo productos (las piezas no se venden sueltas: viven en Inventario) */
export const productos = (inv: Inventario) => inv.items.filter(i => i.tipo === 'producto');

export type Resumen = { n: number; activos: number; unidades: number; valor: number; margen: number | null };
/** Cantidad, unidades, valor del stock al costo y margen promedio (de los que tienen precio) */
export function resumir(items: Item[], inv: Inventario): Resumen {
  const conPrecio = items.filter(i => i.price);
  return {
    n: items.length,
    activos: items.filter(i => i.activo).length,
    // Una PC armada cuenta las que se pueden armar con sus piezas, al costo de esas piezas
    unidades: items.reduce((a, i) => a + Math.max(0, inv.stock(i.id)), 0),
    valor: items.reduce((a, i) => a + Math.max(0, inv.stock(i.id)) * i.cost, 0),
    margen: conPrecio.length ? conPrecio.reduce((a, i) => a + margenDe(i.price!, i.cost), 0) / conPrecio.length : null,
  };
}

/** Marcas: las de los productos y las del carrusel, con lo que tiene cada una. */
export type MarcaFila = Resumen & { marca: string; carrusel: boolean };
export function porMarca(inv: Inventario, carrusel: string[]): MarcaFila[] {
  const prods = productos(inv), marcas = [...new Set([...prods.map(i => i.brand), ...carrusel])];
  return marcas.map(m => ({ marca: m, carrusel: carrusel.includes(m), ...resumir(prods.filter(i => i.brand === m), inv) }))
    .sort((a, b) => b.n - a.n || a.marca.localeCompare(b.marca, 'es'));
}

/** Proveedor: qué provee, la última reposición y lo comprado en los últimos 12 meses (sus reposiciones). */
export type ProvFila = Proveedor & { items: Item[]; ultima: StockMov | null; comprado: number; bajo: number };
export function porProveedor(inv: Inventario, hoy: string): ProvFila[] {
  const desde = addDays(hoy, -365), repos = inv.items.flatMap(i => inv.movs(i.id).filter(m => m.tipo === 'repo'));
  return PROVEEDORES.map(p => {
    const items = inv.items.filter(i => !i.kit && proveedorDe(i.cat) === p.id), suyas = repos.filter(m => m.prov === p.id);
    const ultima = suyas.reduce<StockMov | null>((a, m) => (!a || m.ymd > a.ymd || (m.ymd === a.ymd && m.hm > a.hm) ? m : a), null);
    const comprado = suyas.filter(m => m.ymd >= desde).reduce((a, m) => a + m.qty * (m.unitCost ?? 0), 0);
    return { ...p, items, ultima, comprado, bajo: items.filter(i => inv.nivel(i.id) !== 'ok').length };
  });
}
