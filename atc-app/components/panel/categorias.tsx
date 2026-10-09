'use client';

import { Icon, Render } from '../ui';
import { CardHead } from './card-head';
import { vars } from '@/lib/format';
import { CATS } from '@/lib/data/catalog';
import type { Cat } from '@/lib/panel/stats';
import { delta } from '@/lib/panel/stats';
import { fmt, fmtMonto, fmtPct } from '@/lib/format';

// Color fijo por categoría (tokens --cat-* en 14-panel.css, con versión para modo oscuro).
const color = (id: string) => `var(--cat-${id}, var(--text-3))`;

// Ganancia por categoría (equivale a la lista de activos de la referencia). La variación lleva flecha y signo.
export function Categorias({ cats }: { cats: Cat[] }) {
  return (
    <section className="pn-card pn-cat" aria-labelledby="pn-cat-h">
      <CardHead id="pn-cat-h" title="Por categoría" value={fmtMonto(cats.reduce((a, c) => a + c.ganancia, 0))} sub="antes de gastos" />
      {/* Reparto de la ganancia (como la barra de almacenamiento del iPhone). Los montos están en la lista. */}
      <div className="pn-share" aria-hidden="true">
        {cats.filter(c => c.ganancia > 0).map(c => <i key={c.id} data-cat={c.id} style={vars({ flexGrow: c.ganancia, background: color(c.id) })} />)}
      </div>
      <ul className="pn-rows">
        {cats.map(c => {
          const cat = CATS.find(x => x.id === c.id);
          const d = delta(c.ganancia, c.prev);
          const up = d.abs > 0;
          const n = c.id === 'servicio' ? `${c.n} ${c.n === 1 ? 'reparación' : 'reparaciones'}` : `${c.n} ${c.n === 1 ? 'unidad' : 'unidades'}`;
          return (
            <li key={c.id} className="pn-row" data-cat={c.id} data-v={c.ganancia}>
              <span className="pn-ic pn-ic-r">{cat ? <Render r={cat.r} /> : <Icon n="wrench" />}</span>
              <span className="pn-rt">
                <b><i className="pn-cdot" style={vars({ background: color(c.id) })} aria-hidden="true" />{cat?.t ?? 'Servicio técnico'}</b>
                <small>{n}{d.abs === 0 ? <> · sin cambios</> : d.pct !== null && <> · <span className={`pn-var ${up ? 'up' : 'dn'}`}><Icon n={up ? 'trend-up' : 'trend-down'} cls="i xs" /><span className="sr">{up ? 'subió' : 'bajó'} </span>{fmtPct(d.pct)}</span></>}</small>
              </span>
              <span className="pn-mamt"><b className="pn-num">{fmtMonto(c.ganancia)}</b><small className="pn-num">de {fmt(c.ingresos)}</small></span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
