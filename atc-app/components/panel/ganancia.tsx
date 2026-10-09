'use client';

import { Icon } from '../ui';
import { useReducedMotion } from '../hooks';
import { useCountUp } from './count-up';
import { Chips } from './chips';
import { ProfitChart } from './profit-chart';
import { RANGES, RANGE_IDS, delta, extremos, type Bucket, type RangeId } from '@/lib/panel/stats';
import { fmtMonto, fmtPct, fmtSigned } from '@/lib/format';

const UNIT_CAP = { 'día': 'día', semana: 'semana', mes: 'mes' } as const;

// Tarjeta principal: ganancia del período, variación, gráfico, período y mejor/peor tramo.
export function Ganancia({ range, onRange, total, prev, serie }: { range: RangeId; onRange: (r: RangeId) => void; total: number; prev: number; serie: Bucket[] }) {
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
      <ProfitChart key={range} serie={serie} label={R.label} unit={R.unit} />
      <Chips name="pn-rango" legend="Período" value={range} onChange={onRange} options={RANGE_IDS.map(r => [r, RANGES[r].chip])} />
      <dl className="pn-ext">
        <div><dt>Mejor {UNIT_CAP[R.unit]}</dt><dd><span>{mejor.label}</span><b className="pn-num">{fmtMonto(mejor.valor)}</b></dd></div>
        <div><dt>Peor {UNIT_CAP[R.unit]}</dt><dd><span>{peor.label}</span><b className="pn-num">{fmtMonto(peor.valor)}</b></dd></div>
      </dl>
    </section>
  );
}
