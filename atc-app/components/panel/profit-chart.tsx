'use client';

import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { curva, escala, H, W } from '@/lib/panel/chart';
import type { Bucket, Unit } from '@/lib/panel/stats';
import { fmtMonto } from '@/lib/format';

const DEL: Record<Unit, string> = { 'día': 'del día', semana: 'de la semana', mes: 'del mes' };

/**
 * Ganancia acumulada del período (empieza en $ 0): verde arriba del cero y rojo abajo, con la línea punteada en $ 0.
 * El SVG se estira al ancho de la tarjeta; textos, punto y guía van en HTML encima (no se deforman).
 * Se recorre con el mouse, el dedo o el teclado (←, →, Inicio, Fin). Para lectores de pantalla hay una tabla oculta.
 */
export function ProfitChart({ serie, label, unit }: { serie: Bucket[]; label: string; unit: Unit }) {
  const uid = useId().replace(/[^\w-]/g, '');
  const [sel, setSel] = useState<number | null>(null);
  const n = serie.length;
  const vals = [0, ...serie.map(b => b.acumulado)];
  const { y, y0 } = escala(vals);
  const xs = vals.map((_, i) => (i / n) * W), ys = vals.map(y);
  const line = curva(xs, ys);
  const area = `${line}L${W},${y0.toFixed(1)}L0,${y0.toFixed(1)}Z`;
  const top = Math.min(...ys), bot = Math.max(...ys);
  const txt = (i: number) => `${serie[i].label} · ${DEL[unit]} ${fmtMonto(serie[i].valor)} · acumulado ${fmtMonto(serie[i].acumulado)}`;
  const cur = sel ?? n - 1;

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
  const yy = sel === null ? 0 : (ys[sel + 1] / H) * 100;
  const zl = (y0 / H) * 100;
  return (
    <div className="pn-chart" data-n={n}>
      <div className="pn-plot">
        <svg className="pn-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs>
            <clipPath id={`${uid}u`}><rect x="0" y="0" width={W} height={y0} /></clipPath>
            <clipPath id={`${uid}d`}><rect x="0" y={y0} width={W} height={H - y0} /></clipPath>
            <linearGradient id={`${uid}gu`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={top} y2={y0}><stop offset="0" className="pn-gu" /><stop offset="1" className="pn-gu pn-g0" /></linearGradient>
            <linearGradient id={`${uid}gd`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={y0} y2={bot}><stop offset="0" className="pn-gd pn-g0" /><stop offset="1" className="pn-gd" /></linearGradient>
          </defs>
          <path d={area} fill={`url(#${uid}gu)`} clipPath={`url(#${uid}u)`} />
          <path d={area} fill={`url(#${uid}gd)`} clipPath={`url(#${uid}d)`} />
          <line className="pn-zero" x1="0" x2={W} y1={y0} y2={y0} />
          <path className="pn-l pn-l-up" d={line} clipPath={`url(#${uid}u)`} />
          <path className="pn-l pn-l-dn" d={line} clipPath={`url(#${uid}d)`} />
        </svg>
        <span className={`pn-zl${zl < 14 ? ' below' : ''}`} style={{ top: `${zl}%` }} aria-hidden="true">$ 0</span>
        {sel !== null && (
          <>
            <i className="pn-cross" style={{ left: `${x}%` }} aria-hidden="true" />
            <i className={`pn-dot ${serie[sel].acumulado < 0 ? 'dn' : 'up'}`} style={{ left: `${x}%`, top: `${yy}%` }} aria-hidden="true" />
            <p className={`pn-tip${x < 22 ? ' l' : x > 78 ? ' r' : ''}`} style={{ left: `${x}%` }} aria-hidden="true">
              <b>{serie[sel].label}</b>
              <span>{DEL[unit][0].toUpperCase() + DEL[unit].slice(1)} {fmtMonto(serie[sel].valor)}</span>
              <span>Acumulado {fmtMonto(serie[sel].acumulado)}</span>
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
      <div className="pn-x" aria-hidden="true"><span>{serie[0].label}</span><span>{serie[n - 1].label}</span></div>
      <table className="sr">
        <caption>Ganancia por {unit}, {label.toLowerCase()}</caption>
        <thead><tr><th scope="col">Período</th><th scope="col">{DEL[unit][0].toUpperCase() + DEL[unit].slice(1)}</th><th scope="col">Acumulado</th></tr></thead>
        <tbody>{serie.map(b => <tr key={b.from}><th scope="row">{b.label}</th><td>{fmtMonto(b.valor)}</td><td>{fmtMonto(b.acumulado)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
