import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { esSuperadmin } from '@/lib/server/admin';
import { AdminLogin } from '@/components/admin-login';
import '../styles/15-ingresar.css';

// Ingreso del superadmin al panel. No está enlazada desde ningún lado y nunca se indexa (también X-Robots-Tag en next.config).
export const metadata: Metadata = { title: 'Ingresar · AT Computación', robots: { index: false, follow: false, nocache: true } };

export default async function Ingresar() {
  if (await esSuperadmin()) redirect('/panel');
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <AdminLogin turnstileKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} nonce={nonce} />;
}
