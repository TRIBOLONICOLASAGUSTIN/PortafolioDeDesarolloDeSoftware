'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { generar } from '@/lib/data/panel';
import { indexar, type Index } from '@/lib/panel/stats';
import type { Movement } from '@/lib/panel/types';
import { Sheets } from './sheets';

/* =========================================================
   Panel del dueño (maqueta): estado compartido entre Resumen y Movimientos.
   No usa AppShell (sus atajos y ventanas son de la tienda).
   "ahora" llega del servidor en hora del local: el servidor y el navegador generan los mismos datos
   de ejemplo (sin errores de hidratación).
   Hojas (detalle, formularios): mientras hay una abierta, el panel queda inert (el foco no puede salir),
   Escape la cierra y el foco vuelve al botón que la abrió.
   ========================================================= */
export type Ahora = { ymd: string; hm: string };
export type Sheet = { t: 'detalle'; id: string } | null;
type Panel = {
  ahora: Ahora; hoy: string; ms: Movement[]; idx: Index; byMov: Map<string, Movement>;
  sheet: Sheet; openSheet: (s: Exclude<Sheet, null>) => void; closeSheet: () => void;
};
const PanelCtx = createContext<Panel | null>(null);
export const usePanel = () => useContext(PanelCtx)!;

export function PanelShell({ ahora, children }: { ahora: Ahora; children: ReactNode }) {
  const { ymd, hm } = ahora;
  const data = useMemo(() => {
    const ms = generar({ ymd, hm });
    return { ahora: { ymd, hm }, hoy: ymd, ms, idx: indexar(ms), byMov: new Map(ms.map(m => [m.id, m])) };
  }, [ymd, hm]);

  const [sheet, setSheet] = useState<Sheet>(null);
  const opener = useRef<HTMLElement | null>(null);
  const openRef = useRef(false);
  const openSheet = useCallback((s: Exclude<Sheet, null>) => {
    // Se guarda solo el primero de una cadena (acciones → formulario vuelve al botón original).
    if (!openRef.current) opener.current = document.activeElement as HTMLElement | null;
    openRef.current = true;
    setSheet(s);
  }, []);
  const closeSheet = useCallback(() => { openRef.current = false; setSheet(null); }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('lock', !!sheet);
    if (sheet) {
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSheet(); };
      document.addEventListener('keydown', onKey);
      // Foco adentro de la hoja: el primer campo marcado, o el botón de cerrar.
      requestAnimationFrame(() => document.querySelector<HTMLElement>('.pn-sheet.open [data-autofocus], .pn-sheet.open .pn-close')?.focus());
      return () => document.removeEventListener('keydown', onKey);
    }
    // Al cerrar, el foco vuelve a quien abrió (cuando el panel ya dejó de estar inert).
    const el = opener.current;
    if (el) requestAnimationFrame(() => { if (el.isConnected) el.focus(); opener.current = null; });
  }, [sheet, closeSheet]);
  useEffect(() => () => document.documentElement.classList.remove('lock'), []);

  const value = useMemo<Panel>(() => ({ ...data, sheet, openSheet, closeSheet }), [data, sheet, openSheet, closeSheet]);
  return (
    <PanelCtx.Provider value={value}>
      <div className="pn" inert={!!sheet}>{children}</div>
      <div className="pn-layer"><Sheets /></div>
    </PanelCtx.Provider>
  );
}
