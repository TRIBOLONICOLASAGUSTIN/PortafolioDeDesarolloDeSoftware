import { exigirPanel, panelMeta } from '@/lib/server/panel';
import { Marcas } from '@/components/panel/marcas';

export const generateMetadata = panelMeta('Marcas');

export default async function PanelMarcas() {
  await exigirPanel();
  return (
    <main className="wrap pn-main pn-col" id="pn-main">
      <Marcas />
    </main>
  );
}
