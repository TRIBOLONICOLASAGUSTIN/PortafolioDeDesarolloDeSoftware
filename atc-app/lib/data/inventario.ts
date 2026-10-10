// DATOS DE EJEMPLO (maqueta del panel del dueño): las piezas con las que el local arma sus PC, con su costo.
// Solo las usa el panel (la tienda solo necesita su stock: lib/data/armado.ts). En la etapa 2 salen de la base.
import { PIEZAS_STOCK } from './armado';

export type Pieza = { id: string; brand: string; name: string; icon: string; cost: number; stock: number };

const P = (id: string, brand: string, name: string, icon: string, cost: number): Pieza => ({ id, brand, name, icon, cost, stock: PIEZAS_STOCK[id] ?? 0 });

/** Piezas de la PC Oficina AT: sus costos suman el costo de la PC ($ 560.000) */
export const PIEZAS: Pieza[] = [
  P('pz-cpu-8600g', 'AMD', 'Ryzen 5 8600G', 'cpu', 230000),
  P('pz-mb-a620', 'ASRock', 'Mother A620M-HDV', 'cpu', 120000),
  P('pz-ram-16', 'Kingston', 'Memoria 16 GB DDR5 (2 × 8)', 'ram', 75000),
  P('pz-ssd-512', 'Kingston', 'SSD NVMe 512 GB', 'db', 45000),
  P('pz-psu-550', 'Thermaltake', 'Fuente 550 W 80 Plus', 'zap', 50000),
  P('pz-case-atx', 'Sentey', 'Gabinete ATX con 2 coolers', 'monitor', 40000),
];

/** Stock bajo: avisar desde estas unidades (el dueño lo cambia por producto) */
export const UMBRAL = 3;
/** Hasta cuánto se repone cada categoría (para reconstruir el historial de ejemplo) */
export const TOPE: Record<string, number> = { notebooks: 6, pc: 6, impresoras: 8, insumos: 24, perifericos: 12, redes: 40, componentes: 14, piezas: 8 };
