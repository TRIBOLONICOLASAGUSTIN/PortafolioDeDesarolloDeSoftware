import { CONFIG } from '@/lib/data/config';
import { sitioUrl } from '@/lib/sitio';

const DIAS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

/**
 * Datos estructurados (schema.org ComputerStore) para buscadores, con los mismos datos del sitio (de ejemplo hasta que
 * el dueño pase los reales). Sin calificaciones ni reseñas: nada inventado que parezca real. Es JSON propio, escapado
 * (sin "<"), con el nonce de la CSP; el navegador no lo ejecuta.
 */
export function DatosEstructurados({ nonce }: { nonce?: string }) {
  const horarios = Object.entries(CONFIG.hours).flatMap(([d, tramos]) => tramos.map(([a, b]) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: DIAS[+d], opens: hh(a), closes: hh(b) })));
  const ld = {
    '@context': 'https://schema.org', '@type': 'ComputerStore', name: 'AT Computación', url: sitioUrl(),
    description: 'Venta de notebooks, PCs, impresoras, insumos y accesorios, y servicio técnico con presupuesto antes de reparar.',
    telephone: CONFIG.phone, email: CONFIG.email,
    address: { '@type': 'PostalAddress', streetAddress: CONFIG.addr.street, addressLocality: CONFIG.addr.city, addressRegion: CONFIG.addr.region, addressCountry: 'AR' },
    openingHoursSpecification: horarios,
  };
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />;
}
