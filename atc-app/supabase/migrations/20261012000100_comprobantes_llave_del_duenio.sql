-- =====================================================================
-- AT Computación · Migración · Comprobantes cifrados con la llave del dueño (sobre versión 2)
-- Documentación: docs/atc/seguridad.md §2, §5 (filas 10 y 25), §8, §9, §10 y §11.
-- Antes (versión 1) el servidor cifraba con una clave propia (ATC_COMPROBANTES_KEY) y la tenía al lado de la conexión a la
-- base: quien entrara al servidor podía abrirlos. Ahora el servidor cifra con la llave PÚBLICA del dueño y no puede
-- abrirlos; los abre el dueño en su navegador con su frase (lib/cifrado-comprobante.ts).
-- Sobre: versión 2 (1 byte) + llave efímera (65) + iv (12) + archivo cifrado (1 a 2 MB) + etiqueta (16)
--        = entre 95 y 2.097.246 bytes. La base rechaza cualquier otra cosa (un archivo sin cifrar o un sobre viejo).
-- =====================================================================

-- 1) Solo sobres versión 2. Si quedara alguno de la versión 1 (no debería: no hubo producción), la migración se frena.
do $$
begin
  if exists (select 1 from private.comprobantes where substring(datos from 1 for 1) <> '\x02'::bytea) then
    raise exception 'Hay comprobantes que no son del sobre versión 2: borrarlos antes de aplicar esta migración';
  end if;
end
$$;
alter table private.comprobantes drop constraint comprobantes_datos_cifrado;
alter table private.comprobantes add constraint comprobantes_datos_sobre_v2
  check (octet_length(datos) between 95 and 2097246 and substring(datos from 1 for 1) = '\x02'::bytea);

-- 2) registrar_pago: igual, con el sobre versión 2.
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
     or p_datos is null or octet_length(p_datos) not between 95 and 2097246
     or substring(p_datos from 1 for 1) <> '\x02'::bytea then
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
