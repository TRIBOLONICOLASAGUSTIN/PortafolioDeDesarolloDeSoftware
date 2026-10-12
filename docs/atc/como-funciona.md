# Cómo funciona el código de AT Computación

Esta guía explica el sitio de punta a punta: qué hace cada carpeta, qué pasa desde que alguien abre la página hasta que ve la tienda, y cómo viajan un pedido, una consulta de reparación y el ingreso del dueño. Los controles de seguridad, con sus pruebas, están en [`seguridad.md`](seguridad.md). Las reglas de diseño y del negocio, en [`CLAUDE.md`](../../CLAUDE.md).

> Todo lo que se ve hoy (productos, precios, stock, reseñas, WhatsApp, dirección, montos del panel) es **de ejemplo** hasta que el dueño pase los datos reales.

---

## 1. En pocas palabras

- **Next.js 16 + React 19**: el servidor arma cada página y el navegador la vuelve interactiva.
- **Una sola página pública** (`/`) con la tienda, el servicio técnico, el seguimiento de reparaciones y el cotizador. Además están las páginas legales (`/privacidad`, `/cookies`, `/terminos` y `/arrepentimiento`).
- **Cuatro rutas que reciben datos** (`/api/...`): seguimiento, pedidos de la bolsa, ingreso del dueño y salida.
- **Un panel del dueño** (`/panel`) que solo existe para él, con su sesión. Para cualquier otra persona es un 404.
- **Una base Postgres (Supabase)** que guarda órdenes de reparación y pedidos. Desde la web solo se llega a ella por dos funciones: `track_order` y `crear_pedido`.
- **No se cobra online.** La bolsa registra el pedido, aparta el stock 48 h y abre WhatsApp con el código del pedido.

---

## 2. Mapa de carpetas (`atc-app/`)

| Carpeta o archivo | Qué hay |
|---|---|
| `proxy.ts` | Corre antes de cada página. Inventa el **nonce** del pedido y arma la **CSP**. Con la sesión del dueño, agrega `noindex` y sin caché al panel. |
| `next.config.ts` | Encabezados de seguridad fijos, tope de 1 KB para cuerpos de páginas y la regla que manda `/panel` a una dirección inexistente si no hay cookie de sesión. |
| `app/layout.tsx` | El `<html>`: metadatos (título, Open Graph, `noindex` mientras no se publique), la fuente Inter servida por el propio sitio y el script del tema claro/oscuro, que lleva el nonce. |
| `app/page.tsx` | La portada. Junta las secciones y decide en el servidor si mostrar el botón del dueño. |
| `app/api/*/route.ts` | Las 4 rutas: `seguimiento`, `pedidos`, `ingresar` y `salir`. |
| `app/panel/` | Las páginas del panel. Cada una verifica la sesión en el servidor (`exigirPanel`). |
| `app/ingresar/` | El formulario de ingreso del dueño. No está enlazado desde ningún lado. |
| `app/privacidad`, `cookies`, `terminos`, `arrepentimiento` | Páginas legales. Son borradores que tiene que revisar un abogado. |
| `app/robots.ts`, `sitemap.ts`, `opengraph-image.tsx`, `icon.svg` | Lo que ven los buscadores y las redes. Nunca nombran el panel. |
| `app/styles/` | Un CSS por sección (`01-tokens` … `18-pedidos`). Los colores y las sombras salen de los tokens de `01-tokens.css`. |
| `components/` | Un componente por pieza de la tienda (`nav`, `hero`, `shop`, `tracker`, `layers`…). |
| `components/panel/` | Las piezas del panel (resumen, gráfico, movimientos, inventario, pedidos, hojas y formularios). |
| `lib/data/` | Datos de ejemplo tipados (catálogo, servicios, cotizador, pedidos y movimientos del panel). |
| `lib/panel/` | Cálculos puros del panel (períodos, totales, gráfico, stock, precios, CSV, validación con Zod). No tocan la pantalla: se pueden probar solos. |
| `lib/server/` | Código que **solo** corre en el servidor (`import 'server-only'`): configuración y modos, conexión a la base, límites, Turnstile, sesión del dueño y TOTP. |
| `lib/whatsapp.ts`, `format.ts`, `hours.ts` | Mensajes de WhatsApp, formato de montos y porcentajes, horario del local. |
| `supabase/migrations/` | La base, en orden. Cada cambio es una migración nueva. |
| `scripts/` | `db-local.sh` (Postgres temporal para las pruebas), `admin-setup.mjs` (claves del dueño), `check-doc-ids.mjs` y `carga.mjs` (prueba de carga). |
| `tests/` | `db/` (la base), `api/` (las rutas contra `next start`), `e2e/` (el sitio en el navegador) y `helpers/`. |

**Regla de oro:** un archivo con `'use client'` arriba corre en el navegador, y todo lo que importa viaja en el JavaScript que descarga el cliente. Por eso los secretos y la base viven solo en `lib/server/`, y los datos de ejemplo que no tienen que verse (las órdenes demo) se arman en el servidor.

---

## 3. Qué pasa cuando alguien abre la página

1. **`proxy.ts`** genera un número al azar (el *nonce*) y arma la Content-Security-Policy: el navegador solo va a ejecutar scripts que lleven ese nonce o que esos scripts carguen (`'strict-dynamic'`). Así, aunque alguien lograra meter un `<script>` en la página, no correría.
2. **`next.config.ts`** suma los encabezados fijos (HSTS, `nosniff`, `frame-ancestors 'none'`, `Permissions-Policy`…).
3. **`app/layout.tsx`** arma el `<html>`. El script del tema lee `atc-theme` del navegador antes de pintar, así no hay un destello claro en modo oscuro.
4. **`app/page.tsx`** (componente del servidor) lee el nonce, pregunta `esSuperadmin()` (verifica la firma de la cookie de sesión) y devuelve el HTML de todas las secciones.
5. **En el navegador,** React "hidrata" la página. `AppShell` (`components/app-shell.tsx`) guarda el estado compartido de la tienda: qué ventana está abierta (ficha, bolsa o búsqueda), la categoría y la marca elegidas, el menú, el saludo de WhatsApp, los avisos y la bolsa.

Por el nonce, cada página se arma en el momento (no hay HTML guardado de antemano). Es el precio de la CSP estricta, y por eso el CDN/WAF del punto 10 de `seguridad.md` §8 es importante antes de publicar.

---

## 4. La tienda

- **Catálogo** (`lib/data/catalog.ts`): productos con categoría, marca, precio, stock y la ilustración SVG que les toca (`components/sprites.tsx`, símbolos `r-*`).
- **Estante** (`components/shop.tsx`): filtra por categoría y por marca. El carrusel de marcas (`marquee.tsx`) lleva a los productos de esa marca. Si no hay, lo dice y ofrece WhatsApp.
- **Ficha rápida, bolsa y búsqueda** (`components/layers.tsx`): son ventanas encima de la página. Cerradas llevan `inert` (el teclado no entra) y abiertas bloquean el scroll de atrás (`lib/scroll-lock.ts`).
- **Bolsa:** se guarda en el navegador (`localStorage`, clave `atc-bag`) solo con los productos, la entrega y el medio de pago. El nombre y la dirección quedan en memoria y nunca se guardan. Topes: 3 unidades por producto (`topeBolsa`).
- **Seguimiento de reparaciones** (`components/tracker.tsx`) y **cotizador** (`components/estimator.tsx`, tiempos de ejemplo y orientativos).
- **Tema claro/oscuro** (`theme-button.tsx`) y **WhatsApp** (`whatsapp-widget.tsx`, `lib/whatsapp.ts`).
- **Botón del dueño** (`owner-switch.tsx`): lo dibuja el servidor solo si la cookie de sesión tiene una firma válida. Inventar una cookie desde F12 no lo hace aparecer.

---

## 5. Un pedido de la bolsa, paso a paso

1. **El cliente toca "Finalizar"** (`layers.tsx`). La pestaña de WhatsApp se abre en ese mismo toque (si se abriera después, el navegador la bloquearía).
2. **Turnstile** (`lib/turnstile-client.ts`): recién ahora se descarga el script de Cloudflare, que en general resuelve el desafío sin que el cliente vea nada.
3. **`postJson('/api/pedidos', …)`** manda los productos, la entrega, el pago, el nombre si lo puso y el token.
4. **`app/api/pedidos/route.ts`** controla, en este orden:
   1. que venga del mismo sitio;
   2. que el JSON tenga 2 KB como mucho y sea válido (Zod: hasta 3 unidades por producto y 10 en total, sin claves de más; un precio en el cuerpo se rechaza);
   3. que la configuración esté completa (en producción, si falta algo, responde 503);
   4. la IP, que sale del encabezado de la plataforma y nunca de `X-Forwarded-For`;
   5. el límite por red (5 cada 10 minutos) y, en IPv6, por bloque /48;
   6. Turnstile;
   7. el techo de pedidos de todo el sitio.
5. **La base** (`lib/server/tienda.ts` → `rpc` en `lib/server/db.ts`) ejecuta `crear_pedido` con el rol `atc_tienda`, que no puede leer ni escribir tablas: solo ejecutar esa función. Adentro, la función:
   1. vuelve a validar todo y toma los precios de la base;
   2. limita a 5 pedidos por hora por red (guardada como HMAC, nunca la IP);
   3. bloquea las filas de los productos y revisa que alcance el stock y que los pedidos sin pagar no aparten más de la mitad;
   4. descuenta el stock y crea el pedido con un código `P-XXXX-XX` al azar.
6. **La respuesta** vuelve con el código, y la bolsa escribe en WhatsApp el mensaje con el pedido. Si el servidor falla, WhatsApp se abre igual, sin código: la venta no se pierde. Si no alcanza el stock, se avisa con un enlace para consultarlo por WhatsApp.
7. **Después:** si no se paga en 48 h, `autocancelar_pedidos()` (pg_cron cada 10 minutos) lo cancela y el stock vuelve. Pagado y entregado lo marca el dueño. A los 30 días se borra la red de origen y a los 24 meses se anonimiza.

**Pago por transferencia.** El cliente le manda el comprobante al dueño por WhatsApp; nadie sube archivos desde la tienda.
1. En el panel, la hoja del pedido tiene **"Registrar transferencia"** (`TransferenciaForm` en `components/panel/forms.tsx`). Pide:
   - el nombre de quien pagó;
   - el monto, que arranca en el total, siempre es mayor a 0 y no deja escribir el signo menos;
   - el comprobante: foto JPG o PNG, o PDF, de hasta 2 MB, con el botón "Elegir archivo". Se puede soltar el archivo en el recuadro. El tipo se reconoce por los primeros bytes, nunca por la extensión. Una foto se **redibuja** en el navegador (`redibujarFoto`, `lib/foto.ts`): se decodifica, se dibuja en un lienzo derecha y se guarda de nuevo, achicada si pasa de 2 MB; así no lleva ningún dato oculto (ubicación, modelo del celular, miniatura, ni bytes escondidos de una foto dañada). La vista previa ya es la foto redibujada. Después pasa igual por `limpiarComprobante` (`lib/comprobante.ts`).
2. El pedido pasa a pagado y la venta entra en Ganancias con el medio "Transferencia" y el nombre de quien pagó.
3. Al registrar, el comprobante se **cifra en el navegador** con la llave pública del dueño (`cifrarComprobante`, `lib/cifrado-comprobante.ts`: ECDH P-256 + HKDF + AES-256-GCM). Quien lo cifra no lo puede volver a abrir.
4. En el detalle del pedido: "Ver comprobante" pide la **frase** del dueño (una vez por visita). `app/panel/layout.tsx` le pasa al panel la llave privada bloqueada (`ATC_COMPROBANTES_PRIVADA`); el panel la desbloquea con la frase (`desbloquearPrivada`, PBKDF2 600.000) y guarda la llave abierta solo en memoria, sin poder exportarla (`panel-shell.tsx`). El comprobante se muestra adentro del panel, con "Descargar" y "Cerrar con llave". La frase nunca sale del navegador.
5. "Ya lo revisé: borrar comprobante" (quedan el nombre y el monto) pide haber ingresado hace menos de 15 minutos: el servidor pasa hace cuánto se ingresó (`sesionActual` en `lib/server/admin.ts`, desde `app/panel/layout.tsx`) y, si pasó más, el panel ofrece "Volver a ingresar" (cierra la sesión y va a `/ingresar`).
6. Hoy el panel muestra pedidos de ejemplo: el comprobante se redibuja y se cifra de verdad, pero queda solo en memoria durante la visita.
7. **Lo real ya está hecho para la Etapa 2:**
   - `POST /api/panel/pagos` (solo con la sesión del dueño) limpia el archivo otra vez, lo cifra con la llave pública del dueño (`ATC_COMPROBANTES_PUBLICA`) y llama a `registrar_pago` con el rol `atc_panel`, que vuelve a validar todo, rechaza lo que no sea un sobre cifrado y lo guarda en `private.comprobantes`.
   - `GET /api/panel/pagos/[id]/comprobante` lo devuelve **cifrado** (JSON sin caché, `nosniff`): el servidor no lo puede abrir; lo abre el panel con la frase. `DELETE` lo borra (`borrar_comprobante`) y pide el ingreso de menos de 15 minutos (si no, 403 `reingresar`).
   - Sin sesión, esas rutas responden con cualquier método lo mismo que una dirección inexistente: `lib/server/no-existe.ts` y `app/api/[...resto]/route.ts`.
   - El comprobante se borra a los 90 días, o antes a mano. Quedan el nombre y el monto. Nunca se piden CBU, alias ni número de cuenta.

---

## 6. Una consulta de reparación, paso a paso

1. El cliente escribe el código de su comprobante (`AT-XXXX-XX`) y los últimos 3 dígitos de su teléfono. `cuerpoCodigo` (`lib/data/tracking.ts`) limpia lo que escribió (mayúsculas, sin el prefijo, I/L → 1 y O → 0), igual que la base.
2. Turnstile se carga recién al consultar.
3. **`/api/seguimiento`** sigue el mismo orden que los pedidos: mismo sitio, JSON de 1 KB, configuración, IP, límite (20 cada 10 minutos por red) y Turnstile.
4. **`track_order`** corre con el rol `atc_tracker`, que solo puede ejecutar esa función. La función:
   - bloquea por código intentado (5 fallas en 15 minutos o 10 en 24 h) y por red (30 en 1 h);
   - guarda cada intento como HMAC;
   - responde **lo mismo** si el código no existe, si el teléfono está mal o si el formato es inválido;
   - si acierta, devuelve solo lo mínimo: el nombre con la inicial del apellido, el equipo, el estado, el presupuesto, la garantía y las novedades. Nunca el teléfono.
5. Fuera de producción y sin base, la ruta responde con 3 órdenes de ejemplo (modo demo).

Las cuentas de por qué esto no se puede adivinar están en `seguridad.md` §6.

---

## 7. El ingreso del dueño

1. **`/ingresar`** no está enlazado desde ningún lado y lleva `noindex`. Pide el usuario, la contraseña y el código de 6 dígitos de la app del celular (TOTP).
2. **`/api/ingresar`** verifica:
   1. mismo sitio, JSON chico y la configuración completa;
   2. en modo local, que se entre desde esta compu;
   3. la IP y el límite por red (5 cada 15 minutos);
   4. Turnstile;
   5. **scrypt** de la contraseña: el hash vive en el entorno, nunca la contraseña. Corren como mucho 2 cálculos a la vez y 8 esperan turno;
   6. el código TOTP: cada código sirve una sola vez, y con 10 códigos fallidos en 24 h el ingreso se bloquea.
3. Siempre se calcula todo, y las fallas responden igual: no se puede saber qué dato estuvo mal.
4. Si todo está bien, responde con una **cookie firmada** (HMAC) que es `HttpOnly` (JavaScript no la lee), `SameSite=Strict` (otro sitio no la puede usar) y dura 8 h. En producción lleva `Secure` y el prefijo `__Host-`.
5. **"Salir"** (`/api/salir`) borra la cookie, y la pantalla solo vuelve a la tienda si el servidor confirmó.

**Por qué F12 no sirve:** no hay ningún "rol" en el navegador. Cada página del panel vuelve a verificar la firma de la cookie en el servidor, y sin el secreto (`ATC_SESSION_SECRET`) no se puede fabricar una válida.

---

## 8. El panel del dueño

- **Acceso en capas:**
  - sin cookie, `next.config.ts` reescribe `/panel` a una dirección inexistente (el mismo 404 que cualquier otra);
  - con cookie, `app/panel/layout.tsx` y **cada página** llaman a `exigirPanel()`, porque los layouts no se vuelven a evaluar al navegar dentro del panel;
  - el título de cada página (`panelMeta`) solo aparece con sesión.
- **Estado** (`components/panel/panel-shell.tsx`): los movimientos de ejemplo, lo cargado en la visita, el inventario, los pedidos, la hoja abierta (detalle o formulario), el cajón del menú en el celular y los avisos. **En la maqueta nada se guarda:** al recargar vuelve a los datos de ejemplo.
- **Datos de ejemplo deterministas** (`lib/data/panel.ts`, `lib/data/pedidos.ts`): se generan a partir de la fecha del local, que llega del servidor (`storeStamp`). Así el servidor y el navegador dibujan lo mismo.
- **Cálculos puros** (`lib/panel/`):
  - `stats.ts`: períodos y totales de Ganancias;
  - `chart.ts`: el gráfico;
  - `inventario.ts`: stock en mano, reservado y disponible (una venta descuenta, una PC armada descuenta sus piezas);
  - `pedidos.ts`: estados pendiente, pagado, retrasado y autocancelado;
  - `precios.ts`: aumentos y redondeos;
  - `csv.ts`: planillas para Excel;
  - `schemas.ts`: validación de los formularios.
- **Secciones** (menú lateral):
  - **Ganancias:** Resumen y Movimientos.
  - **Pedidos:** pendientes, pagados, retrasados y autocancelados.
  - **Catálogo:** Productos, Inventario, Proveedores, Lista de precios, Categorías y Marcas.
- **Etapa 2** (pendiente): conectar el panel a la base con un rol propio del servidor, usado solo después de verificar la sesión (`pendientes.md`).

---

## 9. La base de datos

| Tabla | Qué guarda | Quién la ve |
|---|---|---|
| `public.products` | Catálogo y stock | `anon` solo los activos; el dueño, todo |
| `public.orders` / `order_events` | Órdenes de reparación y sus novedades (bitácora que no se edita ni se borra) | Solo el dueño |
| `public.sales_orders` / `sales_order_items` | Pedidos de la bolsa y sus productos | Solo el dueño, que solo puede cambiar el estado |
| `public.settings` | Datos del local y quién es el dueño | Solo el dueño |
| `private.track_attempts` | Intentos de seguimiento, como HMAC | Nadie desde la web |
| `private.secrets` | El pepper de los HMAC | Nadie desde la web |

- **Todo nace cerrado:** RLS en todas las tablas, y se revocan los permisos que Supabase da de fábrica a `anon` y `authenticated` (y el EXECUTE que Postgres da a todos).
- **Las dos puertas públicas** son funciones `SECURITY DEFINER` con `search_path` fijo:
  - `track_order` solo la ejecuta `atc_tracker`;
  - `crear_pedido` solo la ejecuta `atc_tienda`.
  - Ninguna de las dos la ejecuta `anon`: la anon key es pública y permitiría saltearse Turnstile y los límites.
  - Cada rol tiene un tope de 10 conexiones.
- **Tareas programadas** (pg_cron):
  - autocancelar pedidos, cada 10 minutos;
  - borrar intentos de más de 30 días;
  - anonimizar órdenes entregadas y pedidos cerrados a los 24 meses.
- **Migraciones** (`supabase/migrations/`, en orden): esquema, seguridad, seguimiento, tareas, tope de `atc_tracker`, pedidos y topes de pedidos.
- La app **no usa la service_role**: solo las migraciones.

---

## 10. Los modos del servidor (`lib/server/config.ts`)

| Modo | Cuándo | Qué hace |
|---|---|---|
| `demo` | Fuera de producción y sin base | Seguimiento con órdenes de ejemplo; la bolsa sigue por WhatsApp sin registrar |
| `local` | Base en `127.0.0.1` (pruebas o desarrollo) | Límites en memoria; Turnstile solo si hay clave |
| `prod` | Producción o una base remota | Exige **toda** la configuración (Upstash, Turnstile, TLS con la CA de Supabase, `ATC_IP_HEADER`); si falta algo, 503 |

`ATC_LOCAL=1` se ignora en una plataforma de hosting, y una base remota siempre exige el modo producción. Las variables están en el README.

---

## 11. Las pruebas

- `npm test` corre todo en orden: tipos, build, base, API, e2e y `check:docs`.
- **Base** (`tests/db/`): contra un Postgres 16 temporal que imita los permisos de fábrica de Supabase (`scripts/db-local.sh`). Prueba RLS, permisos, funciones, bloqueos, códigos y retención.
- **API** (`tests/api/`): levantan `next start` con distintas configuraciones y prueban cada control de las rutas (origen, tamaños, límites, Turnstile falso, modos, 404 del panel, cookies, robots).
- **e2e** (`tests/e2e/verificar.mjs`): Playwright recorre el sitio y el panel en 320–1440 px, en claro y oscuro, con y sin "reducir movimiento". Mide desbordes, contraste AA, áreas táctiles de 44 px, foco, animaciones sin bucles, errores de consola (incluida la CSP) y axe-core.
- **IDs:** cada prueba de seguridad empieza con un ID (`API-n`, `FN-n`, `RLS-n`…) que se cita en `seguridad.md`. `check:docs` falla si no coinciden.
- **Prueba de carga** (`npm run carga`, aparte): mide que las rutas cortan una avalancha antes de tocar la base. No prueba resistencia a DDoS.

---

## 12. Para cambiar algo sin romperlo

1. Ubicar con `grep -n` el componente o el CSS de la sección y editar solo eso. Los nombres de clase los usan las pruebas.
2. Un cambio en la base lleva una migración nueva, una prueba con ID y su fila en `seguridad.md`.
3. Un cambio en una ruta o en los encabezados lleva su prueba `API-n`.
4. `npm test` antes de cada commit.
5. Nada de secretos en el repo ni en el chat; nada con `NEXT_PUBLIC_` que no sea público de verdad.
