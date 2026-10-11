import { exigirPanel, panelMeta } from '@/lib/server/panel';
import { CatalogoCategorias } from '@/components/panel/catalogo-categorias';

export const generateMetadata = panelMeta('Categorías');

export default async function PanelCatalogoCategorias() {
  await exigirPanel();
  return (
    <main className="wrap pn-main pn-col" id="pn-main">
      <CatalogoCategorias />
    </main>
  );
}
