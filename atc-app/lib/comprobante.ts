// Comprobantes de transferencia: qué se acepta. Lo usan el panel (vista previa) y POST /api/panel/pagos, y la base lo
// vuelve a validar (migración 20261011000200_pagos.sql). Del pago se guardan el nombre de quien pagó y el monto; el
// archivo lo ve solo el dueño y se borra a los 90 días (seguridad.md §5, fila 25).
export const COMPROBANTE_MAX = 2 * 1024 * 1024;
export const TIPOS_COMPROBANTE = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export type TipoComprobante = (typeof TIPOS_COMPROBANTE)[number];

/** El tipo sale de los primeros bytes del archivo, nunca de la extensión ni de lo que diga el navegador. */
export function tipoComprobante(b: Uint8Array): TipoComprobante | null {
  const empieza = (...xs: number[]) => b.length >= xs.length && xs.every((x, i) => b[i] === x);
  if (empieza(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (empieza(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
  if (empieza(0x25, 0x50, 0x44, 0x46, 0x2d)) return 'application/pdf';
  return null;
}
