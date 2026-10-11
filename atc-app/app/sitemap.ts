import type { MetadataRoute } from 'next';
import { PAGINAS_PUBLICAS, sitioUrl } from '@/lib/sitio';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = sitioUrl();
  return PAGINAS_PUBLICAS.map(p => ({ url: `${base}${p === '/' ? '' : p}`, changeFrequency: p === '/' ? 'weekly' : 'yearly', priority: p === '/' ? 1 : 0.3 }));
}
