import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { panelAcceso } from '@/lib/server/panel';
import { CatalogoCategorias } from '@/components/panel/catalogo-categorias';

export async function generateMetadata(): Promise<Metadata> { return (await panelAcceso()) ? { title: 'Categorías' } : {}; }

export default async function PanelCatalogoCategorias() {
  // El layout ya controla; se repite porque los layouts no se vuelven a evaluar al navegar dentro del panel.
  if (!(await panelAcceso())) notFound();
  return (
    <main className="wrap pn-main pn-col" id="pn-main">
      <CatalogoCategorias />
    </main>
  );
}
