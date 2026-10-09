'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { generar } from '@/lib/data/panel';
import { indexar, type Index } from '@/lib/panel/stats';
import type { Movement } from '@/lib/panel/types';

/* =========================================================
   Panel del dueño (maqueta): estado compartido entre Resumen y Movimientos.
   No usa AppShell (sus atajos y ventanas son de la tienda).
   "ahora" llega del servidor en hora del local: el servidor y el navegador generan los mismos datos
   de ejemplo (sin errores de hidratación).
   ========================================================= */
export type Ahora = { ymd: string; hm: string };
type Panel = { ahora: Ahora; hoy: string; ms: Movement[]; idx: Index };
const PanelCtx = createContext<Panel | null>(null);
export const usePanel = () => useContext(PanelCtx)!;

export function PanelShell({ ahora, children }: { ahora: Ahora; children: ReactNode }) {
  const { ymd, hm } = ahora;
  const value = useMemo<Panel>(() => {
    const ms = generar({ ymd, hm });
    return { ahora: { ymd, hm }, hoy: ymd, ms, idx: indexar(ms) };
  }, [ymd, hm]);
  return (
    <PanelCtx.Provider value={value}>
      <div className="pn">{children}</div>
    </PanelCtx.Provider>
  );
}
