// DATOS DE EJEMPLO (maqueta del panel del dueño). Nada de esto es real: costos, ventas, reparaciones y gastos
// son inventados para mostrar el diseño. En la etapa 2 los movimientos salen de la base y los carga el dueño.
// Generador determinista: cada día usa su propia semilla (la fecha), así un día pasado se ve siempre igual
// y el servidor y el navegador generan exactamente lo mismo. Nunca Math.random ni Date.now.
import { PRODUCTS, type Product } from './catalog';
import { SVCS, r500 } from './estimator';
import { CONFIG } from './config';
import type { PayId } from '@/lib/whatsapp';
import { addDays, dow, monthIndex, monthsBetween } from '@/lib/panel/dates';
import type { Gasto, Movement, Reparacion, SaleItem, Venta } from '@/lib/panel/types';

/** Margen de ejemplo por categoría → costo de ejemplo de cada producto (redondeado a $ 100). */
const MARGEN: Record<string, number> = { notebooks: .13, pc: .2, impresoras: .15, insumos: .35, perifericos: .3, redes: .35, componentes: .22 };
export const COSTOS: Record<string, number> = Object.fromEntries(PRODUCTS.map(p => [p.id, Math.round((p.price * (1 - (MARGEN[p.cat] ?? .25))) / 100) * 100]));

// Qué tan seguido se vende cada producto: el tóner y el cable salen mucho; las notebooks, poco.
const PESO: Record<string, number> = { 'nb-ideapad': .9, 'nb-hp250': .8, 'pc-office': .5, 'imp-l3250': .9, 'ins-105a': 6, 'ins-t544': 5, 'per-g203': 3, 'per-k552': 2.5, 'comp-nv2': 2, 'red-c6': 1.5, 'red-hdmi': 5 };
// Temporada: vuelta a clases (feb-mar) y fin de año arriba; enero, abajo.
const TEMPORADA = [.7, 1.15, 1.25, 1, .95, .95, 1.05, 1, .95, 1, 1.15, 1.3];
const PAGOS: [PayId, number][] = [['transferencia', 45], ['efectivo', 25], ['mp', 20], ['tarjeta', 10]];
const SVC_PESO: [string, number][] = [['nb', 35], ['pc', 20], ['imp', 20], ['mant', 15], ['arm', 5], ['red', 5]];
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
// Precios de referencia: octubre de 2026 (los del catálogo). Antes, un 2,5 % menos por mes (inflación de ejemplo).
const REF = '2026-10-01';

const fnv = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function mulberry(a: number) {
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function pick<T>(rnd: () => number, items: [T, number][]) {
  let x = rnd() * items.reduce((a, [, w]) => a + w, 0);
  for (const [v, w] of items) if ((x -= w) < 0) return v;
  return items[items.length - 1][0];
}
const entre = (rnd: () => number, a: number, b: number) => a + rnd() * (b - a);

/** Hora dentro del horario del local de ese día. */
function hora(rnd: () => number, segs: [number, number][]) {
  const total = segs.reduce((a, [x, y]) => a + (y - x) * 60, 0);
  let t = Math.floor(rnd() * total);
  for (const [x, y] of segs) { const len = (y - x) * 60; if (t < len) { const m = x * 60 + t; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; } t -= len; }
  return `${String(segs[0][0]).padStart(2, '0')}:00`;
}

/** Fecha de un gasto fijo del mes: el día pedido o, si cae domingo, el lunes. */
const fijo = (ymd: string, dia: number) => { const f = ymd.slice(0, 8) + String(dia).padStart(2, '0'); return dow(f) === 0 ? addDays(f, 1) : f; };

const EQUIPOS: Record<string, [string, number][]> = {
  nb: [['Notebook Lenovo', 3], ['Notebook HP', 3], ['Notebook Dell', 2], ['Notebook Asus', 2], ['Notebook Acer', 1]],
  pc: [['PC de escritorio', 1]], imp: [['Impresora Epson', 3], ['Impresora HP', 2], ['Impresora Brother', 1]],
  mant: [['Notebook', 2], ['PC de escritorio', 1]], arm: [['PC a medida', 1]], red: [['Red Wi-Fi de un comercio', 1], ['Red Wi-Fi de una casa', 2]],
};
const TALLER = ['Pasta térmica y alcohol isopropílico', 'Destornilladores de precisión', 'Estaño y flux', 'Repuestos de tornillos'];

function dia(ymd: string): Movement[] {
  const segs = CONFIG.hours[dow(ymd)];
  if (!segs.length) return [];
  const rnd = mulberry(fnv('atc:' + ymd));
  const k = TEMPORADA[monthIndex(ymd)] * (dow(ymd) === 6 ? .55 : 1);
  const idx = 1.025 ** monthsBetween(REF, ymd);
  const precio = (v: number) => Math.max(100, Math.round((v * idx) / 100) * 100);
  const tag = ymd.slice(2).replaceAll('-', '');
  const out: Movement[] = [];

  // Ventas (al menos una por día abierto)
  const nV = Math.max(1, Math.round(entre(rnd, 1.4, 3.2) * k));
  const productos: [Product, number][] = PRODUCTS.map(p => [p, PESO[p.id] ?? 1]);
  for (let i = 0; i < nV; i++) {
    const p = pick(rnd, productos);
    const qty = p.cat === 'insumos' ? 1 + (rnd() < .35 ? 1 : 0) + (rnd() < .1 ? 1 : 0) : rnd() < .12 && p.price < 100000 ? 2 : 1;
    const items: SaleItem[] = [{ productId: p.id, qty, unit: precio(p.price), unitCost: precio(COSTOS[p.id]) }];
    if (rnd() < .15) {
      const extra = pick(rnd, productos.filter(([q]) => q.price < 100000 && q.id !== p.id));
      items.push({ productId: extra.id, qty: 1, unit: precio(extra.price), unitCost: precio(COSTOS[extra.id]) });
    }
    const note = p.cat === 'notebooks' && rnd() < .35 ? 'Con Windows y programas instalados' : undefined;
    out.push({ kind: 'venta', id: `V-${tag}-${i + 1}`, ymd, hm: hora(rnd, segs), pay: pick(rnd, PAGOS), status: 'cobrado', items, note } satisfies Venta);
  }

  // Reparaciones cobradas
  const nR = (rnd() < .55 * k ? 1 : 0) + (rnd() < .15 * k ? 1 : 0);
  for (let i = 0; i < nR; i++) {
    const svcId = pick(rnd, SVC_PESO);
    const s = SVCS.find(x => x.id === svcId)!;
    const amount = r500(entre(rnd, s.min, s.max) * idx);
    const partsCost = rnd() < .45 ? r500(amount * entre(rnd, .15, .45)) : 0;
    const code = Array.from({ length: 6 }, () => CROCKFORD[Math.floor(rnd() * 32)]).join('');
    out.push({ kind: 'reparacion', id: `R-${tag}-${i + 1}`, ymd, hm: hora(rnd, segs), pay: pick(rnd, PAGOS), status: 'cobrado',
      orderCode: `AT-${code.slice(0, 4)}-${code.slice(4)}`, equipo: pick(rnd, EQUIPOS[svcId]), svcId, amount, partsCost } satisfies Reparacion);
  }

  // Gastos: fijos del mes y algunos ocasionales
  const gastos: Omit<Gasto, 'id' | 'ymd' | 'hm' | 'kind' | 'status'>[] = [];
  if (ymd === fijo(ymd, 5)) gastos.push({ cat: 'alquiler', concept: 'Alquiler del local', amount: Math.round((380000 * idx) / 1000) * 1000, pay: 'transferencia' });
  if (ymd === fijo(ymd, 10)) gastos.push({ cat: 'servicios', concept: 'Internet del local', amount: precio(28000), pay: 'transferencia' });
  if (ymd === fijo(ymd, 12)) gastos.push({ cat: 'servicios', concept: 'Luz', amount: precio(entre(rnd, 38000, 52000)), pay: 'transferencia' });
  if (ymd === fijo(ymd, 20)) gastos.push({ cat: 'impuestos', concept: 'Monotributo', amount: precio(61000), pay: 'transferencia' });
  if (rnd() < .07) gastos.push({ cat: 'envios', concept: 'Envío a un cliente', amount: precio(entre(rnd, 6000, 14000)), pay: 'efectivo' });
  if (rnd() < .025) gastos.push({ cat: 'publicidad', concept: 'Publicidad en redes', amount: precio(entre(rnd, 15000, 40000)), pay: 'tarjeta' });
  if (rnd() < .035) gastos.push({ cat: 'taller', concept: TALLER[Math.floor(rnd() * TALLER.length)], amount: precio(entre(rnd, 8000, 30000)), pay: 'efectivo' });
  gastos.forEach((g, i) => out.push({ kind: 'gasto', id: `G-${tag}-${i + 1}`, ymd, hm: hora(rnd, segs), status: 'pagado', ...g } satisfies Gasto));

  return out;
}

/** Movimientos de ejemplo de los últimos `dias` días hasta "ahora" (hoy, solo hasta la hora actual). */
export function generar(ahora: { ymd: string; hm: string }, dias = 760): Movement[] {
  const out: Movement[] = [];
  for (let d = addDays(ahora.ymd, -dias); d <= ahora.ymd; d = addDays(d, 1)) {
    for (const m of dia(d)) if (d < ahora.ymd || m.hm <= ahora.hm) out.push(m);
  }
  return out;
}
