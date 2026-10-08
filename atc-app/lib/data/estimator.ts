// Precios y tiempos DE EJEMPLO: se muestran como orientativos (CLAUDE.md, plazos).
export const SVCS = [
  { id: 'nb', t: 'Notebook', d: 'Reparación', ic: 'laptop', min: 35000, max: 90000, time: '48 a 72 h hábiles' },
  { id: 'pc', t: 'PC de escritorio', d: 'Reparación', ic: 'monitor', min: 30000, max: 80000, time: '48 a 72 h hábiles' },
  { id: 'imp', t: 'Impresora', d: 'Reparación', ic: 'printer', min: 25000, max: 60000, time: '2 a 4 días hábiles' },
  { id: 'mant', t: 'Limpieza', d: 'Mantenimiento', ic: 'sparkles', min: 18000, max: 30000, time: '24 a 48 h hábiles' },
  { id: 'arm', t: 'Armado de PC', d: 'A medida', ic: 'cpu', min: 40000, max: 60000, time: '2 a 3 días hábiles' },
  { id: 'red', t: 'Redes / Wi-Fi', d: 'Instalación', ic: 'wifi', min: 30000, max: 80000, time: 'Coordinamos la visita' },
];
export const EXTRAS = [
  { id: 'win', t: 'Windows + drivers', v: 15000 },
  { id: 'bkp', t: 'Backup de datos', v: 12000 },
  { id: 'del', t: 'Retiro y entrega', v: 8000 },
];
export const r500 = (n: number) => Math.round(n / 500) * 500;
