'use client';

import { useState } from 'react';
import { Icon } from '../ui';
import { DEMO_ORDERS } from '@/lib/data/tracking';
import { fmt } from '@/lib/format';

// Aviso del día (equivale a "Bitcoin is on the move" de la referencia): una reparación lista para retirar.
// Sale de las órdenes de ejemplo; en la etapa 2, de las órdenes reales en estado "listo".
export function Aviso({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const lista = Object.values(DEMO_ORDERS).map(o => o.r).find(r => r.estado === 'listo');
  if (!open || !lista) return null;
  return (
    <section className="pn-aviso" aria-labelledby="pn-aviso-h">
      <span className="pn-ic"><Icon n="check-c" /></span>
      <div>
        <h2 className="pn-aviso-t" id="pn-aviso-h">Tenés una reparación lista para retirar</h2>
        <p>{lista.equipo} · orden {lista.codigo}{lista.presupuesto ? ` · ${fmt(lista.presupuesto)}` : ''}</p>
        {children}
      </div>
      <button className="ib pn-aviso-x" type="button" aria-label="Cerrar aviso" onClick={() => setOpen(false)}><Icon n="x" /></button>
    </section>
  );
}
