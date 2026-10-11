import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { panelAcceso, exigirPanel } from '@/lib/server/panel';
import { Ficha } from '@/components/panel/ficha';
import { ITEMS } from '@/lib/panel/inventario';

// Ficha de un producto desde el catálogo (la misma que en Inventario). Solo productos de ejemplo o los cargados en la
// visita (nuevo-N); las piezas viven en Inventario. Cualquier otro id: 404.
const PRODS = new Set(ITEMS.filter(i => i.tipo === 'producto').map(i => i.id));
const valido = (id: string) => PRODS.has(id) || /^nuevo-\d{1,4}$/.test(id);

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!(await panelAcceso())) return {};
  const { id } = await params;
  return valido(id) ? { title: ITEMS.find(i => i.id === id)?.name ?? 'Producto nuevo' } : {};
}

export default async function PanelProducto({ params }: Props) {
  await exigirPanel();
  const { id } = await params;
  if (!valido(id)) notFound();
  return (
    <main className="wrap pn-main" id="pn-main" data-item={id}>
      <Ficha id={id} desde="productos" />
    </main>
  );
}
