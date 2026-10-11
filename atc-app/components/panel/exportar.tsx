'use client';

import { useState } from 'react';
import { Icon } from '../ui';
import { Chips } from './chips';
import { usePanel } from './panel-shell';
import { RANGES, RANGE_IDS, periodo, porDia, type RangeId } from '@/lib/panel/stats';
import { csv, descargarCsv } from '@/lib/panel/csv';

// Descarga la planilla del período elegido (se arma en el navegador: no sale nada del dispositivo).
export function Exportar() {
  const { idx, hoy, toast, closeSheet } = usePanel();
  const [range, setRange] = useState<RangeId>('30d');
  const per = periodo(range, hoy);
  const ms = porDia(idx, per.from, per.to).flatMap(g => g.items);
  const bajar = () => {
    descargarCsv(csv(ms), `atc-movimientos-EJEMPLO-${per.from}_${per.to}.csv`);
    toast('Se descargó la planilla (datos de ejemplo).');
    closeSheet();
  };
  return (
    <div className="pn-form">
      <p className="pn-hint">Planilla para abrir con Excel o mandarle a tu contador. Ahora tiene los datos de ejemplo.</p>
      <div className="pn-fld">
        <span className="pn-lab" aria-hidden="true">Período</span>
        <Chips name="pn-exp" legend="Período" value={range} onChange={setRange} options={RANGE_IDS.map(r => [r, RANGES[r].chip])} />
      </div>
      <p className="pn-prev">{ms.length} movimientos · {RANGES[range].label.toLowerCase()}</p>
      <button className="btn btn-full" type="button" onClick={bajar} data-autofocus><Icon n="download" />Descargar planilla</button>
    </div>
  );
}
