#!/bin/sh
set -e

# Railway (and similar) inject PORT. Local docker defaults to 8000.
PORT="${PORT:-8000}"

# Optional: write LTI private key from env (preferred on Railway; keys/ is gitignored).
if [ -n "${LTI_PRIVATE_KEY_PEM:-}" ]; then
  mkdir -p keys
  # Support literal \n in single-line Railway secrets
  printf '%s\n' "$LTI_PRIVATE_KEY_PEM" | sed 's/\\n/\n/g' > keys/private.key
  chmod 600 keys/private.key
  export LTI_PRIVATE_KEY_PATH="${LTI_PRIVATE_KEY_PATH:-keys/private.key}"
fi

if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
  echo "Applying DB migrations (strict)…"
  python scripts/apply_migrations.py
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
