# Event envelope v1 (tenant-required)

All domain events emitted by EdVidura (outbox, webhooks, future bus) **must** include `tenant_id`.

```json
{
  "event_id": "uuid",
  "event_type": "quiz.attempt.submitted",
  "occurred_at": "2026-08-13T12:00:00Z",
  "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "subject": "lms-user-sub",
  "payload": {}
}
```

## Required fields

| Field | Required | Notes |
| ----- | -------- | ----- |
| `event_id` | yes | UUID, unique per emission |
| `event_type` | yes | Stable dotted name |
| `occurred_at` | yes | ISO-8601 UTC |
| `tenant_id` | **yes** | UUID; never null; never inferred by consumers from other fields alone |
| `subject` | recommended | LMS user `sub` when learner-scoped |
| `payload` | yes | Event-specific object (may be empty) |

## Rules

- Producers take `tenant_id` from `TenantContext` / verified LTI session — not from the HTTP body of untrusted clients.
- Consumers reject events missing `tenant_id`.
- Cache keys / object paths / job payloads that touch learner data must also include `tenant_id` (see [`CACHE_QUEUES_TENANCY.md`](CACHE_QUEUES_TENANCY.md)).
- Optional later: `command_id` for multi-command deployments — not required in v1.

## Status

Contract published for Slice 0. Outbox implementation may follow; the envelope shape is locked.
