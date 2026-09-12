# Deploy EdVidura on Railway

Moodle stays elsewhere (school LMS or local Docker). Railway runs **FastAPI + Postgres**.

## 0. Automate (recommended)

From the repo root:

```bash
# one-time
npm i -g @railway/cli
railway login

# generate secrets + LTI key (writes keys/railway-bootstrap.env — gitignored)
python scripts/railway_bootstrap.py

# create/link project, add Postgres, set variables, generate domain, deploy
python scripts/railway_bootstrap.py --apply
```

Then:

1. Confirm `GET {APP_BASE_URL}/health` → `ok`, `db_ok`
2. `railway variable set RUN_MIGRATIONS=0`
3. Point Moodle at `{APP_BASE_URL}/lti/launch`, `/lti/login`, `/.well-known/jwks.json`

CI: add GitHub secret `RAILWAY_TOKEN` (Railway → Account → Tokens).  
`.github/workflows/railway-deploy.yml` runs `railway up` on push to `main` / `master`.

Without the CLI, use the dashboard steps below and paste values from `keys/railway-bootstrap.env`.

## 1. Create project (manual)

1. [railway.app](https://railway.app) → **New Project** → deploy this GitHub repo
2. **Add Postgres** plugin and link it to the web service (`DATABASE_URL`)
3. **Generate domain** (HTTPS) for the web service

## 2. Environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `ENVIRONMENT` | yes (prod) | set `production` (or `staging`) |
| `APP_BASE_URL` | yes | `https://YOUR-SERVICE.up.railway.app` (no trailing slash) |
| `SESSION_SECRET` | yes | ≥24 char random (not a documented default) |
| `ADMIN_API_KEY` | yes | ≥16 char random for `/onboard` and `/admin/*` |
| `DATABASE_URL` | yes | usually injected by Railway Postgres |
| `LTI_PRIVATE_KEY_PEM` | yes* | full PEM text (use `\n` for newlines in the Railway UI) |
| `RUN_MIGRATIONS` | first boot | set `1` once to apply `db/init.sql` + migrations |
| `LTI_PRIVATE_KEY_PATH` | no | default `keys/private.key` (entrypoint writes PEM here) |
| `MIGRATE_STRICT` | no | default `1` — fail deploy if a migration statement errors unexpectedly |
| `XAPI_LRS_*` | no | optional LRS forward |

\*Or bake a key file into the image (not recommended). Generate locally:

```bash
python scripts/generate_keys.py
# paste keys/private.key into LTI_PRIVATE_KEY_PEM
```

`ENVIRONMENT=production` refuses weak secrets and requires `https://` `APP_BASE_URL` (see Phase 1 security).

## 3. Deploy

`railway.toml` builds with the **Dockerfile**. Start command is the image entrypoint (`uvicorn` on `$PORT`).

Migrations are tracked in table `schema_migrations`. After first successful migrate, set `RUN_MIGRATIONS=0` (or unset). Re-runs skip already-applied files.

One-off migrate from Railway shell:

```bash
python scripts/apply_migrations.py
```

## 4. Wire Moodle LTI

Tool URLs (replace host):

- Launch: `{APP_BASE_URL}/lti/launch`
- Login: `{APP_BASE_URL}/lti/login`
- JWKS: `{APP_BASE_URL}/.well-known/jwks.json`
- Dynamic Registration: `{APP_BASE_URL}/onboard` → connect link

Launch container: **New window**. Enable **Accept grades from the tool** for AGS.

## 5. Smoke

- `GET {APP_BASE_URL}/health` → `ok`, `db_ok`
- Moodle → external tool → EdVidura shell
- `/docs` should **404** when `ENVIRONMENT=production`

## 6. Database role (RLS)

Railway’s default Postgres user is often a **superuser** and **bypasses RLS**. For SaaS you **must** use a non-bypass app role:

```bash
# As owner / superuser
psql "$OWNER_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/ensure_app_role.sql
# Edit the role password, then:
# DATABASE_URL=postgresql://edvidura_app:STRONG@host:port/dbname
```

Checklist:

1. Run [`db/ensure_app_role.sql`](../db/ensure_app_role.sql) as owner.
2. Point app `DATABASE_URL` at `edvidura_app` (NOSUPERUSER, NOBYPASSRLS).
3. Keep owner credentials only for migrations / break-glass (`RUN_MIGRATIONS=1` can still use owner once, then switch).
4. Confirm with: `GET /dev/tenancy/cross-check` (ops auth) or `pytest tests/test_tenant_isolation.py::test_app_role_is_not_bypassrls`.

Capability tables (`lti_registration_invites`, `lti_launch_snapshots`, `quiz_session_tokens`) use RLS too; opaque token/launch lookups set `app.capability_lookup` inside the app only.

## 7. Host Moodle on Railway (optional)

EdVidura and Moodle are **two services**. Do not point Moodle at the EdVidura Postgres plugin.

From the repo root (Railway CLI logged in, project linked):

```bash
python scripts/deploy_moodle_railway.py
```

That script:

1. Creates a `moodle` service (if missing)
2. Adds a **second** Postgres plugin for Moodle only
3. Sets `SSLPROXY=true`, `REVERSEPROXY=false`, admin env vars
4. Mounts a volume at `/var/www/moodledata`
5. Generates `https://….up.railway.app` and deploys `moodle/Dockerfile`

First boot runs Moodle’s installer and can take several minutes. Then:

- Open `{MOODLE_URL}/login/index.php`
- Default admin is `admin` / `Admin@12345` unless you override `MOODLE_USERNAME` / `MOODLE_PASSWORD`
- Register that Moodle issuer on EdVidura (`/admin/tenants/.../lti-platforms`) with `auth.php` / `token.php` / `certs.php` on `{MOODLE_URL}`
- Point the Moodle LTI tool at `{APP_BASE_URL}/lti/launch`, `/lti/login`, `/.well-known/jwks.json`

Manual deploy without the script:

```bash
railway add --service moodle
railway add --database postgres
railway volume add --service moodle --mount-path /var/www/moodledata
railway domain -s moodle
railway up ./moodle --path-as-root -s moodle --detach
```

Set `SITE_URL=https://<moodle-domain>` after the domain exists (or let the image entrypoint use `RAILWAY_PUBLIC_DOMAIN`).

**Cost / RAM:** Moodle wants ~1 GB+. Hobby plans can OOM; bump the service memory if the container restarts during install.

## Notes

- HTTPS is required for LTI cookies (`SameSite=None`).
- Teacher uploads under `app/static/uploads/` are ephemeral on Railway unless you add a volume/object store.
- Do not commit `keys/*.key` — use `LTI_PRIVATE_KEY_PEM`.
- Single replica recommended until Phase 5 (shared launch cache).
- Phase 5+: LTI state uses Postgres `shared_cache` — safe for multiple Railway replicas.
- Phase 6: set `SENTRY_DSN` for error tracking; run `scripts/backup_postgres.sh` on a schedule (or provider PITR).
