import type { Metadata } from 'next';
import Link from 'next/link';
import { CONFIG } from '@/lib/data/config';
import '../styles/16-legal.css';

// Privacidad y cookies. El sitio solo guarda lo necesario para funcionar: por eso no hay cartel de cookies.
// Si se suma algo (medición, publicidad, otro servicio), esta página se actualiza ANTES de publicarlo.
export const metadata: Metadata = { title: 'Privacidad y cookies · AT Computación' };

const GUARDA: [string, string, string, string][] = [
  ['Tema claro u oscuro', 'atc-theme', 'Tu navegador (localStorage)', 'Hasta que lo cambies o borres los datos del sitio.'],
  ['Tu bolsa', 'atc-bag', 'Tu navegador (localStorage)', 'Los productos, la entrega y la forma de pago que elegiste. No guarda tu nombre ni tu dirección: esos datos solo van en el mensaje de WhatsApp que vos mandás (el enlace a WhatsApp, con ese mensaje, puede quedar en el historial de tu navegador; lo podés borrar desde ahí).'],
  ['Saludo de WhatsApp ya visto', 'atc-greet', 'Tu navegador (sessionStorage)', 'Se borra al cerrar la pestaña.'],
];

export default function Privacidad() {
  return (
    <div className="lg">
      <header className="lg-h">
        <div className="lg-wrap lg-h-in">
          <Link className="brand" href="/"><span className="mark" aria-hidden="true">AT</span>AT Computación</Link>
          <Link className="lg-back" href="/">Volver a la tienda</Link>
        </div>
      </header>
      <main className="lg-wrap lg-main">
        <p className="lg-eyebrow">Última actualización: 10 de octubre de 2026</p>
        <h1>Privacidad y cookies</h1>
        <p className="lg-lede">Guardamos lo mínimo para que el sitio funcione. No usamos cookies de publicidad ni de medición, y no vendemos tus datos.</p>

        <section aria-labelledby="lg-guarda">
          <h2 id="lg-guarda">Qué se guarda en tu navegador</h2>
          <ul className="lg-list">
            {GUARDA.map(([t, k, d, n]) => (
              <li key={k}>
                <div className="lg-row"><b>{t}</b><code>{k}</code></div>
                <p>{d}. {n}</p>
              </li>
            ))}
          </ul>
          <p>Podés borrar todo desde la configuración de tu navegador (datos del sitio). La tienda sigue funcionando igual.</p>
        </section>

        <section aria-labelledby="lg-cookies">
          <h2 id="lg-cookies">Cookies</h2>
          <p>Como cliente, el sitio no te guarda cookies propias. La única cookie del sitio es la de la sesión del dueño en su panel: es técnica, necesaria, y el navegador no deja que ningún script la lea.</p>
        </section>

        <section aria-labelledby="lg-terceros">
          <h2 id="lg-terceros">Servicios de otras empresas</h2>
          <p><b>WhatsApp.</b> Al tocar un botón de WhatsApp se abre la app con un mensaje armado. Lo que envíes queda sujeto a la política de privacidad de WhatsApp.</p>
          <p><b>Cloudflare Turnstile.</b> Antes de mostrar una reparación, una verificación de Cloudflare comprueba que no sea un programa automático. Puede procesar datos técnicos de tu navegador según la <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener">política de privacidad de Cloudflare</a>.</p>
        </section>

        <section aria-labelledby="lg-seguimiento">
          <h2 id="lg-seguimiento">Seguimiento de reparaciones</h2>
          <p>Para ver una orden pedimos su código y los últimos 3 dígitos del teléfono. Solo mostramos tu nombre y la inicial del apellido. Los intentos se guardan cifrados y se borran a los 30 días; las órdenes entregadas se anonimizan a los 24 meses.</p>
        </section>

        <section aria-labelledby="lg-derechos">
          <h2 id="lg-derechos">Tus derechos</h2>
          <p>Podés pedir ver, corregir o borrar tus datos escribiendo a <span className="lg-dato">{CONFIG.email}</span> <small>(dato de ejemplo)</small> o por WhatsApp.</p>
          <p className="lg-ley">El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley N.º 25.326. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N.º 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.</p>
        </section>
      </main>
    </div>
  );
}
