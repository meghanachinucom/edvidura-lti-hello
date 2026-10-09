# Yet Analytics SQL LRS + Metabase

**Product status: complete.** EdVidura’s local xAPI store (RLS) is the analytics SoR.
Yet Analytics LRS and Metabase are **optional overlays** when the operator configures them.

## For teachers & schools (plain words)

| Question | Where to look |
|----------|----------------|
| Who scored what on the quiz? | **Class results** / **Analytics** / **Activity** in EdVidura |
| Official grade in Moodle? | Moodle gradebook |
| Raw learning-event archive / Metabase BI? | **EdVidura owners only** at `/ops` (not school UI) |

Metabase charts use EdVidura Postgres (`quiz_attempts`, `xapi_statements`, `lesson_progress`, `tenants`).
The owner dashboard (**EdVidura owner overview**) shows separate number cards, a per-school table, daily activity, and recent attempts — not a pie of mixed KPIs. Empty panels usually mean little student activity yet.

## Architecture

```
Quiz / lesson / manual / Ask Vidura
        │
        ▼
  app.modules.xapi  ──store──►  Postgres (xapi_statements + tiers)  ← SoR
        │
        └──forward──►  Yet SQL LRS  (/xapi/statements)   [optional]
        
  In-app Analytics / Activity  ← always available to schools
  Metabase / Yet admin         ← EdVidura owners at /ops
```

Moodle AGS remains the **gradebook** SoR. LRS/Metabase are owner analytics overlays.

**Next (simulations):** [FEDERATE_HLA.md](FEDERATE_HLA.md) — Federate xAPI bridges HLA sims into the same Yet LRS; not needed for school LTI today.

## Owner console (not school UI)

| Role | Route |
|------|--------|
| EdVidura owner login | `/ops/login` (`ADMIN_API_KEY` or Keycloak ops) |
| Owner dashboard | `/ops/dashboard` (Metabase embed + Yet retry) |
| Ops API | `GET /api/v1/analytics/integrations?probe=true` |

School `/teacher/integrations` and `/school-admin/integrations` redirect to **Activity**.

## Local Docker

```bash
cd db && docker compose --profile bi --profile lrs up -d
```

Yet admin: http://localhost:8080/admin (`edvidura_admin` / `EdViduraAdmin1!`)  
Metabase: http://localhost:3001

## App env

```env
# Optional Yet forward
XAPI_LRS_PROVIDER=yet
XAPI_LRS_ENDPOINT=http://localhost:8080/xapi
XAPI_LRS_KEY=edvidura_key
XAPI_LRS_SECRET=edvidura_secret

# Optional Metabase embed
METABASE_URL=http://localhost:3001
METABASE_SECRET_KEY=…          # Admin → Embedding
METABASE_EMBED_DASHBOARD_ID=1
```

Without these vars, Activity recordings + school/learner dashboards still work end-to-end.

## Production (Railway)

```bash
python scripts/deploy_yet_metabase_railway.py
python scripts/bootstrap_metabase_railway.py
railway up -s edvidura-app --detach   # if bootstrap did not already redeploy
```

1. Yet admin (`/admin`) — Basic auth key/secret from deploy script defaults.
2. Metabase bootstrap creates admin, connects EdVidura Postgres, enables embedding, publishes **EdVidura overview** dashboard, and sets:
   `METABASE_URL`, `METABASE_SECRET_KEY`, `METABASE_EMBED_DASHBOARD_ID` on `edvidura-app`.
3. Confirm: `/health` → `integrations.metabase_embed_ready: true` and `/ops/dashboard` embed iframe.

### Demo seed (Metabase + Yet)

Populate Riverside quiz/xAPI rows (Metabase `bi_*` views) and forward statements to Yet:

```bash
railway connect Postgres-PA_L --tunnel-only -P 15432
# other shell — set DATABASE_URL to the printed tunnel URL (?sslmode=disable)
# plus XAPI_LRS_* / APP_BASE_URL from edvidura-app
python scripts/seed_yet_metabase_demo.py
```

Then sync Metabase (Admin → Databases → EdVidura → Sync) or re-run bootstrap sync.

Module: `app.modules.xapi.lrs_client`, `app.modules.analytics.integrations`.
