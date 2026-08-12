# DEC-013 — Grade system of record

| Field | Value |
| ----- | ----- |
| Status | **Accepted** |
| Date | 2026-07-30 |
| Owner | Product owner |
| Related | Review hard-stop #2 (two systems of record, none declared), CQH0025 |

Extends the review's DEC-001…012 register; numbered DEC-013 here.

## Decision

**Option A: the LMS gradebook (Moodle) is the official grade.**

- EdVidura computes scores and **passes them back via LTI AGS**; the Moodle gradebook is what teachers and learners trust and where disputes are handled.
- EdVidura keeps full attempt detail (per-question responses, timing, events) for analytics and audit — as evidence, not as the official mark.
- A **reconciliation job** compares EdVidura scores vs LMS gradebook and queues discrepancies for human review (review MOD-004 pattern). Passback is part of "done" for any scoring feature: a score that never reached the gradebook is a failed flow, not a success.

## Ownership (answers CQH0025)

The **LTI integration layer owns everything on the LMS wire, including passback**. The quiz feature publishes a `scored` event (see EVENT-ENVELOPE.md); the LTI layer consumes it and performs AGS.

## Rejected for now

Option B (EdVidura as SoR) — revisit only if a customer contractually requires grades mastered outside their LMS; that would be a new DEC, not an edit here.

## Change log

- 2026-07-30 — v1 accepted (Option A).
