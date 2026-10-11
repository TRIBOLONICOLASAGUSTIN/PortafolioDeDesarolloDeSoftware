import { ImageResponse } from 'next/og';

// Imagen para compartir el sitio (WhatsApp, redes): fondo negro como el inicio, marca y una línea.
export const alt = 'AT Computación — Tienda y servicio técnico en Santa Fe';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 96, background: '#000', color: '#f5f5f7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ width: 96, height: 96, borderRadius: 24, background: '#f5f5f7', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontWeight: 700 }}>AT</div>
          <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -2 }}>AT Computación</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 64, fontWeight: 700, letterSpacing: -2, lineHeight: 1.1 }}>Tu tecnología. En las mejores manos.</div>
        <div style={{ marginTop: 24, fontSize: 32, color: '#a1a1a6' }}>Tienda y servicio técnico en Santa Fe</div>
      </div>
    ),
    size,
  );
}
