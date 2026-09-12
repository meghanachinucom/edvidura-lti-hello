#!/bin/sh
# Railway adapter for erseco/alpine-moodle.
set -e

if [ -n "${DATABASE_URL:-}" ]; then
  eval "$(php /usr/local/lib/parse_database_url.php)"
  export DB_FETCHBUFFERSIZE="${DB_FETCHBUFFERSIZE:-0}"
  export DB_DBHANDLEOPTIONS="${DB_DBHANDLEOPTIONS:-true}"
fi

if [ -z "${SITE_URL:-}" ] || [ "$SITE_URL" = "http://localhost" ] || [ "$SITE_URL" = "http://localhost:8085" ]; then
  if [ -n "${RAILWAY_PUBLIC_DOMAIN:-}" ]; then
    export SITE_URL="https://${RAILWAY_PUBLIC_DOMAIN}"
  fi
fi
export SITE_URL="${SITE_URL%/}"
export SSLPROXY="${SSLPROXY:-true}"
export REVERSEPROXY="${REVERSEPROXY:-false}"
export AUTO_UPDATE_MOODLE="${AUTO_UPDATE_MOODLE:-true}"

PORT="${PORT:-8080}"
export PORT
if [ "$PORT" != "8080" ]; then
  find /etc/nginx /etc/nginx/http.d /etc/nginx/conf.d /etc/nginx/server-conf.d \
    -type f -name "*.conf" 2>/dev/null | while read -r f; do
    sed -i "s/listen[[:space:]]\+8080/listen ${PORT}/g" "$f" || true
  done
fi

if [ -d /opt/edvidura-theme ]; then
  mkdir -p /var/www/html/public/theme /var/www/html/theme
  if [ -d /var/www/html/public/theme ]; then
    rm -rf /var/www/html/public/theme/edvidura
    cp -a /opt/edvidura-theme /var/www/html/public/theme/edvidura
  fi
  rm -rf /var/www/html/theme/edvidura
  cp -a /opt/edvidura-theme /var/www/html/theme/edvidura 2>/dev/null || true
fi

echo "Moodle Railway boot SITE_URL=${SITE_URL:-unset} SSLPROXY=${SSLPROXY} DB_HOST=${DB_HOST:-unset}"

if [ "${SEED_SCHOOL:-1}" = "1" ]; then
  export POST_CONFIGURE_COMMANDS="${POST_CONFIGURE_COMMANDS:-php /opt/edvidura-seed/seed_railway_school.php}"
fi

exec /bin/docker-entrypoint.sh "$@"
