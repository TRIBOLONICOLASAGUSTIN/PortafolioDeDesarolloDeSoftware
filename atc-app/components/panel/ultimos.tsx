'use client';

import Link from 'next/link';
import { usePanel } from './panel-shell';
import { MovRow } from './mov-row';
import { porDia } from '@/lib/panel/stats';
import { addDays } from '@/lib/panel/dates';

// Últimos 5 movimientos, con el link a la lista completa.
export function Ultimos() {
  const { idx, hoy } = usePanel();
  const last = porDia(idx, addDays(hoy, -30), hoy).flatMap(g => g.items).slice(0, 5);
  return (
    <section className="pn-card pn-ult" aria-labelledby="pn-ult-h">
      <h2 className="pn-h2" id="pn-ult-h">Últimos movimientos</h2>
      <ul className="pn-movs">{last.map(m => <MovRow key={m.id} m={m} withDay />)}</ul>
      <Link className="lnk pn-all" href="/panel/movimientos" prefetch={false}>Ver todos los movimientos</Link>
    </section>
  );
}
