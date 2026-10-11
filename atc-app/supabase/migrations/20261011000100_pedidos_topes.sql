-- =====================================================================
-- Pedidos de la bolsa: topes contra el acaparamiento de stock (L11, seguridad.md §5 fila 21).
--  - Cada producto, como mucho 3 unidades por pedido; el pedido entero, 10.
--  - Los pedidos sin pagar apartan como mucho la mitad de las unidades de cada producto (mínimo 1): unos pocos pedidos
--    falsos (aunque vengan de muchas redes y resuelvan Turnstile) ya no pueden dejar un producto sin stock 48 h.
-- Solo cambia la función (misma firma, mismos permisos). Pruebas: FN-9, FN-10.
-- =====================================================================

create or replace function public.crear_pedido(p_items jsonb, p_entrega text, p_pago text, p_nombre text, p_ip text)
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
  v_tope     text[];
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
                 or coalesce(x->>'qty', '') !~ '^[0-9]{1,2}$' or (x->>'qty')::int not between 1 and 3)
     or (select count(distinct x->>'slug') from jsonb_array_elements(p_items) x) <> jsonb_array_length(p_items)
     or (select sum((x->>'qty')::int) from jsonb_array_elements(p_items) x) > 10 then
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
  -- d) Tope de apartado: los pedidos sin pagar tienen como mucho la mitad de las unidades de cada producto (mínimo 1).
  --    Pedidos falsos desde muchas redes nunca dejan sin stock a quien compra de verdad (que igual sigue por WhatsApp).
  with apartado as (
    select i.product_id, sum(i.qty)::int as n
      from public.sales_order_items i join public.sales_orders o on o.id = i.order_id
     where o.status = 'pendiente'
     group by i.product_id
  )
  select array_agg(x->>'slug' order by x->>'slug') into v_tope
    from jsonb_array_elements(p_items) x
    join public.products p on p.slug = x->>'slug'
    left join apartado a on a.product_id = p.id
   where coalesce(a.n, 0) + (x->>'qty')::int > greatest(1, (p.stock + coalesce(a.n, 0)) / 2);
  if v_tope is not null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_stock', 'productos', to_jsonb(v_tope));
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

-- La firma no cambia, pero se reafirman los permisos (lo nuevo nace cerrado).
revoke all on function public.crear_pedido(jsonb, text, text, text, text) from public, anon, authenticated, atc_tracker;
grant execute on function public.crear_pedido(jsonb, text, text, text, text) to atc_tienda;
