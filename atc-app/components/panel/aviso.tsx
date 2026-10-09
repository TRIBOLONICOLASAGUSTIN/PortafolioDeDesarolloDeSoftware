'use client';

import { useState } from 'react';
import { Icon } from '../ui';
import { usePanel } from './panel-shell';
import { fmt } from '@/lib/format';

// Aviso del día (equivale a "Bitcoin is on the move" de la referencia): una reparación lista para retirar.
// Sale de las órdenes de ejemplo; en la etapa 2, de las órdenes reales en estado "listo".
export function Aviso() {
  const { listas, openSheet } = usePanel();
  const [open, setOpen] = useState(true);
  const lista = listas[0];
  if (!open || !lista) return null;
  return (
    <section className="pn-aviso" aria-labelledby="pn-aviso-h">
      <span className="pn-ic"><Icon n="check-c" /></span>
      <div>
        <h2 className="pn-aviso-t" id="pn-aviso-h">Tenés una reparación lista para retirar</h2>
        <p>{lista.equipo} · orden {lista.codigo}{lista.presupuesto ? ` · ${fmt(lista.presupuesto)}` : ''}</p>
        <button type="button" className="pn-aviso-btn" onClick={() => openSheet({ t: 'cobro', code: lista.codigo })}>Cobrar reparación</button>
      </div>
      <button className="ib pn-aviso-x" type="button" aria-label="Cerrar aviso" onClick={() => { document.querySelector<HTMLElement>('#pn-main .pn-t')?.focus(); setOpen(false); }}><Icon n="x" /></button>
    </section>
  );
}
