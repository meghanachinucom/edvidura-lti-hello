# DEC-011 — Scope vs capacity: staged vertical slices

| Field | Value |
| ----- | ----- |
| Status | **Accepted** |
| Date | 2026-07-30 |
| Owner | Programme lead |
| Related | Architecture Review §M DEC-011, §T build plan |

## Decision

The programme builds in **staged vertical slices with demonstrable exit gates**, not parallel product tracks.

### Active now

| Stage | Content | Exit gate |
| ----- | ------- | --------- |
| Slice 0 | This contracts pack + parked-decision owners | Contracts published; referenced by code reviews |
| Slice A | LTI launch → quiz → event (envelope + outbox) → AGS grade passback → teacher report, all tenant-scoped | End-to-end demo; cross-tenant CI suite green; reconciliation job running |
| Parallel | Tenant onboarding API (E08 seed, junior task) | Two tenants created via API; launches resolve correctly |

### Explicitly deferred (not staffed, not designed further until Slice A exits)

AI chatbots and auto-grading · competency registry and gap analysis · LRS/xAPI federation · Keycloak · enclave/instance-per-command builds · XR store and lab sites · Metabase suite · Canvas/Open edX · data migration tooling.

## Consequences

- Any work request outside the active table needs a change to this DEC first.
- The Clarification Bank's deferred-product questions stay open without blocking anything.

## Change log

- 2026-07-30 — v1 accepted.
