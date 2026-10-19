# DEC-001 — Event transport

| Field | Value |
| ----- | ----- |
| Status | **Accepted** |
| Date | 2026-07-30 |
| Owner | Platform lead |
| Related | Architecture Review §M DEC-001, MOD-004 |

## Decision

**PostgreSQL transactional outbox + worker processes** carry learning events for Slices A–C. No message broker is installed now.

- Event writes happen in the same transaction as the domain change (quiz attempt row + outbox row commit together).
- Workers poll the outbox, deliver to consumers (report tables, later the LRS), and mark rows done.
- The publish/consume API is a thin internal abstraction so promotion to NATS/JetStream (preferred) or Kafka is a configuration change, not a rewrite.

## Promotion trigger

Adopt a broker only when measured: sustained event rate or consumer lag beyond thresholds defined in Slice E load tests, or offline-fleet onboarding.

## Consequences

- Zero new infrastructure for Slice A; trivially enclave-deployable later.
- Idempotency and ordering live in the envelope contract (EVENT-ENVELOPE.md), not in broker features.

## Change log

- 2026-07-30 — v1 accepted.
