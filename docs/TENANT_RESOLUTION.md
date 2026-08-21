# Tenant resolution contract (EdVidura LTI Hello)

**Locked by [DEC-006](decisions/DEC-006.md).**

## Rule

`tenant_id` is derived **only** from a verified LTI 1.3 registration match:

1. Platform sends `iss` + `client_id` (+ `lti_deployment_id` / deployment claim).
2. Tool looks up `lti_platforms` where `issuer` + `client_id` match and `active`.
3. Deployment id must be in `deployment_ids[]` (fail closed if missing/unknown).
4. Row’s `tenant_id` is the tenant for the request.
5. Runtime binds `TenantContext` and uses `SET LOCAL app.tenant_id` for RLS.

Never trust:

- `?tenant=` / `X-Tenant-Id` headers (learner paths)
- Course id, email domain, or branding alone
- Client-supplied JWT claims without signature verification

## Topology

| Layer | Model |
| ----- | ----- |
| EdVidura app + DB | Shared FastAPI + Postgres **RLS** (DEC-006 A1) |
| Moodle | **BYO Moodle** (B1); one local `:8085` for dev only |

A second seeded tenant (`tenant-b`) exists so isolation tests can prove RLS.

## Session variable

App connects as non-superuser `edvidura_app` (superusers bypass RLS).

```sql
SELECT set_config('app.tenant_id', '<uuid>', true);  -- LOCAL to transaction
```

Helpers: `app.db.with_tenant` / `app.tenant_context.with_tenant`.

## Fail closed

Unknown issuer/client_id → LTI login/launch rejected.  
Wrong deployment → rejected.  
Cross-tenant SELECT under Tenant A’s setting → zero rows from Tenant B.

## Onboarding

See [`/onboard`](../app/onboard_routes.py) and Admin API `POST /admin/tenants` + `POST /admin/tenants/{id}/lti-platforms` (`X-Admin-Key`).
