'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePanel } from './panel-shell';
import { Ganancia } from './ganancia';
import { Desglose } from './desglose';
import { Aviso } from './aviso';
import { Acciones } from './acciones';
import { Categorias } from './categorias';
import { MasVendidos } from './mas-vendidos';
import { Ultimos } from './ultimos';
import { Chips } from './chips';
import { DemoBanner } from './demo-banner';
import { RANGES, RANGE_IDS, delta, periodo, porCategoria, serie, totales, type RangeId } from '@/lib/panel/stats';
import { fmtMonto, fmtPct } from '@/lib/format';
import { resultado } from '@/lib/panel/types';

// Resumen del panel: el período elegido manda en todas las tarjetas (por eso su control va arriba, junto al título).
export function Resumen({ fecha }: { fecha: string }) {
  const { idx, hoy } = usePanel();
  const [range, setRange] = useState<RangeId>('30d');
  const [msg, setMsg] = useState('');
  const per = useMemo(() => periodo(range, hoy), [range, hoy]);
  const t = useMemo(() => totales(idx, per.from, per.to), [idx, per]);
  const prev = useMemo(() => totales(idx, per.prevFrom, per.prevTo), [idx, per]);
  const s = useMemo(() => serie(idx, per), [idx, per]);
  // El mismo armado de tramos, corrido al período anterior (para comparar en el gráfico).
  const ps = useMemo(() => serie(idx, periodo(range, per.prevTo)), [idx, range, per]);
  const cats = useMemo(() => porCategoria(idx, per), [idx, per]);
  const sparks = useMemo(() => ({
    ventas: serie(idx, per, m => (m.kind === 'venta' ? resultado(m) : 0)).map(b => b.valor),
    servicio: serie(idx, per, m => (m.kind === 'reparacion' ? resultado(m) : 0)).map(b => b.valor),
    gastos: serie(idx, per, m => (m.kind === 'gasto' ? m.amount : 0)).map(b => b.valor),
  }), [idx, per]);

  // El cambio de período se anuncia (no al cargar la página).
  const lastRange = useRef(range);
  useEffect(() => {
    if (lastRange.current === range) return;
    lastRange.current = range;
    const d = delta(t.ganancia, prev.ganancia);
    setMsg(`${RANGES[range].label}: ganancia ${fmtMonto(t.ganancia)}${d.pct !== null ? `, ${fmtPct(d.pct)}` : ''} frente a ${RANGES[range].prev}.`);
  }, [range, t, prev]);

  return (
    <>
      <header className="pn-head">
        <div>
          <p className="pn-eyebrow">{fecha}</p>
          <h1 className="pn-t" tabIndex={-1}>Resumen</h1>
        </div>
        <div className="pn-range"><Chips name="pn-rango" legend="Período" value={range} onChange={setRange} options={RANGE_IDS.map(r => [r, RANGES[r].chip])} /></div>
      </header>
      <DemoBanner />
      {/* Orden del HTML = orden en el celular y del foco; en compu la grilla ubica cada tarjeta por su área */}
      <div className="pn-grid">
        <Aviso />
        <Ganancia range={range} total={t.ganancia} prev={prev.ganancia} serie={s} prevSerie={ps} />
        <Acciones />
        <Desglose t={t} sparks={sparks} />
        <Ultimos />
        <Categorias cats={cats} />
        <MasVendidos per={per} t={t} />
      </div>
      <p className="sr" role="status" id="pn-anuncio">{msg}</p>
    </>
  );
}
