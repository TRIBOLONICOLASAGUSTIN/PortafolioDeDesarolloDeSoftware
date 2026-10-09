'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { generar } from '@/lib/data/panel';
import { indexar, type Index } from '@/lib/panel/stats';
import type { Movement } from '@/lib/panel/types';
import { Sheets } from './sheets';
import { Icon } from '../ui';

/* =========================================================
   Panel del dueño (maqueta): estado compartido entre Resumen y Movimientos.
   No usa AppShell (sus atajos y ventanas son de la tienda).
   "ahora" llega del servidor en hora del local: el servidor y el navegador generan los mismos datos
   de ejemplo (sin errores de hidratación).
   Hojas (detalle, formularios): mientras hay una abierta, el panel queda inert (el foco no puede salir),
   Escape la cierra y el foco vuelve al botón que la abrió.
   ========================================================= */
export type Ahora = { ymd: string; hm: string };
export type Lista = { codigo: string; equipo: string; presupuesto: number | null };
export type Sheet = { t: 'detalle'; id: string } | { t: 'acciones' } | { t: 'venta' } | { t: 'gasto' } | { t: 'cobro'; code?: string } | { t: 'exportar' } | null;
type Panel = {
  ahora: Ahora; hoy: string; ms: Movement[]; idx: Index; byMov: Map<string, Movement>;
  sheet: Sheet; openSheet: (s: Exclude<Sheet, null>) => void; closeSheet: () => void;
  /** Lo cargado en esta visita (maqueta: no se guarda, se pierde al recargar). */
  extra: Movement[]; agregar: (m: Movement) => void; nuevoId: (prefijo: 'V' | 'R' | 'G') => string;
  toast: (msg: string) => void;
  /** Órdenes listas para retirar que todavía no se cobraron. */
  listas: Lista[];
};
const PanelCtx = createContext<Panel | null>(null);
export const usePanel = () => useContext(PanelCtx)!;

export function PanelShell({ ahora, listas: todas, children }: { ahora: Ahora; listas: Lista[]; children: ReactNode }) {
  const { ymd, hm } = ahora;
  const base = useMemo(() => generar({ ymd, hm }), [ymd, hm]);
  const [extra, setExtra] = useState<Movement[]>([]);
  const data = useMemo(() => {
    const ms = extra.length ? [...extra, ...base] : base;
    return { ahora: { ymd, hm }, hoy: ymd, ms, idx: indexar(ms), byMov: new Map(ms.map(m => [m.id, m])) };
  }, [ymd, hm, base, extra]);
  const agregar = useCallback((m: Movement) => setExtra(x => [m, ...x]), []);
  // Una vez cobrada (aunque sea en la maqueta), la orden deja de estar lista.
  const listas = useMemo(() => {
    const cobradas = new Set(extra.flatMap(m => (m.kind === 'reparacion' ? [m.orderCode] : [])));
    return todas.filter(o => !cobradas.has(o.codigo));
  }, [todas, extra]);
  const nuevoId = useCallback((p: 'V' | 'R' | 'G') => `${p}-${ymd.slice(2).replaceAll('-', '')}-n${extra.length + 1}`, [ymd, extra.length]);

  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const seq = useRef(0);
  const toast = useCallback((msg: string) => {
    const id = ++seq.current;
    setToasts(t => [...t.slice(-2), { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

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
      requestAnimationFrame(() => (document.querySelector<HTMLElement>('.pn-sheet.open [data-autofocus]') ?? document.querySelector<HTMLElement>('.pn-sheet.open .pn-close'))?.focus());
      return () => document.removeEventListener('keydown', onKey);
    }
    // Al cerrar, el foco vuelve a quien abrió (cuando el panel ya dejó de estar inert).
    // Si ese botón ya no existe (por ejemplo, el aviso desaparece al cobrar), va al título de la página.
    const el = opener.current;
    if (el) requestAnimationFrame(() => { (el.isConnected ? el : document.querySelector<HTMLElement>('#pn-main .pn-t'))?.focus(); opener.current = null; });
  }, [sheet, closeSheet]);
  useEffect(() => () => document.documentElement.classList.remove('lock'), []);
  // Si se cambia de página (por ejemplo con "Atrás"), la hoja se cierra.
  const path = usePathname();
  useEffect(() => { closeSheet(); }, [path, closeSheet]);

  const value = useMemo<Panel>(() => ({ ...data, sheet, openSheet, closeSheet, extra, agregar, nuevoId, toast, listas }), [data, sheet, openSheet, closeSheet, extra, agregar, nuevoId, toast, listas]);
  return (
    <PanelCtx.Provider value={value}>
      <div className="pn" inert={!!sheet}>{children}</div>
      <div className="pn-layer">
        <Sheets />
        <div className="toasts pn-toasts" aria-live="polite">
          {toasts.map(t => <div key={t.id} className="toast no-act"><Icon n="check-c" /><span>{t.msg}</span></div>)}
        </div>
      </div>
    </PanelCtx.Provider>
  );
}
