import { exigirPanel, panelMeta } from '@/lib/server/panel';
import { Resumen } from '@/components/panel/resumen';
import { storeStamp } from '@/lib/hours';
import { diaLargo } from '@/lib/panel/dates';

export const generateMetadata = panelMeta('Resumen');

export default async function PanelResumen() {
  await exigirPanel();
  return (
    <main className="wrap pn-main" id="pn-main">
      <Resumen fecha={diaLargo(storeStamp().ymd)} />
    </main>
  );
}
