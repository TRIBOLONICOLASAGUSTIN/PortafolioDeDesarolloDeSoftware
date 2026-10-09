'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

/* =========================================================
   Panel del dueño (maqueta): estado compartido entre Resumen y Movimientos.
   No usa AppShell (sus atajos y ventanas son de la tienda).
   "ahora" llega del servidor en hora del local: el servidor y el navegador calculan lo mismo (sin errores de hidratación).
   ========================================================= */
export type Ahora = { ymd: string; hm: string };
type Panel = { ahora: Ahora };
const PanelCtx = createContext<Panel | null>(null);
export const usePanel = () => useContext(PanelCtx)!;

export function PanelShell({ ahora, children }: { ahora: Ahora; children: ReactNode }) {
  const value = useMemo<Panel>(() => ({ ahora }), [ahora]);
  return (
    <PanelCtx.Provider value={value}>
      <div className="pn">{children}</div>
    </PanelCtx.Provider>
  );
}
