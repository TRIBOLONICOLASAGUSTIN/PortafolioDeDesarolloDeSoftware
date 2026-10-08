# AT Computación — Seguridad (Hito 1: base de datos)

> Estado: **Hito 1 implementado y probado** (19/19 pruebas en verde contra Postgres 16).
> Código: `atc-app/supabase/migrations/` · Pruebas: `atc-app/tests/db/seguridad.test.mjs` · Cómo correrlas: `atc-app/README.md`.
> Cada control cita la prueba que lo demuestra (IDs `RLS-n`, `FN-n`, `TRK-n`, `GEN-n`, `RET-n`). `npm run check:docs` falla si un ID de este documento no tiene prueba o al revés.
> Las rutas `0100`, `0200`, `0300` y `0400` son las migraciones `atc-app/supabase/migrations/20261008000NNN_*.sql`; el número después de `:` es la línea.

---

## 1. Resumen para el dueño

- **Tus clientes ven solo su orden** y solo si tienen dos cosas: el código del comprobante (`AT-7KQ2-9M`) y los últimos 3 números de su teléfono. Aun así ven lo justo: equipo, estado, presupuesto, garantía y tus notas. **Nunca** su teléfono completo ni lo que escribiste como problema.
- **Los códigos no se pueden adivinar:** son aleatorios entre más de mil millones de combinaciones, no números seguidos.
- **Si alguien prueba códigos al azar, el sistema lo frena solo:** 5 errores seguidos sobre un código lo bloquean 15 minutos, y 10 en el día lo bloquean 24 horas. Desde una misma conexión, 30 errores por hora la bloquean.
- **Solo vos podés cargar o cambiar órdenes y productos.** Aunque alguien se cree una cuenta, la base no le muestra nada.
- **Lo que anotás en "novedades" queda escrito para siempre** (no se puede editar ni borrar), así hay un registro fiel. **No escribas datos personales en esas notas:** el cliente las ve.
- **Los datos personales se borran solos:** nombre, teléfono y problema, 24 meses después de entregado el equipo.

---

## 2. Qué datos se guardan, dónde y quién los ve

| Dato | Dónde | Quién lo ve | Cuánto se guarda |
|---|---|---|---|
| Nombre e inicial del apellido | `public.orders` | El dueño. El seguimiento muestra "Nombre I." | Hasta 24 meses después de la entrega (luego se anonimiza) |
| Teléfono completo | `public.orders.customer_phone` | Solo el dueño | 24 meses después de la entrega |
| Últimos 3 dígitos | `public.orders.phone_last3` (calculado, no editable) | Nadie lo lee: solo se compara dentro de `track_order` | Ídem |
| Descripción del problema | `public.orders.problem` | Solo el dueño | 24 meses después de la entrega |
| Equipo, estado, presupuesto, garantía | `public.orders` | El dueño; el cliente con código + teléfono | Sin límite (no son datos personales) |
| Novedades (notas públicas) | `public.order_events` | El dueño; el cliente con código + teléfono | Sin límite. **Regla:** no escribir datos personales |
| Intentos de seguimiento | `private.track_attempts` (solo HMAC) | Nadie desde el API | 30 días |
| Clave de los HMAC (pepper) | `private.secrets` | Nadie desde el API | Permanente; se puede rotar (§9) |
| Catálogo | `public.products` | Cualquiera (solo los activos) | — |
| Cuenta del dueño | `auth.users` (Supabase Auth) | Supabase | — |

---

## 3. Fronteras de confianza

```
                 ┌──────────────── Internet (no confiable) ────────────────┐
 Cliente ──HTTPS──► Next.js en el servidor (Hito 2)
                     │  Zod (formato) → Turnstile (bots) → límite por IP (Upstash)
                     └──► Postgres como atc_tracker ──► SOLO public.track_order(...)
 Cualquiera ─anon key─► Supabase API (PostgREST) ──► SOLO SELECT de productos activos (RLS)
 Dueño ──link mágico──► Supabase Auth ──► JWT "authenticated" ──► RLS: is_owner() ──► CRUD
                 └──────────────────────────────────────────────────────────┘
 Administración (panel/CLI de Supabase, rol postgres/service_role): migraciones y emergencias. La app NO la usa.
```

**Decisión clave: `track_order` NO es ejecutable por `anon`.**
- **El problema:** la anon key está en el navegador por diseño, así que cualquiera puede llamar a la API de Supabase directamente. Si `anon` pudiera ejecutar `track_order`, un atacante se saltearía Turnstile y el límite por IP del servidor.
- **La solución:** solo la ejecuta `atc_tracker`, un rol sin permisos sobre ninguna tabla cuya contraseña vive únicamente en las variables de entorno del servidor (`0200:130`, `0300:207`).
- **Respaldo:** aunque el servidor fallara, la base aplica sus propios bloqueos (`0300:160`).

---

## 4. Matriz de permisos

Verificada por **RLS-2**, **FN-2** y **FN-3** contra `information_schema` y `pg_proc`, **con los permisos de fábrica de Supabase aplicados**: Supabase da ALL a anon y authenticated sobre lo nuevo en `public`, y Postgres da EXECUTE a PUBLIC sobre toda función nueva.

| Rol | `products` | `orders` | `order_events` | `settings` | `private.*` | Funciones que puede ejecutar |
|---|---|---|---|---|---|---|
| `anon` (público) | SELECT donde `active` | — | — | — | — | ninguna |
| `authenticated` (no dueño) | SELECT donde `active` | 0 filas; escribir falla | 0 filas; escribir falla | 0 filas | — | `is_owner`, `gen_public_code` (sin efecto) |
| `authenticated` (dueño) | todo | todo | INSERT y SELECT (inmutable) | SELECT; UPDATE solo de `business_name` | — | ídem |
| `atc_tracker` (servidor) | — | — | — | — | — | **solo** `track_order` |
| `service_role` / `postgres` | administración (BYPASSRLS) | | | | | |

**Dos reglas para que el sistema siga cerrado con el tiempo:**
- **Todo lo nuevo nace cerrado** (`0200:33-38`). Una tabla o función que se agregue más adelante no queda visible para el API hasta que una migración la conceda explícitamente.
- **Por qué RLS sin `FORCE`** (`0200:14-23`): las funciones SECURITY DEFINER (`is_owner`, `track_order`) pertenecen al mismo rol dueño de las tablas y tienen que leerlas sin depender de si ese rol tiene BYPASSRLS en el proveedor. Ningún rol del API es dueño de tablas (**RLS-1**), así que para ellos la RLS rige siempre.

---

## 5. Amenaza → control → dónde → prueba

| # | Amenaza | Control | Dónde | Prueba |
|---|---|---|---|---|
| 1 | **IDOR / enumeración de órdenes** | Código público aleatorio Crockford de 30 bits + últimos 3 dígitos del teléfono. El UUID interno nunca sale. Las órdenes anonimizadas dejan de ser rastreables. | `0300:46` (`gen_public_code`), `0100:62` (formato), `0300:119` (`track_order`) | GEN-1, TRK-1, TRK-3, RET-1 |
| 2 | **Fuerza bruta** | <ul><li>Bloqueo por código intentado: 5 fallas/15 min y 10/24 h.</li><li>Bloqueo por IP: 30 fallas/1 h.</li><li>Se cuenta exista o no el código, así no revela cuáles existen.</li></ul>Del lado del servidor (Hito 2) se suman Turnstile y Upstash. | `0300:145-163` | TRK-5, TRK-6 |
| 3 | **Tablas expuestas con la anon key** | RLS en todas las tablas; se revocan los permisos de fábrica de Supabase; GRANTs mínimos. | `0200:20-38`, `0200:67-80` | RLS-1, RLS-2, RLS-3, RLS-4 |
| 4 | **Uso o filtración de la service_role** | La app no la usa. El seguimiento va con `atc_tracker`, que solo ejecuta `track_order`, con `statement_timeout` de 2 s. | `0200:126-137`, `0300:206-207` | FN-2, FN-3 |
| 5 | **Inyección SQL / datos inválidos** | CHECKs de formato y largo en todos los campos. Sin SQL dinámico. Parámetros siempre ligados. Normalización con tope de 64 caracteres. | `0100`, `0300:85-103` | TRK-2, TRK-4 |
| 6 | **Acceso indebido a datos del local** | `is_owner()` (SECURITY DEFINER, `search_path` fijo). Políticas solo para el dueño. `owner_user_id` no editable desde el API (permiso por columna). Autor de las novedades no falsificable. | `0200:46-61`, `0200:80`, `0200:88-118` | RLS-5, RLS-6, RLS-7 |
| 7 | **Secuestro del `search_path`** | Toda función de `public` y `private` fija `search_path = pg_catalog, public, pg_temp`. Solo hay 2 funciones SECURITY DEFINER, las esperadas. | todas las funciones | FN-1 |
| 8 | **Alteración del historial** | `order_events` sin UPDATE ni DELETE para nadie del API (bitácora). | `0200:74`, `0200:102-109` | RLS-7 |
| 9 | **Datos personales de más** (Ley 25.326) | Respuesta mínima. Intentos guardados solo como HMAC-SHA256 con pepper. Purga a los 30 días. Anonimización a los 24 meses. | `0300:19-38`, `0300:141-142`, `0300:183-203`, `0300:214-249` | TRK-1, TRK-7, RET-1 |
| 10 | **Archivos subidos** | *Pendiente (Hito 3):* bucket privado, validación de tipo y tamaño, sin EXIF, URLs firmadas. | — | — |
| 11 | **Cabeceras HTTP, XSS, clickjacking** | *Pendiente (Hito 2):* CSP con nonce, HSTS, `frame-ancestors 'none'`, `nosniff`. | — | — |
| 12 | **Pagos** | **Fuera de alcance:** no se cobra online; el sitio nunca toca datos de tarjeta. | — | — |
| 13 | **Pérdida de datos** | Backups y prueba de restauración (§8, §9). | — | — |

---

## 6. Cuentas de fuerza bruta

- **Espacio de códigos:** 6 caracteres del alfabeto Crockford (32 símbolos, sin I, L, O ni U) = 32⁶ = **1.073.741.824** (2³⁰).
- **Segundo factor:** últimos 3 dígitos del teléfono = 1.000 opciones, unos 10 bits.
- **Código filtrado** (por ejemplo, una foto del comprobante en redes):
  - El atacante tiene que adivinar el teléfono: en promedio 500 intentos, como máximo 1.000.
  - El bloqueo por código permite como mucho **10 fallas cada 24 h**, venga de donde venga, porque cuenta por código y no por IP. Eso da **unos 50 días en promedio y hasta 100**.
  - Los intentos quedan registrados, y además se puede cambiar el código (§9).
- **Sin código** (enumeración a ciegas):
  - Hay que acertar código **y** teléfono a la vez, porque un código correcto con teléfono incorrecto da la misma respuesta que uno inexistente (**TRK-3**).
  - Con 200 órdenes activas, la probabilidad por intento es 200 / (2³⁰ × 1.000) ≈ **1 en 5.400 millones**.
  - Con 30 intentos por hora por IP (720 por día), una sola IP tardaría unos **20.000 años** en promedio, y mil IPs, unos 20 años. Sin contar Turnstile ni el límite del servidor (Hito 2).
  - Esta cuenta supone que el servidor le pasa a la base la IP real del cliente (§8 punto 8). Si no, el bloqueo por IP se esquiva. El bloqueo por código no depende de la IP: el caso del código filtrado vale igual.
- **Condiciones de carrera:** el conteo y el registro no son atómicos. Muchas peticiones simultáneas podrían colar algunos intentos de más por ventana. Se acepta (§10) porque el límite del servidor las frena antes.
- **Tiempo de respuesta:** "no existe" y "teléfono incorrecto" hacen la misma búsqueda por índice (`orders_tracking_idx`). Se comprobó con EXPLAIN sobre 5.000 órdenes: el teléfono va en la condición del índice, así que en ninguno de los dos casos se lee la fila. Una respuesta exitosa tarda un poco más, pero solo revela lo que ya revela la respuesta en sí.

---

## 7. Datos personales (Ley 25.326)

- **Consentimiento:** el comprobante de ingreso tiene que informar qué datos se guardan (nombre, teléfono, descripción del problema), para qué (gestionar la reparación y avisar por WhatsApp) y cuánto tiempo (24 meses después de la entrega).
- **Minimización:** solo nombre + inicial y teléfono; el seguimiento muestra lo mínimo (**TRK-1**).
- **Retención:**
  - `private.anonymize_closed_orders()` (`0300:229`) borra nombre, teléfono y problema de las órdenes entregadas hace más de 24 meses.
  - `private.purge_attempts()` (`0300:214`) borra los intentos de más de 30 días (**RET-1**).
  - Se programan con pg_cron (`0400`).
- **Derechos de acceso, rectificación y supresión:** el cliente los ejerce por WhatsApp o mail. El dueño corrige o borra la orden desde el panel (Hito 3) o con SQL (§9).
- **Inscripción de bases:** si corresponde inscribir la base ante la AAIP depende del caso. **Consultarlo con un profesional;** este documento no lo afirma.

---

## 8. Checklist de producción (antes de publicar)

> No se pudo consultar la documentación de Supabase desde el entorno de desarrollo (bloqueada por la red). Los pasos marcados **(verificar)** se confirman en el panel al configurar.

1. **Proyecto:**
   - Crear el proyecto en Supabase, en la región más cercana (São Paulo).
   - Aplicar `atc-app/supabase/migrations/` **en orden** (CLI `supabase db push` o el SQL Editor).
   - **Nunca** aplicar `seed.sql` en producción.
2. **Auth:**
   - Desactivar los registros públicos ("Allow new users to sign up") **(verificar el nombre exacto)**.
   - Dejar solo Email con link mágico y crear el usuario del dueño desde Auth → Users.
3. **Fijar al dueño**, en el SQL Editor:
   ```sql
   update public.settings set owner_user_id = '<UUID del usuario del dueño>' where id = 1;
   ```
4. **Activar `atc_tracker`:**
   - Generar una contraseña larga (`openssl rand -base64 33`).
   - Activarla desde `psql`, conectado como `postgres`:
     ```
     \password atc_tracker
     alter role atc_tracker login;
     ```
   - `\password` pide la contraseña sin mostrarla y calcula el hash SCRAM en tu máquina, así que la contraseña en claro no viaja ni queda en los logs.
   - **No usar `alter role … password '…'` en el SQL Editor:** la sentencia, con la contraseña en claro, puede quedar en el historial del editor y en los logs de la base **(verificar)**.
   - Guardarla **solo** en las variables de entorno del servidor (`TRACKER_DATABASE_URL`). Nunca en el repo ni en el chat.
   - **(verificar)** cómo se conecta un rol propio a través del pooler de Supabase (formato de usuario).
5. **pg_cron:** activar la extensión (Database → Extensions) y volver a ejecutar `0400_tareas.sql`.
6. **Backups:** el plan con backups diarios, o un `pg_dump` semanal a otro lugar. **Probar una restauración** antes de publicar y cada 6 meses.
7. **Auditoría rápida en producción** (tiene que dar lo mismo que en las pruebas):
   ```sql
   -- RLS en todas las tablas (esperado: ninguna fila)
   select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public','private') and c.relkind = 'r' and not c.relrowsecurity;
   -- Qué puede ejecutar cada rol del API (esperado: atc_tracker → track_order; anon → nada)
   select r.rolname, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace,
          (values ('anon'), ('authenticated'), ('atc_tracker')) r(rolname)
    where n.nspname in ('public','private') and has_function_privilege(r.rolname, p.oid, 'EXECUTE');
   ```
8. **Servidor (Hito 2):**
   - Claves de Turnstile y Upstash, encabezados de seguridad y CSP.
   - **La IP que se le pasa a `track_order` tiene que ser la que fija la plataforma de hosting**, nunca el primer valor de `X-Forwarded-For`: ese lo escribe el cliente, y cambiándolo se esquivaría el bloqueo por IP. Lleva prueba propia en el Hito 2.
9. **No mergear a `main`** mientras haya datos de ejemplo (GitHub Pages publica el repo).

---

## 9. Qué hacer si…

**Un cliente quedó bloqueado porque otro probó su código:**
```sql
delete from private.track_attempts
 where code_hash = encode(extensions.hmac(convert_to('AT-XXXX-XX', 'UTF8'),
                                          (select pepper from private.secrets where id = 1), 'sha256'), 'hex');
```

**Se filtró un código** (por ejemplo, una foto del comprobante): el teléfono sigue protegiendo la orden. Si preocupa, se cambia el código y se le pasa el nuevo al cliente:
```sql
update public.orders set public_code = public.gen_public_code()
 where public_code = 'AT-XXXX-XX' returning public_code;
```

**Robaron el celular o la compu del dueño:**
- Cerrar todas sus sesiones en Supabase (Auth → Users → el usuario) **(verificar la opción exacta)**.
- Cambiar la contraseña del mail del dueño, que es lo que recibe el link mágico.

**Se expuso la contraseña de `atc_tracker`:** generar una nueva y cargarla desde `psql` con `\password atc_tracker`, igual que en §8 punto 4. Después, actualizar `TRACKER_DATABASE_URL` en el servidor y volver a desplegar. Ese rol solo puede ejecutar `track_order`, así que el daño posible es acotado.

**Se expuso el pepper:**
```sql
update private.secrets set pepper = extensions.gen_random_bytes(32) where id = 1;
```
Los contadores de bloqueo vuelven a cero (se acepta).

**Sospecha de abuso:** revisar el volumen por hora y por resultado:
```sql
select date_trunc('hour', created_at) h, outcome, count(*) from private.track_attempts group by 1, 2 order by 1 desc;
```

**Pérdida de datos:** restaurar el último backup en un proyecto nuevo, verificarlo con la auditoría rápida (§8 punto 7) y recién después apuntar el servidor ahí.

---

## 10. Riesgos residuales aceptados

| Riesgo | Por qué se acepta | Mitigación |
|---|---|---|
| Alguien que conoce un código puede **bloquear a ese cliente** 24 h fallando a propósito | El bloqueo es lo que impide adivinar el teléfono | El cliente escribe por WhatsApp y el dueño libera el código (§9) |
| Condiciones de carrera en el conteo | Bajo impacto: pocos intentos extra por ventana | Límite del servidor (Hito 2) |
| Diferencia de tiempo entre acierto y fallo | Solo revela lo que ya dice la respuesta | — |
| La anon key es pública | Es así por diseño de Supabase | Con ella solo se lee el catálogo activo (RLS-3, RLS-4) |
| Crecimiento de `track_attempts` por abuso | Cada intento suma una fila | Límite del servidor + purga a 30 días |
| `service_role`/`postgres` tienen permiso total | Son la llave de administración | Nunca se usan en la app; solo en el panel o la CLI |
| Las notas de novedades las ve el cliente | Es su función | Regla: no escribir datos personales en las notas |
| El bloqueo por IP confía en la IP que le pasa el servidor | La base solo ve la conexión del servidor, no la del cliente | El servidor toma la IP que fija la plataforma (§8 punto 8). El bloqueo por código no depende de la IP |
| Comportamientos propios de Supabase probados con un **shim**, no contra Supabase real | Sin cuenta durante el desarrollo | Auditoría rápida en producción (§8 punto 7) |

---

## 11. Registro de cambios de seguridad

| Fecha | Cambio |
|---|---|
| 2026-10-08 | **Hito 1:** esquema, RLS, revocación de los permisos de fábrica, `is_owner`, rol `atc_tracker`, `track_order` con bloqueos, HMAC con pepper, retención y 19 pruebas. Se corrige la documentación previa: el código tiene 30 bits (no 40), y ~40 bits sumando el teléfono. `track_order` deja de estar pensada para `anon`. Queda documentado que el bloqueo por IP depende de que el servidor pase la IP real. La contraseña de `atc_tracker` se carga con `\password` (nunca en claro en el SQL Editor). |
