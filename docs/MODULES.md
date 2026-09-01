# EdVidura reusable modules

Import domain logic from `app.modules.*` — not from FastAPI route files.

## Layout

| Module | Responsibility | Reuse elsewhere |
|--------|----------------|-----------------|
| `app.modules.tenancy` | Resolve LTI → tenant, request context, tool conf | Any LTI multi-tenant service |
| `app.modules.content` | Courses, lessons, progress, teacher authoring | LMS / curriculum services |
| `app.modules.quiz` | Question bank, grade, load per tenant | Assessment services |
| `app.modules.school` | Classes, curriculum links, LTI context bindings (people live in Moodle) | SIS / school org |
| `app.modules.manuals` | Versioned manuals / PeBL eBook (TOC, standalone signed reader) | Curriculum publishing |
| `app.modules.events` | EVENT_ENVELOPE_V1 outbox + D17 webhook drain | Any domain event pipeline |
| `app.modules.xapi` | xAPI 1.0.3 build/store, tiers, LRS forward, middleware API helpers | Analytics / LRS |
| `app.modules.identity` | Keycloak JWT verify + OIDC helpers for ops | Admin / API auth |
| `app.modules.analytics` | Tenant + learner KPIs, Metabase embed URL, CSV export | BI / reporting |
| `app.modules.ai_assessment` | MCQs, simplify, grade assist, deep-link & next-step suggestions; E04 OpenAI + local HTTP | Assessment authoring |
| `app.modules.ai_authoring` | D13 teacher SME authoring assistant (grounded drafts) | Authoring |
| `app.modules.ai_tutor` | Student hints + SME study coach (citations, retention stance) | Tutoring |
| `app.modules.skills` | C8 competency registry + D23 roles + D08 framework import / TO review | Adaptive / gap / difference |
| `app.modules.adaptive` | C9/C10 adaptive next + gap/difference paths + PLE + DCT order/planner | Tutoring / remediation |
| `app.modules.sme` | C13 SME source registry: approved manuals/lessons for study coach | Tutoring / RAG grounding |
| `app.modules.nrps` | LTI Advantage NRPS: Moodle roster cache (awareness only) | Class / membership awareness |
| `app.modules.receipts` | HMAC-sealed grade receipts for attempt evidence | Audit / verify |
| `app.modules.tla` | D06/D07/D16 TLA-shaped catalogue / experiences / profiles | Cross-org / mesh read APIs |
| `app.modules.specials` | Receipts, teleport, radar, coach, stickers, capsule, incidents, competency map, at-risk rules | Product differentiation |
| `app.modules.lti_dynreg` | LTI Dynamic Registration invites + Moodle one-click install | Onboarding |
| `app.modules.isolation` | RLS cross-tenant proofs | CI / ops checks |

Infrastructure stays in `app.db` (Postgres + `SET LOCAL app.tenant_id`) and `app.settings`.

Legacy shims (`app.content`, `app.quiz_content`, `app.tenancy`, …) re-export these modules.

See also: [SKILLS.md](SKILLS.md); [DIFFERENCE.md](DIFFERENCE.md); [SME.md](SME.md); [EBOOK.md](EBOOK.md); [ADAPTIVE.md](ADAPTIVE.md) / [PLE.md](PLE.md) / [DCT.md](DCT.md); [XAPI.md](XAPI.md); [ANALYTICS.md](ANALYTICS.md); [TLA.md](TLA.md); [NRPS.md](NRPS.md); [RECEIPTS.md](RECEIPTS.md); [MULTI_LMS.md](MULTI_LMS.md) / [CANVAS.md](CANVAS.md).
