# Clarification Bank — Stage 0 answers

Transcribe into `EdVidura_Clarification_Bank.xlsx` (sheet: Clarification Bank): set **Status = Answered**, fill **AnsweredBy / AnswerDate = 2026-07-30 / DecisionRecord** with the file below.

| CQID | Question (short) | Answer | DecisionRecord |
| ---- | ---------------- | ------ | -------------- |
| CQA0260 | When does RLS enforcement start? | Now — RLS on every tenant-scoped table from first migration; app filtering is a second layer | DEC-006-tenancy.md |
| CQA0080 | Which claim carries the tenant? | None — tenant from platform registration (issuer + client_id + deployment); unregistered pair rejected | DEC-006-tenancy.md |
| CQE0193 | Metabase has no sandboxing — where is isolation? | In the database via RLS; BI never connects as a multi-tenant-visible role | DEC-006-tenancy.md |
| CQA0078 | Which LTI library, who owns the risk? | PyLTI1p3 (maintained); custom crypto forbidden; integrations lead owns | LTI-LAUNCH-MODEL.md |
| CQA0103 | Local Moodle to develop against? | Yes — docker-compose Moodle in the repo, pre-registered tool | LTI-LAUNCH-MODEL.md |
| CQA0101 | Canvas/Open edX in release one? | No — Moodle only; others deferred with zero effort allocated | DEC-012-lms-scope.md |
| CQA0076 | Which LMS is customer one? | Moodle (record exact version in DEC-012 when known) | DEC-012-lms-scope.md |
| CQA0139 | Who owns the event envelope? | One named owner: platform lead; recorded in the contract | EVENT-ENVELOPE.md |
| CQF0241 | Envelope fields/versioning owner? | Same — envelope v1.0 published with versioning and idempotency rules | EVENT-ENVELOPE.md |
| CQH0025 | Whose sprint has grade passback? | LTI integration layer owns the LMS wire incl. passback; quiz publishes a scored event | DEC-013-grade-sor.md |
| — | Grade system of record | LMS gradebook official via AGS; EdVidura keeps evidence; reconciliation job required | DEC-013-grade-sor.md |
| CQG0038 | Provisioning API or console? | API is the single implementation; console/wizard are clients of it | DEC-011 (parallel track) + onboarding API task |
| CQA0299 | Author content once or per tenant? | Once, into a shared library, with tenant overlays | DEC-011-scope-and-slices.md (note) |

## Still open on purpose (parked with owners)

| CQID | Topic | Blocked on |
| ---- | ----- | ---------- |
| CQA0001–0003, CQA0031 | Keycloak realm/claims | Identity work deferred until a non-LMS surface exists |
| CQG0033 | Definition of "onboarded" for invoicing | Product owner |
| CQF0001/2, CQD... (ATO family) | Accrediting authority | Leadership (DEC-008 parked) |
| CQC0012, CQC0165 (GPU family) | Enclave hardware | Funded customer (DEC-002 parked) |
