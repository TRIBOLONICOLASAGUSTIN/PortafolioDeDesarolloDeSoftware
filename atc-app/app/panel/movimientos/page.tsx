import { exigirPanel, panelMeta } from '@/lib/server/panel';
import { DemoBanner } from '@/components/panel/demo-banner';
import { Movimientos, type Tipo } from '@/components/panel/movimientos';

export const generateMetadata = panelMeta('Movimientos');

const TIPOS: readonly Tipo[] = ['todos', 'ventas', 'reparaciones', 'gastos'];

export default async function PanelMovimientos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirPanel();
  // Solo valores conocidos: cualquier otro (o repetido) cae en "todos".
  const q = (await searchParams).tipo;
  const tipo: Tipo = typeof q === 'string' && (TIPOS as readonly string[]).includes(q) ? (q as Tipo) : 'todos';
  return (
    <main className="wrap pn-main pn-col" id="pn-main" data-tipo={tipo}>
      <h1 className="pn-t" tabIndex={-1}>Movimientos</h1>
      <DemoBanner />
      <Movimientos tipo={tipo} />
    </main>
  );
}
