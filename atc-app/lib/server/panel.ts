import 'server-only';
import { connection } from 'next/server';

/**
 * Panel del dueño, etapa 1 (maqueta con datos de ejemplo, sin base ni login).
 * Solo existe en desarrollo o con ATC_DEMO=1, que nunca se usa en el sitio real (docs/atc/seguridad.md §8).
 * En cualquier otro caso /panel da 404: falla cerrado. Se evalúa en cada pedido, no al compilar.
 * En la etapa 2 (login del dueño) esto pasa a panelMode(): 'real' | 'maqueta' | 'cerrado'.
 */
export async function panelMaqueta() {
  await connection();
  return process.env.NODE_ENV === 'development' || process.env.ATC_DEMO === '1';
}
