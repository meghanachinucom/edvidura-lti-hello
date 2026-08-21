# xAPI (Experience API)

EdVidura emits **xAPI 1.0.3 statements** for learning analytics. **Moodle AGS remains the gradebook system of record** — xAPI does not replace grade passback.

## Module

`app.modules.xapi` — pure builders + RLS-backed store + optional LRS forward.

| Trigger | Verb | Notes |
|---------|------|--------|
| Quiz submit | `passed` / `failed` (≥60% scaled) | Includes score raw/max/scaled; `attempt_id` in context extensions |
| Lesson complete (non-quiz) | `completed` | Activity id includes lesson UUID |

Actor uses LTI `account` (`homePage` + `name` = LMS `sub`), not email.

## Storage

Table `xapi_statements` (tenant RLS). Apply:

```bash
Get-Content db/migration_xapi_statements.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1
```

## Local tiers (fuller xAPI)

Apply:

```bash
Get-Content db/migration_xapi_tiers.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1
```

| Tier | Meaning |
|------|---------|
| `noisy` | Stored but not yet validated |
| `transactional` | Validated statement (default after write) |
| `authoritative` | Successfully forwarded to external LRS |

LRS forward uses **retry (3 attempts)** with backoff. Re-send failures:

`POST /dev/xapi/retry-lrs/{tenant_id}` with `X-Admin-Key` or Keycloak Bearer.

List with optional `?tier=transactional`.

```env
XAPI_LRS_ENDPOINT=https://your-lrs.example/xAPI
XAPI_LRS_KEY=...
XAPI_LRS_SECRET=...
XAPI_ACTOR_HOMEPAGE=http://localhost:8085
```

Endpoint may be the statements URL or the LRS root (tool appends `/statements`).

## Dev API

`GET /dev/xapi/statements/{tenant_id}` with header `X-Admin-Key`.

## Outbox relationship

Quiz submit still enqueues `quiz.attempt.submitted` on the event outbox. xAPI is recorded **in parallel** on the request path (not as an outbox consumer yet). Later: drain worker can map envelopes → statements for replay.
