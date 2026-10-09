import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { panelAcceso } from '@/lib/server/panel';
import { storeStamp } from '@/lib/hours';
import { DEMO_ORDERS } from '@/lib/data/demo-orders';
import { Sprites } from '@/components/sprites';
import { PanelShell } from '@/components/panel/panel-shell';
import '../styles/14-panel.css';

// Panel del dueño: solo el superadmin con sesión (lib/server/admin.ts); para cualquier otro, 404. Montos de ejemplo hasta
// conectar la base. Nunca se indexa (además del X-Robots-Tag de next.config).
// Sin loading.tsx en /panel: con streaming, notFound() respondería 200 en vez de 404.
// La metadata depende del mismo control: en producción el 404 no deja ver que la ruta existe.
export async function generateMetadata(): Promise<Metadata> {
  if (!(await panelAcceso())) return {};
  return {
    title: { default: 'Panel (maqueta) · AT Computación', template: '%s · Panel (maqueta) · AT Computación' },
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await panelAcceso())) notFound();
  // Órdenes listas para retirar (de ejemplo; en la etapa 2, de la base). Se pasan armadas desde el servidor:
  // así las órdenes de ejemplo no terminan en el JS que descarga la tienda.
  const listas = Object.values(DEMO_ORDERS).map(o => o.r).filter(r => r.estado === 'listo').map(r => ({ codigo: r.codigo, equipo: r.equipo, presupuesto: r.presupuesto }));
  return (
    <>
      <Sprites />
      <PanelShell ahora={storeStamp()} listas={listas}>{children}</PanelShell>
    </>
  );
}
