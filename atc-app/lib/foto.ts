// Foto de un comprobante, redibujada en el navegador del dueño (seguridad.md §5, fila 10). Se decodifica y se vuelve a
// dibujar desde sus píxeles en un lienzo: el archivo que sale es nuevo y no puede arrastrar nada del original (ubicación,
// modelo del celular, miniaturas, videos, ni los bytes escondidos de una foto dañada). Además queda derecha (se aplica la
// orientación) y, si es grande (una foto del celular), se achica hasta que entre en 2 MB.
// Una captura de pantalla (PNG) sigue siendo PNG mientras entre en 2 MB: así el texto se lee nítido.
import { COMPROBANTE_MAX } from './comprobante';

const LADO_MAX = 2400; // px del lado más largo: un comprobante se lee perfecto y pesa poco
type Bytes = Uint8Array<ArrayBuffer>;
export type FotoRedibujada = { tipo: 'image/jpeg' | 'image/png'; datos: Bytes; ancho: number; alto: number };

function lienzo(w: number, h: number) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
async function aBlob(c: OffscreenCanvas | HTMLCanvasElement, tipo: string, calidad?: number): Promise<Blob | null> {
  if ('convertToBlob' in c) return c.convertToBlob({ type: tipo, quality: calidad }).catch(() => null);
  return new Promise(res => (c as HTMLCanvasElement).toBlob(res, tipo, calidad));
}

/** Redibuja la foto; null si el navegador no la puede leer (archivo roto o que no es una imagen). */
export async function redibujarFoto(archivo: Blob, tipo: 'image/jpeg' | 'image/png'): Promise<FotoRedibujada | null> {
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(archivo, { imageOrientation: 'from-image' }); } catch { return null; }
  try {
    if (!bmp.width || !bmp.height) return null;
    let escala = Math.min(1, LADO_MAX / Math.max(bmp.width, bmp.height));
    let salida: 'image/jpeg' | 'image/png' = tipo, calidad = 0.9;
    for (let intento = 0; intento < 8; intento++) {
      const w = Math.max(1, Math.round(bmp.width * escala)), h = Math.max(1, Math.round(bmp.height * escala));
      const c = lienzo(w, h);
      const g = c.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
      if (!g) return null;
      // Un JPEG no tiene transparencia: lo transparente de un PNG pasa a blanco (no a negro).
      if (salida === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }
      g.imageSmoothingQuality = 'high';
      g.drawImage(bmp, 0, 0, w, h);
      const blob = await aBlob(c, salida, salida === 'image/jpeg' ? calidad : undefined);
      if (!blob) return null;
      if (blob.size <= COMPROBANTE_MAX) return { tipo: salida, datos: new Uint8Array(await blob.arrayBuffer()), ancho: w, alto: h };
      // Muy pesada: una captura pasa a JPEG; un JPEG baja un poco la calidad y, si no alcanza, el tamaño.
      if (salida === 'image/png') salida = 'image/jpeg';
      else if (calidad > 0.7) calidad -= 0.1;
      else escala *= 0.8;
    }
    return null;
  } finally {
    bmp.close();
  }
}
