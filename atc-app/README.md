# atc-app — AT Computación

El sitio de AT Computación en **Next.js 16 + React 19**, sobre una base Postgres/Supabase con seguridad probada.

| Hito | Estado |
|---|---|
| 1 · Base de datos y seguridad | Hecho (`tests/db`) |
| 2 · Sitio público en React, seguimiento y bolsa que registra el pedido | Hecho (`tests/api`, `tests/e2e`). **Falta configurar** Turnstile, Upstash, el hosting y el borde (CDN/WAF) |
| 3 · Panel del dueño | Acceso hecho: un solo superadmin (contraseña + código del celular) entra por `/ingresar`; sin sesión, `/panel` da 404. Ganancias, pedidos y catálogo con datos de ejemplo hasta conectar la base (pendiente) |

- **Cómo funciona el código**, de punta a punta: [`docs/atc/como-funciona.md`](../docs/atc/como-funciona.md).
- Seguridad, con cada control y la prueba que lo demuestra: [`docs/atc/seguridad.md`](../docs/atc/seguridad.md).
- Reglas del proyecto: [`CLAUDE.md`](../CLAUDE.md).

> **Datos de ejemplo.** El catálogo, los precios, los tiempos, las reseñas, el WhatsApp y la dirección son de prueba, y `tests/db/seed.sql` también (vive con las pruebas, fuera de `supabase/`, para que el CLI de Supabase nunca lo aplique). Mientras sea así, la página lleva `noindex` y **no se mergea a `main`**.

## Verlo en la Mac

```bash
cd atc-app
npm ci
npm run dev          # http://localhost:3000
```

Así corre en **modo demo**: el seguimiento responde con las 3 órdenes de ejemplo (`AT-7KQ2-9M` / 321, `AT-3FJ8-WX` / 548 y `AT-9TR4-6P` / 777), sin base.
En **Windows PowerShell**, usar `npm.cmd` en lugar de `npm` (por ejemplo `npm.cmd run dev`).

**Panel del dueño** (solo el superadmin):
```bash
npm run admin:setup  # una vez: usuario, contraseña y clave para la app del celular → escribe .env.local (no se sube)
npm run dev          # entrar por http://localhost:3000/ingresar
```

## Verlo en Windows con VS Code

Hace falta, una sola vez:
- **Node** (la versión LTS, 22 o más nueva): `winget install OpenJS.NodeJS.LTS` (o el instalador de nodejs.org).
- **Git**: `winget install Git.Git`.
- **VS Code**: `winget install Microsoft.VisualStudioCode`.

Después, en VS Code: **Terminal → Nueva terminal** (PowerShell):

```powershell
cd $HOME\Documents
git clone -b main-0xr8wc https://github.com/TRIBOLONICOLASAGUSTIN/PortafolioDeDesarolloDeSoftware.git atc
cd atc\atc-app
code .                   # abre esta carpeta en VS Code (opcional)
npm.cmd ci
npm.cmd run dev          # http://localhost:3000, modo demo, sin base
```

- **`npm.cmd` y no `npm`:** PowerShell suele bloquear `npm.ps1` ("la ejecución de scripts está deshabilitada"); `npm.cmd` evita ese bloqueo sin tocar la configuración de seguridad de Windows.
- **Panel del dueño:** una vez `npm.cmd run admin:setup` (pide usuario y contraseña, muestra la clave para la app del celular y escribe `.env.local`, que nunca se sube). Después, `npm.cmd run dev` y entrar por `http://localhost:3000/ingresar`.
- **Como en producción:** `npm.cmd run build` y después `npm.cmd start`.
- **Para actualizar** a lo último de la rama: `git pull` y otra vez `npm.cmd ci`.
- **Sin base**, la bolsa lleva a WhatsApp sin código de pedido (es lo esperado en modo demo) y el seguimiento responde con las órdenes de ejemplo.
- **Ojo en una Wi-Fi pública:** `npm run dev` también escucha en la red (para probar en el celular). Cerralo cuando no lo uses.

### Correr las pruebas en Windows (WSL)

La base de pruebas y `npm test` necesitan bash y Postgres 16: en Windows corren dentro de **WSL** (Ubuntu). En PowerShell **como administrador**, una vez:

```powershell
wsl --install -d Ubuntu-24.04   # reiniciar cuando lo pida y crear el usuario de Ubuntu
```

En VS Code, instalar la extensión **WSL** (de Microsoft). Después, en la terminal de Ubuntu:

```bash
sudo apt update && sudo apt install -y postgresql-16 git curl
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc && nvm install 22
git clone -b main-0xr8wc https://github.com/TRIBOLONICOLASAGUSTIN/PortafolioDeDesarolloDeSoftware.git ~/atc
cd ~/atc/atc-app && code .        # abre VS Code conectado a WSL
npm ci
npm i -g playwright@1.56.1 && npx playwright install --with-deps chromium
PW="$(npm root -g)/playwright/index.mjs" npm test
npm run db:stop                   # al terminar: apaga y borra la base temporal
```

- Clonar **dentro** de Ubuntu (`~/atc`), no en `C:\`: es mucho más rápido, y `db-local.sh` no se rompe con finales de línea de Windows (igual, `.gitattributes` los fuerza a LF).
- `npm run carga` (la prueba de carga) también corre ahí, después del build.

### Con la base real local en la Mac

Necesita `brew install postgresql@16`:
```bash
npm run db:reset
ATC_TRACKER_DATABASE_URL="postgres://atc_tracker:$(cat /tmp/atc-pgdata/.atc-pass)@127.0.0.1:54329/atc_test" ATC_DEMO=1 npm run dev
npm run db:stop      # al terminar: apaga y borra la base temporal
```

## Pruebas

```bash
npm test             # todo: tipos, build, base, API, e2e y check:docs
```

| Comando | Qué prueba |
|---|---|
| `npm run typecheck` | Tipos de TypeScript |
| `npm run build` | Que compile para producción |
| `npm run test:db` | Base: RLS, permisos, `track_order`, bloqueos y retención (RLS/FN/TRK/GEN/RET) |
| `npm run test:api` | Ruta y encabezados: respuesta mínima, uniforme, origen, límite, IP, falla cerrada y CSP (API-1…7); panel solo con sesión del superadmin, ingreso con contraseña + código de un solo uso, límite, mismo sitio y falla cerrada (API-8…14); F12, bolsa, buscadores, avalanchas y modos (API-15…33) |
| `npm run test:e2e` | El sitio en el navegador: flujos, responsive, contraste AA, movimiento, accesibilidad, notebook visible y sin errores de consola |
| `npm run check:docs` | Que `seguridad.md` y las pruebas citen los mismos IDs |
| `npm run carga` | Fuera de `npm test`: prueba de carga con autocannon contra `next start` (Linux o WSL, después del build y con la base local). Los números están en `seguridad.md` §11. **No** prueba resistencia a DDoS |

- **Base temporal:** las pruebas usan un Postgres 16 temporal (`scripts/db-local.sh`) que imita Supabase, incluidos sus permisos de fábrica. Escucha solo en `127.0.0.1:54329` y solo se toca a sí mismo.
- **`atc_tracker` en las pruebas:** solo en ese cluster local puede iniciar sesión sin contraseña.
- **Servidor en las pruebas:** `test:api` y `test:e2e` levantan `next start` con la app compilada, así que hace falta `npm run build` antes.
- **Playwright:** el e2e usa Playwright. Si no está en el proyecto, se le indica la ruta con `PW=…/playwright/index.mjs`.

## Variables de entorno (servidor; nunca en el repo ni en el chat)

| Variable | Para qué | Producción |
|---|---|---|
| `ATC_TRACKER_DATABASE_URL` | Conexión como `atc_tracker`, que solo puede ejecutar `track_order` | Obligatoria |
| `ATC_TIENDA_DATABASE_URL` | Conexión como `atc_tienda`, que solo puede ejecutar `crear_pedido` (la bolsa registra el pedido) | Para registrar pedidos (sin ella, la bolsa sigue por WhatsApp sin código) |
| `ATC_DB_CA` | Certificado (PEM) de la CA de Supabase: la base va por TLS verificado | Obligatoria |
| `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile | Obligatoria |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Límite por IP compartido | Obligatoria |
| `ATC_IP_HEADER` | Encabezado con la IP real que pone el hosting (p. ej. `cf-connecting-ip`). **Nunca** `x-forwarded-for` | Obligatoria |
| `ATC_RL_MAX` | Consultas de seguimiento por red cada 10 minutos (por defecto, 20) | Opcional |
| `ATC_RL_PED48` / `ATC_RL_PEDG` | Pedidos de la bolsa por bloque IPv6 /48 (20) y para todo el sitio (60) cada 10 minutos | Opcional |
| `ATC_SITE_URL` | Dirección pública del sitio (canónica, Open Graph y sitemap) | Al publicar |
| `ATC_INDEXAR=1` | Permite indexar en Google: solo con datos reales | Al publicar |
| `ATC_ADMIN_USER` / `ATC_ADMIN_PASS_HASH` / `ATC_ADMIN_TOTP_SECRET` / `ATC_SESSION_SECRET` | Superadmin del panel (usuario, **hash** de la contraseña, clave del código del celular y secreto de las sesiones). Se generan con `npm run admin:setup` | Obligatorias para el panel (sin ellas, el ingreso responde 503 y `/panel` no existe) |
| `ATC_DEMO=1` | Muestra los botones "Probá la demo" del seguimiento | **Nunca** |
| `ATC_LOCAL=1` | Pruebas con la base en 127.0.0.1 (se ignora con una base remota o en una plataforma de hosting) | **Nunca** |

- **Si falta una obligatoria,** `/api/seguimiento` responde 503: falla cerrado y nunca cae en modo demo.
- **Lo que hay que verificar al configurar** está en la checklist de [`seguridad.md` §8](../docs/atc/seguridad.md#8-checklist-de-producción-antes-de-publicar).

## Qué hay adentro

```
atc-app/
├─ proxy.ts                 CSP con nonce por pedido
├─ next.config.ts           encabezados de seguridad, tope de cuerpo y /panel sin cookie → 404
├─ app/
│  ├─ layout.tsx            <html>, metadatos, tema sin parpadeo (script con nonce), fuente Inter servida localmente
│  ├─ page.tsx              la portada: compone las secciones
│  ├─ styles/               CSS por sección (01-tokens … 18-pedidos)
│  ├─ panel/                panel del dueño (solo el superadmin con sesión; datos de ejemplo por ahora)
│  ├─ ingresar/             ingreso del superadmin (sin enlaces, noindex)
│  ├─ privacidad · cookies · terminos · arrepentimiento   páginas legales (borradores)
│  ├─ robots.ts · sitemap.ts · opengraph-image.tsx · icon.svg
│  ├─ not-found.tsx         404 en castellano
│  └─ api/                  seguimiento · pedidos · ingresar · salir
├─ components/              nav, hero, shop, tracker, estimator, info, layers (ficha, bolsa, búsqueda)…
│  └─ panel/                resumen, gráfico, movimientos, pedidos, catálogo, hojas y formularios
├─ lib/
│  ├─ data/                 datos de ejemplo tipados (catálogo, servicios, cotizador, panel, pedidos)
│  ├─ panel/                cálculos puros del panel (períodos, gráfico, stock, pedidos, precios, CSV, validación)
│  ├─ format.ts · hours.ts · whatsapp.ts · turnstile-client.ts
│  └─ server/               solo servidor: config (modos), db, http, ratelimit, turnstile, tracking, tienda, admin, totp
├─ supabase/migrations/     la base, en orden
├─ scripts/                 db-local.sh · admin-setup.mjs · check-doc-ids.mjs · carga.mjs
└─ tests/                   db/ (con seed.sql de ejemplo) · api/ · e2e/ · helpers/
```

## Reglas para cambiar cosas

1. **Base:** cada cambio va en una migración nueva, con su prueba con ID y su fila en `seguridad.md` §5 y §11.
2. **Funciones de la base:** `search_path` fijo; EXECUTE revocado a `public`, `anon` y `authenticated` antes de concederlo (FN-1 y FN-3 comparan contra la lista exacta).
3. **Ruta y encabezados:** cada cambio lleva su prueba `API-n` documentada.
4. **Scripts:** ningún script inline sin el nonce. `dangerouslySetInnerHTML` solo con contenido propio (los SVG).
5. **Antes de cada commit:** `npm test`.
6. **Claves:**
   - La `service_role`, la contraseña de `atc_tracker`, el pepper y las claves de Turnstile y Upstash nunca van al repo ni al chat.
   - La app no usa la `service_role`.
