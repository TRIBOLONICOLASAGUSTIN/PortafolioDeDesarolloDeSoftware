-- =====================================================================
-- Imitación de Supabase para pruebas locales (NO se aplica en producción).
-- Reproduce lo que Supabase trae de fábrica y que afecta a la seguridad:
--   1. Roles del API: anon, authenticated y service_role (BYPASSRLS).
--   2. auth.uid(): lee el "sub" del JWT desde request.jwt.claims, como PostgREST.
--   3. Permisos por defecto PELIGROSOS: Supabase concede ALL sobre lo que se
--      crea en public a anon y authenticated, y Postgres concede EXECUTE a
--      PUBLIC sobre toda función nueva. Las migraciones deben revocarlos;
--      las pruebas demuestran que lo hacen.
--   4. pgcrypto instalada en el schema "extensions", como en Supabase.
-- =====================================================================
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema extensions;
create extension pgcrypto with schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique
);

create function auth.uid() returns uuid
language sql stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ), ''
  )::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
