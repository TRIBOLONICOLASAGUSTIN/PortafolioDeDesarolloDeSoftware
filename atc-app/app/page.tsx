import { headers } from 'next/headers';
import { AppShell } from '@/components/app-shell';
import { Sprites } from '@/components/sprites';
import { Nav } from '@/components/nav';
import { Ribbon } from '@/components/ribbon';
import { Hero } from '@/components/hero';
import { Values } from '@/components/values';
import { Shop } from '@/components/shop';
import { Tiers } from '@/components/tiers';
import { Service } from '@/components/service';
import { Tracker } from '@/components/tracker';
import { Estimator } from '@/components/estimator';
import { Contact, Faq, Footer, Reviews } from '@/components/info';
import { WhatsAppWidget } from '@/components/whatsapp-widget';
import { Layers } from '@/components/layers';

// Página dinámica: cada pedido trae su nonce (CSP) y el estado "abierto/cerrado" del momento.
export default async function Home() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  // Botones "Probá la demo": solo con ATC_DEMO=1 (nunca en el sitio real con clientes).
  const demo = process.env.ATC_DEMO === '1';
  return (
    <AppShell>
      <Sprites />
      <Nav />
      <Ribbon />
      <main>
        <Hero />
        <Values />
        <Shop />
        <Tiers />
        <Service />
        <Tracker demo={demo} turnstileKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} nonce={nonce} />
        <Estimator />
        <Reviews />
        <Faq />
        <Contact />
      </main>
      <Footer />
      <WhatsAppWidget />
      <Layers />
    </AppShell>
  );
}
