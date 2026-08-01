# EdVidura LTI Hello (multi-tenant spike)

Dummy **Moodle + LTI 1.3** spike for EdVidura with **tenant isolation in the shared app DB**.

**Goal:** Student Launch from Moodle → Hello page shows the **tenant** + name/role, and a row is stored under Postgres **RLS**.

This is **not** the full EdVidura product (no Quiz, Keycloak, LRS).

## Stack

| Choice | Value |
| ------ | ----- |
| App | FastAPI |
| LTI library | PyLTI1p3 |
| Launch mode | New window |
| Tenancy | Shared DB + RLS; tenant from LTI `iss` + `client_id` + deployment |
| Moodle | `moodle/` port **8085** (one local LMS for the spike) |
| EdVidura DB | `db/` Postgres port **5433** |

Tenant resolution contract: [`docs/TENANT_RESOLUTION.md`](docs/TENANT_RESOLUTION.md)

> A second tenant row exists in Postgres only for the RLS cross-check (`/dev/tenancy/cross-check`). Product onboarding later = register another institution’s Moodle LTI (BYO), not a second Docker stack in this repo.

## Quick start

### 1) EdVidura Postgres

```powershell
cd f:\edvidura-lti-hello\db
docker compose up -d
```

### 2) Python app

```powershell
cd f:\edvidura-lti-hello
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy config.example.env .env
python scripts\generate_keys.py
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Check: http://localhost:8000/health

### 3) Moodle

```powershell
cd f:\edvidura-lti-hello\moodle
docker compose up -d
```

Open http://localhost:8085 — `admin` / `Admin@12345`

### 4) Register LTI

**Site administration → Plugins → External tool → Manage tools → Configure manually**

Use base `http://host.docker.internal:8000`:

| Field | Value |
| ----- | ----- |
| Tool name | EdVidura Hello |
| LTI version | LTI 1.3 |
| Public keyset URL | `http://host.docker.internal:8000/.well-known/jwks.json` |
| Initiate login URL | `http://host.docker.internal:8000/lti/login` |
| Redirection URI(s) | `http://host.docker.internal:8000/lti/launch` |
| Tool URL | `http://host.docker.internal:8000/lti/launch` |
| Tool configuration usage | Show in activity chooser and as a preconfigured tool |

Copy into `.env`: `MOODLE_ISSUER`, `MOODLE_CLIENT_ID`, `MOODLE_DEPLOYMENT_IDS`, and auth/token/keyset URLs.

```powershell
python scripts\seed_platforms.py
```

In the course: **More → LTI External tools** → show in chooser → add **EdVidura Hello** activity.

### 5) Pass criteria

| Check | Expected |
| ----- | -------- |
| Launch from Moodle | Hello shows **tenant-a** + stored launch id |
| http://localhost:8000/dev/tenancy/cross-check | `"ok": true`, zero leaks |
| Unknown client_id | Login/launch rejected |

## Project layout

```text
edvidura-lti-hello/
  app/                 FastAPI + LTI + tenancy + RLS helpers
  db/                  Shared Postgres + init.sql
  docs/TENANT_RESOLUTION.md
  moodle/              Local Moodle (:8085)
  scripts/             keys + seed_platforms.py
```

## Troubleshooting

| Problem | Fix |
| ------- | --- |
| Moodle cannot fetch JWKS | Use `host.docker.internal` in Moodle tool URLs |
| Cookie / blank / State not found | New window launch; prefer single uvicorn (no broken reload) |
| No active LTI platforms | Run `python scripts\seed_platforms.py` after filling `.env` |
| Moodle redirect loop | `REVERSEPROXY=true` in compose (port map 8085 → 8080) |
| External tool missing in chooser | Course → More → LTI External tools → show in chooser |
