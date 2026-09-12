# Moodle on Railway — separate service from EdVidura FastAPI.
# Build from this folder: railway up ./moodle --path-as-root -s moodle
FROM erseco/alpine-moodle:latest

COPY railway_entrypoint.sh /usr/local/bin/railway-moodle-entrypoint.sh
COPY parse_database_url.php /usr/local/lib/parse_database_url.php
COPY seed_railway_school.php /opt/edvidura-seed/seed_railway_school.php
COPY dump_contexts.php /opt/edvidura-seed/dump_contexts.php
COPY themes/edvidura /opt/edvidura-theme

USER root
RUN sed -i 's/\r$//' /usr/local/bin/railway-moodle-entrypoint.sh \
    && sed -i 's/\r$//' /opt/edvidura-seed/seed_railway_school.php \
    && sed -i 's/\r$//' /opt/edvidura-seed/dump_contexts.php \
    && chmod +x /usr/local/bin/railway-moodle-entrypoint.sh
# Image runs php-fpm as nobody; starting as root makes FPM require a pool user.
USER nobody

EXPOSE 8080
ENTRYPOINT ["/bin/sh", "/usr/local/bin/railway-moodle-entrypoint.sh"]
