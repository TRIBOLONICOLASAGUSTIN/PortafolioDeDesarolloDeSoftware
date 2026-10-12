-- =====================================================================
-- AT Computación · Migración · Panel real (Etapa 2, lote E1)
-- Documentación: docs/atc/seguridad.md §2, §4, §5 (fila 26) y §11.
-- Lo que el panel guardaba solo en memoria pasa a la base: costos y umbral de cada producto, proveedores, piezas de las
-- PC armadas, movimientos de stock, ventas del local, gastos y cobros de reparaciones. Un pedido de la bolsa que pasa a
-- pagado entra solo en Ganancias como venta.
-- Todo vive en `private` (el API de Supabase no lo expone) y la única puerta son las funciones panel_* (SECURITY
-- DEFINER), que ejecuta solo atc_panel: el rol del servidor, usado después de verificar la sesión del superadmin.
-- Montos y cantidades: nunca negativos (CHECK). El único número con signo es `delta` de un movimiento de stock, que
-- calcula la base (el dueño escribe cuántas unidades hay, nunca un número negativo).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Tablas
-- ---------------------------------------------------------------------
create table private.proveedores (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique check (char_length(btrim(nombre)) between 2 and 80),
  rubro      text not null default '' check (char_length(rubro) <= 120),
  contacto   text not null default '' check (char_length(contacto) <= 200),
  creado     timestamptz not null default now()
);

-- Lo que la tienda no ve de cada producto: costo, aviso de stock bajo y proveedor habitual.
create table private.productos_admin (
  product_id   uuid primary key references public.products (id) on delete cascade,
  costo_ars    integer not null default 0 check (costo_ars between 0 and 100000000),
  umbral       integer not null default 3 check (umbral between 0 and 10000),
  proveedor_id uuid references private.proveedores (id) on delete set null
);

-- Piezas con las que se arman las PC (no se venden sueltas).
create table private.piezas (
  id        uuid primary key default gen_random_uuid(),
  slug      text not null unique check (char_length(slug) <= 60 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  brand     text not null check (char_length(brand) between 1 and 40),
  name      text not null check (char_length(name) between 1 and 80),
  icon      text not null default 'cpu' check (icon ~ '^[a-z0-9-]{1,20}$'),
  costo_ars integer not null default 0 check (costo_ars between 0 and 100000000),
  stock     integer not null default 0 check (stock between 0 and 100000),
  umbral    integer not null default 3 check (umbral between 0 and 10000),
  proveedor_id uuid references private.proveedores (id) on delete set null
);

-- Qué piezas lleva cada PC armada.
create table private.kits (
  product_id uuid not null references public.products (id) on delete cascade,
  pieza_id   uuid not null references private.piezas (id) on delete restrict,
  qty        integer not null check (qty between 1 and 20),
  primary key (product_id, pieza_id)
);

-- Movimientos del dinero: ventas del local (o de un pedido de la bolsa ya pagado), cobros de reparaciones y gastos.
create table private.movimientos (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('venta', 'reparacion', 'gasto')),
  pago        text not null check (pago in ('efectivo', 'transferencia', 'mp', 'tarjeta')),
  nota        text check (char_length(nota) <= 200),
  -- venta de un pedido de la bolsa (su stock ya salió con la reserva)
  pedido_id   uuid unique references public.sales_orders (id) on delete set null,
  -- reparación
  orden_code  text check (orden_code ~ '^AT-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{2}$'),
  equipo      text check (char_length(equipo) <= 120),
  servicio    text check (servicio ~ '^[a-z0-9-]{1,20}$'),
  repuestos_ars integer check (repuestos_ars between 0 and 100000000),
  -- gasto
  categoria   text check (categoria in ('alquiler', 'servicios', 'impuestos', 'taller', 'envios', 'publicidad', 'otros')),
  concepto    text check (char_length(concepto) between 1 and 80),
  -- reparación y gasto: el monto (una venta suma sus ítems)
  monto_ars   integer check (monto_ars between 1 and 100000000),
  creado      timestamptz not null default now(),
  constraint movimientos_forma check (
    (kind = 'venta' and monto_ars is null and categoria is null and orden_code is null)
    or (kind = 'reparacion' and monto_ars is not null and equipo is not null and repuestos_ars is not null and pedido_id is null)
    or (kind = 'gasto' and monto_ars is not null and categoria is not null and concepto is not null and pedido_id is null)
  )
);
create index movimientos_creado on private.movimientos (creado);

-- Ítems de una venta: precio y costo de ese momento (si cambian después, no altera el pasado).
create table private.movimiento_items (
  movimiento_id uuid not null references private.movimientos (id) on delete cascade,
  product_id    uuid not null references public.products (id),
  qty           integer not null check (qty between 1 and 1000),
  unit_ars      integer not null check (unit_ars between 1 and 100000000),
  costo_ars     integer not null check (costo_ars between 0 and 100000000),
  primary key (movimiento_id, product_id)
);

-- Movimientos de stock: reposición, ajuste (inventario contado), alta y venta del local. Las reservas y liberaciones de
-- los pedidos de la bolsa salen de sales_orders (no se duplican acá).
create table private.stock_movs (
  id           bigint generated always as identity primary key,
  product_id   uuid references public.products (id) on delete cascade,
  pieza_id     uuid references private.piezas (id) on delete cascade,
  tipo         text not null check (tipo in ('repo', 'ajuste', 'alta', 'venta')),
  delta        integer not null check (delta <> 0 or tipo in ('alta', 'ajuste')),
  despues      integer not null check (despues >= 0),
  costo_ars    integer check (costo_ars between 0 and 100000000),
  proveedor_id uuid references private.proveedores (id) on delete set null,
  movimiento_id uuid references private.movimientos (id) on delete set null,
  nota         text check (char_length(nota) <= 200),
  creado       timestamptz not null default now(),
  constraint stock_movs_uno check ((product_id is null) <> (pieza_id is null))
);
create index stock_movs_creado on private.stock_movs (creado);

-- ---------------------------------------------------------------------
-- 2) Permisos: todo nace cerrado. RLS en todo (sin políticas: nadie del API las lee) y sin permisos de fábrica.
-- ---------------------------------------------------------------------
alter table private.proveedores      enable row level security;
alter table private.productos_admin  enable row level security;
alter table private.piezas           enable row level security;
alter table private.kits             enable row level security;
alter table private.movimientos      enable row level security;
alter table private.movimiento_items enable row level security;
alter table private.stock_movs       enable row level security;
revoke all on private.proveedores, private.productos_admin, private.piezas, private.kits, private.movimientos,
              private.movimiento_items, private.stock_movs from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) Un pedido de la bolsa que pasa a pagado entra en Ganancias como venta (con el costo de ese momento), venga del
--    panel o de registrar_pago. Mismas reglas de estado que antes.
-- ---------------------------------------------------------------------
create or replace function public.tg_sales_order_status() returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_mov uuid;
begin
  if new.status = old.status then
    return new;
  end if;
  if not ((old.status = 'pendiente' and new.status in ('pagado', 'cancelado', 'autocancelado'))
          or (old.status = 'pagado' and new.status = 'entregado')) then
    raise exception 'Cambio de estado no permitido: % → %', old.status, new.status using errcode = '23514';
  end if;
  if new.status = 'pagado' then
    new.paid_at := now();
    insert into private.movimientos (kind, pago, pedido_id) values ('venta', new.payment, new.id)
      on conflict (pedido_id) do nothing
      returning id into v_mov;
    if v_mov is not null then
      insert into private.movimiento_items (movimiento_id, product_id, qty, unit_ars, costo_ars)
        select v_mov, i.product_id, i.qty, i.unit_ars, coalesce(a.costo_ars, 0)
          from public.sales_order_items i
          left join private.productos_admin a on a.product_id = i.product_id
         where i.order_id = new.id;
    end if;
  end if;
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

-- ---------------------------------------------------------------------
-- 4) Lectura (una sola llamada por pantalla). Fechas en la hora del local (Córdoba = Santa Fe).
-- ---------------------------------------------------------------------
-- Entero de un JSON dentro de [min, max]; null si no es un número entero o se sale del rango (nunca un error).
create function private.entero(j jsonb, p_min integer, p_max integer) returns integer
language sql
immutable
set search_path = pg_catalog, public, pg_temp
as $$
  select case when jsonb_typeof(j) = 'number' then   -- CASE anidado: el cast solo corre si es un número
           case when (j #>> '{}')::numeric = trunc((j #>> '{}')::numeric) and (j #>> '{}')::numeric between p_min and p_max
                then (j #>> '{}')::integer end end
$$;
-- Uuid de un texto; null si no tiene la forma.
create function private.uuid_de(t text) returns uuid
language sql
immutable
set search_path = pg_catalog, public, pg_temp
as $$ select case when t ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then t::uuid end $$;

create function private.local(t timestamptz) returns text
language sql
immutable
set search_path = pg_catalog, public, pg_temp
as $$ select to_char(t at time zone 'America/Argentina/Cordoba', 'YYYY-MM-DD"T"HH24:MI') $$;

-- Catálogo completo para el panel: productos (con lo privado), piezas, kits y proveedores.
create function public.panel_catalogo() returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'productos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'slug', p.slug, 'cat', p.category, 'brand', p.brand, 'name', p.name, 'short', p.short,
        'price', p.price_ars, 'stock', p.stock, 'tag', p.tag, 'activo', p.active,
        'costo', coalesce(a.costo_ars, 0), 'umbral', coalesce(a.umbral, 3), 'proveedor', a.proveedor_id,
        'kit', (select jsonb_agg(jsonb_build_array(k.pieza_id, k.qty) order by k.pieza_id) from private.kits k where k.product_id = p.id)
      ) order by p.category, p.name)
      from public.products p left join private.productos_admin a on a.product_id = p.id), '[]'::jsonb),
    'piezas', coalesce((
      select jsonb_agg(jsonb_build_object('id', z.id, 'slug', z.slug, 'brand', z.brand, 'name', z.name, 'icon', z.icon,
                                          'costo', z.costo_ars, 'stock', z.stock, 'umbral', z.umbral, 'proveedor', z.proveedor_id) order by z.name)
      from private.piezas z), '[]'::jsonb),
    'proveedores', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'nombre', v.nombre, 'rubro', v.rubro, 'contacto', v.contacto) order by v.nombre)
      from private.proveedores v), '[]'::jsonb)
  )
$$;

-- Pedidos de la bolsa de los últimos p_dias días (y todos los pendientes), con sus ítems y pagos (sin el comprobante).
create function public.panel_pedidos(p_dias integer) returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'codigo', o.public_code, 'creado', private.local(o.created_at), 'cliente', coalesce(o.customer_name, '—'),
    'entrega', o.delivery, 'pago', o.payment, 'estado', o.status, 'total', o.total_ars, 'vence', private.local(o.expires_at),
    'pagado', private.local(o.paid_at), 'entregado', private.local(o.delivered_at), 'cancelado', private.local(o.cancelled_at),
    'items', (select jsonb_agg(jsonb_build_object('productId', i.product_id, 'qty', i.qty, 'unit', i.unit_ars) order by i.product_id)
                from public.sales_order_items i where i.order_id = o.id),
    'pagos', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'pagador', s.pagador, 'monto', s.monto_ars,
                                                           'comprobante', (select c.tipo from private.comprobantes c where c.payment_id = s.id))
                                        order by s.created_at)
                         from public.sales_payments s where s.order_id = o.id), '[]'::jsonb)
  ) order by o.created_at desc), '[]'::jsonb)
  from public.sales_orders o
  where o.status = 'pendiente' or o.created_at > now() - make_interval(days => least(greatest(coalesce(p_dias, 30), 1), 800))
$$;

-- Movimientos de dinero y de stock desde una fecha (como mucho 800 días atrás).
create function public.panel_movimientos(p_desde date) returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  with d as (select greatest(coalesce(p_desde, current_date - 30), current_date - 800)::timestamptz as desde)
  select jsonb_build_object(
    'dinero', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'kind', m.kind, 'at', private.local(m.creado), 'pay', m.pago, 'note', m.nota,
        'pedido', (select o.public_code from public.sales_orders o where o.id = m.pedido_id),
        'orderCode', m.orden_code, 'equipo', m.equipo, 'svcId', m.servicio, 'partsCost', m.repuestos_ars,
        'cat', m.categoria, 'concept', m.concepto, 'amount', m.monto_ars,
        'items', (select jsonb_agg(jsonb_build_object('productId', i.product_id, 'qty', i.qty, 'unit', i.unit_ars, 'unitCost', i.costo_ars) order by i.product_id)
                    from private.movimiento_items i where i.movimiento_id = m.id)
      ) order by m.creado)
      from private.movimientos m, d where m.creado >= d.desde), '[]'::jsonb),
    'stock', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'itemId', coalesce(s.product_id, s.pieza_id), 'at', private.local(s.creado), 'tipo', s.tipo,
        'delta', s.delta, 'despues', s.despues, 'unitCost', s.costo_ars, 'prov', s.proveedor_id, 'note', s.nota) order by s.id)
      from private.stock_movs s, d where s.creado >= d.desde), '[]'::jsonb)
  )
$$;

-- ---------------------------------------------------------------------
-- 5) Escritura. Cada función valida todo otra vez (la base no confía en el servidor) y responde {ok, motivo}.
-- ---------------------------------------------------------------------

-- Pedido de la bolsa: pagado (sin transferencia: efectivo, Mercado Pago o tarjeta en el local), entregado o cancelado.
create function public.panel_pedido_estado(p_codigo text, p_estado text) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v public.sales_orders%rowtype;
begin
  if p_codigo is null or p_codigo !~ '^P-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{2}$'
     or p_estado is null or p_estado not in ('pagado', 'entregado', 'cancelado') then
    return jsonb_build_object('ok', false, 'motivo', 'solicitud_invalida');
  end if;
  select * into v from public.sales_orders where public_code = p_codigo for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'pedido');
  end if;
  if not ((v.status = 'pendiente' and p_estado in ('pagado', 'cancelado')) or (v.status = 'pagado' and p_estado = 'entregado')) then
    return jsonb_build_object('ok', false, 'motivo', 'estado', 'estado', v.status);
  end if;
  update public.sales_orders set status = p_estado where id = v.id;
  return jsonb_build_object('ok', true, 'pedido', p_codigo, 'estado', p_estado);
end
$$;

-- Producto nuevo o editado (si trae id). Precio > 0; costo y umbral ≥ 0.
create function public.panel_producto_guardar(p jsonb) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_id    uuid;
  v_nuevo boolean := not (p ? 'id');
begin
  if jsonb_typeof(p) is distinct from 'object'
     or private.entero(p -> 'price', 1, 100000000) is null
     or private.entero(p -> 'costo', 0, 100000000) is null
     or private.entero(p -> 'umbral', 0, 10000) is null
     or jsonb_typeof(p -> 'activo') is distinct from 'boolean'
     or (not v_nuevo and private.uuid_de(p ->> 'id') is null)
     or (coalesce(jsonb_typeof(p -> 'proveedor'), 'null') <> 'null'
         and not exists (select 1 from private.proveedores where id = private.uuid_de(p ->> 'proveedor'))) then
    return jsonb_build_object('ok', false, 'motivo', 'solicitud_invalida');
  end if;
  begin
    if v_nuevo then
      if private.entero(p -> 'stock', 0, 100000) is null then
        return jsonb_build_object('ok', false, 'motivo', 'solicitud_invalida');
      end if;
      insert into public.products (slug, category, brand, name, short, price_ars, stock, tag, active)
        values (p ->> 'slug', p ->> 'cat', btrim(p ->> 'brand'), btrim(p ->> 'name'), coalesce(btrim(p ->> 'short'), ''),
                (p ->> 'price')::integer, (p ->> 'stock')::integer, nullif(btrim(coalesce(p ->> 'tag', '')), ''), (p ->> 'activo')::boolean)
        returning id into v_id;
      insert into private.stock_movs (product_id, tipo, delta, despues, costo_ars, nota)
        values (v_id, 'alta', (p ->> 'stock')::integer, (p ->> 'stock')::integer, (p ->> 'costo')::integer, 'Alta del producto');
    else
      update public.products
         set category = p ->> 'cat', brand = btrim(p ->> 'brand'), name = btrim(p ->> 'name'), short = coalesce(btrim(p ->> 'short'), ''),
             price_ars = (p ->> 'price')::integer, tag = nullif(btrim(coalesce(p ->> 'tag', '')), ''), active = (p ->> 'activo')::boolean
       where id = (p ->> 'id')::uuid
       returning id into v_id;
      if v_id is null then
        return jsonb_build_object('ok', false, 'motivo', 'no_existe');
      end if;
    end if;
  exception
    when check_violation or not_null_violation then return jsonb_build_object('ok', false, 'motivo', 'solicitud_invalida');
    when unique_violation then return jsonb_build_object('ok', false, 'motivo', 'slug_repetido');
  end;
  insert into private.productos_admin (product_id, costo_ars, umbral, proveedor_id)
    values (v_id, (p ->> 'costo')::integer, (p ->> 'umbral')::integer, private.uuid_de(p ->> 'proveedor'))
    on conflict (product_id) do update set costo_ars = excluded.costo_ars, umbral = excluded.umbral, proveedor_id = excluded.proveedor_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end
$$;

-- Stock de un producto o una pieza. 'repo': entran p_qty unidades (> 0) a p_costo cada una, de un proveedor.
-- 'ajuste': el dueño contó y hay p_qty unidades (≥ 0). Nunca deja el stock negativo.
create function public.panel_stock(p_item uuid, p_tipo text, p_qty integer, p_costo integer, p_proveedor uuid, p_nota text) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_antes   integer;
  v_despues integer;
  v_pieza   boolean := false;
begin
  if p_item is null or p_tipo is null or p_tipo not in ('repo', 'ajuste') or p_qty is null
     or (p_tipo = 'repo' and p_qty not between 1 and 10000) or (p_tipo = 'ajuste' and p_qty not between 0 and 100000)
     or (p_costo is not null and p_costo not between 0 and 100000000)
     or (p_nota is not null and char_length(p_nota) > 200)
     or (p_proveedor is not null and not exists (select 1 from private.proveedores where id = p_proveedor)) then
    return jsonb_build_object('ok', false, 'motivo', 'solicitud_invalida');
  end if;
  select stock into v_antes from public.products where id = p_item for update;
  if not found then
    select stock into v_antes from private.piezas where id = p_item for update;
    if not found then
      return jsonb_build_object('ok', false, 'motivo', 'no_existe');
    end if;
    v_pieza := true;
  end if;
  v_despues := case p_tipo when 'repo' then v_antes + p_qty else p_qty end;
  if v_despues > 100000 then
    return jsonb_build_object('ok', false, 'motivo', 'solicitud_invalida');
  end if;
  if v_pieza then
    update private.piezas set stock = v_despues, costo_ars = coalesce(case when p_tipo = 'repo' then p_costo end, costo_ars) where id = p_item;
  else
    update public.products set stock = v_despues, stock_checked_at = now() where id = p_item;
    if p_tipo = 'repo' and p_costo is not null then
      insert into private.productos_admin (product_id, costo_ars) values (p_item, p_costo)
        on conflict (product_id) do update set costo_ars = excluded.costo_ars;
    end if;
  end if;
  insert into private.stock_movs (product_id, pieza_id, tipo, delta, despues, costo_ars, proveedor_id, nota)
    values (case when v_pieza then null else p_item end, case when v_pieza then p_item end, p_tipo, v_despues - v_antes, v_despues,
            case when p_tipo = 'repo' then p_costo end, case when p_tipo = 'repo' then p_proveedor end, nullif(btrim(coalesce(p_nota, '')), ''));
  return jsonb_build_object('ok', true, 'stock', v_despues);
end
$$;

-- Venta en el local: precios que escribe el dueño (puede hacer un descuento), costo de la base, stock atómico.
-- p_items: [{"id": uuid, "qty": n, "unit": precio}], como mucho 30 renglones.
create function public.panel_venta(p_items jsonb, p_pago text, p_nota text) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_mov   uuid;
  v_falta jsonb;
  r       record;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 30
     or p_pago is null or p_pago not in ('efectivo', 'transferencia', 'mp', 'tarjeta')
     or (p_nota is not null and char_length(p_nota) > 200)
     or exists (select 1 from jsonb_array_elements(p_items) e
                 where jsonb_typeof(e) <> 'object'
                    or private.uuid_de(e ->> 'id') is null
                    or private.entero(e -> 'qty', 1, 1000) is null
                    or private.entero(e -> 'unit', 1, 100000000) is null)
     or (select count(distinct e ->> 'id') from jsonb_array_elements(p_items) e) <> jsonb_array_length(p_items) then
    return jsonb_build_object('ok', false, 'motivo', 'solicitud_invalida');
  end if;
  -- Bloquear en orden de id (sin interbloqueos) y ver que todo alcance antes de tocar nada.
  perform 1 from public.products where id in (select (e ->> 'id')::uuid from jsonb_array_elements(p_items) e) order by id for update;
  select jsonb_agg(e ->> 'id') into v_falta
    from jsonb_array_elements(p_items) e
    left join public.products p on p.id = (e ->> 'id')::uuid
   where p.id is null or p.stock < (e ->> 'qty')::integer;
  if v_falta is not null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_stock', 'productos', v_falta);
  end if;
  insert into private.movimientos (kind, pago, nota) values ('venta', p_pago, nullif(btrim(coalesce(p_nota, '')), '')) returning id into v_mov;
  for r in select (e ->> 'id')::uuid as id, (e ->> 'qty')::integer as qty, (e ->> 'unit')::integer as unit from jsonb_array_elements(p_items) e order by 1 loop
    update public.products set stock = stock - r.qty where id = r.id;
    insert into private.movimiento_items (movimiento_id, product_id, qty, unit_ars, costo_ars)
      values (v_mov, r.id, r.qty, r.unit, coalesce((select costo_ars from private.productos_admin where product_id = r.id), 0));
    insert into private.stock_movs (product_id, tipo, delta, despues, movimiento_id)
      values (r.id, 'venta', -r.qty, (select stock from public.products where id = r.id), v_mov);
  end loop;
  return jsonb_build_object('ok', true, 'id', v_mov);
end
$$;

-- Gasto del local (monto > 0).
create function public.panel_gasto(p_categoria text, p_concepto text, p_monto integer, p_pago text, p_nota text) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_id uuid;
begin
  begin
    insert into private.movimientos (kind, pago, categoria, concepto, monto_ars, nota)
      values ('gasto', p_pago, p_categoria, btrim(p_concepto), p_monto, nullif(btrim(coalesce(p_nota, '')), ''))
      returning id into v_id;
  exception when check_violation or not_null_violation then
    return jsonb_build_object('ok', false, 'motivo', 'solicitud_invalida');
  end;
  return jsonb_build_object('ok', true, 'id', v_id);
end
$$;

-- Cobro de una reparación (monto > 0; repuestos ≥ 0).
create function public.panel_cobro(p_orden text, p_equipo text, p_servicio text, p_monto integer, p_repuestos integer, p_pago text, p_nota text) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_id uuid;
begin
  begin
    insert into private.movimientos (kind, pago, orden_code, equipo, servicio, monto_ars, repuestos_ars, nota)
      values ('reparacion', p_pago, nullif(upper(btrim(coalesce(p_orden, ''))), ''), btrim(p_equipo), p_servicio, p_monto,
              coalesce(p_repuestos, 0), nullif(btrim(coalesce(p_nota, '')), ''))
      returning id into v_id;
  exception when check_violation or not_null_violation then
    return jsonb_build_object('ok', false, 'motivo', 'solicitud_invalida');
  end;
  return jsonb_build_object('ok', true, 'id', v_id);
end
$$;

-- Proveedor nuevo o editado.
create function public.panel_proveedor_guardar(p_id uuid, p_nombre text, p_rubro text, p_contacto text) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_id uuid;
begin
  begin
    if p_id is null then
      insert into private.proveedores (nombre, rubro, contacto) values (btrim(p_nombre), coalesce(btrim(p_rubro), ''), coalesce(btrim(p_contacto), ''))
        returning id into v_id;
    else
      update private.proveedores set nombre = btrim(p_nombre), rubro = coalesce(btrim(p_rubro), ''), contacto = coalesce(btrim(p_contacto), '')
       where id = p_id returning id into v_id;
      if v_id is null then
        return jsonb_build_object('ok', false, 'motivo', 'no_existe');
      end if;
    end if;
  exception
    when check_violation or not_null_violation then return jsonb_build_object('ok', false, 'motivo', 'solicitud_invalida');
    when unique_violation then return jsonb_build_object('ok', false, 'motivo', 'nombre_repetido');
  end;
  return jsonb_build_object('ok', true, 'id', v_id);
end
$$;

-- Lista de precios: aplica los precios nuevos (calculados en el panel con su vista previa). Todo o nada.
-- p_cambios: [{"id": uuid, "price": n}], como mucho 500.
create function public.panel_precios(p_cambios jsonb) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_n integer;
begin
  if jsonb_typeof(p_cambios) is distinct from 'array' or jsonb_array_length(p_cambios) not between 1 and 500
     or exists (select 1 from jsonb_array_elements(p_cambios) e
                 where jsonb_typeof(e) <> 'object'
                    or private.uuid_de(e ->> 'id') is null
                    or private.entero(e -> 'price', 1, 100000000) is null)
     or (select count(distinct e ->> 'id') from jsonb_array_elements(p_cambios) e) <> jsonb_array_length(p_cambios) then
    return jsonb_build_object('ok', false, 'motivo', 'solicitud_invalida');
  end if;
  update public.products p set price_ars = (e ->> 'price')::integer
    from jsonb_array_elements(p_cambios) e
   where p.id = (e ->> 'id')::uuid;
  get diagnostics v_n = row_count;
  if v_n <> jsonb_array_length(p_cambios) then
    raise exception 'producto inexistente en la lista de precios' using errcode = 'P0002';
  end if;
  return jsonb_build_object('ok', true, 'cambiados', v_n);
exception when no_data_found then
  return jsonb_build_object('ok', false, 'motivo', 'no_existe');
end
$$;

-- ---------------------------------------------------------------------
-- 6) Solo atc_panel ejecuta las funciones del panel (lo nuevo nace cerrado; se repite por claridad).
-- ---------------------------------------------------------------------
revoke all on function private.local(timestamptz), private.entero(jsonb, integer, integer), private.uuid_de(text)
  from public, anon, authenticated, atc_tracker, atc_tienda, atc_panel;
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.panel_catalogo()', 'public.panel_pedidos(integer)', 'public.panel_movimientos(date)',
    'public.panel_pedido_estado(text, text)', 'public.panel_producto_guardar(jsonb)',
    'public.panel_stock(uuid, text, integer, integer, uuid, text)', 'public.panel_venta(jsonb, text, text)',
    'public.panel_gasto(text, text, integer, text, text)', 'public.panel_cobro(text, text, text, integer, integer, text, text)',
    'public.panel_proveedor_guardar(uuid, text, text, text)', 'public.panel_precios(jsonb)'] loop
    execute format('revoke all on function %s from public, anon, authenticated, atc_tracker, atc_tienda', f);
    execute format('grant execute on function %s to atc_panel', f);
  end loop;
end
$$;
