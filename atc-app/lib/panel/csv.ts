// Planilla CSV de movimientos (para Excel o el contador). Separador ";" y BOM UTF-8: Excel en castellano la abre bien.
// Las celdas de texto que empiezan con = + - @ (o tab/retorno) se escapan con ' para que Excel no las tome como fórmula.
import { costo, ingreso, resultado, type Movement } from './types';
import { ESTADO, KIND_LABEL, payLabel, titulo } from './labels';

const texto = (s: string) => {
  const v = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};
export function csv(ms: Movement[]) {
  const head = ['Fecha', 'Hora', 'N.º', 'Tipo', 'Detalle', 'Medio de pago', 'Ingreso', 'Costo', 'Ganancia', 'Estado', 'Nota'];
  const rows = ms.map(m => [texto(m.ymd), texto(m.hm), texto(m.id), texto(KIND_LABEL[m.kind]), texto(titulo(m)), texto(payLabel(m.pay)),
    String(ingreso(m)), String(costo(m)), String(resultado(m)), texto(ESTADO[m.status]), texto(m.note ?? '')]);
  return '﻿' + [head.map(texto), ...rows].map(r => r.join(';')).join('\r\n') + '\r\n';
}
