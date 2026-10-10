-- atc_tracker con tope de conexiones (seguridad.md §5 fila 4 y §9).
-- Si su contraseña se filtra, quien la tenga se saltea Turnstile, Upstash y el límite por IP del servidor, y sus
-- timeouts los puede cambiar con SET en su sesión: el tope es lo que impide que agote las conexiones de la base.
-- 10 alcanza para el servidor legítimo (pool de 3 por instancia, lib/server/tracking.ts) y las reconexiones.
-- No aplica a superusuarios; atc_tracker no lo es.
alter role atc_tracker connection limit 10;
