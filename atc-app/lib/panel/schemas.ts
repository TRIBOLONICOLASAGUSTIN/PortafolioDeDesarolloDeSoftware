// Validación de lo que carga el dueño en el panel. En la maqueta valida en el navegador;
// en la etapa 2 los mismos esquemas validan en el servidor antes de guardar.
import { z } from 'zod';
import { GASTO_CATS } from './types';
import { CATS } from '@/lib/data/catalog';

const PAY = z.enum(['efectivo', 'transferencia', 'mp', 'tarjeta'], 'Elegí cómo te pagaron');
const monto = z.number('Ingresá un monto').int('Sin centavos').positive('Tiene que ser mayor a $ 0').max(100_000_000, 'Revisá el monto');
const costo = z.number('Ingresá un monto (0 si no hubo)').int('Sin centavos').min(0, 'No puede ser negativo').max(100_000_000, 'Revisá el monto');

export const ventaSchema = z.object({
  productId: z.string().min(1, 'Elegí un producto'),
  qty: z.number('Ingresá la cantidad').int().min(1, 'Al menos 1 unidad').max(999, 'Revisá la cantidad'),
  unit: monto,
  unitCost: costo,
  pay: PAY,
  note: z.string().trim().max(140, 'Hasta 140 caracteres'),
});

export const cobroSchema = z.object({
  code: z.string().min(1, 'Elegí una orden'),
  amount: monto,
  partsCost: costo,
  pay: PAY,
});

export const gastoSchema = z.object({
  cat: z.enum(GASTO_CATS.map(([c]) => c) as [string, ...string[]], 'Elegí una categoría'),
  concept: z.string().trim().min(2, 'Contá en qué fue el gasto').max(80, 'Hasta 80 caracteres'),
  amount: monto,
  pay: PAY,
  ymd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elegí una fecha'),
});

const cantidad = z.number('Ingresá la cantidad').int('Sin decimales').min(1, 'Al menos 1 unidad').max(999, 'Revisá la cantidad');
const nombre = z.string().trim().min(2, 'Escribí el nombre').max(80, 'Hasta 80 caracteres');
const umbral = z.number('Ingresá un número').int('Sin decimales').min(0, 'No puede ser negativo').max(99, 'Hasta 99');
const stock = z.number('Ingresá el stock').int('Sin decimales').min(0, 'No puede ser negativo').max(9999, 'Revisá el stock');

/** Reposición: entra mercadería (no es un gasto: su costo se resta al vender). */
export const repoSchema = z.object({
  itemId: z.string().min(1, 'Elegí qué repusiste'),
  qty: cantidad,
  unitCost: monto,
  prov: z.string().trim().max(60, 'Hasta 60 caracteres'),
});

/** Editar: el precio no existe en las piezas y el costo de una PC armada sale de sus piezas (null = no se edita). */
export const editarSchema = z.object({ name: nombre, price: monto.nullable(), cost: monto.nullable(), umbral, stock: stock.nullable() });

/** Producto nuevo (las PC armadas no: necesitan su lista de piezas). */
export const CATS_NUEVO = CATS.filter(c => c.id !== 'todo' && c.id !== 'pc');
export const nuevoSchema = z.object({
  cat: z.enum(CATS_NUEVO.map(c => c.id) as [string, ...string[]], 'Elegí una categoría'),
  brand: z.string().trim().min(1, 'Escribí la marca').max(40, 'Hasta 40 caracteres'),
  name: nombre,
  price: monto,
  cost: monto,
  stock,
  umbral,
});

/** "$ 849.999", "849999" o "849.999" → 849999. Vacío o sin números → NaN (lo marca el esquema). */
export const toInt = (s: string) => { const d = s.replace(/\D/g, ''); return d ? Number(d) : NaN; };

/** Primer mensaje de error por campo. */
export function errores(e: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of e.issues) { const k = String(i.path[0] ?? ''); if (!out[k]) out[k] = i.message; }
  return out;
}
