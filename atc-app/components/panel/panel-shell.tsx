'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { COSTOS, generar, precioEn } from '@/lib/data/panel';
import { pedidosDemo } from '@/lib/data/pedidos';
import { contar, ESTADOS, estado as estadoDe, eventosStock, REGLAS, reservado, stamp, type EstadoPedido, type Pedido, type Reglas, type Transferencia } from '@/lib/panel/pedidos';
import { BOM } from '@/lib/data/armado';
import { indexar, type Index } from '@/lib/panel/stats';
import { historialBase, inventario, movsDeVenta, type Ajuste, type Inventario, type Item, type StockIn } from '@/lib/panel/inventario';
import { olvidarProductos, producto, registrarProducto } from '@/lib/panel/labels';
import type { Movement } from '@/lib/panel/types';
import { Sheets } from './sheets';
import { NAV, PanelBar, PanelNav, type NavGrupo } from './panel-nav';
import { Icon } from '../ui';
import { bloquearScroll } from '@/lib/scroll-lock';

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
  | { t: 'reponer'; itemId?: string; prov?: string } | { t: 'editar'; itemId: string } | { t: 'nuevo' } | { t: 'pedido'; codigo: string } | null;
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
  /** Pedidos de la tienda (de ejemplo) con lo hecho en esta visita, y "ahora" como "YYYY-MM-DD HH:MM" */
  pedidos: Pedido[]; ahoraS: string; reglas: Reglas; setRetraso: (dias: number) => void;
  estadoPedido: (p: Pedido) => EstadoPedido;
  /** Unidades apartadas por pedidos pendientes */
  reservas: Map<string, number>;
  pagarPedido: (codigo: string, hm: string, t?: Transferencia) => void; entregarPedido: (codigo: string, hm: string) => void; cancelarPedido: (codigo: string, hm: string) => void;
};
const PanelCtx = createContext<Panel | null>(null);
const PED_IC: Record<string, string> = { pendiente: 'clock', pagado: 'check-c', retrasado: 'bell', autocancelado: 'refresh' };
export const usePanel = () => useContext(PanelCtx)!;

export function PanelShell({ ahora, listas: todas, children }: { ahora: Ahora; listas: Lista[]; children: ReactNode }) {
  const { ymd, hm } = ahora;
  const ahoraS = stamp(ymd, hm);
  // Pedidos de ejemplo (relativos a "ahora") y lo que el dueño hizo con ellos en esta visita
  const pedidosBase = useMemo(() => pedidosDemo({ ymd, hm }), [ymd, hm]);
  const [cambios, setCambios] = useState<Record<string, Partial<Pick<Pedido, 'pagado' | 'entregado' | 'cancelado' | 'transferencia'>>>>({});
  const pedidos = useMemo(() => pedidosBase.map(p => (cambios[p.codigo] ? { ...p, ...cambios[p.codigo] } : p)), [pedidosBase, cambios]);
  const [retrasoD, setRetraso] = useState(REGLAS.retrasoD);
  const reglas = useMemo<Reglas>(() => ({ ...REGLAS, retrasoD }), [retrasoD]);
  // Los pedidos de ejemplo ya pagados entran en Ganancias como ventas (su stock salió con la reserva)
  const base = useMemo(() => {
    const ventas: Movement[] = pedidosBase.filter(p => p.pagado).map(p => ({
      kind: 'venta', id: `V-${p.codigo}`, ymd: p.pagado!.slice(0, 10), hm: p.pagado!.slice(11, 16), pay: p.pago, status: 'cobrado', pedido: p.codigo, note: `Pedido ${p.codigo}`,
      items: p.items.map(i => ({ ...i, unitCost: precioEn(COSTOS[i.productId] ?? 0, p.pagado!.slice(0, 10)) })),
    }));
    return [...ventas, ...generar({ ymd, hm })];
  }, [ymd, hm, pedidosBase]);
  const [extra, setExtra] = useState<Movement[]>([]);
  const data = useMemo(() => {
    const ms = extra.length ? [...extra, ...base] : base;
    return { ahora: { ymd, hm }, hoy: ymd, ms, idx: indexar(ms), byMov: new Map(ms.map(m => [m.id, m])) };
  }, [ymd, hm, base, extra]);
  // Stock: lo cargado en esta visita va en un solo registro, en el orden en que se cargó (ventas, reposiciones y ajustes)
  // Lo que los pedidos le hicieron al stock: reservas y liberaciones de ejemplo; si se pagó en esta visita, la reserva
  // pasa a ser la venta. Una cancelación de esta visita entra por el registro (moverStock), no acá.
  const hist = useMemo(() => {
    const deBase = new Set(pedidosBase.flatMap(p => eventosStock(p, ahoraS, reglas)).filter(e => e.tipo === 'libera').map(e => `${e.ref}:${e.productId}`));
    const ev = pedidos.flatMap(p => eventosStock(p, ahoraS, reglas)).filter(e => e.tipo !== 'libera' || deBase.has(`${e.ref}:${e.productId}`));
    return historialBase(base, ev);
  }, [base, pedidosBase, pedidos, ahoraS, reglas]);
  const [log, setLog] = useState<StockIn[]>([]);
  const [ajustes, setAjustes] = useState<Record<string, Ajuste>>({});
  const [nuevos, setNuevos] = useState<Item[]>([]);
  const inv = useMemo(() => inventario(hist, ajustes, nuevos, log), [hist, ajustes, nuevos, log]);
  const agregar = useCallback((m: Movement) => {
    setExtra(x => [m, ...x]);
    if (m.kind === 'venta' && !m.pedido) setLog(l => [...l, ...movsDeVenta(m, id => BOM[id])]);
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

  // Pedidos (maqueta): pagar lo convierte en venta (entra en Ganancias), entregar lo cierra, cancelar devuelve el stock.
  const estadoPedido = useCallback((p: Pedido) => estadoDe(p, ahoraS, reglas), [ahoraS, reglas]);
  const reservas = useMemo(() => reservado(pedidos, ahoraS, reglas), [pedidos, ahoraS, reglas]);
  // Con una transferencia registrada, la venta va con ese medio y el nombre de quien pagó (se ve en Ganancias).
  const pagarPedido = useCallback((codigo: string, hmP: string, t?: Transferencia) => {
    const p = pedidos.find(x => x.codigo === codigo);
    if (!p || p.pagado || p.cancelado) return;
    setCambios(c => ({ ...c, [codigo]: { ...c[codigo], pagado: stamp(ymd, hmP), ...(t ? { transferencia: t } : {}) } }));
    agregar({ kind: 'venta', id: nuevoId('V'), ymd, hm: hmP, pay: t ? 'transferencia' : p.pago, status: 'sin-guardar', pedido: codigo,
      note: t ? `Pedido ${codigo} · transferencia de ${t.pagador}` : `Pedido ${codigo}`,
      items: p.items.map(i => ({ ...i, unitCost: inv.byId.get(i.productId)?.cost ?? 0 })) });
  }, [pedidos, ymd, agregar, nuevoId, inv]);
  const entregarPedido = useCallback((codigo: string, hmP: string) => setCambios(c => ({ ...c, [codigo]: { ...c[codigo], entregado: stamp(ymd, hmP) } })), [ymd]);
  const cancelarPedido = useCallback((codigo: string, hmP: string) => {
    const p = pedidos.find(x => x.codigo === codigo);
    if (!p || p.pagado || p.cancelado || estadoDe(p, ahoraS, reglas) !== 'pendiente') return;
    setCambios(c => ({ ...c, [codigo]: { ...c[codigo], cancelado: stamp(ymd, hmP) } }));
    for (const it of p.items) moverStock({ itemId: it.productId, ymd, hm: hmP, tipo: 'libera', qty: it.qty, ref: codigo, note: 'Pedido cancelado' });
  }, [pedidos, ymd, ahoraS, reglas, moverStock]);
  // Menú con los pedidos de cada estado
  const grupos = useMemo<NavGrupo[]>(() => {
    const n = contar(pedidos, ahoraS, reglas);
    return [...NAV, { t: 'Pedidos', items: ESTADOS.map(([e, t]) => ({ href: `/panel/pedidos?estado=${e}`, t, ic: PED_IC[e], n: n[e] })) }];
  }, [pedidos, ahoraS, reglas]);

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
  useEffect(() => () => { bloquearScroll(false); olvidarProductos(); }, []);
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
  useEffect(() => { bloquearScroll(!!sheet || cajon); }, [sheet, cajon]);

  // Si se cambia de página (por ejemplo con "Atrás"), la hoja y el cajón se cierran.
  const path = usePathname(), search = useSearchParams().toString();
  useEffect(() => {
    closeSheet();
    setNavOpen(false);
    if (alTitulo.current) { alTitulo.current = false; requestAnimationFrame(() => document.querySelector<HTMLElement>('#pn-main .pn-t')?.focus()); }
  }, [path, search, closeSheet]);

  const value = useMemo<Panel>(() => ({ ...data, sheet, openSheet, closeSheet, extra, agregar, nuevoId, toast, listas, inv, moverStock, ajustar, crear,
    pedidos, ahoraS, reglas, setRetraso, estadoPedido, reservas, pagarPedido, entregarPedido, cancelarPedido }),
    [data, sheet, openSheet, closeSheet, extra, agregar, nuevoId, toast, listas, inv, moverStock, ajustar, crear,
      pedidos, ahoraS, reglas, estadoPedido, reservas, pagarPedido, entregarPedido, cancelarPedido]);
  return (
    <PanelCtx.Provider value={value}>
      <div className={`pn${cajon ? ' nav-open' : ''}`} inert={!!sheet}>
        <a className="sr pn-skip" href="#pn-main">Ir al contenido</a>
        <PanelNav open={navOpen} cerrable={movil} onClose={cerrarNav} onGo={onGo} grupos={grupos} />
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
