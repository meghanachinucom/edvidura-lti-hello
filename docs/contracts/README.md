# EdVidura Stage 0 contracts

Signed one-page decisions. Code built after a contract's date must follow it; to change one, add a new dated entry to its Change log — never silently diverge.

## Status board

| Contract | Decision in one line | Status |
| -------- | -------------------- | ------ |
| [DEC-006 Tenancy](DEC-006-tenancy.md) | Shared DB + RLS for SaaS; instance-per-command for enclaves; tenant only from verified LTI registration | **Accepted** |
| [LTI launch model](LTI-LAUNCH-MODEL.md) | LTI 1.3, PyLTI1p3, new-window launch, BYO Moodle | **Accepted** |
| [DEC-012 LMS scope](DEC-012-lms-scope.md) | Moodle only for release one | **Accepted** |
| [DEC-001 Event transport](DEC-001-event-transport.md) | Postgres transactional outbox now; broker only when volume proves it | **Accepted** |
| [Event envelope v1.0](EVENT-ENVELOPE.md) | Mandatory fields incl. `event_id` + `tenant_id`; idempotent ingestion | **Accepted** |
| [DEC-013 Grade system of record](DEC-013-grade-sor.md) | LMS gradebook is official; EdVidura passes back via LTI AGS | **Accepted** |
| [DEC-011 Scope & slices](DEC-011-scope-and-slices.md) | Staged vertical slices; AI/enclave/federation/XR deferred | **Accepted** |
| [Tenant resolution](../TENANT_RESOLUTION.md) | iss + client_id + deployment → `lti_platforms` → tenant; fail closed | **Accepted** (pre-existing) |

## Parked (owner + date required, cannot be decided by engineering)

| Topic | Review ref | Needs |
| ----- | ---------- | ----- |
| Accrediting authority + control baseline | DEC-008 | Named authority for the Indian market |
| GPU sizing / local AI serving | DEC-002 | Funded customer or sizing spike budget |
| Language tier commitment | DEC-010 | Product owner + funding per language |

## Cross-references

- Clarification Bank rows answered by this pack: see [ANSWERS_STAGE0.md](ANSWERS_STAGE0.md)
- Source recommendations: `docs/source-resources/EdVidura_Architecture_Review_Report.docx` §M (decision register), §T (build plan)
