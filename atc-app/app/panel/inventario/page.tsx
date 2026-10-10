import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { panelAcceso } from '@/lib/server/panel';
import { PanelHeader } from '@/components/panel/panel-header';
import { Inventario } from '@/components/panel/inventario';
import { FILTROS, type Filtro } from '@/lib/panel/inventario';

export async function generateMetadata(): Promise<Metadata> { return (await panelAcceso()) ? { title: 'Inventario' } : {}; }

export default async function PanelInventario({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await panelAcceso())) notFound();
  // Solo valores conocidos: cualquier otro (o repetido) cae en "todos".
  const q = (await searchParams).filtro;
  const filtro: Filtro = typeof q === 'string' && FILTROS.some(([f]) => f === q) ? (q as Filtro) : 'todos';
  return (
    <>
      <PanelHeader />
      <main className="wrap pn-main pn-col" id="pn-main" data-filtro={filtro}>
        <Inventario filtro={filtro} />
      </main>
    </>
  );
}
