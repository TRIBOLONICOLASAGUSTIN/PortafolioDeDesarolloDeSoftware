import { exigirPanel, panelMeta } from '@/lib/server/panel';
import { Precios } from '@/components/panel/precios';

export const generateMetadata = panelMeta('Lista de precios');

export default async function PanelPrecios() {
  await exigirPanel();
  return (
    <main className="wrap pn-main pn-col" id="pn-main">
      <Precios />
    </main>
  );
}
