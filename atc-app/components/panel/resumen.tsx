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
import { RANGES, delta, periodo, porCategoria, serie, totales, type RangeId } from '@/lib/panel/stats';
import { fmtMonto, fmtPct } from '@/lib/format';

// Resumen del panel: el período elegido manda en todas las tarjetas.
export function Resumen() {
  const { idx, hoy } = usePanel();
  const [range, setRange] = useState<RangeId>('30d');
  const [msg, setMsg] = useState('');
  const per = useMemo(() => periodo(range, hoy), [range, hoy]);
  const t = useMemo(() => totales(idx, per.from, per.to), [idx, per]);
  const prev = useMemo(() => totales(idx, per.prevFrom, per.prevTo), [idx, per]);
  const s = useMemo(() => serie(idx, per), [idx, per]);
  const cats = useMemo(() => porCategoria(idx, per), [idx, per]);

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
      <div className="pn-grid">
        <Aviso />
        <Ganancia range={range} onRange={setRange} total={t.ganancia} prev={prev.ganancia} serie={s} />
        <Desglose t={t} />
        <Acciones />
        <Categorias cats={cats} />
        <MasVendidos per={per} />
        <Ultimos />
      </div>
      <p className="sr" role="status" id="pn-anuncio">{msg}</p>
    </>
  );
}
