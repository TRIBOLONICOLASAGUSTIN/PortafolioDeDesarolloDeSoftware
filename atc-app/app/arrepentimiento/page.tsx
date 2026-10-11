import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';
import { Arrepentimiento as Form } from '@/components/arrepentimiento';

// Botón de arrepentimiento (Ley 24.240 art. 34 y Res. 424/2020 SCI): sin registrarse, desde el inicio del sitio.
// El sitio no guarda nada: el pedido sale por WhatsApp y el dueño responde con el código de arrepentimiento.
export const metadata: Metadata = {
  title: 'Botón de arrepentimiento',
  description: 'Arrepentite de una compra dentro de los 10 días corridos, sin dar motivos y sin costo.',
  alternates: { canonical: '/arrepentimiento' },
};

export default function Arrepentimiento() {
  return (
    <LegalPage title="Botón de arrepentimiento" updated="11 de octubre de 2026"
      lede="Tenés 10 días corridos desde que recibiste el producto para arrepentirte de la compra, sin dar motivos y sin costo.">
      <section aria-labelledby="lg-como">
        <h2 id="lg-como">Cómo pedirlo</h2>
        <p>Completá lo que tengas a mano y tocá el botón: se abre WhatsApp con el pedido armado. No hace falta registrarse. Por ley, te respondemos con un código de arrepentimiento dentro de las 24 horas y coordinamos cómo devolver el producto, en el mismo estado en que lo recibiste. Los gastos de la devolución corren por nuestra cuenta.</p>
        <Form />
      </section>
    </LegalPage>
  );
}
