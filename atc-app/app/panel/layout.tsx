import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { panelMaqueta } from '@/lib/server/panel';
import { storeStamp } from '@/lib/hours';
import { Sprites } from '@/components/sprites';
import { PanelShell } from '@/components/panel/panel-shell';
import '../styles/14-panel.css';

// Panel del dueño (etapa 1): maqueta con datos de ejemplo. Nunca se indexa (además del X-Robots-Tag de next.config).
// Sin loading.tsx en /panel: con streaming, notFound() respondería 200 en vez de 404.
export const metadata: Metadata = {
  title: { default: 'Panel (maqueta) · AT Computación', template: '%s · Panel (maqueta) · AT Computación' },
  robots: { index: false, follow: false, nocache: true },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await panelMaqueta())) notFound();
  return (
    <>
      <Sprites />
      <PanelShell ahora={storeStamp()}>{children}</PanelShell>
    </>
  );
}
