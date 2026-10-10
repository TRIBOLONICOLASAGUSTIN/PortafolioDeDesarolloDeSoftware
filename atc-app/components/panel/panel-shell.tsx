'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { generar } from '@/lib/data/panel';
import { BOM } from '@/lib/data/armado';
import { indexar, type Index } from '@/lib/panel/stats';
import { historialBase, inventario, movsDeVenta, type Ajuste, type Inventario, type Item, type StockIn } from '@/lib/panel/inventario';
import { olvidarProductos, producto, registrarProducto } from '@/lib/panel/labels';
import type { Movement } from '@/lib/panel/types';
import { Sheets } from './sheets';
import { PanelBar, PanelNav } from './panel-nav';
import { Icon } from '../ui';

/* =========================================================
   Panel del dueño (maqueta): estado compartido entre Resumen, Movimientos e Inventario.
   No usa AppShell (sus atajos y ventanas son de la tienda).
   "ahora" llega del servidor en hora del local: el servidor y el navegador generan los mismos datos
   de ejemplo (sin errores de hidratación).
   Hojas (detalle, formularios): mientras hay una abierta, el panel queda inert (el foco no puede salir),
   Escape la cierra y el foco vuelve al botón que la abrió.
   Menú: barra lateral fija desde 1024 px; más angosto, un cajón con las mismas reglas que las hojas.
   ========================================================= */
export type Ahora = { ymd: string; hm: string };
export type Lista = { codigo: string; equipo: string; presupuesto: number | null };
export type Sheet = { t: 'detalle'; id: string } | { t: 'acciones' } | { t: 'venta'; productId?: string } | { t: 'gasto' } | { t: 'cobro'; code?: string } | { t: 'exportar' }
  | { t: 'reponer'; itemId?: string } | { t: 'editar'; itemId: string } | { t: 'nuevo' } | null;
type Panel = {
  ahora: Ahora; hoy: string; ms: Movement[]; idx: Index; byMov: Map<string, Movement>;
  sheet: Sheet; openSheet: (s: Exclude<Sheet, null>) => void; closeSheet: () => void;
  /** Lo cargado en esta visita (maqueta: no se guarda, se pierde al recargar). */
  extra: Movement[]; agregar: (m: Movement) => void; nuevoId: (prefijo: 'V' | 'R' | 'G') => string;
  toast: (msg: string) => void;
  /** Órdenes listas para retirar que todavía no se cobraron. */
  listas: Lista[];
  /** Inventario: el de ejemplo más lo cargado en esta visita (una venta descuenta stock; una PC, sus piezas). */
  inv: Inventario;
  moverStock: (e: Omit<StockIn, 'id' | 'status'>) => void;
  ajustar: (id: string, a: Ajuste) => void;
  crear: (item: Omit<Item, 'id' | 'base' | 'nuevo'>, stock: number, hm: string) => string;
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
  // Stock: lo cargado en esta visita va en un solo registro, en el orden en que se cargó (ventas, reposiciones y ajustes)
  const hist = useMemo(() => historialBase(base), [base]);
  const [log, setLog] = useState<StockIn[]>([]);
  const [ajustes, setAjustes] = useState<Record<string, Ajuste>>({});
  const [nuevos, setNuevos] = useState<Item[]>([]);
  const inv = useMemo(() => inventario(hist, ajustes, nuevos, log), [hist, ajustes, nuevos, log]);
  const agregar = useCallback((m: Movement) => {
    setExtra(x => [m, ...x]);
    if (m.kind === 'venta') setLog(l => [...l, ...movsDeVenta(m, id => BOM[id])]);
  }, []);
  const sn = useRef(0);
  const sid = useCallback((n: number) => `S-${ymd.slice(2).replaceAll('-', '')}-n${n}`, [ymd]);
  const moverStock = useCallback((e: Omit<StockIn, 'id' | 'status'>) => { const id = sid(++sn.current); setLog(l => [...l, { ...e, id, status: 'sin-guardar' }]); }, [sid]);
  const ajustar = useCallback((id: string, a: Ajuste) => {
    // El nombre nuevo se ve también en las ventas, el resumen y la planilla
    const p = producto(id);
    if (a.name && p) registrarProducto(id, { name: a.name, brand: p.brand, cat: p.cat });
    setAjustes(x => ({ ...x, [id]: { ...x[id], ...a } }));
  }, []);
  const crear = useCallback((item: Omit<Item, 'id' | 'base' | 'nuevo'>, stock: number, hm: string) => {
    const n = ++sn.current, id = `nuevo-${n}`;
    registrarProducto(id, { name: item.name, brand: item.brand, cat: item.cat });
    setNuevos(x => [...x, { ...item, id, base: 0, nuevo: true }]);
    if (stock > 0) setLog(l => [...l, { id: sid(n), itemId: id, ymd, hm, tipo: 'alta', qty: stock, status: 'sin-guardar' }]);
    return id;
  }, [ymd, sid]);
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
  useEffect(() => () => { document.documentElement.classList.remove('lock'); olvidarProductos(); }, []);
  // Menú: en celular y tablet es un cajón (cerrable); desde 1024 px, una barra fija.
  const [movil, setMovil] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const cajon = movil && navOpen;
  useEffect(() => {
    const mq = matchMedia('(max-width:1023px)');
    const ver = () => { setMovil(mq.matches); if (!mq.matches) setNavOpen(false); };
    ver();
    mq.addEventListener('change', ver);
    return () => mq.removeEventListener('change', ver);
  }, []);
  const menuBtn = useRef<HTMLButtonElement | null>(null);
  const alTitulo = useRef(false);
  const cerrarNav = useCallback(() => { setNavOpen(false); requestAnimationFrame(() => menuBtn.current?.focus()); }, []);
  // Un enlace del menú: si lleva a otra página, el foco va a su título; si es la misma, vuelve al botón "Menú".
  const onGo = useCallback((actual: boolean) => {
    if (!movil) return;
    if (actual) { cerrarNav(); return; }
    alTitulo.current = true;
    setNavOpen(false);
  }, [movil, cerrarNav]);
  useEffect(() => {
    if (!cajon) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrarNav(); };
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => document.querySelector<HTMLElement>('#pn-nav .pn-nav-a[aria-current]')?.focus() ?? document.querySelector<HTMLElement>('#pn-nav .pn-nav-x')?.focus());
    return () => document.removeEventListener('keydown', onKey);
  }, [cajon, cerrarNav]);
  // Sin scroll de fondo mientras hay una hoja o el cajón abierto
  useEffect(() => { document.documentElement.classList.toggle('lock', !!sheet || cajon); }, [sheet, cajon]);

  // Si se cambia de página (por ejemplo con "Atrás"), la hoja y el cajón se cierran.
  const path = usePathname(), search = useSearchParams().toString();
  useEffect(() => {
    closeSheet();
    setNavOpen(false);
    if (alTitulo.current) { alTitulo.current = false; requestAnimationFrame(() => document.querySelector<HTMLElement>('#pn-main .pn-t')?.focus()); }
  }, [path, search, closeSheet]);

  const value = useMemo<Panel>(() => ({ ...data, sheet, openSheet, closeSheet, extra, agregar, nuevoId, toast, listas, inv, moverStock, ajustar, crear }),
    [data, sheet, openSheet, closeSheet, extra, agregar, nuevoId, toast, listas, inv, moverStock, ajustar, crear]);
  return (
    <PanelCtx.Provider value={value}>
      <div className={`pn${cajon ? ' nav-open' : ''}`} inert={!!sheet}>
        <a className="sr pn-skip" href="#pn-main">Ir al contenido</a>
        <PanelNav open={navOpen} cerrable={movil} onClose={cerrarNav} onGo={onGo} />
        <div className="pn-nav-scrim" aria-hidden="true" onClick={cerrarNav} />
        <div className="pn-body" inert={cajon}>
          <PanelBar open={navOpen} onMenu={() => setNavOpen(true)} btnRef={menuBtn} />
          {children}
        </div>
      </div>
      <div className="pn-layer">
        <Sheets />
        <div className="toasts pn-toasts" aria-live="polite">
          {toasts.map(t => <div key={t.id} className="toast no-act"><Icon n="check-c" /><span>{t.msg}</span></div>)}
        </div>
      </div>
    </PanelCtx.Provider>
  );
}
