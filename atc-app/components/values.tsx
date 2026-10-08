import { Icon } from './ui';
import { Marquee } from './marquee';
import { vars } from '@/lib/format';

const VALUES: [string, string, string][] = [
  ['shield', '90 días', 'de garantía escrita en cada reparación.'],
  ['check-c', 'Tu OK', 'antes de reparar: presupuesto y plazo por WhatsApp.'],
  ['user', '1 a 1', 'te atiende el técnico, sin intermediarios.'],
  ['scan', 'Online', 'seguís tu reparación paso a paso.'],
];
const PAYMENTS: [string, string, string][] = [
  ['cash', 'Efectivo', 'En el local, al retirar.'],
  ['transfer', 'Transferencia', 'Te pasamos el alias por WhatsApp.'],
  ['zap', 'Mercado Pago', 'Con QR o link de pago.'],
  ['card', 'Débito y crédito', 'Cuotas en productos seleccionados.'],
];
const BRANDS = ['HP', 'Lenovo', 'Epson', 'Brother', 'Logitech', 'Samsung', 'Kingston', 'TP-Link', 'ASUS', 'Dell', 'Canon', 'Acer', 'Western Digital', 'Redragon'];

export function Values() {
  return (
    <section className="sec" aria-label="Por qué AT Computación" style={{ paddingTop: 'clamp(64px,8vw,110px)' }}>
      <div className="wrap">
        <div className="values">
          {VALUES.map(([ic, b, p], i) => (
            <div key={b} className="val rv" style={i ? vars({ '--d': `${(i * .08).toFixed(2)}s` }) : undefined}><Icon n={ic} /><b>{b}</b><p>{p}</p></div>
          ))}
        </div>
        <div className="pay rv" role="group" aria-label="Medios de pago">
          <h3 className="pay-t">Pagás como te quede más cómodo. <span>Sin vueltas.</span></h3>
          <div className="pay-grid">
            {PAYMENTS.map(([ic, b, s]) => <div key={b} className="pay-i"><span className="pay-ic"><Icon n={ic} /></span><b>{b}</b><small>{s}</small></div>)}
          </div>
        </div>
        <div className="brands rv" role="group" aria-label="Marcas con las que trabajamos">
          <p className="brands-t">Trabajamos con las marcas que ya conocés</p>
          <Marquee brands={BRANDS} />
        </div>
      </div>
    </section>
  );
}
