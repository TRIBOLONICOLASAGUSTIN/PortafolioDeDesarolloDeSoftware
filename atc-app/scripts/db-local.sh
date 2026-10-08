#!/usr/bin/env bash
# Postgres 16 temporal SOLO para pruebas locales.
# - Escucha únicamente en 127.0.0.1 (puerto 54329) con autenticación "trust": no usar fuera de pruebas.
# - Imita Supabase con tests/db/shim-supabase.sql y aplica las migraciones + seed.
# Uso: bash scripts/db-local.sh start | stop | reset
set -euo pipefail
cd "$(dirname "$0")/.."

PGDATA="${ATC_PGDATA:-/tmp/atc-pgdata}"
PORT="${ATC_PGPORT:-54329}"
DB="${ATC_DB:-atc_test}"
if [ -n "${PG_BIN:-}" ]; then BIN="$PG_BIN"
elif command -v pg_config >/dev/null 2>&1; then BIN="$(pg_config --bindir)"
else BIN="/usr/lib/postgresql/16/bin"; fi

# initdb/pg_ctl no corren como root: en Linux se usa el usuario del sistema "postgres".
run() { if [ "$(id -u)" = "0" ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PORT" -U postgres)

start() {
  if [ ! -s "$PGDATA/PG_VERSION" ]; then
    mkdir -p "$PGDATA"
    if [ "$(id -u)" = "0" ]; then chown postgres "$PGDATA"; fi
    run "$BIN/initdb" -D "$PGDATA" -U postgres -A trust -E UTF8 --locale=C >/dev/null
  fi
  if ! run "$BIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
    run "$BIN/pg_ctl" -D "$PGDATA" -l "$PGDATA/log.txt" -w \
      -o "-p $PORT -c listen_addresses=127.0.0.1 -k /tmp" start >/dev/null
  fi
}

stop() {
  if [ -s "$PGDATA/PG_VERSION" ]; then
    run "$BIN/pg_ctl" -D "$PGDATA" -m fast stop >/dev/null 2>&1 || true
    rm -rf "$PGDATA"
  fi
}

reset() {
  start
  "${PSQL[@]}" -d postgres -c "drop database if exists $DB with (force)" -c "create database $DB"
  # Los roles son de todo el cluster: se recrean para partir siempre de cero.
  "${PSQL[@]}" -d postgres -c "drop role if exists atc_tracker, anon, authenticated, service_role"
  "${PSQL[@]}" -d "$DB" -f tests/db/shim-supabase.sql
  for f in supabase/migrations/*.sql; do "${PSQL[@]}" -d "$DB" -f "$f"; done
  "${PSQL[@]}" -d "$DB" -f supabase/seed.sql
  echo "Base $DB lista en 127.0.0.1:$PORT (shim + $(ls supabase/migrations/*.sql | wc -l | tr -d ' ') migraciones + seed)."
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  reset) reset ;;
  *) echo "Uso: $0 start|stop|reset" >&2; exit 2 ;;
esac
