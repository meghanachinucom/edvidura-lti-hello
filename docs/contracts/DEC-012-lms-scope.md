# DEC-012 — LMS certification scope

| Field | Value |
| ----- | ----- |
| Status | **Accepted** |
| Date | 2026-07-30 |
| Owner | Product owner |
| Related | Architecture Review §M DEC-012, CQA0101, CQA0076 |

## Decision

**Moodle only for release one.** Moodle is self-hostable (works in enclaves later) and is the LMS of the first target customers. Canvas and Open edX are compatibility-matrix rows tagged *deferred* with **zero build or certification effort allocated**.

## Consequences

- All launch testing, docs, and onboarding guides assume Moodle.
- Any LMS-specific workaround is isolated behind the LTI layer so future LMSs don't fork product code.
- Expansion is matrix-driven: a new LMS is added only with a named paying customer and its own certification budget.

## Open item

Exact Moodle version of customer one (CQA0076) — record it here when known.

## Change log

- 2026-07-30 — v1 accepted.
