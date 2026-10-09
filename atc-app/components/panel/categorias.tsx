'use client';

import { Icon, Render } from '../ui';
import { CATS } from '@/lib/data/catalog';
import type { Cat } from '@/lib/panel/stats';
import { delta } from '@/lib/panel/stats';
import { fmt, fmtMonto, fmtPct } from '@/lib/format';

// Ganancia por categoría (equivale a la lista de activos de la referencia). La variación lleva flecha y signo.
export function Categorias({ cats }: { cats: Cat[] }) {
  return (
    <section className="pn-card pn-cat" aria-labelledby="pn-cat-h">
      <h2 className="pn-h2" id="pn-cat-h">Por categoría</h2>
      <ul className="pn-rows">
        {cats.map(c => {
          const cat = CATS.find(x => x.id === c.id);
          const d = delta(c.ganancia, c.prev);
          const up = d.abs >= 0;
          const n = c.id === 'servicio' ? `${c.n} ${c.n === 1 ? 'reparación' : 'reparaciones'}` : `${c.n} ${c.n === 1 ? 'unidad' : 'unidades'}`;
          return (
            <li key={c.id} className="pn-row" data-cat={c.id} data-v={c.ganancia}>
              <span className="pn-ic pn-ic-r">{cat ? <Render r={cat.r} /> : <Icon n="wrench" />}</span>
              <span className="pn-rt">
                <b>{cat?.t ?? 'Servicio técnico'}</b>
                <small>{n}{d.pct !== null && <> · <span className={`pn-var ${up ? 'up' : 'dn'}`}><Icon n={up ? 'trend-up' : 'trend-down'} cls="i xs" />{fmtPct(d.pct)}</span></>}</small>
              </span>
              <span className="pn-mamt"><b className="pn-num">{fmtMonto(c.ganancia)}</b><small className="pn-num">de {fmt(c.ingresos)}</small></span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
