'use client';

import { Icon, Render } from '../ui';
import { CardHead } from './card-head';
import { vars } from '@/lib/format';
import { CATS } from '@/lib/data/catalog';
import type { Cat } from '@/lib/panel/stats';
import { delta } from '@/lib/panel/stats';
import { fmt, fmtMonto, fmtPct } from '@/lib/format';

// Un solo tono (azul) de más intenso a más suave según el puesto en la lista: calmo, sin verde ni rojo (reservados para
// subir y bajar) y sin depender de distinguir 8 colores. El nombre y el monto de cada fila dicen qué es cada tramo.
const color = (i: number) => `var(--pn-r${Math.min(i, 7) + 1})`;

// Ganancia por categoría (equivale a la lista de activos de la referencia). La variación lleva flecha y signo.
export function Categorias({ cats }: { cats: Cat[] }) {
  return (
    <section className="pn-card pn-cat" aria-labelledby="pn-cat-h">
      <CardHead id="pn-cat-h" title="Por categoría" value={fmtMonto(cats.reduce((a, c) => a + c.ganancia, 0))} sub="antes de gastos" />
      {/* Reparto de la ganancia (como la barra de almacenamiento del iPhone). Los montos están en la lista. */}
      <div className="pn-share" aria-hidden="true">
        {cats.map((c, i) => c.ganancia > 0 && <i key={c.id} data-cat={c.id} style={vars({ flexGrow: c.ganancia, background: color(i) })} />)}
      </div>
      <ul className="pn-rows" style={vars({ '--rows': Math.ceil(cats.length / 2) })}>
        {cats.map((c, i) => {
          const cat = CATS.find(x => x.id === c.id);
          const d = delta(c.ganancia, c.prev);
          const up = d.abs > 0;
          const n = c.id === 'servicio' ? `${c.n} ${c.n === 1 ? 'reparación' : 'reparaciones'}` : `${c.n} ${c.n === 1 ? 'unidad' : 'unidades'}`;
          return (
            <li key={c.id} className="pn-row" data-cat={c.id} data-v={c.ganancia}>
              <span className="pn-ic pn-ic-r">{cat ? <Render r={cat.r} /> : <Icon n="wrench" />}<i className="pn-cdot" style={vars({ background: color(i) })} aria-hidden="true" /></span>
              <span className="pn-rt">
                <b>{cat?.t ?? 'Servicio técnico'}</b>
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
