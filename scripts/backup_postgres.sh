#!/usr/bin/env bash
# Nightly / manual Postgres backup for local Docker or any host with pg_dump.
# Usage:
#   ./scripts/backup_postgres.sh
#   DATABASE_URL=postgresql://... ./scripts/backup_postgres.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/edvidura-$STAMP.dump"

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "Dumping via DATABASE_URL → $OUT"
  pg_dump "$DATABASE_URL" --format=custom --file="$OUT"
elif docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'db-db-1'; then
  echo "Dumping via docker db-db-1 → $OUT"
  docker exec db-db-1 pg_dump -U edvidura -d edvidura --format=custom -f /tmp/edvidura.dump
  docker cp db-db-1:/tmp/edvidura.dump "$OUT"
else
  echo "Set DATABASE_URL or start db/ docker compose (db-db-1)." >&2
  exit 1
fi

# Keep last 14 dumps locally
ls -1t "$BACKUP_DIR"/edvidura-*.dump 2>/dev/null | tail -n +15 | xargs -r rm -f
echo "OK $OUT"
ls -lh "$OUT"
