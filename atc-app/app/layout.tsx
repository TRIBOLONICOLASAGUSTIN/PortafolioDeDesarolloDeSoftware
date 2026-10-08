import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Inter } from 'next/font/google';
import './styles/01-tokens.css';
import './styles/02-base.css';
import './styles/03-nav.css';
import './styles/04-hero.css';
import './styles/05-values.css';
import './styles/06-shop.css';
import './styles/07-story.css';
import './styles/08-tracker.css';
import './styles/09-estimator.css';
import './styles/10-info.css';
import './styles/11-overlays.css';
import './styles/12-responsive.css';

// Inter se sirve desde el propio sitio (next/font): sin pedidos a Google y compatible con la CSP.
// En Apple se ve SF Pro (-apple-system), que nunca se sirve como fuente web por su licencia.
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'AT Computación — Tienda y servicio técnico',
  description: 'Notebooks, PCs, impresoras, insumos y accesorios. Servicio técnico con presupuesto antes de reparar y seguimiento online de tu reparación.',
  // Con datos de ejemplo, el sitio no se indexa (ATC_INDEXAR=1 cuando estén los reales).
  robots: process.env.ATC_INDEXAR === '1' ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#ffffff' }, { media: '(prefers-color-scheme: dark)', color: '#000000' }],
};

// Tema antes de pintar (sin parpadeo) y clase "js" para las apariciones: patrón de la guía de Next
// (docs/01-app/02-guides/preventing-flash-before-hydration.md), con el nonce de la CSP.
const THEME = `(function(){var d=document.documentElement,t=null;try{t=localStorage.getItem('atc-theme')}catch(e){}if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.dataset.theme=t;d.classList.add('js')})()`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="es-AR" className={inter.variable} suppressHydrationWarning>
      <head>
        <script nonce={nonce} suppressHydrationWarning type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'} dangerouslySetInnerHTML={{ __html: THEME }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
