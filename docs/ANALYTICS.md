# Analytics / BI (D18)

EdVidura keeps **Moodle AGS as gradebook SoR**. Analytics uses quiz attempts + xAPI under tenant RLS.

## Role dashboards

| Role | Route | Source |
|------|-------|--------|
| **Learner** | `/learn/analytics` | `learner_dashboard(tenant, subject)` |
| **Teacher** | `/teacher/analytics` (+ `.json` / `.csv`) | `tenant_dashboard` |
| **School admin** | `/school-admin/analytics` | same tenant roll-up |

Module: `app.modules.analytics`.

## Metabase

```bash
cd db
docker compose --profile bi up -d
```

Apply BI views (via `scripts/apply_migrations.py` — includes `migration_bi_xapi_tiers.sql` for tier columns).

Open http://localhost:3001 — add Postgres:

| Field | Value |
|-------|--------|
| Host | `db` |
| Port | `5432` |
| Database | `edvidura` |
| User | `edvidura_bi` |
| Password | `edvidura_bi` |

**Always filter by `tenant_id` / `tenant_slug`.** Role `edvidura_bi` bypasses RLS for reporting.

Views: `bi_quiz_attempts`, `bi_xapi_statements` (includes `tier`), `bi_xapi_daily`, `bi_lesson_progress`, `bi_tenant_kpis`.

### Signed embed (optional)

```env
METABASE_URL=http://localhost:3001
METABASE_SECRET_KEY=...          # from Metabase Admin → Embedding
METABASE_EMBED_DASHBOARD_ID=1    # published dashboard id
```

When set, teacher + school-admin Analytics show a static embed iframe (`metabase_embed_url`) with optional `tenant_id` / `tenant_slug` locked params. Otherwise the pages link out to Metabase.

## Related

- [XAPI.md](XAPI.md) — statement store / middleware API / LRS
- Class results — radar, competency map, at-risk
