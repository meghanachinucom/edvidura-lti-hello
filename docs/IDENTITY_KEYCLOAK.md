# Identity (Keycloak) — after onboarding works

**Status:** Deferred until Admin API + BYO-Moodle onboarding are stable.

## Preferred model (SaaS)

- **Single realm** (or equivalent IdP) with a **`tenant_id` claim** in access tokens (**C1**).
- Map LTI launch → app session that already embeds `tenant_id` (same value as `lti_platforms.tenant_id`).
- Service accounts are **tenant-scoped** — no all-tenant super tokens for normal app services.
- Replace `ADMIN_API_KEY` / `X-Admin-Key` with role-gated ops auth once IdP is live.

## Not preferred for SaaS

- Realm-per-tenant (**C2**) — heavy ops; only if a customer pays for that model or pairs with DB-per-tenant enclave.

## Front door today

Moodle LTI 1.3 remains the learner/instructor front door. Keycloak does not replace LTI for LMS launch; it complements staff/API identity later.
