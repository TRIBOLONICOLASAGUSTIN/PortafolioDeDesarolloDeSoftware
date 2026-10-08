-- =====================================================================
-- AT Computación · Migración 0300 · Seguimiento seguro de órdenes
-- Documentación: docs/atc/seguridad.md §5 y §6 (cuentas de fuerza bruta).
-- Pruebas: FN-1 … FN-3, TRK-1 … TRK-7, GEN-1, RET-1.
--
-- Amenazas que cubre:
--   * Enumeración de órdenes (IDOR): códigos aleatorios de 30 bits + 3
--     dígitos del teléfono, nunca secuenciales.
--   * Fuerza bruta: bloqueo por código intentado y por IP, contado en la
--     base (no depende de que el servidor web lo haga bien).
--   * Fuga de datos: la respuesta trae solo lo mínimo; los intentos se
--     guardan como HMAC (sin códigos ni IP en crudo).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Clave secreta (pepper) para los HMAC. Una por entorno, aleatoria,
--    nunca sale de la base ni se guarda en el repo.
-- ---------------------------------------------------------------------
create table private.secrets (
  id     smallint primary key default 1 check (id = 1),
  pepper bytea not null check (octet_length(pepper) = 32)
);
insert into private.secrets (pepper) values (extensions.gen_random_bytes(32));
alter table private.secrets enable row level security;

-- ---------------------------------------------------------------------
-- 2) Registro de intentos de seguimiento (solo hashes).
-- ---------------------------------------------------------------------
create table private.track_attempts (
  id         bigint generated always as identity primary key,
  code_hash  text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  ip_hash    text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  outcome    text not null check (outcome in ('ok', 'no_encontrada', 'invalida', 'bloqueada')),
  created_at timestamptz not null default now()
);
create index track_attempts_code_idx on private.track_attempts (code_hash, created_at desc);
create index track_attempts_ip_idx   on private.track_attempts (ip_hash, created_at desc);
alter table private.track_attempts enable row level security;

-- ---------------------------------------------------------------------
-- 3) Código público: AT-XXXX-XX en Crockford base32
--    (0-9 A-Z sin I, L, O, U: no se confunden al dictarlo).
--    6 caracteres × 5 bits = 30 bits aleatorios = 1.073.741.824 códigos.
--    SECURITY INVOKER: corre con los permisos del dueño que inserta.
-- ---------------------------------------------------------------------
create function public.gen_public_code() returns text
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
    body := 'AT-' || substr(body, 1, 4) || '-' || substr(body, 5, 2);
    if not exists (select 1 from public.orders o where o.public_code = body) then
      return body;
    end if;
  end loop;
  raise exception 'No se pudo generar un código único';
end
$$;
revoke all on function public.gen_public_code() from public, anon, authenticated;
grant execute on function public.gen_public_code() to authenticated;

alter table public.orders alter column public_code set default public.gen_public_code();

-- ---------------------------------------------------------------------
-- 4) Normalización del código tal como lo escribe la gente:
--    "at-7kq2-9m", "7KQ29M", "AT 7KQ2 9M" → "AT-7KQ2-9M".
--    I y L se leen como 1, O como 0 (regla Crockford). Más de 64
--    caracteres o formato inválido → NULL.
-- ---------------------------------------------------------------------
create function public.normalize_code(p text) returns text
language sql
immutable
set search_path = pg_catalog, public, pg_temp
as $$
  select case
    when p is null or char_length(p) > 64 then null
    else (
      with c as (select upper(regexp_replace(p, '[^0-9A-Za-z]', '', 'g')) as s),
           d as (select case when char_length(s) = 8 and left(s, 2) = 'AT' then substr(s, 3) else s end as s from c),
           e as (select translate(s, 'ILO', '110') as s from d)
      select case when s ~ '^[0-9A-HJKMNP-TV-Z]{6}$'
                  then 'AT-' || substr(s, 1, 4) || '-' || substr(s, 5, 2)
             end
        from e
    )
  end
$$;
revoke all on function public.normalize_code(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 5) track_order: la ÚNICA puerta pública a una orden.
--    Solo la ejecuta atc_tracker (el servidor web), nunca anon: la anon
--    key es pública y permitiría saltearse Turnstile y el límite por IP.
--
--    Orden de los pasos (importa):
--      a) hashes del código intentado y de la IP (HMAC-SHA256 + pepper)
--      b) bloqueo, ANTES de buscar: por código 5 fallas/15 min o
--         10 fallas/24 h; por IP 30 fallas/1 h. Se cuenta sobre el código
--         INTENTADO, exista o no: el bloqueo no revela qué códigos existen.
--      c) validación de formato (inválido = misma respuesta que "no existe")
--      d) búsqueda por código + últimos 3 dígitos del teléfono
--      e) respuesta mínima (sin teléfono, sin UUID, sin el problema)
-- ---------------------------------------------------------------------
create function public.track_order(p_code text, p_phone3 text, p_ip text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_code       text := public.normalize_code(p_code);
  v_phone3     text := case when p_phone3 ~ '^[0-9]{3}$' then p_phone3 end;
  v_pepper     bytea;
  v_code_hash  text;
  v_ip_hash    text;
  v_fail_15m   integer;
  v_fail_24h   integer;
  v_ip_fail_1h integer;
  o            public.orders%rowtype;
begin
  select s.pepper into strict v_pepper from private.secrets s where s.id = 1;

  -- a) Hashes (se usa el código normalizado si es válido; si no, lo escrito,
  --    recortado a 64 caracteres para no hashear textos gigantes).
  v_code_hash := encode(extensions.hmac(convert_to(coalesce(v_code, left(coalesce(p_code, ''), 64)), 'UTF8'), v_pepper, 'sha256'), 'hex');
  v_ip_hash   := encode(extensions.hmac(convert_to(left(coalesce(p_ip, ''), 64), 'UTF8'), v_pepper, 'sha256'), 'hex');

  -- b) Bloqueos
  select count(*) filter (where t.created_at > now() - interval '15 minutes'),
         count(*)
    into v_fail_15m, v_fail_24h
    from private.track_attempts t
   where t.code_hash = v_code_hash
     and t.outcome in ('no_encontrada', 'invalida')
     and t.created_at > now() - interval '24 hours';

  select count(*)
    into v_ip_fail_1h
    from private.track_attempts t
   where t.ip_hash = v_ip_hash
     and t.outcome in ('no_encontrada', 'invalida')
     and t.created_at > now() - interval '1 hour';

  if v_fail_15m >= 5 or v_fail_24h >= 10 or v_ip_fail_1h >= 30 then
    insert into private.track_attempts (code_hash, ip_hash, outcome) values (v_code_hash, v_ip_hash, 'bloqueada');
    return jsonb_build_object('ok', false, 'motivo', 'demasiados_intentos');
  end if;

  -- c) Formato
  if v_code is null or v_phone3 is null then
    insert into private.track_attempts (code_hash, ip_hash, outcome) values (v_code_hash, v_ip_hash, 'invalida');
    return jsonb_build_object('ok', false, 'motivo', 'no_encontrada');
  end if;

  -- d) Búsqueda (las órdenes anonimizadas no tienen teléfono: nunca coinciden)
  select * into o
    from public.orders x
   where x.public_code = v_code
     and x.phone_last3 = v_phone3
     and x.anonymized_at is null;

  if not found then
    insert into private.track_attempts (code_hash, ip_hash, outcome) values (v_code_hash, v_ip_hash, 'no_encontrada');
    return jsonb_build_object('ok', false, 'motivo', 'no_encontrada');
  end if;

  insert into private.track_attempts (code_hash, ip_hash, outcome) values (v_code_hash, v_ip_hash, 'ok');

  -- e) Respuesta mínima
  return jsonb_build_object(
    'ok',             true,
    'codigo',         o.public_code,
    'equipo',         o.device,
    'cliente',        o.customer_first_name || coalesce(' ' || o.customer_last_initial || '.', ''),
    'estado',         o.status,
    'presupuesto',    o.budget_ars,
    'garantia_hasta', o.warranty_until,
    'novedades',      coalesce((
                        select jsonb_agg(jsonb_build_object('estado', e.status, 'nota', e.note_public, 'fecha', e.created_at)
                                         order by e.created_at desc)
                          from (select ev.status, ev.note_public, ev.created_at
                                  from public.order_events ev
                                 where ev.order_id = o.id
                                 order by ev.created_at desc
                                 limit 20) e
                      ), '[]'::jsonb)
  );
end
$$;
revoke all on function public.track_order(text, text, text) from public, anon, authenticated;
grant execute on function public.track_order(text, text, text) to atc_tracker;

-- ---------------------------------------------------------------------
-- 6) Retención de datos (Ley 25.326: conservar solo lo necesario).
--    Se programan con pg_cron en la migración 0400 (si existe).
-- ---------------------------------------------------------------------
-- Intentos de seguimiento: se borran a los 30 días.
create function private.purge_attempts(p_days integer default 30) returns integer
language sql
volatile
set search_path = pg_catalog, public, pg_temp
as $$
  with d as (
    delete from private.track_attempts
     where created_at < now() - make_interval(days => p_days)
    returning 1
  )
  select count(*)::integer from d
$$;

-- Órdenes entregadas hace más de 24 meses: se borran nombre, teléfono y
-- problema. Quedan equipo, estado, montos y fechas (útiles para el negocio).
create function private.anonymize_closed_orders(p_months integer default 24) returns integer
language sql
volatile
set search_path = pg_catalog, public, pg_temp
as $$
  with u as (
    update public.orders
       set customer_first_name   = null,
           customer_last_initial = null,
           customer_phone        = null,
           problem               = null,
           anonymized_at         = now()
     where status = 'entregado'
       and delivered_at < now() - make_interval(months => p_months)
       and anonymized_at is null
    returning 1
  )
  select count(*)::integer from u
$$;
revoke all on function private.purge_attempts(integer) from public, anon, authenticated, atc_tracker;
revoke all on function private.anonymize_closed_orders(integer) from public, anon, authenticated, atc_tracker;
