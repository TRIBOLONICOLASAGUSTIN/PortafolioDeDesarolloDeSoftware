-- =====================================================================
-- AT Computación · Migración · Pedidos de la tienda (la bolsa)
-- Documentación: docs/atc/seguridad.md §4, §5 (fila 21), §7 y §11.
-- La bolsa registra el pedido y aparta el stock por 48 h. El cobro sigue siendo por WhatsApp: acá no hay pagos.
-- Única puerta pública: public.crear_pedido (SECURITY DEFINER), que solo ejecuta atc_tienda, un rol del servidor sin
-- acceso a tablas (como atc_tracker). Nunca anon: la anon key es pública y permitiría saltearse Turnstile y el límite
-- por IP del servidor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Tablas. Del cliente se guarda lo mínimo: nombre e inicial del apellido (Ley 25.326).
-- ---------------------------------------------------------------------
create table public.sales_orders (
  id            uuid primary key default gen_random_uuid(),
  public_code   text not null unique
                check (public_code ~ '^P-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{2}$'),
  customer_name text check (char_length(customer_name) between 1 and 60),
  delivery      text not null check (delivery in ('retiro', 'envio')),
  payment       text not null check (payment in ('efectivo', 'transferencia', 'mp', 'tarjeta')),
  status        text not null default 'pendiente'
                check (status in ('pendiente', 'pagado', 'entregado', 'cancelado', 'autocancelado')),
  total_ars     integer not null check (total_ars > 0),
  -- HMAC de la red de origen (con el pepper): solo para el límite de pedidos por IP. Se borra a los 30 días.
  ip_hash       text,
  expires_at    timestamptz not null default now() + interval '48 hours',
  paid_at       timestamptz,
  delivered_at  timestamptz,
  cancelled_at  timestamptz,
  anonymized_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint sales_orders_customer_present check (anonymized_at is not null or customer_name is not null)
);
create index sales_orders_pendientes on public.sales_orders (expires_at) where status = 'pendiente';
create index sales_orders_ip on public.sales_orders (ip_hash, created_at) where ip_hash is not null;
create trigger set_updated_at before update on public.sales_orders
  for each row execute function public.tg_set_updated_at();

create table public.sales_order_items (
  order_id   uuid not null references public.sales_orders (id) on delete cascade,
  product_id uuid not null references public.products (id),
  qty        integer not null check (qty between 1 and 10),
  unit_ars   integer not null check (unit_ars > 0),
  primary key (order_id, product_id)
);

-- ---------------------------------------------------------------------
-- 2) Permisos. Lo nuevo nace cerrado (0200 sacó los permisos por defecto): solo el dueño ve los pedidos y solo
--    puede cambiar su estado; nadie más lee ni escribe.
-- ---------------------------------------------------------------------
alter table public.sales_orders      enable row level security;
alter table public.sales_order_items enable row level security;
revoke all on public.sales_orders, public.sales_order_items from public, anon, authenticated;
grant select on public.sales_orders, public.sales_order_items to authenticated;
grant update (status) on public.sales_orders to authenticated;
create policy sales_orders_owner_select on public.sales_orders
  for select to authenticated using (public.is_owner());
create policy sales_orders_owner_update on public.sales_orders
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy sales_order_items_owner_select on public.sales_order_items
  for select to authenticated using (public.is_owner());

-- ---------------------------------------------------------------------
-- 3) Código del pedido: P-XXXX-XX, 30 bits al azar en Crockford base32 (como las órdenes de reparación).
-- ---------------------------------------------------------------------
create function private.gen_pedido_code() returns text
language plpgsql
volatile
set search_path = pg_catalog, public, pg_temp
as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  b    bytea;
  n    bigint;
  body text;
begin
  for attempt in 1 .. 20 loop
    b := extensions.gen_random_bytes(4);
    n := ((get_byte(b, 0)::bigint << 24) | (get_byte(b, 1)::bigint << 16)
        | (get_byte(b, 2)::bigint << 8) | get_byte(b, 3)::bigint) >> 2;   -- 30 bits
    body := '';
    for i in 1 .. 6 loop
      body := substr(alphabet, (n & 31)::int + 1, 1) || body;
      n := n >> 5;
    end loop;
    body := 'P-' || substr(body, 1, 4) || '-' || substr(body, 5, 2);
    if not exists (select 1 from public.sales_orders s where s.public_code = body) then
      return body;
    end if;
  end loop;
  raise exception 'No se pudo generar un código de pedido único';
end
$$;

-- ---------------------------------------------------------------------
-- 4) Cambios de estado (los hace el dueño o la autocancelación). Solo los que tienen sentido:
--    pendiente → pagado | cancelado | autocancelado, y pagado → entregado. Cancelar devuelve el stock apartado.
-- ---------------------------------------------------------------------
create function public.tg_sales_order_status() returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if not ((old.status = 'pendiente' and new.status in ('pagado', 'cancelado', 'autocancelado'))
          or (old.status = 'pagado' and new.status = 'entregado')) then
    raise exception 'Cambio de estado no permitido: % → %', old.status, new.status using errcode = '23514';
  end if;
  if new.status = 'pagado' then new.paid_at := now(); end if;
  if new.status = 'entregado' then new.delivered_at := now(); end if;
  if new.status in ('cancelado', 'autocancelado') then
    new.cancelled_at := now();
    update public.products p
       set stock = p.stock + i.qty
      from public.sales_order_items i
     where i.order_id = new.id and p.id = i.product_id;
  end if;
  return new;
end
$$;
create trigger sales_order_status before update of status on public.sales_orders
  for each row execute function public.tg_sales_order_status();

-- ---------------------------------------------------------------------
-- 5) crear_pedido: la única puerta pública (la ejecuta atc_tienda, desde POST /api/pedidos).
--    - Valida todo otra vez (la base no confía en el servidor).
--    - 5 pedidos por hora por red (HMAC con el pepper; nunca la IP en crudo).
--    - Precios de la base, nunca del navegador.
--    - Reserva atómica: bloquea las filas de los productos (en orden de id, sin interbloqueos) y descuenta todo o
--      nada. Si algo no alcanza, no aparta nada y dice qué productos faltan.
-- ---------------------------------------------------------------------
create function public.crear_pedido(p_items jsonb, p_entrega text, p_pago text, p_nombre text, p_ip text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  invalida constant jsonb := jsonb_build_object('ok', false, 'motivo', 'solicitud_invalida');
  v_pepper   bytea;
  v_ip_hash  text;
  v_palabras text[];
  v_nombre   text;
  v_faltan   text[];
  v_total    integer;
  v_order    uuid;
  v_code     text;
  v_vence    timestamptz;
begin
  -- a) Formato
  if p_entrega is null or p_entrega not in ('retiro', 'envio')
     or p_pago is null or p_pago not in ('efectivo', 'transferencia', 'mp', 'tarjeta')
     or p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 10 then
    return invalida;
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) x
              where jsonb_typeof(x) <> 'object'
                 or coalesce(x->>'slug', '') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(x->>'slug') > 60
                 or coalesce(x->>'qty', '') !~ '^[0-9]{1,2}$' or (x->>'qty')::int not between 1 and 10)
     or (select count(distinct x->>'slug') from jsonb_array_elements(p_items) x) <> jsonb_array_length(p_items)
     or (select sum((x->>'qty')::int) from jsonb_array_elements(p_items) x) > 20 then
    return invalida;
  end if;
  -- Nombre: lo mínimo (nombre e inicial del apellido), sin espacios de más.
  v_palabras := regexp_split_to_array(btrim(regexp_replace(coalesce(left(p_nombre, 200), ''), '\s+', ' ', 'g')), ' ');
  v_nombre := case when v_palabras[1] = '' then null
                   when cardinality(v_palabras) = 1 then left(v_palabras[1], 40)
                   else left(v_palabras[1], 40) || ' ' || upper(left(v_palabras[cardinality(v_palabras)], 1)) || '.' end;
  if v_nombre is null or v_nombre ~ '[<>{}\\]' then
    return invalida;
  end if;

  -- b) Límite por red
  select s.pepper into strict v_pepper from private.secrets s where s.id = 1;
  v_ip_hash := encode(extensions.hmac(convert_to('pedido:' || left(coalesce(p_ip, ''), 64), 'UTF8'), v_pepper, 'sha256'), 'hex');
  if (select count(*) from public.sales_orders s where s.ip_hash = v_ip_hash and s.created_at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', false, 'motivo', 'demasiados_pedidos');
  end if;

  -- c) Reserva: primero se bloquean las filas, después se revisa y se descuenta
  perform 1 from public.products p
   where p.slug in (select x->>'slug' from jsonb_array_elements(p_items) x)
   order by p.id
     for update;
  select array_agg(x->>'slug' order by x->>'slug') into v_faltan
    from jsonb_array_elements(p_items) x
    left join public.products p on p.slug = x->>'slug'
   where p.id is null or not p.active or p.stock < (x->>'qty')::int;
  if v_faltan is not null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_stock', 'productos', to_jsonb(v_faltan));
  end if;
  select sum(p.price_ars * (x->>'qty')::int) into v_total
    from jsonb_array_elements(p_items) x join public.products p on p.slug = x->>'slug';

  v_code := private.gen_pedido_code();
  insert into public.sales_orders (public_code, customer_name, delivery, payment, total_ars, ip_hash)
       values (v_code, v_nombre, p_entrega, p_pago, v_total, v_ip_hash)
    returning id, expires_at into v_order, v_vence;
  insert into public.sales_order_items (order_id, product_id, qty, unit_ars)
       select v_order, p.id, (x->>'qty')::int, p.price_ars
         from jsonb_array_elements(p_items) x join public.products p on p.slug = x->>'slug';
  update public.products p
     set stock = p.stock - (x->>'qty')::int
    from jsonb_array_elements(p_items) x
   where p.slug = x->>'slug';

  return jsonb_build_object(
    'ok', true, 'codigo', v_code, 'total', v_total, 'vence', v_vence,
    'items', (select jsonb_agg(jsonb_build_object('slug', p.slug, 'nombre', p.name, 'qty', i.qty, 'precio', i.unit_ars) order by p.name)
                from public.sales_order_items i join public.products p on p.id = i.product_id
               where i.order_id = v_order)
  );
end
$$;

-- ---------------------------------------------------------------------
-- 6) Rol del servidor para la bolsa: atc_tienda (como atc_tracker). Sin tablas: solo crear_pedido.
--    La contraseña se carga en producción con \password (seguridad.md §8 punto 4).
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'atc_tienda') then
    create role atc_tienda nologin noinherit;
  end if;
end
$$;
alter role atc_tienda connection limit 10;
alter role atc_tienda set statement_timeout = '3s';
alter role atc_tienda set lock_timeout = '2s';
alter role atc_tienda set idle_in_transaction_session_timeout = '5s';
grant usage on schema public to atc_tienda;
revoke all on schema private from atc_tienda;

revoke all on function public.crear_pedido(jsonb, text, text, text, text) from public, anon, authenticated, atc_tracker;
grant execute on function public.crear_pedido(jsonb, text, text, text, text) to atc_tienda;
revoke all on function public.tg_sales_order_status() from public, anon, authenticated, atc_tracker, atc_tienda;
revoke all on function private.gen_pedido_code() from public, anon, authenticated, atc_tracker, atc_tienda;

-- ---------------------------------------------------------------------
-- 7) Autocancelación y retención
--    - Pendientes sin pago a las 48 h: se autocancelan y el stock vuelve (el trigger lo devuelve).
--    - La red de origen (ip_hash) se borra a los 30 días.
--    - Pedidos cerrados (entregados o cancelados) se anonimizan a los 24 meses.
-- ---------------------------------------------------------------------
create function private.autocancelar_pedidos() returns integer
language sql
volatile
set search_path = pg_catalog, public, pg_temp
as $$
  with u as (
    update public.sales_orders set status = 'autocancelado'
     where status = 'pendiente' and expires_at < now()
    returning 1
  )
  select count(*)::integer from u
$$;

create function private.limpiar_pedidos(p_dias integer default 30, p_meses integer default 24) returns integer
language plpgsql
volatile
set search_path = pg_catalog, public, pg_temp
as $$
declare
  n integer;
begin
  -- Dos pasos separados (una misma fila no se puede actualizar dos veces en una sola sentencia)
  update public.sales_orders set ip_hash = null
   where ip_hash is not null and created_at < now() - make_interval(days => p_dias);
  update public.sales_orders set customer_name = null, ip_hash = null, anonymized_at = now()
   where status in ('entregado', 'cancelado', 'autocancelado') and anonymized_at is null
     and coalesce(delivered_at, cancelled_at, updated_at) < now() - make_interval(months => p_meses);
  get diagnostics n = row_count;
  return n;
end
$$;
revoke all on function private.autocancelar_pedidos() from public, anon, authenticated, atc_tracker, atc_tienda;
revoke all on function private.limpiar_pedidos(integer, integer) from public, anon, authenticated, atc_tracker, atc_tienda;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Cada 10 minutos: los pendientes vencidos se cancelan solos y devuelven el stock.
    perform cron.schedule('atc-autocancelar-pedidos', '*/10 * * * *', 'select private.autocancelar_pedidos()');
    -- Todos los días a las 03:41: borra redes de más de 30 días y anonimiza pedidos cerrados hace 24 meses.
    perform cron.schedule('atc-limpiar-pedidos', '41 3 * * *', 'select private.limpiar_pedidos()');
  else
    raise notice 'pg_cron no está instalado: programar autocancelar_pedidos() y limpiar_pedidos() (ver docs/atc/seguridad.md §8).';
  end if;
end
$$;
