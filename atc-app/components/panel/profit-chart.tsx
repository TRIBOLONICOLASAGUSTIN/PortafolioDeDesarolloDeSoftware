'use client';

import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { curva, escala, marcasX, H, W } from '@/lib/panel/chart';
import type { Bucket, Unit } from '@/lib/panel/stats';
import { fmtEje, fmtMonto } from '@/lib/format';

const DEL: Record<Unit, string> = { 'día': 'del día', semana: 'de la semana', mes: 'del mes' };
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * Ganancia acumulada del período, al estilo de Bolsa: grilla suave, montos a la derecha y fechas abajo.
 * La línea es verde arriba del $ 0 y roja abajo; el período anterior va en gris punteado para comparar.
 * El SVG se estira al ancho de la tarjeta; textos, puntos y guía van en HTML encima (no se deforman).
 * Se recorre con el mouse, el dedo o el teclado (←, →, Inicio, Fin). Para lectores de pantalla hay una tabla oculta.
 */
export function ProfitChart({ serie, prev, label, prevLabel, unit }: { serie: Bucket[]; prev: Bucket[]; label: string; prevLabel: string; unit: Unit }) {
  const uid = useId().replace(/[^\w-]/g, '');
  const [sel, setSel] = useState<number | null>(null);
  const n = serie.length;
  const vals = [0, ...serie.map(b => b.acumulado)];
  const pvals = prev.length === n ? [0, ...prev.map(b => b.acumulado)] : null;
  const { y, y0, ticks } = escala(pvals ? [...vals, ...pvals] : vals);
  const xs = vals.map((_, i) => (i / n) * W), ys = vals.map(y);
  const line = curva(xs, ys);
  const pline = pvals ? curva(xs, pvals.map(y)) : null;
  const area = `${line}L${W},${y0.toFixed(1)}L0,${y0.toFixed(1)}Z`;
  const top = Math.min(...ys), bot = Math.max(...ys);
  const antes = (i: number) => (pvals ? ` · período anterior ${fmtMonto(pvals[i + 1])}` : '');
  const txt = (i: number) => `${serie[i].label} · acumulado ${fmtMonto(serie[i].acumulado)} · ${DEL[unit]} ${fmtMonto(serie[i].valor)}${antes(i)}`;
  const cur = sel ?? n - 1;
  const tone = (v: number) => (v < 0 ? 'dn' : 'up');
  const pct = (v: number) => `${(v / H) * 100}%`;

  const onKey = (e: KeyboardEvent) => {
    const next = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? cur - 1 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? cur + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null;
    if (next === null) return;
    e.preventDefault();
    setSel(Math.max(0, Math.min(n - 1, next)));
  };
  const at = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setSel(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * n - 1))));
  };

  const x = sel === null ? 0 : ((sel + 1) / n) * 100;
  return (
    <div className="pn-chart" data-n={n}>
      {pvals && (
        <ul className="pn-leg" aria-hidden="true">
          <li><i className={`pn-key ${tone(serie[n - 1].acumulado)}`} />{label}</li>
          <li><i className="pn-key prev" />{cap(prevLabel)}</li>
        </ul>
      )}
      <div className="pn-plot">
        <svg className="pn-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs>
            <clipPath id={`${uid}u`}><rect x="0" y="0" width={W} height={y0} /></clipPath>
            <clipPath id={`${uid}d`}><rect x="0" y={y0} width={W} height={H - y0} /></clipPath>
            <linearGradient id={`${uid}gu`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={top} y2={y0}><stop offset="0" className="pn-gu" /><stop offset="1" className="pn-gu pn-g0" /></linearGradient>
            <linearGradient id={`${uid}gd`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={y0} y2={bot}><stop offset="0" className="pn-gd pn-g0" /><stop offset="1" className="pn-gd" /></linearGradient>
          </defs>
          {ticks.filter(t => t !== 0).map(t => <line key={t} className="pn-gl" x1="0" x2={W} y1={y(t)} y2={y(t)} />)}
          <path d={area} fill={`url(#${uid}gu)`} clipPath={`url(#${uid}u)`} />
          <path d={area} fill={`url(#${uid}gd)`} clipPath={`url(#${uid}d)`} />
          <line className="pn-zero" x1="0" x2={W} y1={y0} y2={y0} />
          {pline && <path className="pn-l-prev" d={pline} />}
          <path className="pn-l pn-l-up" d={line} clipPath={`url(#${uid}u)`} />
          <path className="pn-l pn-l-dn" d={line} clipPath={`url(#${uid}d)`} />
        </svg>
        {sel === null ? (
          <i className={`pn-end ${tone(serie[n - 1].acumulado)}`} style={{ top: pct(ys[n]) }} aria-hidden="true" />
        ) : (
          <>
            <i className="pn-cross" style={{ left: `${x}%` }} aria-hidden="true" />
            {pvals && <i className="pn-dot prev" style={{ left: `${x}%`, top: pct(y(pvals[sel + 1])) }} aria-hidden="true" />}
            <i className={`pn-dot ${tone(serie[sel].acumulado)}`} style={{ left: `${x}%`, top: pct(ys[sel + 1]) }} aria-hidden="true" />
            {/* El detalle va dentro del dibujo: arriba, o abajo si el punto está alto (no tapa el punto ni la leyenda) */}
            <p className={`pn-tip${x < 22 ? ' l' : x > 78 ? ' r' : ''}${ys[sel + 1] / H < .5 ? ' bt' : ''}`} style={{ left: `${x}%` }} aria-hidden="true">
              <b>{serie[sel].label}</b>
              <span>Acumulado <b className="pn-num">{fmtMonto(serie[sel].acumulado)}</b></span>
              <span>{cap(DEL[unit])} {fmtMonto(serie[sel].valor)}</span>
              {pvals && <span className="pn-tip-prev">Período anterior {fmtMonto(pvals[sel + 1])}</span>}
            </p>
          </>
        )}
        <div className="pn-hit" role="slider" tabIndex={0} aria-label={`Ganancia acumulada, ${label.toLowerCase()}`}
          aria-valuemin={0} aria-valuemax={n - 1} aria-valuenow={cur} aria-valuetext={txt(cur)}
          onKeyDown={onKey} onFocus={() => setSel(s => s ?? n - 1)} onBlur={() => setSel(null)}
          onPointerDown={e => { if (e.pointerType !== 'mouse') e.currentTarget.setPointerCapture(e.pointerId); at(e); }}
          onPointerMove={at} onPointerLeave={e => { if (e.pointerType === 'mouse' && document.activeElement !== e.currentTarget) setSel(null); }}
          onPointerCancel={() => setSel(null)} onPointerUp={e => { if (e.pointerType !== 'mouse') e.currentTarget.focus({ preventScroll: true }); }} />
      </div>
      <div className="pn-yax" aria-hidden="true">{ticks.map(t => <span key={t} className="pn-yt" style={{ top: pct(y(t)) }}>{fmtEje(t)}</span>)}</div>
      <div className="pn-x" aria-hidden="true">
        {marcasX(serie, unit).map(m => <span key={m.i} className={`pn-xt${m.x < .08 ? ' l' : m.x > .92 ? ' r' : ''}${m.alt ? ' alt' : ''}`} style={{ left: `${m.x * 100}%` }}>{m.label}</span>)}
      </div>
      {/* Las tablas no se achican a 1 px: el contenedor oculto es el que mide 1 px (si no, empuja el ancho de la página) */}
      <div className="sr"><table>
        <caption>Ganancia por {unit}, {label.toLowerCase()}</caption>
        <thead><tr><th scope="col">Período</th><th scope="col">{cap(DEL[unit])}</th><th scope="col">Acumulado</th>{pvals && <th scope="col">Acumulado del período anterior</th>}</tr></thead>
        <tbody>{serie.map((b, i) => <tr key={b.from}><th scope="row">{b.label}</th><td>{fmtMonto(b.valor)}</td><td>{fmtMonto(b.acumulado)}</td>{pvals && <td>{fmtMonto(pvals[i + 1])}</td>}</tr>)}</tbody>
      </table></div>
    </div>
  );
}
