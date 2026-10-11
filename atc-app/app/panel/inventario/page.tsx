import { exigirPanel, panelMeta } from '@/lib/server/panel';
import { Inventario } from '@/components/panel/inventario';
import { FILTROS, type Filtro } from '@/lib/panel/inventario';

export const generateMetadata = panelMeta('Inventario');

export default async function PanelInventario({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirPanel();
  // Solo valores conocidos: cualquier otro (o repetido) cae en "todos".
  const q = (await searchParams).filtro;
  const filtro: Filtro = typeof q === 'string' && FILTROS.some(([f]) => f === q) ? (q as Filtro) : 'todos';
  return (
    <main className="wrap pn-main pn-col" id="pn-main" data-filtro={filtro}>
      <Inventario filtro={filtro} />
    </main>
  );
}
