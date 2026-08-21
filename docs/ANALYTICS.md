# Analytics / BI

EdVidura keeps **Moodle AGS as gradebook SoR**. Analytics uses quiz attempts + xAPI.

## In-app (teachers)

| Route | What |
|-------|------|
| `/teacher/analytics` | KPI cards, 30-day attempts, xAPI verb counts |
| `/teacher/analytics.json` | Same payload as JSON |
| `/teacher/analytics.csv` | Flat attempt export |

Module: `app.modules.analytics`.

## Metabase (optional)

```bash
cd db
docker compose --profile bi up -d
```

Apply BI role + views (once):

```bash
Get-Content db/migration_bi_views.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1
Get-Content db/migration_xapi_tiers.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1
```

Open http://localhost:3001 — complete Metabase setup, then add a Postgres database:

| Field | Value |
|-------|--------|
| Host | `db` (same compose network) |
| Port | `5432` |
| Database | `edvidura` |
| User | `edvidura_bi` |
| Password | `edvidura_bi` |

This role is **read-only** and `BYPASSRLS` so Metabase can see all tenants — **always filter dashboards by `tenant_id` / `tenant_slug`**. Treat as the reporting “replica” for local demos (a physical streaming replica can replace it later).

Useful views: `bi_quiz_attempts`, `bi_xapi_statements`, `bi_xapi_daily`, `bi_lesson_progress`, `bi_tenant_kpis`.

Teacher Analytics also links to `METABASE_URL` when set.

## Related

- [`docs/XAPI.md`](XAPI.md) — statement store / optional LRS
- Class results still has radar, competency map, at-risk coach
