# atc-app — AT Computación

El sitio de AT Computación en **Next.js 16 + React 19**, sobre una base Postgres/Supabase con seguridad probada.

| Hito | Estado |
|---|---|
| 1 · Base de datos y seguridad | Hecho: 19 pruebas (`tests/db`) |
| 2 · Sitio público en React y `/api/seguimiento` seguro | Hecho: 7 pruebas de la ruta (`tests/api`) y 80 verificaciones del sitio (`tests/e2e`). **Falta configurar** Turnstile, Upstash y el hosting |
| 3 · Panel del dueño | Etapa 1 en curso: maqueta con datos de ejemplo en `/panel` (solo con `ATC_DEMO=1`). Etapa 2 (login y base) pendiente |

- Seguridad, con cada control y la prueba que lo demuestra: [`docs/atc/seguridad.md`](../docs/atc/seguridad.md).
- Reglas del proyecto: [`CLAUDE.md`](../CLAUDE.md).

> **Datos de ejemplo.** El catálogo, los precios, los tiempos, las reseñas, el WhatsApp y la dirección son de prueba, y `supabase/seed.sql` también. Mientras sea así, la página lleva `noindex` y **no se mergea a `main`**.

## Verlo en la Mac

```bash
cd atc-app
npm ci
npm run dev          # http://localhost:3000
```

Así corre en **modo demo**: el seguimiento responde con las 3 órdenes de ejemplo (`AT-7KQ2-9M` / 321, `AT-3FJ8-WX` / 548 y `AT-9TR4-6P` / 777), sin base.

**Con la base real local** (necesita `brew install postgresql@16`):
```bash
npm run db:reset
ATC_TRACKER_DATABASE_URL=postgres://atc_tracker@127.0.0.1:54329/atc_test ATC_DEMO=1 npm run dev
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
| `npm run test:api` | Ruta y encabezados: respuesta mínima, uniforme, origen, límite, IP, falla cerrada y CSP (API-1…7); panel cerrado sin `ATC_DEMO` y siempre `noindex` (API-8, API-9) |
| `npm run test:e2e` | El sitio en el navegador: flujos, responsive, contraste AA, movimiento, accesibilidad, notebook visible y sin errores de consola |
| `npm run check:docs` | Que `seguridad.md` y las pruebas citen los mismos IDs |

- **Base temporal:** las pruebas usan un Postgres 16 temporal (`scripts/db-local.sh`) que imita Supabase, incluidos sus permisos de fábrica. Escucha solo en `127.0.0.1:54329` y solo se toca a sí mismo.
- **`atc_tracker` en las pruebas:** solo en ese cluster local puede iniciar sesión sin contraseña.
- **Servidor en las pruebas:** `test:api` y `test:e2e` levantan `next start` con la app compilada, así que hace falta `npm run build` antes.
- **Playwright:** el e2e usa Playwright. Si no está en el proyecto, se le indica la ruta con `PW=…/playwright/index.mjs`.

## Variables de entorno (servidor; nunca en el repo ni en el chat)

| Variable | Para qué | Producción |
|---|---|---|
| `ATC_TRACKER_DATABASE_URL` | Conexión como `atc_tracker`, que solo puede ejecutar `track_order` | Obligatoria |
| `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile | Obligatoria |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Límite por IP compartido | Obligatoria |
| `ATC_IP_HEADER` | Encabezado con la IP real que pone el hosting (p. ej. `cf-connecting-ip`). **Nunca** `x-forwarded-for` | Obligatoria |
| `ATC_RL_MAX` | Pedidos por IP cada 10 minutos (por defecto, 20) | Opcional |
| `ATC_INDEXAR=1` | Permite indexar en Google: solo con datos reales | Al publicar |
| `ATC_DEMO=1` | Muestra los botones "Probá la demo" y la maqueta del panel en `/panel` | **Nunca** |
| `ATC_LOCAL=1` | Pruebas con la base en 127.0.0.1 (se ignora con una base remota) | **Nunca** |

- **Si falta una obligatoria,** `/api/seguimiento` responde 503: falla cerrado y nunca cae en modo demo.
- **Lo que hay que verificar al configurar** está en la checklist de [`seguridad.md` §8](../docs/atc/seguridad.md#8-checklist-de-producción-antes-de-publicar).

## Qué hay adentro

```
atc-app/
├─ proxy.ts                 CSP con nonce por pedido
├─ next.config.ts           encabezados de seguridad
├─ app/
│  ├─ layout.tsx            <html>, metadatos, tema sin parpadeo (script con nonce), fuente Inter servida localmente
│  ├─ page.tsx              la portada: compone las secciones
│  ├─ styles/               CSS por sección (01-tokens … 12-responsive)
│  └─ api/seguimiento/      la única puerta pública a una orden
├─ components/              nav, hero, values, shop, tiers, service, tracker, estimator, info, layers, whatsapp-widget…
├─ lib/
│  ├─ data/                 datos de ejemplo tipados (catálogo, servicios, cotizador, órdenes demo, configuración)
│  ├─ format.ts · hours.ts · whatsapp.ts
│  └─ server/               config (modos), ratelimit, turnstile, tracking (pg como atc_tracker)
├─ supabase/                migraciones (0100–0400) y seed de ejemplo
├─ scripts/                 db-local.sh · check-doc-ids.mjs
└─ tests/                   db/ · api/ · e2e/ · helpers/
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
