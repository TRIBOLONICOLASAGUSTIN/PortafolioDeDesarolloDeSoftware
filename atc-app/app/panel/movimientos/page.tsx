import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { panelAcceso } from '@/lib/server/panel';
import { PanelHeader } from '@/components/panel/panel-header';
import { DemoBanner } from '@/components/panel/demo-banner';
import { Movimientos, type Tipo } from '@/components/panel/movimientos';

export async function generateMetadata(): Promise<Metadata> { return (await panelAcceso()) ? { title: 'Movimientos' } : {}; }

const TIPOS: readonly Tipo[] = ['todos', 'ventas', 'reparaciones', 'gastos'];

export default async function PanelMovimientos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await panelAcceso())) notFound();
  // Solo valores conocidos: cualquier otro (o repetido) cae en "todos".
  const q = (await searchParams).tipo;
  const tipo: Tipo = typeof q === 'string' && (TIPOS as readonly string[]).includes(q) ? (q as Tipo) : 'todos';
  return (
    <>
      <PanelHeader />
      <main className="wrap pn-main pn-col" id="pn-main" data-tipo={tipo}>
        <h1 className="pn-t" tabIndex={-1}>Movimientos</h1>
        <DemoBanner />
        <Movimientos tipo={tipo} />
      </main>
    </>
  );
}
