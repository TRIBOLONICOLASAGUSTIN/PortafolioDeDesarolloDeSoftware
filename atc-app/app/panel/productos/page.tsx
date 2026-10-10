import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { panelAcceso } from '@/lib/server/panel';
import { Productos } from '@/components/panel/productos';
import { CATS, PRODUCTS } from '@/lib/data/catalog';
import { ESTADOS_PROD, type EstadoProd } from '@/lib/panel/catalogo';

export async function generateMetadata(): Promise<Metadata> { return (await panelAcceso()) ? { title: 'Productos' } : {}; }

const MARCAS = new Set(PRODUCTS.map(p => p.brand));
const uno = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

export default async function PanelProductos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await panelAcceso())) notFound();
  // Solo valores conocidos: cualquier otro (o repetido) se ignora.
  const sp = await searchParams, e = uno(sp.estado), c = uno(sp.cat), m = uno(sp.marca);
  const estado: EstadoProd = ESTADOS_PROD.some(([x]) => x === e) ? (e as EstadoProd) : 'todos';
  const cat = CATS.some(x => x.id === c && x.id !== 'todo') ? c : '';
  const marca = MARCAS.has(m) ? m : '';
  return (
    <main className="wrap pn-main pn-col" id="pn-main" data-estado={estado} data-cat={cat} data-marca={marca}>
      {/* La key rearma los filtros si se llega con otros por el menú o un enlace (mismo camino, otra dirección) */}
      <Productos key={`${estado}|${cat}|${marca}`} estado={estado} cat={cat} marca={marca} />
    </main>
  );
}
