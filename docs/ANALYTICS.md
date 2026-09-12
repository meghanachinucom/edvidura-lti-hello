# Analytics / BI (D18)

EdVidura keeps **Moodle AGS as gradebook SoR**. Analytics uses quiz attempts + xAPI under tenant RLS.

## Role dashboards

| Role | Route | Source |
|------|-------|--------|
| **Learner** | `/learn/analytics` | `learner_dashboard(tenant, subject)` |
| **Teacher** | `/teacher/analytics` (+ `.json` / `.csv` / `live.json`) | `tenant_dashboard` + `live_school_users` |
| **School admin** | `/school-admin/analytics` (+ `live.json`) | same |

### Live people (one school)

Auto-refreshes every 10s:

| Metric | Meaning |
|--------|---------|
| **Moodle users / learners / instructors** | Unique people from last **NRPS roster sync** (real Moodle enrolments) |
| **Active now** | Distinct LTI launches in the last 15 minutes |
| **Active today** | Distinct launches since midnight |
| **Quiz learners** | Distinct subjects with quiz attempts (activity, not enrolment) |

Sync roster: teacher → Class results → **Sync Moodle roster** (tool must allow NRPS).

Module: `app.modules.analytics` (+ `app.modules.nrps.school_roster_totals`).

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

## Yet Analytics SQL LRS

Forward statements to Yet SQL LRS (or any xAPI 1.0.3 LRS). Full runbook: [YET_LRS_METABASE.md](YET_LRS_METABASE.md).

```env
XAPI_LRS_PROVIDER=yet
XAPI_LRS_ENDPOINT=http://localhost:8080/xapi
XAPI_LRS_KEY=edvidura_key
XAPI_LRS_SECRET=edvidura_secret
```

```bash
cd db && docker compose --profile lrs up -d
```

Ops: `GET /api/v1/analytics/integrations?probe=true`

## Related

- [XAPI.md](XAPI.md) — statement store / middleware API / LRS
- [YET_LRS_METABASE.md](YET_LRS_METABASE.md) — Yet + Metabase together
- Class results — radar, competency map, at-risk
