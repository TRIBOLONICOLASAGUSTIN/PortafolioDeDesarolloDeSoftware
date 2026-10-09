import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { panelAcceso } from '@/lib/server/panel';
import { PanelHeader } from '@/components/panel/panel-header';
import { Resumen } from '@/components/panel/resumen';
import { storeStamp } from '@/lib/hours';
import { diaLargo } from '@/lib/panel/dates';

export async function generateMetadata(): Promise<Metadata> { return (await panelAcceso()) ? { title: 'Resumen' } : {}; }

export default async function PanelResumen() {
  // El layout ya controla; se repite porque los layouts no se vuelven a evaluar al navegar dentro del panel.
  if (!(await panelAcceso())) notFound();
  return (
    <>
      <PanelHeader />
      <main className="wrap pn-main" id="pn-main">
        <Resumen fecha={diaLargo(storeStamp().ymd)} />
      </main>
    </>
  );
}
