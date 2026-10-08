import { NextResponse, type NextRequest } from 'next/server';

// CSP con nonce por pedido (guía de Next 16: node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
// - Scripts: solo los que llevan el nonce de este pedido ('strict-dynamic' deja que esos carguen los suyos).
// - Estilos: hojas propias o con nonce; los atributos style="--d:.1s" necesitan 'unsafe-inline' SOLO en style-src-attr.
// - Turnstile: se habilita su iframe solo si hay clave configurada.
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const dev = process.env.NODE_ENV === 'development';
  const turnstile = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const https = !dev && process.env.ATC_LOCAL !== '1';
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? ` 'unsafe-eval'` : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `frame-src ${turnstile ? 'https://challenges.cloudflare.com' : `'none'`}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(https ? ['upgrade-insecure-requests'] : []),
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
