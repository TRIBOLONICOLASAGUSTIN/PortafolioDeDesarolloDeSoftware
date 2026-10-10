// Planilla CSV de movimientos (para Excel o el contador). Separador ";" y BOM UTF-8: Excel en castellano la abre bien.
// Las celdas de texto que empiezan con = + - @ (o tab/retorno) se escapan con ' para que Excel no las tome como fórmula.
import { costo, ingreso, resultado, type Movement } from './types';
import { ESTADO, KIND_LABEL, payLabel, titulo } from './labels';

export const texto = (s: string) => {
  const v = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};
export function csv(ms: Movement[]) {
  const head = ['Fecha', 'Hora', 'N.º', 'Tipo', 'Detalle', 'Medio de pago', 'Ingreso', 'Costo', 'Ganancia', 'Estado', 'Nota'];
  const rows = ms.map(m => [texto(m.ymd), texto(m.hm), texto(m.id), texto(KIND_LABEL[m.kind]), texto(titulo(m)), texto(payLabel(m.pay)),
    String(ingreso(m)), String(costo(m)), String(resultado(m)), texto(ESTADO[m.status]), texto(m.note ?? '')]);
  return '﻿' + [head.map(texto), ...rows].map(r => r.join(';')).join('\r\n') + '\r\n';
}

/** Lista de precios: categoría, marca, producto, costo, precio y margen (para imprimir o pasarle a un vendedor). */
export function csvPrecios(rows: { cat: string; marca: string; nombre: string; costo: number; precio: number; margen: number }[]) {
  const head = ['Categoría', 'Marca', 'Producto', 'Costo', 'Precio', 'Margen %'];
  const out = rows.map(r => [texto(r.cat), texto(r.marca), texto(r.nombre), String(r.costo), String(r.precio), String(Math.round(r.margen * 1000) / 10).replace('.', ',')]);
  return '\ufeff' + [head.map(texto), ...out].map(r => r.join(';')).join('\r\n') + '\r\n';
}
