# Yet Analytics SQL LRS — listen on Railway $PORT
FROM yetanalytics/lrsql:latest
ENV LRSQL_API_KEY_DEFAULT=edvidura_key \
    LRSQL_API_SECRET_DEFAULT=edvidura_secret \
    LRSQL_ADMIN_USER_DEFAULT=edvidura_admin \
    LRSQL_ADMIN_PASS_DEFAULT=EdViduraAdmin1! \
    LRSQL_DB_NAME=db/lrsql.sqlite.db \
    LRSQL_ALLOW_ALL_ORIGINS=true \
    PORT=8080
# Official image entrypoint; force HTTP port from Railway PORT
ENTRYPOINT ["sh", "-c", "export LRSQL_HTTP_SERVER_PORT=\"${PORT:-8080}\"; exec /lrsql/bin/run_lrsql.sh"]
