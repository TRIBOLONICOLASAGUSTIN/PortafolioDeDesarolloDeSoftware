'use client';

import { useState } from 'react';
import { Chips } from './chips';
import { usePanel } from './panel-shell';
import { top, type Metric, type Periodo } from '@/lib/panel/stats';
import { productName } from '@/lib/panel/labels';
import { byId } from '@/lib/data/catalog';
import { fmt, vars } from '@/lib/format';

const METRICS: [Metric, string][] = [['unidades', 'Unidades'], ['ventas', 'Ventas'], ['ganancia', 'Ganancia']];

// Productos más vendidos del período, con barras proporcionales (se dibujan con scaleX).
export function MasVendidos({ per }: { per: Periodo }) {
  const { idx } = usePanel();
  const [metric, setMetric] = useState<Metric>('unidades');
  const list = top(idx, per.from, per.to, metric);
  const max = Math.max(1, ...list.map(t => t[metric]));
  const val = (v: number) => (metric === 'unidades' ? `${v} u.` : fmt(v));
  return (
    <section className="pn-card pn-top" aria-labelledby="pn-top-h">
      <h2 className="pn-h2" id="pn-top-h">Más vendidos</h2>
      <Chips variant="seg" name="pn-metrica" legend="Ordenar por" value={metric} onChange={setMetric} options={METRICS} />
      {list.length ? (
        <ol className="pn-rank">
          {list.map((t, i) => (
            <li key={t.productId} data-v={t[metric]} style={vars({ '--s': (t[metric] / max).toFixed(4) })}>
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
