// DATOS DE EJEMPLO: piezas con las que el local arma sus PC y cuántas hay de cada una. Solo ids, cantidades y stock
// (sin costos): lo usa también la tienda, porque el stock de una PC armada es cuántas se pueden armar con las piezas.
// Los nombres y costos de las piezas están en lib/data/inventario.ts (solo el panel).

/** Piezas de cada PC armada: [pieza, cantidad por PC] */
export const BOM: Record<string, [string, number][]> = {
  'pc-office': [['pz-cpu-8600g', 1], ['pz-mb-a620', 1], ['pz-ram-16', 1], ['pz-ssd-512', 1], ['pz-psu-550', 1], ['pz-case-atx', 1]],
};

/** Stock de hoy de cada pieza */
export const PIEZAS_STOCK: Record<string, number> = {
  'pz-cpu-8600g': 3, 'pz-mb-a620': 5, 'pz-ram-16': 6, 'pz-ssd-512': 8, 'pz-psu-550': 4, 'pz-case-atx': 3,
};

/** Cuántas PC se pueden armar con el stock de piezas */
export const armables = (bom: [string, number][], stockDe: (id: string) => number) =>
  Math.max(0, Math.min(...bom.map(([id, q]) => Math.floor(stockDe(id) / q))));
