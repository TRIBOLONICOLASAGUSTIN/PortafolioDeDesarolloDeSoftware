# atc-app — AT Computación, proyecto real

**Hito 1: base de datos y seguridad.** Por ahora contiene solo la base: esquema, permisos, seguimiento de órdenes y retención de datos, cada pieza con su prueba. La web en Next.js llega en el Hito 2.

- Diseño y decisiones de seguridad: [`docs/atc/seguridad.md`](../docs/atc/seguridad.md). Cada control cita su archivo, su línea y el ID de la prueba que lo demuestra.
- Reglas del proyecto: [`CLAUDE.md`](../CLAUDE.md).

> **Datos de ejemplo.** `supabase/seed.sql` carga los productos y las órdenes de la demo (teléfonos `5493420000000…`). **No va a producción.**

## Cómo correrlo en la Mac

```bash
brew install postgresql@16        # Node 20 o más: comprobalo con  node -v
cd atc-app
npm ci                            # instala pg con la versión exacta del package-lock
npm run test:db                   # Postgres temporal + migraciones + seed + 19 pruebas
npm run check:docs                # seguridad.md y las pruebas citan los mismos IDs
npm run db:stop                   # apaga y borra el Postgres temporal
```

- **No hace falta iniciar el Postgres de Homebrew** (`brew services`). El script arma su propio Postgres en `/tmp/atc-pgdata`, que escucha solo en `127.0.0.1:54329`, sin contraseña. Sirve solo para pruebas.
- **Si dice "No encuentro Postgres":** indicale la carpeta con `PG_BIN="$(brew --prefix postgresql@16)/bin" npm run test:db`.
- **El script solo apaga o borra carpetas que creó él** (deja una marca `.atc-cluster-de-pruebas`). Si `ATC_PGDATA` apunta a otra base por error, se niega a tocarla.

| Variable | Por defecto | Para qué |
|---|---|---|
| `PG_BIN` | Homebrew `postgresql@16`, `pg_config` o `/usr/lib/postgresql/16/bin` | Carpeta de `initdb`, `pg_ctl` y `psql` |
| `ATC_PGDATA` | `/tmp/atc-pgdata` | Carpeta del Postgres temporal |
| `ATC_PGPORT` | `54329` | Puerto |
| `ATC_DB` | `atc_test` | Nombre de la base |
| `ATC_DB_URL` | `postgres://postgres@127.0.0.1:54329/atc_test` | Conexión que usan las pruebas |

## Qué hay adentro

```
atc-app/
├─ supabase/migrations/
│  ├─ 20261008000100_esquema.sql      tablas, formatos, límites de largo y triggers
│  ├─ 20261008000200_seguridad.sql    RLS, revocación de permisos de fábrica, is_owner(), rol atc_tracker
│  ├─ 20261008000300_seguimiento.sql  códigos aleatorios, track_order() con bloqueos, purga y anonimización
│  └─ 20261008000400_tareas.sql       programa purga y anonimización con pg_cron (si existe)
├─ supabase/seed.sql                  datos de ejemplo de la demo (no van a producción)
├─ tests/db/
│  ├─ shim-supabase.sql               imita Supabase: roles, auth.uid() y sus permisos de fábrica
│  ├─ helpers.mjs                     conexión, cambio de rol, transacciones que siempre se deshacen
│  └─ seguridad.test.mjs              19 pruebas: RLS-1…7, FN-1…3, TRK-1…7, GEN-1, RET-1
└─ scripts/
   ├─ db-local.sh                     start | stop | reset del Postgres temporal
   └─ check-doc-ids.mjs               cruza los IDs de seguridad.md con los de las pruebas
```

**Qué demuestran las pruebas:**
- Corren contra un Postgres 16 real que imita Supabase, **incluidos sus permisos de fábrica**: Supabase les da todo sobre `public` a `anon` y `authenticated`, y Postgres les da EXECUTE a todos sobre cualquier función nueva.
- Así queda demostrado que las migraciones cierran esos permisos.

**Qué no demuestran:**
- El comportamiento del Supabase real (pooler, Auth, pg_cron). Eso se verifica con la checklist de [`seguridad.md` §8](../docs/atc/seguridad.md#8-checklist-de-producción-antes-de-publicar) antes de publicar.

## Reglas para cambiar la base

1. **Cada cambio va en una migración nueva.** Una migración ya aplicada en producción no se edita.
2. **Toda tabla nueva:**
   - Lleva RLS y sus GRANT mínimos.
   - Suma una prueba con ID.
   - Suma una fila en la tabla de amenazas de `seguridad.md` §5.
   - Va al registro de cambios (§11).
3. **Toda función** lleva `set search_path = pg_catalog, public, pg_temp`, y se le revoca EXECUTE a `public`, `anon` y `authenticated` antes de concederlo a quien corresponda.
   - FN-1 y FN-3 comparan contra la lista exacta de funciones y de quién ejecuta cada una.
   - Una función nueva hace fallar esas pruebas hasta que se la agregue a mano a la lista: es un control a propósito.
4. **Antes de cada commit:** `npm run test:db && npm run check:docs`.
5. **Claves fuera del repo:**
   - La `service_role`, la contraseña de `atc_tracker` y el pepper nunca van al repo ni al chat.
   - La app no usa la `service_role`.
