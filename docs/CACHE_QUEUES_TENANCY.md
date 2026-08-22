# Cache, files, and queues — tenancy rules

Apply when Redis, object storage, or background jobs are introduced.

| Layer | Rule |
| ----- | ---- |
| Shared LTI cache | Postgres `shared_cache` (Phase 5) — opaque protocol keys only; no tenant-wide learner indexes |
| Redis / cache keys | Prefix with tenant: `t:{tenant_id}:...` — no shared global caches of learner data |
| Object / file paths | `/{tenant_id}/...` |
| Jobs / queues | Every job payload **must** carry `tenant_id`; workers set `TenantContext` before DB work |
| Logs | Include `tenant_id` on tenant-scoped operations |

Do not implement cross-tenant “global” learner indexes.
