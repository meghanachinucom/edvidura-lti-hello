# Contract — Learning event envelope v1.0

| Field | Value |
| ----- | ----- |
| Status | **Accepted** |
| Date | 2026-07-30 |
| Owner | Platform lead (envelope owner per CQA0139 — one owner, recorded here) |
| Related | Architecture Review §S.4, CQF0241, CQA0139 |

Every learning event any EdVidura component emits MUST use this envelope. Three squads inventing incompatible envelopes is a review hard-stop; this file is the single source.

## Envelope v1.0

| Field | Type | Rule |
| ----- | ---- | ---- |
| `event_id` | UUID v4 | Client-generated idempotency key; duplicates are absorbed, not double-counted |
| `schema_version` | string | `"1.0"`; unknown versions are rejected |
| `tenant_id` | UUID | Taken from the launch/session context server-side. A `tenant_id` in a request body is ignored; mismatch with session → **reject** |
| `source` | string | Emitting component, e.g. `edvidura.quiz` |
| `actor_sub` | string | LTI `sub` of the learner/teacher |
| `verb` | string | One of `launched`, `attempted`, `completed`, `scored` (v1.0 closed set; additions bump minor version) |
| `object_type` | string | e.g. `quiz` |
| `object_id` | string | Stable id of the thing acted on |
| `context` | object | `{ course_id?, resource_link_id? }` from the LTI launch |
| `occurred_at` | ISO-8601 UTC | Client clock; `received_at` is stamped by the server |
| `correlation_id` | UUID, optional | Ties multi-step flows (attempt → score → passback) |
| `payload` | object | Verb-specific detail (e.g. score, max_score) |

### Example

```json
{
  "event_id": "9f8b2c1e-6a54-4d2f-9a1b-3c5d7e9f0a12",
  "schema_version": "1.0",
  "source": "edvidura.quiz",
  "actor_sub": "a1b2c3",
  "verb": "scored",
  "object_type": "quiz",
  "object_id": "quiz-101",
  "context": { "course_id": "c42", "resource_link_id": "rl-7" },
  "occurred_at": "2026-07-30T15:20:11Z",
  "correlation_id": "5e4d3c2b-1a09-48f7-b6c5-d4e3f2a1b0c9",
  "payload": { "score": 8, "max_score": 10 }
}
```

`tenant_id` is shown nowhere above deliberately — the server attaches it from the authenticated session.

## Ingestion rules

1. **Idempotent**: same `(tenant_id, event_id)` twice → store once, return the original result (unique index enforces it).
2. **Fail closed**: missing session tenant, unknown `schema_version`, or verb outside the set → reject with a reason; rejected events are logged for audit.
3. **RLS**: the events table has a tenant policy from its first migration (DEC-006).
4. **Outbox**: events are written via the transactional outbox (DEC-001).

## xAPI note

The envelope is not xAPI, but maps cleanly (`launched→initialized`, `completed→completed`, `scored→scored`) so the future LRS integration is a translator, not a schema change.

## Change log

- 2026-07-30 — v1.0 accepted.
