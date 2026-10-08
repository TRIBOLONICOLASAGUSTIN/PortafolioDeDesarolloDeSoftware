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
export type TrackResult = TrackFound | { ok: false; motivo: 'no_encontrada' | 'demasiados_intentos' | 'no_disponible' | 'verificacion' };

// Órdenes DE EJEMPLO para el modo demo (solo fuera de producción y sin base): espejo de supabase/seed.sql.
const ev = (estado: OrderStatus, fecha: string, nota: string) => ({ estado, nota, fecha });
export const DEMO_ORDERS: Record<string, { tel: string; r: TrackFound }> = {
  'AT-7KQ2-9M': { tel: '321', r: { ok: true, codigo: 'AT-7KQ2-9M', equipo: 'Notebook Lenovo IdeaPad 3', cliente: 'Nicolás T.', estado: 'listo', presupuesto: 45000, garantia_hasta: '2027-01-04', novedades: [
    ev('listo', '2026-10-06T18:10:00-03:00', '¡Listo! Lo probamos 24 h con carga y batería. Podés retirarlo.'),
    ev('reparacion', '2026-10-03T11:30:00-03:00', 'Presupuesto aprobado. Reemplazamos el conector y revisamos la placa.'),
    ev('aprobacion', '2026-10-03T09:05:00-03:00', 'Te enviamos el presupuesto por WhatsApp: $45.000.'),
    ev('diagnostico', '2026-10-02T16:40:00-03:00', 'El conector de carga (DC jack) está dañado y no hace contacto.'),
    ev('ingresado', '2026-10-02T10:14:00-03:00', 'Recibimos el equipo con su cargador. Sin golpes visibles.') ] } },
  'AT-3FJ8-WX': { tel: '548', r: { ok: true, codigo: 'AT-3FJ8-WX', equipo: 'Impresora Epson L3250', cliente: 'María G.', estado: 'aprobacion', presupuesto: 38500, garantia_hasta: null, novedades: [
    ev('aprobacion', '2026-10-06T12:45:00-03:00', 'Presupuesto enviado: $38.500. Esperamos tu confirmación.'),
    ev('diagnostico', '2026-10-06T10:20:00-03:00', 'Cabezal obstruido en el color negro. Recomendamos reemplazarlo.'),
    ev('ingresado', '2026-10-05T11:02:00-03:00', 'Ingresó la impresora sin cables.') ] } },
  'AT-9TR4-6P': { tel: '777', r: { ok: true, codigo: 'AT-9TR4-6P', equipo: 'PC de escritorio', cliente: 'Diego R.', estado: 'diagnostico', presupuesto: null, garantia_hasta: null, novedades: [
    ev('diagnostico', '2026-10-07T10:05:00-03:00', 'Estamos haciendo pruebas de temperatura y de la fuente.'),
    ev('ingresado', '2026-10-07T09:30:00-03:00', 'Ingresó la PC. El cliente indica que se apaga sola al jugar.') ] } },
};
