#!/usr/bin/env bash
# Postgres 16 temporal SOLO para pruebas locales.
# - Escucha únicamente en 127.0.0.1 (puerto 54329) y por TCP pide contraseña (scram): una al azar por cluster, guardada
#   en $PGDATA/.atc-pass, que solo lee el dueño de la carpeta (0700). El socket queda dentro de esa misma carpeta.
#   Sin contraseña solo entra el dueño de la carpeta por el socket. No usar fuera de pruebas.
# - Imita Supabase con tests/db/shim-supabase.sql y aplica las migraciones + seed.
# Uso: bash scripts/db-local.sh start | stop | reset
set -euo pipefail
cd "$(dirname "$0")/.."

PGDATA="${ATC_PGDATA:-/tmp/atc-pgdata}"
PORT="${ATC_PGPORT:-54329}"
DB="${ATC_DB:-atc_test}"
if [ -n "${PG_BIN:-}" ]; then BIN="$PG_BIN"
elif command -v brew >/dev/null 2>&1 && [ -x "$(brew --prefix postgresql@16 2>/dev/null)/bin/initdb" ]; then
  BIN="$(brew --prefix postgresql@16)/bin"   # Mac: postgresql@16 de Homebrew no queda en el PATH
elif command -v pg_config >/dev/null 2>&1; then BIN="$(pg_config --bindir)"
else BIN="/usr/lib/postgresql/16/bin"; fi
[ -x "$BIN/initdb" ] || { echo "No encuentro Postgres en $BIN. Instalalo (README) o indicá la carpeta con PG_BIN=…" >&2; exit 1; }

# Marca que deja este script: sin ella, stop/reset no tocan la carpeta
# (evita borrar una base real si ATC_PGDATA apunta a otro lado por error).
MARK="$PGDATA/.atc-cluster-de-pruebas"
PASSF="$PGDATA/.atc-pass"

# initdb/pg_ctl no corren como root: en Linux se usa el usuario del sistema "postgres".
run() { if [ "$(id -u)" = "0" ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
PSQL=("$BIN/psql" -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PORT" -U postgres)

start() {
  # Un cluster de una versión anterior de este script (sin contraseña) se rehace.
  if [ -s "$PGDATA/PG_VERSION" ] && [ -f "$MARK" ] && [ ! -s "$PASSF" ]; then stop; fi
  if [ ! -s "$PGDATA/PG_VERSION" ]; then
    if [ -e "$PGDATA" ] && [ "$(id -u)" != "0" ] && [ ! -O "$PGDATA" ]; then
      echo "$PGDATA existe y no es tuya: no la uso. Usá otra carpeta con ATC_PGDATA=…" >&2; exit 1
    fi
    mkdir -p "$PGDATA" && chmod 700 "$PGDATA"
    local pw tmp; pw="$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')"; tmp="$(mktemp)"
    printf '%s' "$pw" > "$tmp"
    if [ "$(id -u)" = "0" ]; then chown postgres "$PGDATA" "$tmp"; fi
    run "$BIN/initdb" -D "$PGDATA" -U postgres --auth-local=trust --auth-host=scram-sha-256 --pwfile="$tmp" -E UTF8 --locale=C >/dev/null
    rm -f "$tmp"
    (umask 077; printf '%s' "$pw" > "$PASSF")
    run touch "$MARK"
  elif [ ! -f "$MARK" ]; then
    echo "$PGDATA no lo creó este script: no lo toco. Usá otra carpeta con ATC_PGDATA=…" >&2; exit 1
  fi
  if ! run "$BIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
    run "$BIN/pg_ctl" -D "$PGDATA" -l "$PGDATA/log.txt" -w \
      -o "-p $PORT -c listen_addresses=127.0.0.1 -k $PGDATA" start >/dev/null
  fi
  PGPASSWORD="$(cat "$PASSF")"; export PGPASSWORD
}

stop() {
  if [ -s "$PGDATA/PG_VERSION" ] && [ -f "$MARK" ]; then
    run "$BIN/pg_ctl" -D "$PGDATA" -m fast stop >/dev/null 2>&1 || true
    rm -rf "$PGDATA"
  elif [ -s "$PGDATA/PG_VERSION" ]; then
    echo "$PGDATA no lo creó este script: no lo detengo ni lo borro." >&2; exit 1
  fi
}

reset() {
  start
  "${PSQL[@]}" -d postgres -c "drop database if exists $DB with (force)" -c "create database $DB"
  # Los roles son de todo el cluster: se recrean para partir siempre de cero.
  "${PSQL[@]}" -d postgres -c "drop role if exists atc_tracker, atc_tienda, atc_panel, anon, authenticated, service_role"
  "${PSQL[@]}" -d "$DB" -f tests/db/shim-supabase.sql
  for f in supabase/migrations/*.sql; do "${PSQL[@]}" -d "$DB" -f "$f"; done
  "${PSQL[@]}" -d "$DB" -f tests/db/seed.sql
  # SOLO en este cluster de pruebas (127.0.0.1): atc_tracker, atc_tienda y atc_panel inician sesión con la contraseña al
  # azar del cluster, para probar /api/seguimiento, /api/pedidos y /api/panel/pagos contra la base real. En producción: seguridad.md §8 punto 4.
  "${PSQL[@]}" -d postgres -c "alter role atc_tracker login password '$PGPASSWORD'" -c "alter role atc_tienda login password '$PGPASSWORD'" -c "alter role atc_panel login password '$PGPASSWORD'"
  echo "Base $DB lista en 127.0.0.1:$PORT (shim + $(ls supabase/migrations/*.sql | wc -l | tr -d ' ') migraciones + seed)."
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  reset) reset ;;
  *) echo "Uso: $0 start|stop|reset" >&2; exit 2 ;;
esac
