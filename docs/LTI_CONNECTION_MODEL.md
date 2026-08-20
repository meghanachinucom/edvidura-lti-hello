# LTI connection model

## Rule

One **`lti_platforms` row** = one LMS registration (issuer + client_id) mapped to exactly one **`tenants`** row.

- Multiple **deployment IDs** may be listed on one platform (`deployment_ids[]`).
- Unknown issuer/client_id → fail closed.
- Deployment not in the allow-list → fail closed.
- Runtime tool config is built **only** from active `lti_platforms` rows (`build_tool_conf_from_db`). `MOODLE_*` env vars are optional **seed** inputs, not runtime source of truth.

## Onboarding

1. Operator creates tenant: `POST /admin/tenants` (header `X-Admin-Key`) or `/onboard`.
2. School admin registers EdVidura URLs in Moodle (login, launch, JWKS).
3. Operator pastes Client ID + Deployment ID: `POST /admin/tenants/{id}/lti-platforms`.
4. Successful launch updates `lti_platforms.last_launch_at` (test-launch status on `/onboard`).

## Grade system of record (Slice A)

| Grade type | System of record | Notes |
| ---------- | ---------------- | ----- |
| Official course grade (Release 1) | **Moodle gradebook** | EdVidura passes score via LTI AGS when enabled |
| Attempt history / audit | EdVidura `quiz_attempts` | Always written with `tenant_id` under RLS |

Both write paths must carry `tenant_id`. Never trust client-supplied tenant fields.
