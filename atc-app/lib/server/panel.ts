import 'server-only';
import { connection } from 'next/server';
import { esSuperadmin } from './admin';

/**
 * El panel del dueño solo existe para el superadmin con una sesión válida (lib/server/admin.ts).
 * Para cualquier otro, en cualquier entorno, /panel responde 404: no revela que existe.
 * Se evalúa en cada pedido, en el layout y en cada página (los layouts no se vuelven a evaluar al navegar).
 */
export async function panelAcceso() {
  await connection();
  return esSuperadmin();
}
