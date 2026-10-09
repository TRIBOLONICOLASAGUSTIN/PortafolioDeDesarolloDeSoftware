// Cálculos del panel (funciones puras): los usa la maqueta con datos de ejemplo y, en la etapa 2, los datos reales.
import { byId } from '@/lib/data/catalog';
import { addDays, addMonths, dayShort, monthShort, monthStart, short } from './dates';
import { costo, ingreso, resultado, type Kind, type Movement } from './types';

export type RangeId = '7d' | '30d' | '3m' | '12m';
export type Unit = 'día' | 'semana' | 'mes';
export const RANGES: Record<RangeId, { chip: string; label: string; prev: string; unit: Unit; n: number }> = {
  '7d': { chip: '7 días', label: 'Últimos 7 días', prev: 'los 7 días anteriores', unit: 'día', n: 7 },
  '30d': { chip: '30 días', label: 'Últimos 30 días', prev: 'los 30 días anteriores', unit: 'día', n: 30 },
  '3m': { chip: '3 meses', label: 'Últimos 3 meses', prev: 'los 3 meses anteriores', unit: 'semana', n: 13 },
  '12m': { chip: '1 año', label: 'Últimos 12 meses', prev: 'el mismo período del año pasado', unit: 'mes', n: 12 },
};
export const RANGE_IDS = Object.keys(RANGES) as RangeId[];

/** Movimientos agrupados por día (se arma una vez). */
export type Index = Map<string, Movement[]>;
export function indexar(ms: Movement[]): Index {
  const idx: Index = new Map();
  for (const m of ms) { const a = idx.get(m.ymd); if (a) a.push(m); else idx.set(m.ymd, [m]); }
  for (const a of idx.values()) a.sort((x, y) => (x.hm < y.hm ? 1 : x.hm > y.hm ? -1 : 0));
  return idx;
}
function* entre(idx: Index, from: string, to: string) {
  for (let d = from; d <= to; d = addDays(d, 1)) { const a = idx.get(d); if (a) yield* a; }
}

export type Bucket = { from: string; to: string; label: string; valor: number; acumulado: number };
export type Periodo = { from: string; to: string; prevFrom: string; prevTo: string; buckets: Omit<Bucket, 'valor' | 'acumulado'>[] };

/**
 * Período actual y el anterior de igual largo.
 * 7 y 30 días: por día. 3 meses: 13 bloques de 7 días que terminan hoy (todos iguales).
 * 12 meses: meses calendario; el último va hasta hoy y se compara con lo mismo del año anterior.
 */
export function periodo(r: RangeId, hoy: string): Periodo {
  if (r === '12m') {
    const from = monthStart(addMonths(hoy, -11));
    const buckets = Array.from({ length: 12 }, (_, i) => {
      const f = addMonths(from, i), last = addDays(addMonths(f, 1), -1);
      const t = i === 11 ? hoy : last;
      return { from: f, to: t, label: i === 11 ? `${monthShort(f, hoy)} (hasta hoy)` : monthShort(f, hoy) };
    });
    return { from, to: hoy, prevFrom: addMonths(from, -12), prevTo: addMonths(hoy, -12), buckets };
  }
  const { n } = RANGES[r], step = r === '3m' ? 7 : 1, days = n * step;
  const from = addDays(hoy, -(days - 1));
  const buckets = Array.from({ length: n }, (_, i) => {
    const f = addDays(from, i * step), t = addDays(f, step - 1);
    return { from: f, to: t, label: step === 1 ? dayShort(f) : `${short(f)} – ${short(t)}` };
  });
  return { from, to: hoy, prevFrom: addDays(from, -days), prevTo: addDays(from, -1), buckets };
}

export type Totales = {
  ventas: number; costoVentas: number; gananciaVentas: number; nVentas: number; unidades: number;
  servicio: number; repuestos: number; gananciaServicio: number; nReparaciones: number;
  gastos: number; nGastos: number; ganancia: number;
};
export function totales(idx: Index, from: string, to: string): Totales {
  const t: Totales = { ventas: 0, costoVentas: 0, gananciaVentas: 0, nVentas: 0, unidades: 0, servicio: 0, repuestos: 0, gananciaServicio: 0, nReparaciones: 0, gastos: 0, nGastos: 0, ganancia: 0 };
  for (const m of entre(idx, from, to)) {
    if (m.kind === 'venta') { t.ventas += ingreso(m); t.costoVentas += costo(m); t.nVentas++; t.unidades += m.items.reduce((a, i) => a + i.qty, 0); }
    else if (m.kind === 'reparacion') { t.servicio += m.amount; t.repuestos += m.partsCost; t.nReparaciones++; }
    else { t.gastos += m.amount; t.nGastos++; }
  }
  t.gananciaVentas = t.ventas - t.costoVentas;
  t.gananciaServicio = t.servicio - t.repuestos;
  t.ganancia = t.gananciaVentas + t.gananciaServicio - t.gastos;
  return t;
}

/** Diferencia con el período anterior. El porcentaje solo tiene sentido si antes hubo ganancia. */
export const delta = (cur: number, prev: number) => ({ abs: cur - prev, pct: prev > 0 ? (cur - prev) / prev : null });

/** Ganancia de cada tramo y acumulada desde el principio del período (o lo que sume `f`, por ejemplo solo las ventas). */
export function serie(idx: Index, p: Periodo, f: (m: Movement) => number = resultado): Bucket[] {
  let acc = 0;
  return p.buckets.map(b => {
    let valor = 0;
    for (const m of entre(idx, b.from, b.to)) valor += f(m);
    acc += valor;
    return { ...b, valor, acumulado: acc };
  });
}

/** Mejor y peor tramo (si empatan, el más reciente). */
export function extremos(s: Bucket[]) {
  let mejor = s[0], peor = s[0];
  for (const b of s) { if (b.valor >= mejor.valor) mejor = b; if (b.valor <= peor.valor) peor = b; }
  return { mejor, peor };
}

/** Categorías del catálogo + servicio técnico, con su ganancia y la variación frente al período anterior. */
export type Cat = { id: string; ganancia: number; ingresos: number; n: number; prev: number };
export function porCategoria(idx: Index, p: Periodo): Cat[] {
  const acc = new Map<string, Cat>();
  const add = (id: string, g: number, ing: number, n: number, prev: boolean) => {
    const c = acc.get(id) ?? { id, ganancia: 0, ingresos: 0, n: 0, prev: 0 };
    if (prev) c.prev += g; else { c.ganancia += g; c.ingresos += ing; c.n += n; }
    acc.set(id, c);
  };
  for (const [from, to, prev] of [[p.from, p.to, false], [p.prevFrom, p.prevTo, true]] as const) {
    for (const m of entre(idx, from, to)) {
      if (m.kind === 'venta') for (const i of m.items) add(byId[i.productId]?.cat ?? 'otros', i.qty * (i.unit - i.unitCost), i.qty * i.unit, i.qty, prev);
      else if (m.kind === 'reparacion') add('servicio', m.amount - m.partsCost, m.amount, 1, prev);
    }
  }
  return [...acc.values()].filter(c => c.n > 0).sort((a, b) => b.ganancia - a.ganancia || a.id.localeCompare(b.id));
}

/** Productos más vendidos del período, por unidades, por lo vendido o por la ganancia. */
export type Metric = 'unidades' | 'ventas' | 'ganancia';
export type Top = { productId: string; unidades: number; ventas: number; ganancia: number };
export function top(idx: Index, from: string, to: string, metric: Metric, n = 5): Top[] {
  const acc = new Map<string, Top>();
  for (const m of entre(idx, from, to)) {
    if (m.kind !== 'venta') continue;
    for (const i of m.items) {
      const t = acc.get(i.productId) ?? { productId: i.productId, unidades: 0, ventas: 0, ganancia: 0 };
      t.unidades += i.qty; t.ventas += i.qty * i.unit; t.ganancia += i.qty * (i.unit - i.unitCost);
      acc.set(i.productId, t);
    }
  }
  const name = (id: string) => byId[id]?.name ?? id;
  return [...acc.values()].sort((a, b) => b[metric] - a[metric] || name(a.productId).localeCompare(name(b.productId))).slice(0, n);
}

/** Movimientos por día, del más nuevo al más viejo, filtrados por tipo. */
export function porDia(idx: Index, from: string, to: string, kind?: Kind) {
  const out: { ymd: string; items: Movement[] }[] = [];
  for (let d = to; d >= from; d = addDays(d, -1)) {
    const a = (idx.get(d) ?? []).filter(m => !kind || m.kind === kind);
    if (a.length) out.push({ ymd: d, items: a });
  }
  return out;
}
