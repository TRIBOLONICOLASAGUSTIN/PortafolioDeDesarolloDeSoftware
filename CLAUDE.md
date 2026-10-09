# CLAUDE.md

Este repo es el portfolio de Nicolás (`index.html`, `Estilos/`, etc.; se publica con GitHub Pages desde `main`).
Adentro vive **AT Computación**: el sitio en `atc-app/` (Next.js 16 + React 19 sobre Supabase), con su documentación en `docs/atc/`. El prototipo HTML se reemplazó por la versión React en el Hito 2 (queda en el historial de git, commit `d6e675d`).
Las reglas de abajo aplican a todo lo de AT Computación.

## El negocio (la verdad manda sobre el diseño)
- Local de venta de tecnología y servicio técnico en Santa Fe, Argentina. **Lo atiende una sola persona**: el dueño, que también es el técnico.
- Nunca prometer capacidad que una persona no tiene:
  - Sin servicio express ni "envíos en el día".
  - Sin "responde en minutos", sin "especialistas" y sin "nuestro equipo".
  - Envíos y retiros: "a coordinar por WhatsApp".
- Sellos de confianza permitidos: "Garantía escrita de 90 días" y "Te atiende el técnico, sin intermediarios". **Prohibido** "oficial" o "certificado" mientras no haya una prueba.
- Sin cifras ni reseñas inventadas que parezcan reales. Las reseñas de ejemplo van marcadas en el código.
- Logos de marcas (carrusel): solo marcas que el local vende de verdad, monocromos, y nunca "oficial", "autorizado" ni "distribuidor".
- Sin plazos fijos de diagnóstico ni de reparación hasta que el dueño los confirme. Los tiempos del cotizador son de ejemplo y se muestran como orientativos.
- Datos de ejemplo hasta que el dueño pase los reales: WhatsApp `5493420000000`, dirección, mail, precios, tiempos del cotizador, stock y reseñas.
- **No mergear a `main`** mientras haya datos de ejemplo: GitHub Pages lo publicaría. Se trabaja en ramas.
- La compra no cobra online: la bolsa arma un mensaje de WhatsApp (entrega, pago y nombre). Nada de datos de tarjeta.

## Estilo (inspirado en apple.com, calmo, que no canse la vista)
- **Espacio:**
  - Escala de espaciado con base 4: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128.
  - Secciones con padding `clamp(88px, 11vw, 144px)`.
  - Un producto destacado ocupa más espacio y queda aislado.
- **Tipografía:**
  - `-apple-system, BlinkMacSystemFont, "SF Pro Display/Text", "Inter", system-ui`. Nunca servir SF Pro como fuente web: su licencia no lo permite.
  - Títulos en peso 600, `text-wrap: balance`, tracking −0,02 a −0,035 em según el tamaño.
  - Cuerpo 17/1,47; texto chico 14/1,43; mínimo absoluto 12 px, y solo en el pie.
- **Colores** (todo par texto/fondo cumple AA ≥ 4,5:1; se verifica con el script):
  - Claro:
    - Fondos `#fff` y alterno `#f5f5f7`.
    - Textos `#1d1d1f` y secundario `#6e6e73`.
    - Acento `#0071e3` (hover `#0062c4`) y links `#0066cc`.
  - Oscuro:
    - Fondos `#000` y alterno `#0f0f10`; tarjetas `#1c1c1e` y `#161617`.
    - Textos `#f5f5f7` y secundario `#a1a1a6`.
    - Links y textos azules `#2997ff`.
  - `--text-3`: en claro vale `#6e6e73` (igual que el secundario, para que el texto chico cumpla AA sobre `#f5f5f7`); en oscuro, `#86868b`. Bordes de campos: `--field` (`#86868b` claro / `#6e6e73` oscuro, 3:1 o más). Verde OK `#1d7a35`.
  - WhatsApp: botón `#157a3e` con texto blanco (5,4:1); el botón flotante puede usar `#25d366` porque no lleva texto.
  - El naranja (`#b64400` / `#ff9f0a`) solo marca "Oferta" y "Últimas unidades". Las etiquetas de sección usan un solo color.
- **Materialidad:**
  - Radios en escala 12 · 18 · 24 · 32 · píldora.
  - Bordes de 0,5 px en retina (`box-shadow: inset 0 0 0 .5px`).
  - Tres niveles de sombra, siempre difusa y tenue:
    - e1 `0 1px 2px rgba(0,0,0,.04), 0 8px 28px rgba(0,0,0,.06)`
    - e2 (hover) `0 2px 8px rgba(0,0,0,.05), 0 18px 50px rgba(0,0,0,.10)`
    - e3 (modales) `0 30px 90px rgba(0,0,0,.22)`
  - En modo oscuro, en vez de sombra se usa un borde fino `rgba(255,255,255,.08)`.
- Las ilustraciones de producto son SVG propios (`<symbol id="r-*">`, en `atc-app/components/sprites.tsx`). Cuando haya fotos reales, van en fondo blanco liso, y cada producto apunta a una sola imagen.

## Movimiento ("menos es más")
- Easing único `--ease: cubic-bezier(.16,1,.3,1)`. Duraciones de 150 ms (color/hover), 300 ms (UI) y 600 ms (apariciones). Nada pasa de 900 ms.
- Solo se animan `transform` y `opacity` (60 fps). Cada animación ocurre una vez y por una razón: orientar, confirmar o suavizar un cambio de estado.
- Hover de tarjetas: escala 1,015 + sombra e2, dentro de `@media (hover:hover)`.
- **Sin bucles.** Única excepción aprobada: el carrusel de marcas `.mq-track`. Es lento (48 s), se pausa con el mouse y fuera de pantalla, y queda quieto con "reducir movimiento". También se permite el indicador de carga mientras se espera algo.
- Siempre respetar `prefers-reduced-motion`.

## Responsive y accesibilidad
- Matriz de pruebas: 320 · 375 · 390 · 820 · 1024 · 1440 px × claro/oscuro × con y sin "reducir movimiento".
- Sin scroll horizontal en ningún ancho.
- Áreas táctiles de 44 px o más.
- Foco visible.
- Las ventanas cerradas llevan `inert`.
- Las maquetas decorativas llevan `aria-hidden`.
- Los títulos no saltan de nivel.

## Seguridad — detalle en `docs/atc/seguridad.md` (manda sobre la guía)
- **Códigos de seguimiento** aleatorios, nunca secuenciales: `AT-XXXX-XX`, 6 caracteres Crockford base32 = **30 bits**. Para ver una orden se piden el código y los últimos 3 dígitos del teléfono (~10 bits más).
- **Datos personales** (Ley 25.326):
  - El seguimiento muestra solo lo mínimo (nombre + inicial).
  - Los intentos se borran a los 30 días.
  - Las órdenes entregadas se anonimizan a los 24 meses.
- **Base** (`atc-app/`, Supabase):
  - RLS en todas las tablas, y se revocan los permisos de fábrica: Supabase les da todo a `anon` y `authenticated`, y Postgres les da EXECUTE a todos. Lo nuevo nace cerrado.
  - `track_order(code, phone3, ip)` (SECURITY DEFINER) es la única puerta pública a una orden. **Solo la ejecuta `atc_tracker`**, un rol del servidor sin acceso a tablas. **Nunca `anon`:** la anon key es pública y permitiría saltearse Turnstile y el límite por IP.
  - Bloqueos dentro de la base: por código intentado, 5 fallas en 15 min o 10 en 24 h; por IP, 30 en 1 h.
  - Misma respuesta para "no existe", "teléfono incorrecto" y "formato inválido". Los intentos se guardan solo como HMAC.
  - La app **no usa la service_role** (solo las migraciones). La contraseña de `atc_tracker` vive solo en las variables de entorno del servidor: nunca en el repo ni en el chat.
- **Servidor** (Hito 2, hecho: `app/api/seguimiento/route.ts`, `lib/server/`, `proxy.ts`):
  - Antes de `track_order`, en este orden:
    - Mismo sitio.
    - JSON de 1 KB como máximo, validado con Zod.
    - IP del encabezado de la plataforma (`ATC_IP_HEADER`, **nunca** `X-Forwarded-For`).
    - Límite por IP (Upstash en producción).
    - Turnstile.
  - En producción, si falta configuración, falla cerrado (503). El modo demo solo existe fuera de producción y sin base.
  - CSP con nonce por pedido, sin `unsafe-inline` ni `unsafe-eval` en scripts. Nunca agregar scripts inline sin el nonce, ni `dangerouslySetInnerHTML` con datos que no sean propios.
- **Panel del dueño:** un solo superadmin (contraseña con hash scrypt + código TOTP de un solo uso + cookie firmada `HttpOnly`/`SameSite=Strict`).
  - La sesión se verifica en el servidor en cada página y acción del panel; sin sesión, 404 (nunca revelar que existe).
  - Sus claves van en el entorno (`.env.local` / hosting), nunca en el repo, en el chat ni con prefijo `NEXT_PUBLIC_`.

## `atc-app/` (proyecto real)
- **Estructura:**
  - `app/`: la página, los estilos por sección en `app/styles/`, la ruta `api/seguimiento` y el panel del dueño en `app/panel/` (solo el superadmin con sesión: contraseña + código del celular, `lib/server/admin.ts`; sin sesión da 404; montos de ejemplo hasta conectar la base) y su ingreso en `app/ingresar/`.
  - `components/`: un componente por pieza; `'use client'` solo donde hay interacción.
  - `lib/data/`: datos de ejemplo.
  - `lib/server/`: código que solo corre en el servidor.
  - `supabase/`: migraciones.
  - `tests/`: pruebas.
- **Antes de cada commit:** `npm test`.
  - Corre tipos, build, base (19), API (14), e2e (295) y `check:docs`.
  - Usa un Postgres 16 temporal que imita Supabase; `npm run db:stop` lo borra.
  - En la nube, el e2e necesita `PW="$(npm root -g)/playwright/index.mjs"`.
- **Cada cambio de base lleva:**
  - Una migración nueva.
  - Una prueba con ID (`RLS|FN|TRK|GEN|RET-n`).
  - Su fila en `seguridad.md` §5 y §11.
- **Cada cambio de la ruta o de los encabezados** lleva su prueba `API-n` documentada.
- `check:docs` falla si los IDs de las pruebas y de `seguridad.md` no coinciden.
- `supabase/seed.sql` es de ejemplo: no va a producción.

## Forma de trabajar (para no gastar tokens de más)
- **Ediciones puntuales:**
  - Se edita el componente o el archivo de estilos de la sección que cambia, con reemplazos verificados (`assert s.count(old)==1`).
  - Los estilos conservan los nombres de clase del diseño (las pruebas los usan).
  - No reescribir archivos enteros.
- **Antes de editar,** ubicar con `grep -n` y leer solo las líneas necesarias.
- **Verificar** con `cd atc-app && npm test`, o por partes: `typecheck`, `build`, `test:db`, `test:api`, `test:e2e` y `check:docs`. El e2e cubre flujos, desborde, contraste AA, bucles, accesibilidad y errores de consola (incluidas las violaciones de CSP).
- **Capturas** solo de la sección que se tocó.
- **No usar multi-agente ni workflows** salvo que el usuario lo pida explícitamente.
- **Un commit + push por lote,** con mensaje en castellano.
- **Pendientes priorizados** en `docs/atc/pendientes.md`: marcarlos al terminarlos.
- **Para ver el sitio en la Mac** (Node 20.9 o más):
  ```bash
  git clone -b <rama> https://github.com/TRIBOLONICOLASAGUSTIN/PortafolioDeDesarolloDeSoftware.git atc && cd atc/atc-app
  npm ci && npm run dev    # http://localhost:3000 — modo demo, sin base
  ```
  - En Windows PowerShell: `npm.cmd` en lugar de `npm`.
  - Panel: una vez `npm run admin:setup` (escribe `.env.local`, que nunca se sube) y después entrar por `/ingresar`. Las claves del superadmin nunca van al repo ni al chat.
