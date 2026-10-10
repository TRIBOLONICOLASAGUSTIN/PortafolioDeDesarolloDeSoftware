'use client';

import Link from 'next/link';
import type { RefObject } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ThemeButton } from '../theme-button';
import { Icon } from '../ui';
import { Salir } from './salir';

/* =========================================================
   Navegación del panel, como la barra lateral de las apps de Apple (Música, Fotos, Configuración):
   en la compu, fija a la izquierda; en el celular y la tablet, un cajón que se abre con "Menú".
   Abajo, el mismo lugar que en la tienda: el interruptor para ir de un lado al otro.
   ========================================================= */
export type NavItem = { href: string; t: string; ic: string; n?: number };
export type NavGrupo = { t: string; items: NavItem[] };

export const NAV: NavGrupo[] = [
  { t: 'Ganancias', items: [
    { href: '/panel', t: 'Resumen', ic: 'trend-up' },
    { href: '/panel/movimientos', t: 'Movimientos', ic: 'receipt' },
  ] },
  { t: 'Catálogo', items: [
    { href: '/panel/inventario', t: 'Inventario', ic: 'package' },
  ] },
];

/** ¿Este enlace es la página actual? Resumen solo en /panel; con ?estado=, también tiene que coincidir. */
function actual(href: string, path: string, q: URLSearchParams) {
  const [p, qs] = href.split('?');
  if (p === '/panel') return path === p;
  if (!(path === p || path.startsWith(`${p}/`))) return false;
  if (!qs) return true;
  return [...new URLSearchParams(qs)].every(([k, v]) => q.get(k) === v);
}

/**
 * `cerrable`: celular y tablet (cajón). Cerrado queda inert. `onGo(actual)` avisa que se tocó un enlace:
 * el cajón se cierra y el foco va al título de la página nueva (o vuelve al botón "Menú" si era la misma).
 */
export function PanelNav({ open, cerrable, onClose, onGo, grupos = NAV }: { open: boolean; cerrable: boolean; onClose: () => void; onGo: (actual: boolean) => void; grupos?: NavGrupo[] }) {
  const path = usePathname(), q = useSearchParams();
  return (
    <nav className={`pn-nav${open ? ' open' : ''}`} id="pn-nav" aria-label="Secciones del panel" inert={cerrable && !open}>
      <div className="pn-nav-h">
        <Link className="pn-brand" href="/panel" prefetch={false} aria-label="Panel de AT Computación, resumen" onClick={() => onGo(path === '/panel')}>
          <span className="mark" aria-hidden="true">AT</span><span>Panel</span>
        </Link>
        <span className="pn-ej" title="Maqueta con datos de ejemplo">Ejemplo</span>
        {cerrable && <button type="button" className="ib pn-nav-x" aria-label="Cerrar el menú" onClick={onClose}><Icon n="x" /></button>}
      </div>
      <div className="pn-nav-g">
        {grupos.map(g => (
          <div key={g.t} className="pn-nav-sec" role="group" aria-labelledby={`pn-ng-${g.t}`}>
            <p className="pn-nav-t" id={`pn-ng-${g.t}`}>{g.t}</p>
            <ul>
              {g.items.map(it => {
                const cur = actual(it.href, path, q);
                return (
                  <li key={it.href}>
                    <Link href={it.href} prefetch={false} className="pn-nav-a" aria-current={cur ? 'page' : undefined} onClick={() => onGo(cur)}>
                      <Icon n={it.ic} /><span>{it.t}</span>
                      {it.n !== undefined && it.n > 0 && <span className="pn-nav-n" aria-label={`${it.n} ${it.n === 1 ? 'pedido' : 'pedidos'}`}>{it.n}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="pn-nav-f">
        <Link className="pn-sw" href="/" prefetch={false}><span className="mark" aria-hidden="true">AT</span>Ver la tienda</Link>
        <ThemeButton />
        <Salir />
      </div>
    </nav>
  );
}

// Barra de arriba en el celular y la tablet: menú, marca y el aviso permanente de datos de ejemplo.
export function PanelBar({ onMenu, open, btnRef }: { onMenu: () => void; open: boolean; btnRef: RefObject<HTMLButtonElement | null> }) {
  return (
    <header className="pn-mbar">
      <div className="wrap pn-mbar-in">
        <button type="button" ref={btnRef} className="ib pn-menu" aria-label="Abrir el menú" aria-controls="pn-nav" aria-expanded={open} onClick={onMenu}><Icon n="menu" /></button>
        <Link className="pn-brand" href="/panel" prefetch={false} aria-label="Panel de AT Computación, resumen">
          <span className="mark" aria-hidden="true">AT</span><span>Panel</span>
        </Link>
        <span className="pn-ej" title="Maqueta con datos de ejemplo">Ejemplo</span>
      </div>
    </header>
  );
}
