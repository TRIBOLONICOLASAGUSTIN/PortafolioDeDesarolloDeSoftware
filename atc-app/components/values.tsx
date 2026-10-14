import { Icon } from './ui';
import { Marquee } from './marquee';
import { MARCAS_CARRUSEL } from '@/lib/data/marcas';

const PAYMENTS: [string, string, string][] = [
  ['cash', 'Efectivo', 'En el local, al retirar.'],
  ['transfer', 'Transferencia', 'Te pasamos el alias por WhatsApp.'],
  ['zap', 'Mercado Pago', 'Con QR o link de pago.'],
  ['card', 'Débito y crédito', 'Cuotas en productos seleccionados.'],
];

export function Values() {
  return (
    <section className="sec">
      <div className="wrap">
        <div className="pay rv" role="group" aria-label="Medios de pago">
          <h2 className="pay-t" id="pay-t">Pagás como te quede más cómodo. <span>Sin vueltas.</span></h2>
          <div className="pay-grid">
            {PAYMENTS.map(([ic, b, s]) => <div key={b} className="pay-i"><span className="pay-ic"><Icon n={ic} /></span><b>{b}</b><small>{s}</small></div>)}
          </div>
        </div>
        <div className="brands rv" role="group" aria-label="Marcas con las que trabajamos">
          <p className="brands-t">Trabajamos con las marcas que ya conocés</p>
          <Marquee brands={MARCAS_CARRUSEL} />
        </div>
      </div>
    </section>
  );
}
