import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';

// Política de cookies. No hay cartel porque no hay nada opcional que aceptar: todo lo que se guarda es necesario para
// lo que pediste. Si algún día se suma medición o publicidad, primero va un aviso para elegir y después se activa.
export const metadata: Metadata = {
  title: 'Cookies',
  description: 'Qué guarda AT Computación en tu navegador y por qué no hace falta un cartel de cookies.',
  alternates: { canonical: '/cookies' },
};

// [nombre, clave, dónde, para qué y cuánto]
const GUARDA: [string, string, string, string][] = [
  ['Tema claro u oscuro', 'atc-theme', 'Tu navegador (localStorage)', 'Recuerda el tema que elegiste, hasta que lo cambies o borres los datos del sitio.'],
  ['Tu bolsa', 'atc-bag', 'Tu navegador (localStorage)', 'Los productos, la entrega y la forma de pago. Nunca tu nombre ni tu dirección. El enlace a WhatsApp, con el mensaje armado, puede quedar en el historial de tu navegador; lo podés borrar desde ahí.'],
  ['Saludo de WhatsApp ya visto', 'atc-greet', 'Tu navegador (sessionStorage)', 'Para no mostrártelo de nuevo. Se borra al cerrar la pestaña.'],
  ['Sesión del dueño', '__Host-atc_s', 'Cookie, solo en el panel del dueño', 'Mantiene abierta su sesión 8 horas. Es técnica y necesaria, y ningún script la puede leer. Como cliente, nunca la recibís.'],
];

export default function Cookies() {
  return (
    <LegalPage title="Cookies" updated="11 de octubre de 2026"
      lede="Como cliente, el sitio no te guarda cookies. No usamos cookies de publicidad ni de medición.">
      <section aria-labelledby="lg-guarda">
        <h2 id="lg-guarda">Qué se guarda y por qué</h2>
        <ul className="lg-list">
          {GUARDA.map(([t, k, d, n]) => (
            <li key={k}>
              <div className="lg-row"><b>{t}</b><code>{k}</code></div>
              <p>{d}. {n}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="lg-cartel">
        <h2 id="lg-cartel">Por qué no hay cartel de cookies</h2>
        <p>Un cartel sirve para elegir qué aceptar. Acá no hay nada opcional: lo que se guarda es necesario para lo que vos pediste (el tema, tu bolsa y el saludo) y queda en tu navegador. Si algún día sumamos algo que no sea necesario, como medición de visitas, primero vas a ver un aviso para elegir, y recién después se activa.</p>
      </section>

      <section aria-labelledby="lg-ts">
        <h2 id="lg-ts">Verificación de Cloudflare</h2>
        <p>Cuando consultás una reparación o finalizás un pedido, Cloudflare Turnstile comprueba que no seas un programa automático. Se carga solo en ese momento, no al entrar al sitio, y puede usar datos técnicos de tu navegador según la <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener">política de privacidad de Cloudflare</a>.</p>
      </section>

      <section aria-labelledby="lg-borrar">
        <h2 id="lg-borrar">Cómo borrarlo</h2>
        <p>Desde la configuración de tu navegador (datos del sitio). La tienda sigue funcionando igual: solo vuelve al tema de tu sistema y tu bolsa queda vacía.</p>
      </section>
    </LegalPage>
  );
}
