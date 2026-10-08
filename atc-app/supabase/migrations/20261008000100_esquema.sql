-- =====================================================================
-- AT Computación · Migración 0100 · Esquema base
-- Documentación: docs/atc/seguridad.md (§2 datos, §5 controles).
-- Las restricciones CHECK son la primera barrera: ningún dato fuera de
-- formato entra a la base, venga de donde venga.
-- =====================================================================

-- Estados de una orden (los mismos 6 de la demo).
create type public.order_status as enum (
  'ingresado', 'diagnostico', 'aprobacion', 'reparacion', 'listo', 'entregado'
);

-- ---------------------------------------------------------------------
-- settings: una sola fila. Guarda quién es el dueño (el único usuario
-- con permisos de escritura). El dueño se fija a mano desde el panel de
-- Supabase (ver checklist de producción en seguridad.md §8).
-- ---------------------------------------------------------------------
create table public.settings (
  id            smallint primary key default 1 check (id = 1),
  owner_user_id uuid references auth.users (id) on delete set null,
  business_name text not null default 'AT Computación' check (char_length(business_name) between 1 and 80),
  updated_at    timestamptz not null default now()
);
insert into public.settings (id) values (1);

-- ---------------------------------------------------------------------
-- products: catálogo público (solo los activos se ven en la web).
-- ---------------------------------------------------------------------
create table public.products (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique
                   check (char_length(slug) <= 60 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category         text not null
                   check (category in ('notebooks', 'pc', 'impresoras', 'insumos', 'perifericos', 'redes', 'componentes')),
  brand            text not null check (char_length(brand) between 1 and 40),
  name             text not null check (char_length(name) between 1 and 80),
  short            text not null default '' check (char_length(short) <= 120),
  specs            jsonb not null default '[]'::jsonb
                   check (jsonb_typeof(specs) = 'array' and jsonb_array_length(specs) <= 12),
  price_ars        integer not null check (price_ars > 0),
  stock            integer not null default 0 check (stock >= 0),
  tag              text check (char_length(tag) <= 30),
  active           boolean not null default true,
  stock_checked_at timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- orders: órdenes de reparación.
-- * id (UUID) es interno y nunca sale de la base.
-- * public_code es el código del comprobante (AT-XXXX-XX, Crockford
--   base32, aleatorio: se genera en la migración 0300).
-- * customer_phone lo ve solo el dueño; el seguimiento usa phone_last3,
--   que se calcula solo y no se puede escribir a mano.
-- * Al anonimizar (24 meses después de entregada) se borran nombre,
--   teléfono y problema, y la orden deja de poder rastrearse.
-- ---------------------------------------------------------------------
create table public.orders (
  id                    uuid primary key default gen_random_uuid(),
  public_code           text not null unique
                        check (public_code ~ '^AT-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{2}$'),
  customer_first_name   text check (char_length(customer_first_name) between 1 and 40),
  customer_last_initial text check (customer_last_initial ~ '^[A-ZÁÉÍÓÚÑ]$'),
  customer_phone        text check (customer_phone ~ '^[0-9]{8,15}$'),
  phone_last3           text generated always as (right(customer_phone, 3)) stored,
  device                text not null check (char_length(device) between 1 and 120),
  problem               text check (char_length(problem) <= 2000),
  status                public.order_status not null default 'ingresado',
  budget_ars            integer check (budget_ars >= 0),
  warranty_until        date,
  delivered_at          timestamptz,
  anonymized_at         timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- Mientras la orden no esté anonimizada, nombre y teléfono son obligatorios.
  constraint orders_customer_present check (
    anonymized_at is not null
    or (customer_first_name is not null and customer_phone is not null)
  )
);
create index orders_tracking_idx on public.orders (public_code, phone_last3);

-- ---------------------------------------------------------------------
-- order_events: novedades de cada orden. Es una bitácora: una vez escrita
-- no se edita ni se borra (lo garantiza la migración 0200).
-- ---------------------------------------------------------------------
create table public.order_events (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders (id) on delete cascade,
  status      public.order_status not null,
  note_public text check (char_length(note_public) <= 500),
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at desc);

-- ---------------------------------------------------------------------
-- Triggers (SECURITY INVOKER: corren con los permisos de quien escribe).
-- ---------------------------------------------------------------------
create function public.tg_set_updated_at() returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger settings_updated_at before update on public.settings
  for each row execute function public.tg_set_updated_at();
create trigger products_updated_at before update on public.products
  for each row execute function public.tg_set_updated_at();
create trigger orders_updated_at before update on public.orders
  for each row execute function public.tg_set_updated_at();

-- Cada novedad deja la orden en ese estado (y marca la entrega).
create function public.tg_event_updates_order() returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  update public.orders
     set status = new.status,
         delivered_at = case when new.status = 'entregado'
                             then coalesce(delivered_at, new.created_at)
                             else delivered_at end
   where id = new.order_id;
  return new;
end
$$;

create trigger order_events_update_order after insert on public.order_events
  for each row execute function public.tg_event_updates_order();
