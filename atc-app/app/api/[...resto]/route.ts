import { noExiste } from '@/lib/server/no-existe';

// Cualquier dirección de /api que no es una ruta: el mismo 404 vacío para todos los métodos, igual que las rutas del
// panel sin sesión (lib/server/no-existe.ts, API-34).
export const dynamic = 'force-dynamic';
export { noExiste as GET, noExiste as HEAD, noExiste as POST, noExiste as PUT, noExiste as PATCH, noExiste as DELETE, noExiste as OPTIONS };
