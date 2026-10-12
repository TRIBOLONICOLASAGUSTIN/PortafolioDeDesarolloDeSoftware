import 'server-only';
import { notFound } from 'next/navigation';
import { esSuperadmin } from './admin';

// Respuesta de una dirección de /api que no existe (o que existe solo para el superadmin con sesión), para cualquier
// método: el mismo 404 vacío. Sin esto, Next contesta solo OPTIONS (204 con la lista de métodos) y 405 a los métodos
// que una ruta no tiene, y eso delata que la ruta existe (seguridad.md §5, fila 17; API-34).
// Controla la sesión aunque no la use, para que una dirección inventada tarde lo mismo que una ruta del panel.
export async function noExiste(): Promise<never> {
  await esSuperadmin();
  notFound();
}
