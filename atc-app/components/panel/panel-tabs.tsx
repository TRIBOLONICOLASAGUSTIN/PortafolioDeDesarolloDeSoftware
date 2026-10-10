'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '../ui';

const TABS: [string, string, string][] = [['/panel', 'Resumen', 'trend-up'], ['/panel/movimientos', 'Movimientos', 'receipt'], ['/panel/inventario', 'Inventario', 'package']];

// Secciones del panel: en la compu, en la barra de arriba; en el celular, abajo (como la barra de pestañas de iOS).
export function PanelTabs() {
  const path = usePathname();
  return (
    <nav className="pn-tabs" aria-label="Secciones del panel">
      {TABS.map(([h, t, ic]) => {
        const actual = h === '/panel' ? path === h : path.startsWith(h);
        return <Link key={h} href={h} prefetch={false} className="pn-tab" aria-current={actual ? 'page' : undefined}><Icon n={ic} /><span>{t}</span></Link>;
      })}
    </nav>
  );
}
