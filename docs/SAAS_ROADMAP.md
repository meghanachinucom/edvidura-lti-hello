# SaaS production roadmap

Implement **one phase at a time**.

| Phase | Goal | Status |
|-------|------|--------|
| **1** | Security foundations | **Done** |
| **2** | Railway deploy + migrations hardened | **Done** |
| **3** | Land uncommitted SaaS modules (dynreg, xAPI, identity, …) | **Done** |
| **4** | RLS on invites / snapshots / tokens + non-bypass DB role | Next |
| **5** | Shared launch cache (Redis/DB) for multi-instance | Pending |
| **6** | Rate limits, backups, monitoring | Pending |

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
