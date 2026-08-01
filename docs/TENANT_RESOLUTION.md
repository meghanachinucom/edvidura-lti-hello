# Tenant resolution contract (EdVidura LTI Hello multi-tenant spike)

## Rule

`tenant_id` is derived **only** from a verified LTI 1.3 registration match:

1. Platform sends `iss` + `client_id` (+ `lti_deployment_id` / deployment claim).
2. Tool looks up `lti_platforms` where `issuer` + `client_id` match and `active`.
3. Deployment id must be in `deployment_ids[]` (fail closed if missing/unknown).
4. Row’s `tenant_id` is the tenant for the request.

Never trust:

- `?tenant=` / `X-Tenant-Id` headers
- Course id, email domain, or branding alone
- Client-supplied JWT claims without signature verification

## Topology (this spike)

| Layer | Model |
| ----- | ----- |
| EdVidura app + DB | Shared FastAPI + Postgres **RLS** on `launch_events` |
| Moodle | One local instance (`:8085`) for launches; extra tenants are LTI registrations (BYO Moodle), not a second compose stack in-repo |

A second seeded tenant (`tenant-b`) exists only so `/dev/tenancy/cross-check` can prove RLS.

## Session variable

App connects as non-superuser `edvidura_app` (superusers bypass RLS).

Writes/reads of `launch_events` run inside a transaction after:

```sql
SELECT set_config('app.tenant_id', '<uuid>', true);  -- LOCAL to transaction
```

RLS policy: `tenant_id = current_setting('app.tenant_id')::uuid`.

## Fail closed

Unknown issuer/client_id → LTI login/launch rejected.  
Wrong deployment → rejected.  
Cross-tenant SELECT under Tenant A’s setting → zero rows from Tenant B.
