// Lista de precios (funciones puras): aumentos en % para todo, una categoría o una marca, con redondeo opcional.
// En la maqueta, aplicar cambia el precio solo durante la visita (ajustar, en panel-shell). En la etapa 2, en la base.
import type { Item } from './inventario';

export type Alcance = { t: 'todo' } | { t: 'cat'; id: string } | { t: 'marca'; id: string };
export type Redondeo = 'no' | '100' | '999';
export const REDONDEOS: [Redondeo, string][] = [['no', 'Sin redondeo'], ['100', 'A $ 100'], ['999', 'Termina en 999']];
/** Aumento (o rebaja) permitido, en %: evita un error de tipeo que deje un precio en cero o lo multiplique por diez. */
export const PCT_MIN = -50, PCT_MAX = 100;

/** Solo los productos que se venden (las piezas no tienen precio de venta). */
export const enAlcance = (it: Item, a: Alcance) => it.price !== null && (a.t === 'todo' || (a.t === 'cat' ? it.cat === a.id : it.brand === a.id));

/**
 * Redondeo a $ 100, o terminado en 999 (849.999, como los precios del catálogo). En un aumento redondea hacia arriba
 * y en una rebaja hacia abajo: así un aumento nunca queda por debajo del porcentaje pedido.
 */
export function redondear(v: number, r: Redondeo, arriba = true) {
  const f = arriba ? Math.ceil : Math.floor, e = (x: number) => Math.round(x * 1e6) / 1e6; // sin errores de coma flotante
  if (r === '100') return Math.max(100, f(e(v / 100)) * 100);
  if (r === '999') return Math.max(999, f(e((v + 1) / 1000)) * 1000 - 1);
  return Math.max(1, Math.round(v));
}

export type Cambio = { id: string; antes: number; despues: number; costo: number; margenAntes: number; margenDespues: number };
export const margenDe = (precio: number, costo: number) => (precio > 0 ? (precio - costo) / precio : 0);

/** Vista previa: qué productos cambian y cómo queda cada margen. Los que no cambian (por el redondeo) no aparecen. */
export function previsualizar(items: Item[], a: Alcance, pct: number, r: Redondeo): Cambio[] {
  if (!Number.isFinite(pct) || pct < PCT_MIN || pct > PCT_MAX) return [];
  return items.filter(i => enAlcance(i, a)).map(i => {
    const antes = i.price!, despues = redondear(antes * (1 + pct / 100), r, pct >= 0);
    return { id: i.id, antes, despues, costo: i.cost, margenAntes: margenDe(antes, i.cost), margenDespues: margenDe(despues, i.cost) };
  }).filter(c => c.despues !== c.antes);
}

/** El precio nuevo queda por debajo del costo: se avisa antes de aplicar. */
export const bajoCosto = (c: Cambio) => c.despues < c.costo;
