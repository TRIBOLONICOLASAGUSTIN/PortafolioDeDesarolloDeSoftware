import 'server-only';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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

/** Control de cada página del panel: sin sesión, 404. Se repite aunque el layout ya controla, porque los layouts no se
 * vuelven a evaluar al navegar dentro del panel. */
export async function exigirPanel() {
  if (!(await panelAcceso())) notFound();
}

/** Título de una página del panel; sin sesión, ninguno (el 404 no revela qué hay detrás). */
export const panelMeta = (title: string) => async (): Promise<Metadata> => ((await panelAcceso()) ? { title } : {});
