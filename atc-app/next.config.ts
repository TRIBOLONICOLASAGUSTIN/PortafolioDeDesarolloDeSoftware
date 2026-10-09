import type { NextConfig } from 'next';

// Encabezados de seguridad para todas las respuestas (docs/atc/seguridad.md §5).
// La CSP con nonce la arma proxy.ts en cada pedido.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // pg queda fuera del bundle: se usa solo en el servidor (lib/server/tracking.ts).
  serverExternalPackages: ['pg'],
  reactStrictMode: true,
  // Solo en desarrollo: sin el botón flotante de Next (la vista previa se ve como el sitio real; los errores igual se muestran)
  // y con acceso desde la red local, para probar en el celular por Wi-Fi (http://192.168.x.x:3000).
  devIndicators: false,
  allowedDevOrigins: ['192.168.*.*'],
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Panel del dueño: nunca se indexa ni queda en caché (también cubre /panel).
      { source: '/panel/:path*', headers: [
        { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
      ] },
    ];
  },
};

export default nextConfig;
