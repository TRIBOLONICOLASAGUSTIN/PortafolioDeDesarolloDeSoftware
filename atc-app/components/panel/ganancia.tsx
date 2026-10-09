'use client';

import { Icon } from '../ui';
import { useReducedMotion } from '../hooks';
import { useCountUp } from './count-up';
import { ProfitChart } from './profit-chart';
import { RANGES, delta, extremos, type Bucket, type RangeId } from '@/lib/panel/stats';
import { fmtMonto, fmtPct, fmtSigned } from '@/lib/format';

const UNIT_CAP = { 'día': 'día', semana: 'semana', mes: 'mes' } as const;

// Tarjeta principal: ganancia del período, variación, gráfico y mejor/peor tramo (el período se elige arriba).
export function Ganancia({ range, total, prev, serie, prevSerie }: { range: RangeId; total: number; prev: number; serie: Bucket[]; prevSerie: Bucket[] }) {
  const R = RANGES[range];
  const d = delta(total, prev);
  const up = d.abs > 0, igual = d.abs === 0;
  // El último tramo termina hoy y está incompleto (el día o el mes en curso): no compite por mejor o peor.
  const { mejor, peor } = extremos(serie.length > 1 ? serie.slice(0, -1) : serie);
  const shown = useCountUp(total, range, useReducedMotion());
  return (
    <section className="pn-card pn-gan" aria-labelledby="pn-gan-h">
      <h2 className="pn-lbl" id="pn-gan-h">Ganancia <span className="pn-per" id="pn-per">· {R.label}</span></h2>
      <p className="pn-big pn-num" id="pn-total" data-v={total}>{fmtMonto(shown)}</p>
      <p className="pn-delta">
        {igual ? <span className="pn-trend eq">Sin cambios</span> : (
          <span className={`pn-trend ${up ? 'up' : 'dn'}`}>
            <Icon n={up ? 'trend-up' : 'trend-down'} cls="i xs" /><span className="sr">{up ? 'Subió' : 'Bajó'}</span>{fmtSigned(d.abs)}
          </span>
        )}
        <span className="pn-vs">{d.pct !== null && !igual && <span className="pn-num">{fmtPct(d.pct)} </span>}frente a {R.prev}</span>
      </p>
      <ProfitChart key={range} serie={serie} prev={prevSerie} label={R.label} prevLabel={R.prev} unit={R.unit} />
      <dl className="pn-ext">
        <div><dt>Mejor {UNIT_CAP[R.unit]}</dt><dd><span>{mejor.label}</span><b className="pn-num">{fmtMonto(mejor.valor)}</b></dd></div>
        <div><dt>Peor {UNIT_CAP[R.unit]}</dt><dd><span>{peor.label}</span><b className="pn-num">{fmtMonto(peor.valor)}</b></dd></div>
      </dl>
    </section>
  );
}
