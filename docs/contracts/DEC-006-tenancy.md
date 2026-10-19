# DEC-006 — Tenancy model

| Field | Value |
| ----- | ----- |
| Status | **Accepted** |
| Date | 2026-07-30 |
| Owner | Platform lead |
| Related | Architecture Review §M DEC-006, CQA0260, CQA0080, CQE0193, `docs/TENANT_RESOLUTION.md` |

## Decision

1. **SaaS tenants share one PostgreSQL database.** Every tenant-scoped table carries `tenant_id UUID NOT NULL` and ships with a Row-Level Security policy **in its first migration** — never added later.
2. **Enclave / defence customers get a full instance per command** (own stack from signed offline media). No middle "schema-per-tenant" tier is built.
3. **Tenant identity comes only from the verified LTI registration** (`iss` + `client_id` + `deployment_id` → `lti_platforms` row) or, later, a platform-issued token claim. Nothing a client can type — query params, headers, course names, email domains — is ever a tenant source. Unknown registrations fail closed.

## Enforcement rules (binding on all new code)

- App connects as a `NOSUPERUSER NOBYPASSRLS` role; policies use `FORCE ROW LEVEL SECURITY`.
- Tenant context is set per transaction: `SELECT set_config('app.tenant_id', $1, true)`.
- Cache keys, queue messages, vector indexes, and storage paths are tenant-prefixed.
- Cross-tenant negative tests run in CI; a leak is a release blocker.
- BI/reporting tools never connect as a role that can see more than one tenant.

## Not decided here

Keycloak realm layout (parked with identity work) · enclave hardware (DEC-002) · per-tenant data residency terms.

## Consequences

- Onboarding a school = insert tenant + `lti_platforms` row (see onboarding API task).
- Every new table review asks one question first: "where is the RLS policy?"

## Change log

- 2026-07-30 — v1 accepted (matches spike implementation and review recommendation).
