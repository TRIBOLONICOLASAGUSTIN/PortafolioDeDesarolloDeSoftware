'use client';

import Link from 'next/link';
import { usePanel } from './panel-shell';
import { MovRow } from './mov-row';
import { porDia } from '@/lib/panel/stats';
import { addDays } from '@/lib/panel/dates';

// Últimos movimientos (7 en compu, donde la tarjeta va al lado de "Más vendidos"; 5 en celular y tablet), con el link a la lista completa.
export function Ultimos() {
  const { idx, hoy } = usePanel();
  const last = porDia(idx, addDays(hoy, -30), hoy).flatMap(g => g.items).slice(0, 7);
  return (
    <section className="pn-card pn-ult" aria-labelledby="pn-ult-h">
      <header className="pn-ch">
        <h2 className="pn-h2" id="pn-ult-h">Últimos movimientos</h2>
        <Link className="lnk pn-all" href="/panel/movimientos" prefetch={false} aria-label="Ver todos los movimientos">Ver todos</Link>
      </header>
      <ul className="pn-movs">{last.map(m => <MovRow key={m.id} m={m} withDay />)}</ul>
    </section>
  );
}
