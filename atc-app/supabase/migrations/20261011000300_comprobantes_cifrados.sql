-- =====================================================================
-- AT Computación · Migración · Comprobantes cifrados y borrado a mano
-- Documentación: docs/atc/seguridad.md §2, §4, §5 (filas 10 y 25), §8, §10 y §11.
-- El comprobante de una transferencia trae datos bancarios del cliente. Desde acá:
--   - Se guarda cifrado por el servidor (AES-256-GCM con ATC_COMPROBANTES_KEY, que no está en la base): quien lea la
--     base (el panel de Supabase, un backup, una clave filtrada) ve bytes sin sentido. La base rechaza un archivo sin
--     cifrar. Como ya no ve el archivo, el tipo por sus primeros bytes lo controla el servidor, al guardar y al leer.
--   - El dueño lo puede borrar apenas lo revisó (borrar_comprobante), además del borrado a los 90 días. Quedan el nombre
--     de quien pagó y el monto (Ganancias).
-- Sobre: versión 1 (1 byte) + iv (12) + archivo cifrado (1 a 2 MB) + etiqueta (16) = entre 30 y 2.097.181 bytes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Comprobantes: solo sobres cifrados. Si hubiera alguno guardado sin cifrar, la migración se frena (no se borra nada
--    sin avisar): borrarlos o cifrarlos a mano antes de aplicarla.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from private.comprobantes where octet_length(datos) < 30 or substring(datos from 1 for 1) <> '\x01'::bytea) then
    raise exception 'Hay comprobantes sin cifrar en private.comprobantes: borrarlos o cifrarlos antes de aplicar esta migración';
  end if;
end
$$;
alter table private.comprobantes drop constraint comprobantes_datos_check;
alter table private.comprobantes add constraint comprobantes_datos_cifrado
  check (octet_length(datos) between 30 and 2097181 and substring(datos from 1 for 1) = '\x01'::bytea);

-- ---------------------------------------------------------------------
-- 2) registrar_pago: igual que antes, pero el archivo tiene que llegar cifrado (sobre versión 1).
-- ---------------------------------------------------------------------
create or replace function public.registrar_pago(p_codigo text, p_pagador text, p_monto integer, p_tipo text, p_datos bytea)
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
     or p_datos is null or octet_length(p_datos) not between 30 and 2097181
     or substring(p_datos from 1 for 1) <> '\x01'::bytea then
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

-- ---------------------------------------------------------------------
-- 3) borrar_comprobante: "Ya lo revisé". Borra solo el archivo; el pago (nombre y monto) queda.
--    Devuelve false si no había (ya borrado, vencido o un id que no existe).
-- ---------------------------------------------------------------------
create function public.borrar_comprobante(p_pago uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  delete from private.comprobantes where payment_id = p_pago;
  return found;
end
$$;
revoke all on function public.borrar_comprobante(uuid) from public, anon, authenticated, atc_tracker, atc_tienda;
grant execute on function public.borrar_comprobante(uuid) to atc_panel;
