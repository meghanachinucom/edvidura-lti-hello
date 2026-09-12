# Yet Analytics SQL LRS + Metabase

EdVidura stores xAPI locally (RLS) and can **forward** to [Yet Analytics SQL LRS](https://yetanalytics.github.io/lrsql/).
In-app KPIs stay in FastAPI; **Metabase** reads Postgres BI views for richer charts/embeds.

## Architecture

```
Quiz / lesson / manual
        │
        ▼
  app.modules.xapi  ──store──►  Postgres (xapi_statements + tiers)
        │
        └──forward──►  Yet SQL LRS  (/xapi/statements)
                              │
Metabase ◄── edvidura_bi ─────┘  (BI views on EdVidura DB; LRS UI separate)
```

Moodle AGS remains the **gradebook** SoR. LRS/Metabase are analytics.

## Local Docker

```bash
# Metabase (BI)
cd db && docker compose --profile bi up -d

# Yet Analytics SQL LRS
cd db && docker compose --profile lrs up -d
# Admin UI: http://localhost:8080/admin
#   user: edvidura_admin
#   pass: EdViduraAdmin1!
```

Both: `docker compose --profile bi --profile lrs up -d`

## App env (Yet LRS)

```env
XAPI_LRS_PROVIDER=yet
XAPI_LRS_ENDPOINT=http://localhost:8080/xapi
XAPI_LRS_KEY=edvidura_key
XAPI_LRS_SECRET=edvidura_secret
```

Notes:

- Endpoint may be `/xapi` or `/xapi/statements` — `lrs_client.normalize_statements_url` handles both.
- Auth is **Basic** (API key:secret) + `X-Experience-API-Version: 1.0.3` (Yet Postman docs).
- On success, statements promote to tier `authoritative`.
- Retry: `POST /api/v1/xapi/retry-lrs?tenant_id=`

Module: `app.modules.xapi.lrs_client` (portable — copy into another app).

## Metabase

See [ANALYTICS.md](ANALYTICS.md). Summary:

```env
METABASE_URL=http://localhost:3001
METABASE_SECRET_KEY=…          # Admin → Embedding
METABASE_EMBED_DASHBOARD_ID=1
```

Teacher / school-admin Analytics show a signed iframe when embed vars are set.

Postgres connection inside Compose: Host=`db`, Port=`5432`, DB=`edvidura`, User=`edvidura_bi`, Password=`edvidura_bi`. Always filter by `tenant_id`.

## Ops status API

```http
GET /api/v1/analytics/integrations?probe=true
X-Admin-Key: …
```

Returns Yet LRS + Metabase configuration and optional reachability.

## Production (Railway / cloud)

1. Run Yet SQL LRS (Docker/VM) or use a hosted LRS with the same xAPI Statements API.
2. Set `XAPI_LRS_*` on `edvidura-app`.
3. Run Metabase against a read replica or the BI role; set embed secret + dashboard id.
4. Confirm with `/api/v1/analytics/integrations?probe=true` after a quiz submit + LRS UI check.
