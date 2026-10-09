'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { byId } from '@/lib/data/catalog';
import { bagCount, type BagState } from '@/lib/whatsapp';

/* =========================================================
   Interfaz: ventanas (ficha, bolsa, búsqueda), menú, WhatsApp, categoría y avisos
   ========================================================= */
export type Layer = 'qv' | 'bag' | 'spot' | null;
type ToastT = { id: number; msg: ReactNode; action?: { label: string; run: () => void }; out?: boolean };

type UI = {
  layer: Layer; qvId: string | null;
  openQV: (id: string) => void; openBag: () => void; openSpot: () => void; closeLayer: () => void;
  menuOpen: boolean; setMenu: (open: boolean) => void;
  waOpen: boolean; setWa: (open: boolean) => void;
  cat: string; setCat: (id: string) => void;
  toasts: ToastT[]; toast: (msg: ReactNode, action?: ToastT['action']) => void; endToast: (id: number) => void;
};
const UICtx = createContext<UI | null>(null);
export const useUI = () => useContext(UICtx)!;

/* =========================================================
   Bolsa: se guarda en el navegador (localStorage); se compra por WhatsApp
   ========================================================= */
type BagApi = {
  bag: BagState; count: number; bump: number;
  add: (id: string, q?: number) => void; setQty: (id: string, n: number) => void; remove: (id: string) => void;
  patch: (p: Partial<BagState>) => void;
};
const BagCtx = createContext<BagApi | null>(null);
export const useBag = () => useContext(BagCtx)!;

const EMPTY: BagState = { items: {}, entrega: 'retiro', pago: 'transferencia', nombre: '', dir: '' };
const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// Vive en hooks.ts (lo usa también el panel, que no monta AppShell).
export { useReducedMotion } from './hooks';

export function AppShell({ children }: { children: ReactNode }) {
  const [layer, setLayer] = useState<Layer>(null);
  const [qvId, setQvId] = useState<string | null>(null);
  const [menuOpen, setMenu] = useState(false);
  const [waOpen, setWa] = useState(false);
  const [cat, setCatState] = useState('todo');
  const [toasts, setToasts] = useState<ToastT[]>([]);
  const lastFocus = useRef<HTMLElement | null>(null);
  const layerRef = useRef<Layer>(null);
  layerRef.current = layer;

  const open = useCallback((l: Exclude<Layer, null>) => {
    if (!layerRef.current) lastFocus.current = document.activeElement as HTMLElement | null;
    setToasts([]); setMenu(false); setWa(false); setLayer(l);
  }, []);
  const closeLayer = useCallback(() => {
    if (!layerRef.current) return;
    setLayer(null);
    const f = lastFocus.current; lastFocus.current = null;
    requestAnimationFrame(() => f?.focus?.({ preventScroll: true }));
  }, []);
  const openQV = useCallback((id: string) => { if (byId[id]) { setQvId(id); open('qv'); } }, [open]);
  const openBag = useCallback(() => open('bag'), [open]);
  const openSpot = useCallback(() => open('spot'), [open]);
  const setCat = useCallback((id: string) => setCatState(id), []);

  const nextToast = useRef(0);
  const toast = useCallback((msg: ReactNode, action?: ToastT['action']) => {
    const id = ++nextToast.current;
    setToasts(t => [...t, { id, msg, action }]);
    setTimeout(() => setToasts(t => t.map(x => (x.id === id ? { ...x, out: true } : x))), 3200);
  }, []);
  const endToast = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), []);

  /* Bolsa */
  const [bag, setBag] = useState<BagState>(EMPTY);
  const [bump, setBump] = useState(0);
  const loaded = useRef(false);
  useEffect(() => {
    const saved = { ...EMPTY, ...store.get<Partial<BagState>>('atc-bag', {}) };
    // Se descartan productos que ya no existen o no tienen stock.
    saved.items = Object.fromEntries(Object.entries(saved.items ?? {}).filter(([id]) => byId[id] && byId[id].stock > 0));
    setBag(saved); loaded.current = true;
  }, []);
  useEffect(() => { if (loaded.current) store.set('atc-bag', bag); }, [bag]);

  const add = useCallback((id: string, q = 1) => {
    const p = byId[id]; if (!p || p.stock <= 0) return;
    const cur = bag.items[id] || 0;
    if (cur >= p.stock) { toast('Ya tenés en tu bolsa todo el stock de este producto.'); return; }
    setBag(b => ({ ...b, items: { ...b.items, [id]: Math.min(p.stock, cur + q) } }));
    setBump(n => n + 1);
    toast(<><b>{p.name}</b> se agregó a tu bolsa</>, { label: 'Ver bolsa', run: () => open('bag') });
  }, [bag.items, toast, open]);
  const setQty = useCallback((id: string, n: number) => setBag(b => {
    const items = { ...b.items };
    if (n <= 0) delete items[id]; else items[id] = Math.min(n, byId[id].stock);
    return { ...b, items };
  }), []);
  const remove = useCallback((id: string) => setBag(b => { const items = { ...b.items }; delete items[id]; return { ...b, items }; }), []);
  const patch = useCallback((p: Partial<BagState>) => setBag(b => ({ ...b, ...p })), []);

  /* Estado visual global: bloqueo de scroll y clases del body que usa el CSS */
  useEffect(() => { document.documentElement.classList.toggle('lock', !!layer || menuOpen); }, [layer, menuOpen]);
  useEffect(() => { document.body.classList.toggle('menu-open', menuOpen); }, [menuOpen]);
  useEffect(() => { document.body.classList.toggle('wa-open', waOpen); }, [waOpen]);

  /* Teclado: Ctrl/⌘+K y "/" abren la búsqueda; Escape cierra todo; Tab queda dentro de la ventana abierta */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const l = layerRef.current;
      if (e.key === 'Tab' && l) {
        const el = document.getElementById(l);
        const f = el ? [...el.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input,select,textarea')].filter(x => x.offsetParent !== null) : [];
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); l === 'spot' ? closeLayer() : open('spot');
      } else if (e.key === '/' && !l && !/input|textarea|select/i.test((document.activeElement as HTMLElement)?.tagName ?? '')) {
        e.preventDefault(); open('spot');
      } else if (e.key === 'Escape') {
        closeLayer(); setMenu(false); setWa(false);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open, closeLayer]);

  /* Apariciones una sola vez (.rv → .in) y FAQ exclusiva en navegadores sin <details name> */
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.rv:not(.in)').forEach(el => io.observe(el));
    const onToggle = (e: Event) => {
      const d = e.target as HTMLDetailsElement;
      if (d.matches?.('.faq details') && d.open) document.querySelectorAll<HTMLDetailsElement>('.faq details').forEach(o => { if (o !== d) o.open = false; });
    };
    document.addEventListener('toggle', onToggle, true);
    return () => { io.disconnect(); document.removeEventListener('toggle', onToggle, true); };
  }, []);

  const ui = useMemo<UI>(() => ({ layer, qvId, openQV, openBag, openSpot, closeLayer, menuOpen, setMenu, waOpen, setWa, cat, setCat, toasts, toast, endToast }),
    [layer, qvId, openQV, openBag, openSpot, closeLayer, menuOpen, waOpen, cat, setCat, toasts, toast, endToast]);
  const bagApi = useMemo<BagApi>(() => ({ bag, count: bagCount(bag), bump, add, setQty, remove, patch }), [bag, bump, add, setQty, remove, patch]);

  return <UICtx.Provider value={ui}><BagCtx.Provider value={bagApi}>{children}</BagCtx.Provider></UICtx.Provider>;
}
