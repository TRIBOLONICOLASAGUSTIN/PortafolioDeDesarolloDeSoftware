import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { panelAcceso } from '@/lib/server/panel';
import { Pedidos } from '@/components/panel/pedidos';
import { ESTADO_IDS, type Vista } from '@/lib/panel/pedidos';

export async function generateMetadata(): Promise<Metadata> { return (await panelAcceso()) ? { title: 'Pedidos' } : {}; }

export default async function PanelPedidos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await panelAcceso())) notFound();
  // Solo estados conocidos: cualquier otro (o repetido) cae en "pendiente".
  const q = (await searchParams).estado;
  const estado: Vista = typeof q === 'string' && (ESTADO_IDS as string[]).includes(q) ? (q as Vista) : 'pendiente';
  return (
    <main className="wrap pn-main pn-col" id="pn-main" data-estado={estado}>
      <Pedidos estado={estado} />
    </main>
  );
}
