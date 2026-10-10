import type { NextConfig } from 'next';

// Encabezados de seguridad para todas las respuestas (docs/atc/seguridad.md §5).
// La CSP con nonce la arma proxy.ts en cada pedido.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Nada de cámara, micrófono, ubicación, pagos ni sensores: el sitio no los usa (y un script ajeno tampoco podría).
  { key: 'Permissions-Policy', value: ['accelerometer', 'autoplay', 'browsing-topics', 'camera', 'display-capture', 'encrypted-media', 'fullscreen', 'geolocation', 'gyroscope', 'hid', 'idle-detection', 'magnetometer', 'microphone', 'midi', 'payment', 'picture-in-picture', 'publickey-credentials-get', 'screen-wake-lock', 'serial', 'usb', 'xr-spatial-tracking'].map(f => `${f}=()`).join(', ') },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // Los archivos del sitio no se pueden incrustar desde otros sitios.
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
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
  // Sin cookie de sesión, /panel se atiende como una dirección inexistente: el 404 es idéntico al de cualquier otra
  // (encabezados y armado). Con una cookie (válida o no) decide el panel, que controla la firma en el servidor.
  async rewrites() {
    const missing = [{ type: 'cookie' as const, key: 'atc_s' }, { type: 'cookie' as const, key: '__Host-atc_s' }];
    // El destino usa :path* (si no, Next agrega los tramos como ?path=… y el 404 se distinguiría).
    return { beforeFiles: [{ source: '/panel', missing, destination: '/_no-existe' }, { source: '/panel/:path*', missing, destination: '/_no-existe/:path*' }], afterFiles: [], fallback: [] };
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Ingreso del superadmin: nunca se indexa ni queda en caché. El panel recibe lo mismo desde proxy.ts, y solo con
      // sesión: sin sesión su 404 tiene que ser igual al de cualquier dirección inventada.
      { source: '/ingresar', headers: [
        { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
      ] },
    ];
  },
};

export default nextConfig;
