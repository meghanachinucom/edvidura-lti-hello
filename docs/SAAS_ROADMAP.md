# SaaS production roadmap

Implement **one phase at a time**.

| Phase | Goal | Status |
|-------|------|--------|
| **1** | Security foundations | **Done** |
| **2** | Railway deploy + migrations hardened | **Done** |
| **3** | Land uncommitted SaaS modules (dynreg, xAPI, identity, …) | **Done** |
| **4** | RLS on invites / snapshots / tokens + non-bypass DB role | **Done** |
| **5** | Shared launch cache (Postgres) for multi-instance | **Done** |
| **6** | Rate limits, backups, monitoring | **Done** |

## Phase 1 (done)

- `ENVIRONMENT` = `development` \| `staging` \| `production`
- Staging/production refuse weak secrets; require `https` `APP_BASE_URL` + LTI key
- `/dev/*` requires ops auth; **404 in production**
- `/api/v1/institutions` and `/api/v1/students` require ops auth
- OpenAPI `/docs` hidden when `ENVIRONMENT=production`
- Tests: `tests/test_security_boot.py`

## Phase 2 (done)

- `scripts/apply_migrations.py` — `schema_migrations` registry, fail-closed (`MIGRATE_STRICT=1`)
- CI uses the same migration list (owner DSN for DDL, app role for tests)
- `Dockerfile` / `railway.toml` / `scripts/docker_entrypoint.sh` / `docs/RAILWAY.md`
- Default image `ENVIRONMENT=production` (override locally)

Local stays `ENVIRONMENT=development` in `.env`.

## Phase 3 (done)

Landed SaaS modules and HTTP wiring in git:

- Modules: `identity`, `xapi`, `lti_dynreg`, `specials`, `analytics`, `ai_assessment`
- Routes: Keycloak auth, Dynamic Registration, Deep Linking, onboard wizard
- Keycloak compose: `identity/`
- Product docs + module tests

## Phase 4 (done)

- RLS on `lti_registration_invites`, `lti_launch_snapshots`, `quiz_session_tokens`
- `app.capability_lookup` for opaque token / launch_id reads; inserts still require `app.tenant_id`
- `db/ensure_app_role.sql` + Railway docs for NOBYPASSRLS app role
- Isolation proof: `prove_capability_tables_isolation`

## Phase 5 (done)

- `shared_cache` Postgres table + `SharedCache` (memory L1 + DB)
- LTI nonce/state/OIDC pending work across multiple workers
- `/health` reports `cache_backend`

## Phase 6 (done)

- Rate limits on LTI / onboard / admin / API (`RATE_LIMIT_ENABLED`)
- Backup scripts: `scripts/backup_postgres.ps1` / `.sh`
- Optional Sentry via `SENTRY_DSN`
- Health exposes `environment`, `version`, `rate_limit`
