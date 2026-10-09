'use client';

import { useMemo, useState } from 'react';
import { Chips } from './chips';
import { Icon } from '../ui';
import { MovRow } from './mov-row';
import { usePanel } from './panel-shell';
import { porDia } from '@/lib/panel/stats';
import { addDays, daysBetween, labelDay } from '@/lib/panel/dates';
import { resultado, type Kind } from '@/lib/panel/types';
import { fmtMonto } from '@/lib/format';

export type Tipo = 'todos' | 'ventas' | 'reparaciones' | 'gastos';
const TIPOS: [Tipo, string][] = [['todos', 'Todos'], ['ventas', 'Ventas'], ['reparaciones', 'Reparaciones'], ['gastos', 'Gastos']];
const KIND: Record<Tipo, Kind | undefined> = { todos: undefined, ventas: 'venta', reparaciones: 'reparacion', gastos: 'gasto' };
const PASO = 30;

// Lista de movimientos (equivale a "Crypto transactions" de la referencia): filtros por tipo y días agrupados.
export function Movimientos({ tipo: inicial }: { tipo: Tipo }) {
  const { idx, hoy, ms, openSheet } = usePanel();
  const [tipo, setTipo] = useState<Tipo>(inicial);
  const [dias, setDias] = useState(PASO);
  const desde = addDays(hoy, -(dias - 1));
  const grupos = useMemo(() => porDia(idx, desde, hoy, KIND[tipo]), [idx, desde, hoy, tipo]);
  const n = grupos.reduce((a, g) => a + g.items.length, 0);
  const masViejo = ms.reduce((a, m) => (m.ymd < a ? m.ymd : a), hoy);
  const hayMas = daysBetween(masViejo, desde) > 0;

  const elegir = (t: Tipo) => {
    setTipo(t);
    // La dirección refleja el filtro (se puede compartir o volver con el navegador).
    history.replaceState(null, '', t === 'todos' ? '/panel/movimientos' : `/panel/movimientos?tipo=${t}`);
  };
  return (
    <div className="pn-movl" data-hoy={hoy}>
      <Chips name="pn-tipo" legend="Tipo de movimiento" value={tipo} onChange={elegir} options={TIPOS} />
      <div className="pn-count-r">
        <p className="pn-count" role="status">{n === 1 ? '1 movimiento' : `${n} movimientos`} en los últimos {dias} días</p>
        <button type="button" className="btn pn-reg" onClick={() => openSheet({ t: 'acciones' })}><Icon n="plus" />Registrar</button>
      </div>
      {grupos.map(g => {
        const neto = g.items.reduce((a, m) => a + resultado(m), 0);
        return (
          <section key={g.ymd} className="pn-card pn-group" data-ymd={g.ymd} aria-labelledby={`pn-d-${g.ymd}`}>
            <h2 className="pn-day" id={`pn-d-${g.ymd}`}>{labelDay(g.ymd, hoy)}</h2>
            <p className="pn-day-n">{tipo === 'gastos' ? 'Gastos del día' : 'Ganancia del día'} <b className="pn-num">{fmtMonto(neto)}</b></p>
            <ul className="pn-movs">{g.items.map(m => <MovRow key={m.id} m={m} />)}</ul>
          </section>
        );
      })}
      {!grupos.length && <p className="pn-empty">No hay movimientos de este tipo en estos días.</p>}
      {/* El botón no se desmonta al llegar al final (perdería el foco): queda desactivado */}
      <button type="button" className="btn btn-gray pn-more" aria-disabled={!hayMas || undefined} onClick={() => { if (hayMas) setDias(d => d + PASO); }}>
        {hayMas ? `Mostrar ${PASO} días más` : 'No hay movimientos más viejos'}
      </button>
    </div>
  );
}
