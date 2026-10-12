import type { Metadata } from 'next';
import Link from 'next/link';
import { CONFIG } from '@/lib/data/config';
import { Ejemplo, LegalPage } from '@/components/legal-page';

// Política de privacidad (Ley 25.326). Borrador con datos de ejemplo: lo revisa un abogado antes de producción.
// Si el sitio empieza a guardar algo nuevo (o suma un servicio), esta página se actualiza ANTES de publicarlo.
export const metadata: Metadata = {
  title: 'Privacidad',
  description: 'Qué datos guarda AT Computación, para qué, por cuánto tiempo y cómo pedir verlos, corregirlos o borrarlos.',
  alternates: { canonical: '/privacidad' },
};

// [dato, qué se guarda, para qué y base, cuánto tiempo]
const DATOS: [string, string, string, string][] = [
  ['Pedidos de la bolsa', 'Los productos, la forma de entrega y de pago, el código del pedido y tu nombre reducido a la inicial del apellido (si lo escribiste). La dirección nunca llega al sitio: solo va en el mensaje de WhatsApp que mandás vos.',
    'Apartar el stock y preparar tu compra. Es necesario para la compra que nos pedís.',
    'Si no se paga, se cancela solo a las 48 h. Los pedidos cerrados se anonimizan a los 24 meses.'],
  ['Pago por transferencia', 'Si pagás por transferencia y nos mandás el comprobante por WhatsApp, el técnico registra el nombre de quien pagó, el monto y el comprobante. Nunca te pedimos CBU, alias ni número de cuenta, pero el comprobante puede traerlos: lo ve solo el técnico, se guarda cifrado, no se publica y no sale del sistema. A las fotos se les quitan antes los datos ocultos (ubicación, modelo del celular).',
    'Confirmar que el pago llegó y resolver cualquier reclamo sobre ese pago.', 'El comprobante se borra a los 90 días, o antes, cuando el técnico ya lo revisó. El nombre de quien pagó, cuando el pedido se anonimiza (24 meses).'],
  ['Huella de la conexión', 'Al registrar un pedido o consultar una reparación, una huella cifrada (HMAC) de tu red, nunca la dirección IP en claro.',
    'Frenar los abusos (demasiados pedidos o intentos seguidos).', 'Se borra a los 30 días.'],
  ['Órdenes de reparación', 'Las carga el técnico cuando dejás tu equipo: tu nombre, tu teléfono, el equipo y el problema. El seguimiento online muestra solo tu nombre y la inicial del apellido.',
    'Hacer y entregar la reparación, y avisarte cómo va.', 'Las órdenes entregadas se anonimizan a los 24 meses.'],
  ['Intentos de seguimiento', 'El código que escribiste y el resultado, guardados solo como huellas cifradas.',
    'Bloquear a quien prueba códigos al azar.', 'Se borran a los 30 días.'],
];

export default function Privacidad() {
  return (
    <LegalPage title="Privacidad" updated="11 de octubre de 2026"
      lede="Guardamos lo mínimo para venderte y reparar tu equipo. No usamos publicidad ni medición, y no vendemos ni cedemos tus datos.">
      <section aria-labelledby="lg-resp">
        <h2 id="lg-resp">Quién es responsable</h2>
        <p>AT Computación, de <Ejemplo>{CONFIG.titular}</Ejemplo>, CUIT <Ejemplo>{CONFIG.cuit}</Ejemplo>, con domicilio en <Ejemplo>{CONFIG.address}</Ejemplo>. Lo atiende una sola persona: el dueño, que también es el técnico.</p>
      </section>

      <section aria-labelledby="lg-datos">
        <h2 id="lg-datos">Qué datos tratamos y para qué</h2>
        <ul className="lg-list">
          {DATOS.map(([t, que, para, cuanto]) => (
            <li key={t}>
              <div className="lg-row"><b>{t}</b></div>
              <p>{que}</p>
              <p><b>Para qué:</b> {para}</p>
              <p><b>Por cuánto tiempo:</b> {cuanto}</p>
            </li>
          ))}
        </ul>
        <p>En tu navegador quedan solo el tema elegido, tu bolsa (sin nombre ni dirección) y si ya viste el saludo de WhatsApp: el detalle está en <Link href="/cookies">Cookies</Link>.</p>
      </section>

      <section aria-labelledby="lg-terceros">
        <h2 id="lg-terceros">Quién más interviene</h2>
        <p>Usamos estos servicios para que el sitio funcione. Procesan datos por cuenta nuestra y no los usan para otra cosa:</p>
        <ul className="lg-list">
          <li><div className="lg-row"><b>Supabase</b></div><p>La base de datos donde se guardan los pedidos y las órdenes.</p></li>
          <li><div className="lg-row"><b>Upstash</b></div><p>Cuenta los intentos para frenar abusos. Solo recibe huellas cifradas, nunca tu IP ni tus datos.</p></li>
          <li><div className="lg-row"><b>Cloudflare Turnstile</b></div><p>Cuando consultás una reparación o finalizás un pedido, comprueba que no seas un programa automático. Puede procesar datos técnicos de tu navegador según la <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener">política de privacidad de Cloudflare</a>.</p></li>
          <li><div className="lg-row"><b>Hosting del sitio</b></div><p><Ejemplo>a definir</Ejemplo>: recibe los pedidos de tu navegador para mostrarte las páginas.</p></li>
          <li><div className="lg-row"><b>WhatsApp</b></div><p>Al tocar un botón de WhatsApp se abre la app con un mensaje armado. Lo que envíes queda sujeto a la política de WhatsApp.</p></li>
        </ul>
        <p>Algunos de estos servicios pueden guardar datos fuera de la Argentina. Antes de publicar el sitio, el dueño elige su región y revisa que den una protección adecuada.</p>
      </section>

      <section aria-labelledby="lg-seg">
        <h2 id="lg-seg">Cómo los cuidamos</h2>
        <p>Todo viaja cifrado. Solo el dueño entra al panel, con contraseña y un código de su celular. Las direcciones IP y los códigos que se prueban se guardan como huellas que no se pueden revertir.</p>
      </section>

      <section aria-labelledby="lg-derechos">
        <h2 id="lg-derechos">Tus derechos</h2>
        <p>Podés pedir gratis ver tus datos, corregirlos, actualizarlos o borrarlos, escribiendo a <Ejemplo>{CONFIG.email}</Ejemplo> o por WhatsApp. Te respondemos el pedido de acceso dentro de los 10 días corridos y los de corrección o borrado dentro de los 5 días hábiles (Ley 25.326, artículos 14 y 16).</p>
        <p className="lg-ley">El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley N.º 25.326. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N.º 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales. Más información en <a href="https://www.argentina.gob.ar/aaip" target="_blank" rel="noopener">argentina.gob.ar/aaip</a>.</p>
      </section>
    </LegalPage>
  );
}
