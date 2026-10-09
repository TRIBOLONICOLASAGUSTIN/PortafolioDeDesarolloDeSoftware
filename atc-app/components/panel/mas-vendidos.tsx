'use client';

import { useState } from 'react';
import { Chips } from './chips';
import { CardHead } from './card-head';
import { usePanel } from './panel-shell';
import { top, type Metric, type Periodo, type Totales } from '@/lib/panel/stats';
import { productName } from '@/lib/panel/labels';
import { byId } from '@/lib/data/catalog';
import { fmtMonto, vars } from '@/lib/format';

const METRICS: [Metric, string][] = [['unidades', 'Unidades'], ['ventas', 'Ventas'], ['ganancia', 'Ganancia']];

// Productos más vendidos del período, con barras proporcionales (se dibujan con scaleX).
const TOTAL: Record<Metric, [(t: Totales) => number, string]> = {
  unidades: [t => t.unidades, 'unidades vendidas'], ventas: [t => t.ventas, 'vendido en productos'], ganancia: [t => t.gananciaVentas, 'ganancia de productos'],
};

export function MasVendidos({ per, t }: { per: Periodo; t: Totales }) {
  const { idx } = usePanel();
  const [metric, setMetric] = useState<Metric>('unidades');
  const list = top(idx, per.from, per.to, metric);
  const max = Math.max(1, ...list.map(t => t[metric]));
  const val = (v: number) => (metric === 'unidades' ? `${v} u.` : fmtMonto(v));
  return (
    <section className="pn-card pn-top" aria-labelledby="pn-top-h">
      <CardHead id="pn-top-h" title="Más vendidos" value={val(TOTAL[metric][0](t))} sub={TOTAL[metric][1]} />
      <Chips variant="seg" name="pn-metrica" legend="Ordenar por" value={metric} onChange={setMetric} options={METRICS} />
      {list.length ? (
        <ol className="pn-rank">
          {list.map((t, i) => (
            <li key={t.productId} data-v={t[metric]} style={vars({ '--s': (Math.max(0, t[metric]) / max).toFixed(4), '--i': i })}>
              <span className="pn-rk pn-num">{i + 1}</span>
              <span className="pn-rt"><b>{productName(t.productId)}</b><small>{byId[t.productId]?.brand}</small></span>
              <b className="pn-rv pn-num">{val(t[metric])}</b>
              <i className="pn-bar" aria-hidden="true" />
            </li>
          ))}
        </ol>
      ) : <p className="pn-empty">Sin ventas en estos días.</p>}
    </section>
  );
}
