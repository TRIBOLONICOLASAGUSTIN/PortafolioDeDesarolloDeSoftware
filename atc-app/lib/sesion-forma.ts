// Forma exacta del valor de la cookie de sesión del panel: v1.<vence>.<al azar>.<firma> (lib/server/admin.ts).
// La usan admin.ts, para validar, y next.config.ts, para atender /panel como una dirección inexistente cuando la cookie
// falta o no tiene esta forma (seguridad.md §5, fila 17). Sin grupos: Next copia los grupos a los parámetros.
export const SESION_FORMA = 'v1\\.\\d{10}\\.[A-Za-z0-9_-]{16}\\.[A-Za-z0-9_-]{43}';

/** Ver o borrar un comprobante (datos bancarios del cliente) pide haber ingresado hace menos de 15 minutos: con una
 *  sesión robada más vieja no alcanza. Lo controla el servidor (lib/server/admin.ts); el panel lo usa para avisar antes. */
export const REINGRESO_MS = 15 * 60_000;
