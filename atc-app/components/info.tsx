import { GoCat } from './go-cat';
import { Icon, Wa } from './ui';
import { CONFIG } from '@/lib/data/config';
import { storeNow } from '@/lib/hours';
import { vars } from '@/lib/format';

const Stars = () => <span className="stars" role="img" aria-label="5 de 5 estrellas">{[0, 1, 2, 3, 4].map(i => <Icon key={i} n="star" />)}</span>;

// Reseñas DE EJEMPLO: reemplazar por reseñas reales antes de publicar (CLAUDE.md).
const REVIEWS: [string, string, string, string][] = [
  ['“Me cambiaron el conector de carga en dos días y pude seguir todo desde la web. Súper claros con el presupuesto.”', 'LM', 'Lucía M.', 'Reparación de notebook'],
  ['“Compramos los tóners para la oficina siempre acá. Te asesoran de verdad y los precios son claros.”', 'RA', 'Estudio R&A', 'Cliente de insumos'],
  ['“Me armaron una PC para diseño dentro de mi presupuesto y me explicaron cada componente.”', 'TG', 'Tomás G.', 'PC armada a medida'],
];

export function Reviews() {
  return (
    <section className="sec" id="opiniones">
      <div className="wrap">
        <div className="head center rv">
          <h2 className="h2">Lo que dicen <span className="muted">nuestros clientes.</span></h2>
          <a className="lnk" href="#" id="reviewLink">Dejanos tu reseña en Google</a>
        </div>
        <div className="revs" data-ejemplo="reseñas de ejemplo">
          {REVIEWS.map(([q, ini, who, what], i) => (
            <figure key={ini} className="rev rv" style={i ? vars({ '--d': `${(i * .08).toFixed(2)}s` }) : undefined}>
              <Stars /><blockquote>{q}</blockquote>
              <figcaption className="who"><span className="ava">{ini}</span><div><b>{who}</b><small>{what}</small></div></figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQ: [string, string][] = [
  ['¿Cuánto tarda una reparación?', 'Depende del equipo, de la falla y de los repuestos. Al recibirlo te decimos un plazo estimado, y cada avance lo ves en el seguimiento online. Si lo necesitás para una fecha puntual, avisanos al dejarlo y te decimos con sinceridad si llegamos.'],
  ['¿El diagnóstico tiene costo?', 'Si aprobás la reparación, el diagnóstico no se cobra. Si decidís no reparar, tiene un costo mínimo que te informamos al ingresar el equipo.'],
  ['¿Cómo sigo el estado de mi equipo?', 'Con el código de tu comprobante (por ejemplo AT-7KQ2-9M) y los últimos 3 dígitos de tu teléfono, en la sección Seguimiento. También te avisamos por WhatsApp en cada cambio importante.'],
  ['¿Las reparaciones tienen garantía?', 'Sí, todas las reparaciones tienen garantía escrita de 90 días sobre el trabajo realizado y los repuestos colocados.'],
  ['¿Cómo compro en la tienda?', 'Agregá los productos a tu bolsa, elegí si lo retirás o te lo enviamos y cómo vas a pagar. Se abre WhatsApp con el pedido armado y te confirmamos stock y total. No se cobra nada online.'],
  ['¿Quién repara mi equipo?', 'El dueño del local, que es el técnico: el mismo que te atiende y te explica el diagnóstico. Si algún trabajo necesita un laboratorio especializado (por ejemplo, un disco con daño físico), te lo decimos antes de hacer nada.'],
  ['¿Qué medios de pago aceptan?', 'Efectivo, transferencia, Mercado Pago y tarjetas de débito y crédito, con cuotas en productos seleccionados.'],
];

export function Faq() {
  return (
    <section className="sec alt" id="faq">
      <div className="wrap">
        <div className="head center rv"><h2 className="h2">Preguntas frecuentes.</h2></div>
        <div className="faq rv">
          {FAQ.map(([q, a], i) => <details key={q} name="faq" open={i === 0}><summary>{q}<Icon n="plus" /></summary><p>{a}</p></details>)}
        </div>
        <p className="faq-more rv">¿Te quedó otra duda? <Wa className="lnk" text="¡Hola! Tengo una consulta: ">Escribinos por WhatsApp</Wa></p>
      </div>
    </section>
  );
}

export function Contact() {
  const today = storeNow().day;
  return (
    <section className="sec" id="contacto">
      <div className="wrap">
        <div className="head center rv"><h2 className="h2">Contacto. <span className="muted">Estamos cerca.</span></h2></div>
        <div className="contact">
          <div className="c-main rv">
            <div>
              <h3>¿Hablamos?</h3>
              <p className="lede">Escribinos por WhatsApp y te responde directamente el dueño del local. Consultas, presupuestos o el estado de tu equipo.</p>
              <div className="c-who"><span className="mark">AT</span><div><b>Te atiende el técnico, que es el dueño.</b><small>Sin call center ni intermediarios: hablás con quien repara tu equipo.</small></div></div>
            </div>
            <div>
              <div className="c-btns">
                <Wa className="btn btn-wa" text="¡Hola AT Computación! Tengo una consulta."><Icon n="wa" />Escribir por WhatsApp</Wa>
                <a className="btn btn-gray" href={`tel:${CONFIG.phone}`}><Icon n="phone" />Llamar</a>
              </div>
              <div className="c-list">
                <span><Icon n="pin" />{CONFIG.address}</span>
                <a href={`mailto:${CONFIG.email}`}><Icon n="mail" />{CONFIG.email}</a>
              </div>
            </div>
          </div>
          <div className="c-side">
            <div className="c-tile rv" style={vars({ '--d': '.08s' })}>
              <h4><Icon n="clock" />Horarios</h4>
              <ul className="hours" id="hours">{CONFIG.hoursRows.map(([l, h, ds]) => <li key={l} className={ds.includes(today) ? 'today' : ''}><span>{l}</span><span>{h}</span></li>)}</ul>
            </div>
            <div className="c-tile rv" style={vars({ '--d': '.16s' })}>
              <h4><Icon n="pin" />Cómo llegar</h4>
              <div className="map" role="img" aria-label="Mapa ilustrativo de la ubicación del local">
                <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                  <path className="wt" d="M0 160c60-10 120 20 200 8s140-30 200-20v60H0z" />
                  <rect className="pk" x="262" y="96" width="92" height="52" rx="12" />
                  <path className="rd2" d="M-10 100H410M160-10v220M320-10v220" />
                  <path className="rd" d="M-10 52H410M-10 140H410M90-10v220M240-10v220" />
                  <path className="rt" d="M20 140H90V52h150v28" />
                </svg>
                <div className="mpin"><span>AT</span></div>
              </div>
              <div className="c-row">
                <div className="socials">
                  <a className="ib" href="#" aria-label="Instagram"><Icon n="instagram" /></a>
                  <a className="ib" href="#" aria-label="Facebook"><Icon n="facebook" /></a>
                </div>
                <a className="lnk" href="https://www.google.com/maps" target="_blank" rel="noopener" style={{ fontSize: 15 }}>Abrir en Maps</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="wrap f-wrap">
        <p className="f-note">Precios en pesos argentinos, sujetos a cambios sin previo aviso. Stock sujeto a disponibilidad. Imágenes ilustrativas. El diagnóstico se bonifica si aprobás la reparación.</p>
        <div className="f-cols">
          <div>
            <a className="brand" href="#inicio"><span className="mark">AT</span>AT Computación</a>
            <p>Venta de tecnología y servicio técnico de computadoras, notebooks e impresoras en Santa Fe.</p>
          </div>
          <div><h2>Tienda</h2><ul>{[['notebooks', 'Notebooks'], ['impresoras', 'Impresoras'], ['insumos', 'Insumos'], ['perifericos', 'Periféricos'], ['componentes', 'Componentes']].map(([c, t]) => <li key={c}><GoCat cat={c}>{t}</GoCat></li>)}</ul></div>
          <div><h2>Servicio</h2><ul><li><a href="#servicio">Servicio técnico</a></li><li><a href="#seguimiento">Seguir mi reparación</a></li><li><a href="#presupuesto">Calcular presupuesto</a></li><li><a href="#faq">Preguntas frecuentes</a></li></ul></div>
          <div><h2>Visitanos</h2><ul><li>{CONFIG.address}</li><li>Lun a vie 9–13 · 16–20 h</li><li>Sábados 9–13 h</li><li><a href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a></li><li><Wa text="¡Hola AT Computación!">WhatsApp</Wa></li></ul></div>
        </div>
        <div className="f-bot">
          <div className="legal">
            <span>© {storeNow().year} AT Computación</span>
            <Wa className="regret" text="Hola, quiero arrepentirme de una compra (Botón de arrepentimiento). Mi pedido es: ">Botón de arrepentimiento</Wa>
            <a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor" target="_blank" rel="noopener">Defensa del Consumidor</a>
            <a href="/privacidad">Privacidad y cookies</a>
            <a href="#" title="Reemplazar por el QR de Data Fiscal de ARCA">Data fiscal</a>
          </div>
          <span>Santa Fe, Argentina</span>
        </div>
      </div>
    </footer>
  );
}
