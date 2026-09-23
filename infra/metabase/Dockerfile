# Metabase — listen on Railway $PORT
FROM metabase/metabase:v0.52.14
ENV JAVA_TIMEZONE=UTC \
    PORT=3000
ENTRYPOINT ["sh", "-c", "export MB_JETTY_PORT=\"${PORT:-3000}\"; exec /app/run_metabase.sh"]
