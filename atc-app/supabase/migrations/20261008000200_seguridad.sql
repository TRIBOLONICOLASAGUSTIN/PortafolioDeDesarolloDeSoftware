-- =====================================================================
-- AT Computación · Migración 0200 · Permisos y Row Level Security
-- Documentación: docs/atc/seguridad.md §4 (matriz de permisos) y §5.
-- Pruebas: RLS-1 … RLS-7, FN-1 … FN-3 (tests/db/seguridad.test.mjs).
--
-- Principio: TODO cerrado por defecto y se abre solo lo necesario.
-- Supabase concede ALL a anon/authenticated sobre lo que se crea en
-- public, y Postgres concede EXECUTE a PUBLIC sobre toda función nueva:
-- acá se revoca todo eso explícitamente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Row Level Security en todas las tablas.
--    Se usa ENABLE sin FORCE a propósito: las funciones SECURITY DEFINER
--    (is_owner, track_order) pertenecen al mismo rol dueño de las tablas
--    y necesitan leerlas sin depender de si ese rol tiene BYPASSRLS en el
--    proveedor. Ningún rol del API es dueño de tablas (prueba RLS-1), así
--    que para anon/authenticated la RLS rige siempre.
-- ---------------------------------------------------------------------
alter table public.settings     enable row level security;
alter table public.products     enable row level security;
alter table public.orders       enable row level security;
alter table public.order_events enable row level security;

-- ---------------------------------------------------------------------
-- 2) Cerrar todo lo que vino abierto de fábrica.
-- ---------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- Lo que se cree en el futuro también nace cerrado.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
-- El EXECUTE para PUBLIC es un default global de Postgres: se quita globalmente
-- para las funciones que cree este rol (el que corre las migraciones).
alter default privileges revoke execute on functions from public;

-- ---------------------------------------------------------------------
-- 3) is_owner(): ¿la sesión es del dueño del local?
--    SECURITY DEFINER para leer settings sin depender de la RLS de
--    settings (que a su vez usa is_owner: así no hay recursión).
--    search_path fijo: nadie puede "colar" un objeto con el mismo nombre.
-- ---------------------------------------------------------------------
create function public.is_owner() returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1
      from public.settings s
     where s.id = 1
       and s.owner_user_id is not null
       and s.owner_user_id = auth.uid()
  )
$$;
revoke all on function public.is_owner() from public, anon, authenticated;
grant execute on function public.is_owner() to authenticated;

-- ---------------------------------------------------------------------
-- 4) Permisos mínimos por tabla (la RLS filtra encima de esto).
-- ---------------------------------------------------------------------
-- Catálogo: lo ve cualquiera; solo el dueño lo modifica (RLS).
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

-- Órdenes y novedades: nada para anon. Para authenticated, la RLS deja
-- pasar solo al dueño. Las novedades no se editan ni se borran: sin
-- UPDATE/DELETE ni siquiera para el dueño (bitácora inmutable).
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert on public.order_events to authenticated;

-- Configuración: el dueño solo puede cambiar el nombre del negocio.
-- owner_user_id NO se puede tocar desde el API (permiso por columna):
-- transferir la propiedad requiere el panel de Supabase.
grant select on public.settings to authenticated;
grant update (business_name) on public.settings to authenticated;

-- Las funciones de triggers no necesitan EXECUTE para quien escribe
-- (Postgres lo controla al crear el trigger): quedan revocadas.

-- ---------------------------------------------------------------------
-- 5) Políticas RLS.
-- ---------------------------------------------------------------------
create policy products_read_active on public.products
  for select to anon, authenticated
  using (active);

create policy products_owner_all on public.products
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy orders_owner_all on public.orders
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy order_events_owner_select on public.order_events
  for select to authenticated
  using (public.is_owner());

-- El autor de la novedad queda registrado y no se puede falsear.
create policy order_events_owner_insert on public.order_events
  for insert to authenticated
  with check (public.is_owner() and created_by = auth.uid());

create policy settings_owner_select on public.settings
  for select to authenticated
  using (public.is_owner());

create policy settings_owner_update on public.settings
  for update to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ---------------------------------------------------------------------
-- 6) Rol del servidor para el seguimiento: atc_tracker.
--    Sin acceso a ninguna tabla; solo podrá ejecutar track_order
--    (se concede en la migración 0300). Nace SIN LOGIN: la contraseña se
--    activa en producción a mano y nunca se guarda en el repo
--    (seguridad.md §8). Límites de tiempo contra consultas colgadas.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'atc_tracker') then
    create role atc_tracker nologin noinherit;
  end if;
end
$$;
alter role atc_tracker set statement_timeout = '2s';
alter role atc_tracker set lock_timeout = '1s';
alter role atc_tracker set idle_in_transaction_session_timeout = '5s';
grant usage on schema public to atc_tracker;

-- ---------------------------------------------------------------------
-- 7) Schema privado: tablas internas (clave de hash, intentos).
--    Supabase solo expone por API los schemas configurados (public):
--    private no es alcanzable desde el API y además ningún rol del API
--    tiene USAGE.
-- ---------------------------------------------------------------------
create schema private;
revoke all on schema private from public, anon, authenticated, atc_tracker;
