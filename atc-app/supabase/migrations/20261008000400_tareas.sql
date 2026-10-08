-- =====================================================================
-- AT Computación · Migración 0400 · Tareas programadas de retención
-- Documentación: docs/atc/seguridad.md §7 y §8.
-- Si pg_cron está instalado (en Supabase se activa desde el panel:
-- Database → Extensions), programa la limpieza. Si no, no hace nada y
-- avisa: la checklist de producción indica cómo hacerlo.
-- =====================================================================
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Todos los días a las 03:17 (hora del servidor): borra intentos de más de 30 días.
    perform cron.schedule('atc-purgar-intentos', '17 3 * * *', 'select private.purge_attempts()');
    -- Los domingos a las 03:29: anonimiza órdenes entregadas hace más de 24 meses.
    perform cron.schedule('atc-anonimizar-ordenes', '29 3 * * 0', 'select private.anonymize_closed_orders()');
  else
    raise notice 'pg_cron no está instalado: programar purge_attempts() y anonymize_closed_orders() (ver docs/atc/seguridad.md §8).';
  end if;
end
$$;
