-- =====================================================================
-- AT Computación · Migración · Pagos por transferencia con comprobante
-- Documentación: docs/atc/seguridad.md §2, §4, §5 (filas 10 y 25), §7 y §11.
-- El cliente le manda el comprobante al dueño por WhatsApp y el dueño lo adjunta en el panel: no hay ninguna puerta
-- pública para subir archivos. Del pago se guardan el nombre de quien pagó y el monto (siempre mayor a 0); el
-- comprobante lo ve solo el dueño y se borra a los 90 días. Nunca se piden ni se escriben CBU, alias, banco ni cuenta.
-- Única puerta: public.registrar_pago y public.ver_comprobante (SECURITY DEFINER), que solo ejecuta atc_panel, un rol
-- del servidor sin acceso a tablas que se usa solo después de verificar la sesión del superadmin.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Tablas
-- ---------------------------------------------------------------------
create table public.sales_payments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.sales_orders (id) on delete cascade,
  -- Nombre de quien pagó (el que figura en la transferencia). Se borra al anonimizar el pedido.
  pagador       text check (char_length(pagador) between 2 and 80),
  monto_ars     integer not null check (monto_ars > 0 and monto_ars <= 100000000),
  medio         text not null default 'transferencia' check (medio = 'transferencia'),
  anonymized_at timestamptz,
  created_at    timestamptz not null default now(),
  constraint sales_payments_pagador_present check (anonymized_at is not null or pagador is not null)
);
create index sales_payments_order on public.sales_payments (order_id);

-- El archivo vive en private: el API de Supabase (PostgREST) nunca lo expone.
create table private.comprobantes (
  payment_id uuid primary key references public.sales_payments (id) on delete cascade,
  tipo       text not null check (tipo in ('image/jpeg', 'image/png', 'application/pdf')),
  datos      bytea not null check (octet_length(datos) between 1 and 2097152),
  created_at timestamptz not null default now()
);
create index comprobantes_created on private.comprobantes (created_at);

-- ---------------------------------------------------------------------
-- 2) Permisos: nace cerrado. El dueño (Supabase Auth, is_owner) ve los pagos; el archivo no lo ve nadie del API.
-- ---------------------------------------------------------------------
alter table public.sales_payments enable row level security;
alter table private.comprobantes  enable row level security;
revoke all on public.sales_payments from public, anon, authenticated;
revoke all on private.comprobantes from public, anon, authenticated;
grant select on public.sales_payments to authenticated;
create policy sales_payments_owner_select on public.sales_payments
  for select to authenticated using (public.is_owner());

-- ---------------------------------------------------------------------
-- 3) registrar_pago: el dueño adjunta la transferencia a un pedido pendiente o pagado.
--    - Valida todo otra vez: código, nombre, monto > 0, tipo y los primeros bytes del archivo (JPEG, PNG o PDF).
--    - Como mucho 3 pagos por pedido. Un pedido pendiente pasa a pagado (y entra en Ganancias).
-- ---------------------------------------------------------------------
create function public.registrar_pago(p_codigo text, p_pagador text, p_monto integer, p_tipo text, p_datos bytea)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_pedido  public.sales_orders%rowtype;
  v_pagador text := btrim(coalesce(p_pagador, ''));
  v_pago    uuid;
  v_n       integer;
begin
  if p_codigo is null or p_codigo !~ '^P-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{2}$'
     or char_length(v_pagador) not between 2 and 80
     or p_monto is null or p_monto <= 0 or p_monto > 100000000
     or p_tipo is null or p_tipo not in ('image/jpeg', 'image/png', 'application/pdf')
     or p_datos is null or octet_length(p_datos) not between 1 and 2097152
     or not ((p_tipo = 'image/jpeg' and substring(p_datos from 1 for 3) = '\xffd8ff'::bytea)
          or (p_tipo = 'image/png' and substring(p_datos from 1 for 8) = '\x89504e470d0a1a0a'::bytea)
          or (p_tipo = 'application/pdf' and substring(p_datos from 1 for 5) = '\x255044462d'::bytea)) then
    return jsonb_build_object('ok', false, 'motivo', 'solicitud_invalida');
  end if;

  select * into v_pedido from public.sales_orders where public_code = p_codigo for update;
  if not found or v_pedido.status not in ('pendiente', 'pagado') then
    return jsonb_build_object('ok', false, 'motivo', 'pedido');
  end if;
  select count(*) into v_n from public.sales_payments where order_id = v_pedido.id;
  if v_n >= 3 then
    return jsonb_build_object('ok', false, 'motivo', 'demasiados_pagos');
  end if;

  insert into public.sales_payments (order_id, pagador, monto_ars) values (v_pedido.id, v_pagador, p_monto)
    returning id into v_pago;
  insert into private.comprobantes (payment_id, tipo, datos) values (v_pago, p_tipo, p_datos);
  if v_pedido.status = 'pendiente' then
    update public.sales_orders set status = 'pagado' where id = v_pedido.id;
  end if;
  return jsonb_build_object('ok', true, 'pago', v_pago, 'pedido', p_codigo, 'pagador', v_pagador, 'monto', p_monto,
                            'total', v_pedido.total_ars, 'estado', 'pagado');
end
$$;

-- ver_comprobante: el archivo de un pago (nada si no existe o ya se borró a los 90 días).
create function public.ver_comprobante(p_pago uuid)
returns table (tipo text, datos bytea)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select c.tipo, c.datos from private.comprobantes c where c.payment_id = p_pago
$$;

-- ---------------------------------------------------------------------
-- 4) Rol del servidor para el panel: atc_panel (como atc_tienda). Sin tablas: solo estas dos funciones.
--    Se usa únicamente después de verificar la sesión del superadmin. Contraseña con \password (seguridad.md §8).
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'atc_panel') then
    create role atc_panel nologin noinherit;
  end if;
end
$$;
alter role atc_panel connection limit 10;
alter role atc_panel set statement_timeout = '5s';
alter role atc_panel set lock_timeout = '2s';
alter role atc_panel set idle_in_transaction_session_timeout = '5s';
grant usage on schema public to atc_panel;
revoke all on schema private from atc_panel;

revoke all on function public.registrar_pago(text, text, integer, text, bytea) from public, anon, authenticated, atc_tracker, atc_tienda;
revoke all on function public.ver_comprobante(uuid) from public, anon, authenticated, atc_tracker, atc_tienda;
grant execute on function public.registrar_pago(text, text, integer, text, bytea) to atc_panel;
grant execute on function public.ver_comprobante(uuid) to atc_panel;

-- ---------------------------------------------------------------------
-- 5) Retención: el comprobante se borra a los 90 días (queda el pago: nombre y monto). Cuando el pedido se anonimiza
--    (24 meses), también se borra el nombre de quien pagó.
-- ---------------------------------------------------------------------
create function private.limpiar_comprobantes(p_dias integer default 90) returns integer
language plpgsql
volatile
set search_path = pg_catalog, public, pg_temp
as $$
declare
  n integer;
begin
  delete from private.comprobantes where created_at < now() - make_interval(days => p_dias);
  get diagnostics n = row_count;
  update public.sales_payments s set pagador = null, anonymized_at = now()
    from public.sales_orders o
   where o.id = s.order_id and o.anonymized_at is not null and s.anonymized_at is null;
  return n;
end
$$;
revoke all on function private.limpiar_comprobantes(integer) from public, anon, authenticated, atc_tracker, atc_tienda, atc_panel;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Todos los días a las 03:53: borra comprobantes de más de 90 días y el nombre de los pagos de pedidos anonimizados.
    perform cron.schedule('atc-limpiar-comprobantes', '53 3 * * *', 'select private.limpiar_comprobantes()');
  else
    raise notice 'pg_cron no está instalado: programar limpiar_comprobantes() (ver docs/atc/seguridad.md §8).';
  end if;
end
$$;
