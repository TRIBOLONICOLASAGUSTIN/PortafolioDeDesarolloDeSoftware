import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { panelMaqueta } from '@/lib/server/panel';
import { PanelHeader } from '@/components/panel/panel-header';
import { DemoBanner } from '@/components/panel/demo-banner';
import { Icon } from '@/components/ui';

export const metadata: Metadata = { title: 'Movimientos' };

const TIPOS = ['todos', 'ventas', 'reparaciones', 'gastos'] as const;
export type Tipo = (typeof TIPOS)[number];

export default async function PanelMovimientos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await panelMaqueta())) notFound();
  // Solo valores conocidos: cualquier otro (o repetido) cae en "todos".
  const q = (await searchParams).tipo;
  const tipo: Tipo = typeof q === 'string' && (TIPOS as readonly string[]).includes(q) ? (q as Tipo) : 'todos';
  return (
    <>
      <PanelHeader />
      <main className="wrap pn-main" id="pn-main" data-tipo={tipo}>
        <Link className="pn-back" href="/panel" prefetch={false}><Icon n="chev-l" cls="i sm" />Resumen</Link>
        <h1 className="pn-t" tabIndex={-1}>Movimientos</h1>
        <DemoBanner />
      </main>
    </>
  );
}
