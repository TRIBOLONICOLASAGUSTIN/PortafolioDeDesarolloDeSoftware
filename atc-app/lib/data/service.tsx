import type { ReactNode } from 'react';

// Pasos del servicio técnico (sin plazos fijos: CLAUDE.md).
export type StoryStep = {
  n: string; h: string; p: ReactNode;
  scr: { t: string; pill: [string, string]; pg: number; bub?: string; budget?: boolean; done?: boolean };
};

export const STORY: StoryStep[] = [
  { n: 'Paso 1', h: 'Lo traés al local.', p: <>Te lo recibe el técnico y te da un comprobante con tu <b>código de orden</b>. Si no podés acercarte, escribinos y lo vemos.</>,
    scr: { t: 'Recibimos tu equipo', pill: ['Ingresado', '#8e8e93'], pg: 12, bub: 'Recibimos tu notebook con su cargador. Te avisamos con el diagnóstico.' } },
  { n: 'Paso 2', h: 'Diagnóstico claro.', p: <>Encontramos la falla y te la <b>explicamos en palabras simples</b>, con fotos si hace falta.</>,
    scr: { t: 'Diagnóstico', pill: ['En revisión', '#5e5ce6'], pg: 35, bub: 'El conector de carga está dañado y no hace contacto. Te enviamos el presupuesto.' } },
  { n: 'Paso 3', h: 'Vos decidís.', p: <>Te mandamos el presupuesto por WhatsApp. <b>No tocamos nada sin tu OK.</b></>,
    scr: { t: 'Presupuesto', pill: ['Esperando tu OK', '#c75c00'], pg: 55, budget: true } },
  { n: 'Paso 4', h: 'Reparamos con repuestos de calidad.', p: <>Y lo probamos a fondo antes de entregarlo. Cada vez que el técnico actualiza la orden, <b>lo ves en la web</b>.</>,
    scr: { t: 'En reparación', pill: ['En curso', '#0071e3'], pg: 80, bub: 'Reemplazamos el conector y estamos haciendo la prueba de carga de 24 h.' } },
  { n: 'Paso 5', h: 'Listo. Con garantía escrita.', p: <>Te avisamos por WhatsApp y lo retirás con <b>90 días de garantía</b> sobre el trabajo.</>,
    scr: { t: 'Listo para retirar', pill: ['Listo', '#248a3d'], pg: 100, done: true } },
];

export const HIST: [string, string][] = [['Ingreso', '02/10 · 10:14'], ['Diagnóstico', '02/10 · 16:40'], ['Presupuesto', '03/10 · 09:05'], ['Reparación', '03/10 · 11:30'], ['Listo', '06/10 · 18:10']];

export const SERVICES: [string, string, string][] = [
  ['laptop', 'Reparación de notebooks', 'Pantallas, bisagras, teclados y conectores de carga.'],
  ['printer', 'Service de impresoras', 'Cabezales, atascos y sistemas continuos.'],
  ['refresh', 'Recarga de tóners', 'Ahorrá frente a un tóner nuevo, con la misma calidad.'],
  ['sparkles', 'Limpieza y mantenimiento', 'Pasta térmica, ventiladores y optimización.'],
  ['monitor', 'Instalación de Windows', 'Con drivers, programas y tus archivos a salvo.'],
  ['cpu', 'Armado de PC', 'Elegimos los componentes con vos.'],
  ['wifi', 'Redes y Wi-Fi', 'Cableado, routers y repetidores para casa u oficina.'],
  ['db', 'Recuperación de datos', 'Archivos borrados y backups. Si el disco tiene daño físico, te lo decimos antes.'],
];
