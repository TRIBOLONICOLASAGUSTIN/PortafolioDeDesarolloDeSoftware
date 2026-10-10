import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { panelAcceso } from '@/lib/server/panel';
import { PanelHeader } from '@/components/panel/panel-header';
import { Ficha } from '@/components/panel/ficha';
import { ITEM_IDS, ITEMS } from '@/lib/panel/inventario';

// Productos y piezas de ejemplo, y los cargados en esta visita (nuevo-N: viven solo en el navegador). Cualquier otro: 404.
const valido = (id: string) => ITEM_IDS.has(id) || /^nuevo-\d{1,4}$/.test(id);

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!(await panelAcceso())) return {};
  const { id } = await params;
  return valido(id) ? { title: ITEMS.find(i => i.id === id)?.name ?? 'Producto nuevo' } : {};
}

export default async function PanelFicha({ params }: Props) {
  if (!(await panelAcceso())) notFound();
  const { id } = await params;
  if (!valido(id)) notFound();
  return (
    <>
      <PanelHeader />
      <main className="wrap pn-main" id="pn-main" data-item={id}>
        <Ficha id={id} />
      </main>
    </>
  );
}
