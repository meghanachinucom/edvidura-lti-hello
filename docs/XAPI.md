# xAPI (Experience API)

EdVidura emits **xAPI 1.0.3 statements** for learning analytics. **Moodle AGS remains the gradebook system of record** — xAPI does not replace grade passback.

## Module

`app.modules.xapi` — pure builders + RLS-backed store + optional LRS forward + middleware helpers.

| Trigger | Verb | Notes |
|---------|------|--------|
| Quiz submit | `passed` / `failed` (≥60% scaled) | Includes score; `attempt_id` in extensions |
| Skill profile (quiz) | `mastered` / `failed` / `attempted` | D15 competency statements per skill |
| Lesson complete | `completed` | Activity id includes lesson UUID |
| Manual open | `experienced` | Resource activity |
| Ask Vidura turn | `interacted` | PeBL Discussion-aligned fields (see below) |

### Ask Vidura ↔ PeBL Discussion (Technical Specification)

PeBL requires discussion/chat capture: **User ID, Timestamp, Thread ID, Access level, Text of the message**.

| PeBL field | EdVidura extension / field |
|------------|----------------------------|
| User ID | Actor account (`subject`) |
| Timestamp | Statement `timestamp` |
| Thread ID | `…/thread_id` (+ activity IRI `…/study-coach/thread/{id}`) |
| Access level | `…/access_level` (default `class`; `COACH_XAPI_ACCESS_LEVEL`) |
| Text of message | Preview always; **full text** when `COACH_XAPI_FULL_TEXT=1` |

```env
# Privacy-light default (preview ≤120 chars + hash)
# PeBL Discussion parity:
COACH_XAPI_FULL_TEXT=1
COACH_XAPI_ACCESS_LEVEL=class
```

Activity UI: `/learn/activity`, `/teacher/activity`, `/school-admin/activity`.

Actor uses LTI `account` (`homePage` + `name` = LMS `sub`), not email.

## Tiers (one DB)

| Tier | Meaning |
|------|---------|
| `noisy` | Stored but not validated |
| `transactional` | Valid statement (default after successful shape check) |
| `authoritative` | Forwarded to external LRS (or manually promoted after LRS success) |

## Middleware API (ops)

Ops auth: `X-Admin-Key` or Keycloak Bearer (`OpsAuth`).

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/xapi/statements` | Ingest one statement (`tenant_id` + `statement`) |
| `POST` | `/api/v1/xapi/statements/batch` | Up to 50 statements |
| `GET` | `/api/v1/xapi/statements?tenant_id=&tier=&attempt_id=&subject=` | List + tier counts |
| `POST` | `/api/v1/xapi/statements/{id}/promote?tenant_id=` | Set tier; optional `send_lrs` |
| `POST` | `/api/v1/xapi/retry-lrs?tenant_id=` | Re-send failed LRS posts |
| `GET` | `/api/v1/xapi/assignments?tenant_id=&subject=` | F-3 assignment dashboard (groups + quota) |
| `GET` | `/api/v1/xapi/files/{id}?tenant_id=` | F-4 structured JSON file fetcher (`quiz`, `assignments`, stored JSON) |
| `GET` | `/api/v1/xapi/files/{id}/stream?tenant_id=` | F-9 universal file streamer |
| `GET` | `/api/v1/xapi/files/{id}/meta?tenant_id=` | F-10 type detection + json/stream routing |
| `POST` | `/api/v1/xapi/files` | Store a JSON or binary file |
| `POST` | `/api/v1/xapi/grades` | F-5 inbound grade from an external module (records attempt + xAPI; does not replace Moodle AGS) |
| `GET` | `/api/v1/xapi/attempts?tenant_id=&subject=` | F-6 attempt counters (local graded + synced) |
| `POST` | `/api/v1/xapi/attempts/sync` | F-6 merge an external attempt count |

App API mirrors (learner/staff token): `GET /api/v1/app/assignments`, `GET /api/v1/app/files/{id}` (+ `/stream`, `/meta`), `POST /api/v1/app/grades`, `GET /api/v1/app/attempts` (includes `quota`). Graded quiz GET/POST enforce F-7 attempt limits and LMS F-6 group assignment.

Domain: `store_raw_statement`, `promote_tier`, `list_statements`, `retry_failed_lrs`, `assignment_dashboard`, `fetch_json_file`, `stream_file`, `detect_file_kind`, `ingest_external_grade`, `attempt_counters`, `sync_attempt_counter`.

Dev-only mirrors (404 in production): `GET /dev/xapi/statements/{tenant_id}`, `POST /dev/xapi/retry-lrs/{tenant_id}`.

## Config

```env
XAPI_LRS_ENDPOINT=https://your-lrs.example/xAPI
XAPI_LRS_KEY=...
XAPI_LRS_SECRET=...
XAPI_LRS_PROVIDER=yet   # yet | generic | auto — Yet SQL LRS uses /xapi/statements
XAPI_ACTOR_HOMEPAGE=http://localhost:8085
```

Empty endpoint = local store only (tiers still apply).

Yet Analytics SQL LRS + Metabase runbook: [YET_LRS_METABASE.md](YET_LRS_METABASE.md).

## Outbox

Quiz submit still enqueues `quiz.attempt.submitted`. xAPI is recorded **in parallel** on the request path (not yet an outbox consumer).
