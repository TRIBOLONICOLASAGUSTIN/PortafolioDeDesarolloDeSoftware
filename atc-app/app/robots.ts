import type { MetadataRoute } from 'next';
import { indexar, sitioUrl } from '@/lib/sitio';

// Se arma en cada pedido: ATC_INDEXAR decide sin volver a compilar. Nunca nombra /panel ni /ingresar (eso revelaría
// que existen); esas rutas ya dan 404 sin sesión y llevan noindex.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  if (!indexar()) return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/' }, sitemap: `${sitioUrl()}/sitemap.xml` };
}
