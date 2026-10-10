import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { panelAcceso } from '@/lib/server/panel';
import { Proveedores } from '@/components/panel/proveedores';

export async function generateMetadata(): Promise<Metadata> { return (await panelAcceso()) ? { title: 'Proveedores' } : {}; }

export default async function PanelProveedores() {
  // El layout ya controla; se repite porque los layouts no se vuelven a evaluar al navegar dentro del panel.
  if (!(await panelAcceso())) notFound();
  return (
    <main className="wrap pn-main pn-col" id="pn-main">
      <Proveedores />
    </main>
  );
}
