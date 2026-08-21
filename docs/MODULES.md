# EdVidura reusable modules

Import domain logic from `app.modules.*` — not from FastAPI route files.

## Layout

| Module | Responsibility | Reuse elsewhere |
|--------|----------------|-----------------|
| `app.modules.tenancy` | Resolve LTI → tenant, request context, tool conf | Any LTI multi-tenant service |
| `app.modules.content` | Courses, lessons, progress, teacher authoring | LMS / curriculum services |
| `app.modules.quiz` | Question bank, grade, load per tenant | Assessment services |
| `app.modules.school` | Admins, teachers, classes, roster snapshot | SIS / school org |
| `app.modules.manuals` | Versioned technical manuals / eBook path | Curriculum publishing |
| `app.modules.events` | EVENT_ENVELOPE_V1 outbox producer/drain | Any domain event pipeline |
| `app.modules.xapi` | xAPI 1.0.3 statement build/store (+ optional LRS, tiers, retry) | Analytics / LRS integrations |
| `app.modules.identity` | Keycloak JWT verify + OIDC helpers for ops | Admin / API auth |
| `app.modules.analytics` | Tenant KPIs, attempt export, Metabase-ready views | BI / reporting |
| `app.modules.ai_assessment` | Lesson text → draft MCQs (local or OpenAI) | Assessment authoring |
| `app.modules.specials` | Receipts, teleport, radar, coach, stickers, capsule, incidents, competency map, at-risk rules | Product differentiation |
| `app.modules.lti_dynreg` | LTI Dynamic Registration invites + Moodle one-click install | Onboarding |
| `app.modules.isolation` | RLS cross-tenant proofs | CI / ops checks |

Infrastructure stays in `app.db` (Postgres + `SET LOCAL app.tenant_id`) and `app.settings`.

Legacy shims (`app.content`, `app.quiz_content`, `app.tenancy`, …) re-export these modules.
