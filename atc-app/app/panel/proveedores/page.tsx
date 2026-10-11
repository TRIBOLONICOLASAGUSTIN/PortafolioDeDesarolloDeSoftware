import { exigirPanel, panelMeta } from '@/lib/server/panel';
import { Proveedores } from '@/components/panel/proveedores';

export const generateMetadata = panelMeta('Proveedores');

export default async function PanelProveedores() {
  await exigirPanel();
  return (
    <main className="wrap pn-main pn-col" id="pn-main">
      <Proveedores />
    </main>
  );
}
