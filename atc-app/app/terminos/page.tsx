import type { Metadata } from 'next';
import Link from 'next/link';
import { CONFIG } from '@/lib/data/config';
import { Ejemplo, LegalPage } from '@/components/legal-page';

// Términos y condiciones de venta y servicio. BORRADOR con datos de ejemplo: lo revisa un abogado antes de producción.
// Sin plazos de reparación ni promesas que una sola persona no puede cumplir (CLAUDE.md).
export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Cómo funcionan los pedidos, los pagos, las entregas, la garantía y el arrepentimiento en AT Computación.',
  alternates: { canonical: '/terminos' },
};

export default function Terminos() {
  return (
    <LegalPage title="Términos y condiciones" updated="11 de octubre de 2026"
      lede="Las reglas de siempre, en palabras simples. El sitio no cobra nada online: los pagos se coordinan por WhatsApp.">
      <section aria-labelledby="lg-quien">
        <h2 id="lg-quien">Quién vende</h2>
        <p>AT Computación, de <Ejemplo>{CONFIG.titular}</Ejemplo>, CUIT <Ejemplo>{CONFIG.cuit}</Ejemplo>, con local en <Ejemplo>{CONFIG.address}</Ejemplo>. Te atiende el técnico, sin intermediarios.</p>
      </section>

      <section aria-labelledby="lg-precios">
        <h2 id="lg-precios">Productos, precios y stock</h2>
        <p>Los precios están en pesos argentinos y pueden cambiar sin previo aviso; vale el precio del momento en que registrás el pedido. El stock está sujeto a disponibilidad y las imágenes son ilustrativas.</p>
      </section>

      <section aria-labelledby="lg-pedido">
        <h2 id="lg-pedido">Cómo se hace un pedido</h2>
        <p>Armás tu bolsa y tocás “Finalizar pedido por WhatsApp”. El pedido queda registrado con un código (P-XXXX-XX) y te apartamos el stock por 48 horas. Por WhatsApp coordinamos el pago, la entrega y el total. Si no se paga en 48 horas, el pedido se cancela solo y el stock vuelve a estar disponible.</p>
      </section>

      <section aria-labelledby="lg-pago">
        <h2 id="lg-pago">Pagos</h2>
        <p>Efectivo, transferencia, Mercado Pago o tarjeta, a coordinar por WhatsApp. Nunca te vamos a pedir los datos de tu tarjeta por el sitio ni por chat.</p>
      </section>

      <section aria-labelledby="lg-entrega">
        <h2 id="lg-entrega">Entrega y retiro</h2>
        <p>Podés retirar en el local sin costo. Los envíos se coordinan por WhatsApp: el costo y el día se acuerdan antes de pagar.</p>
      </section>

      <section aria-labelledby="lg-garantia">
        <h2 id="lg-garantia">Garantía</h2>
        <p>Los productos tienen la garantía legal de la Ley 24.240 (artículo 11): seis meses los nuevos y tres meses los usados, además de la del fabricante cuando corresponda. Las reparaciones tienen garantía escrita de 90 días sobre el trabajo realizado.</p>
      </section>

      <section aria-labelledby="lg-arrep">
        <h2 id="lg-arrep">Arrepentimiento</h2>
        <p>Si compraste a distancia, podés arrepentirte dentro de los 10 días corridos desde que recibiste el producto (Ley 24.240, artículo 34), sin dar motivos y sin costo: el producto tiene que volver en el estado en que lo recibiste. Lo pedís desde el <Link href="/arrepentimiento">Botón de arrepentimiento</Link>.</p>
      </section>

      <section aria-labelledby="lg-servicio">
        <h2 id="lg-servicio">Servicio técnico</h2>
        <p>Antes de reparar te pasamos un presupuesto y no hacemos nada sin tu aprobación. Los tiempos dependen de cada equipo y de los repuestos: te los decimos al darte el presupuesto. Podés seguir tu orden online con el código de tu comprobante.</p>
      </section>

      <section aria-labelledby="lg-datos">
        <h2 id="lg-datos">Tus datos</h2>
        <p>Cómo los usamos y cómo pedir verlos o borrarlos está en <Link href="/privacidad">Privacidad</Link>.</p>
      </section>

      <section aria-labelledby="lg-ley">
        <h2 id="lg-ley">Reclamos</h2>
        <p>Rige la ley argentina, incluida la Ley 24.240 de Defensa del Consumidor. Si algo no salió bien, escribinos primero; también podés hacer tu reclamo en <a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor" target="_blank" rel="noopener">Defensa del Consumidor</a>.</p>
      </section>
    </LegalPage>
  );
}
