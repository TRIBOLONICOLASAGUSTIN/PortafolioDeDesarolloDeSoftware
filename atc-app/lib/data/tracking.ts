// Seguimiento: estados (los mismos 6 del enum public.order_status) y la forma de la respuesta de track_order.
export type OrderStatus = 'ingresado' | 'diagnostico' | 'aprobacion' | 'reparacion' | 'listo' | 'entregado';

export const STEPS: { id: OrderStatus; t: string; s?: string; ic: string; c: string }[] = [
  { id: 'ingresado', t: 'Ingresado', ic: 'package', c: 'var(--text-2)' },
  { id: 'diagnostico', t: 'Diagnóstico', ic: 'scan', c: '#5e5ce6' },
  { id: 'aprobacion', t: 'Esperando aprobación', s: 'Aprobación', ic: 'msg', c: 'var(--warn)' },
  { id: 'reparacion', t: 'En reparación', s: 'Reparación', ic: 'wrench', c: 'var(--link)' },
  { id: 'listo', t: 'Listo para retirar', s: 'Listo', ic: 'check', c: 'var(--ok)' },
  { id: 'entregado', t: 'Entregado', ic: 'bag', c: 'var(--ok)' },
];

/** Respuesta mínima de public.track_order (migración 0300, paso e). */
export type TrackFound = {
  ok: true; codigo: string; equipo: string; cliente: string; estado: OrderStatus;
  presupuesto: number | null; garantia_hasta: string | null;
  novedades: { estado: OrderStatus; nota: string | null; fecha: string }[];
};
export type TrackResult = TrackFound | { ok: false; motivo: 'no_encontrada' | 'demasiados_intentos' | 'no_disponible' | 'verificacion' | 'solicitud_invalida' | 'origen' };

/** Lo que escribió la persona → los caracteres del código: mayúsculas, sin el prefijo AT (solo si son 8), I/L → 1 y
 *  O → 0. Igual que normalize_code en la base (migración 0300); lo usan el formulario y el modo demo del servidor. */
export const cuerpoCodigo = (s: string) => {
  const v = s.toUpperCase().replace(/[^0-9A-Z]/g, '');
  return (v.length === 8 && v.startsWith('AT') ? v.slice(2) : v).replace(/[IL]/g, '1').replace(/O/g, '0');
};
