'use client';

import type { ReactNode } from 'react';
import { Icon } from '../ui';

// Hoja modal: abajo en el celular, centrada en la compu. Cerrada lleva inert (no recibe foco ni se lee).
export function Sheet({ open, onClose, labelledBy, children }: { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode }) {
  return (
    <>
      <div className={`pn-scrim${open ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />
      <section className={`pn-sheet${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} inert={!open}>
        <button className="ib pn-close" type="button" aria-label="Cerrar" onClick={onClose}><Icon n="x" /></button>
        <div className="pn-sheet-b">{children}</div>
      </section>
    </>
  );
}
