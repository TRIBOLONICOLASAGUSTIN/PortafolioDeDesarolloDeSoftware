// DATOS DE EJEMPLO (maqueta del panel del dueño): proveedores inventados, con nombres genéricos y sin contactos reales.
// En la etapa 2 los carga el dueño y salen de la base. Las PC armadas no tienen proveedor: se arman en el local.
export type Proveedor = { id: string; nombre: string; rubro: string; cats: string[]; contacto: string };

export const PROVEEDORES: Proveedor[] = [
  { id: 'prov-a', nombre: 'Mayorista de informática A', rubro: 'Notebooks, componentes y piezas para armar PC', cats: ['notebooks', 'componentes', 'piezas'], contacto: 'Contacto de ejemplo (a cargar)' },
  { id: 'prov-b', nombre: 'Mayorista de impresión B', rubro: 'Impresoras, tóner y tintas', cats: ['impresoras', 'insumos'], contacto: 'Contacto de ejemplo (a cargar)' },
  { id: 'prov-c', nombre: 'Mayorista de accesorios C', rubro: 'Periféricos, redes y cables', cats: ['perifericos', 'redes'], contacto: 'Contacto de ejemplo (a cargar)' },
];

/** Proveedor habitual de una categoría (el de ejemplo), o null si se arma en el local. */
export const proveedorDe = (cat: string) => PROVEEDORES.find(p => p.cats.includes(cat))?.id ?? null;
