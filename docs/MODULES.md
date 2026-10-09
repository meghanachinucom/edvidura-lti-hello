# EdVidura reusable modules

Import domain logic from `app.modules.*` — not from FastAPI route files.

## Layout

| Module | Responsibility | Reuse elsewhere |
|--------|----------------|-----------------|
| `app.modules.tenancy` | Resolve LTI → tenant, request context, tool conf | Any LTI multi-tenant service |
| `app.modules.content` | Courses, lessons, progress, teacher authoring | LMS / curriculum services |
| `app.modules.quiz` | Bank, grade, personalized quizzes, attempts, session_ctx | Assessment (copy module) |
| `app.modules.school` | Classes, LTI bindings, `enrich_session_from_launch` | SIS / LTI binding |
| `app.modules.manuals` | Versioned manuals / PeBL eBook (TOC, standalone signed reader) | Curriculum publishing |
| `app.modules.events` | EVENT_ENVELOPE_V1 outbox + D17 webhook drain | Any domain event pipeline |
| `app.modules.xapi` | xAPI 1.0.3 build/store, tiers, Yet/generic LRS forward (`lrs_client`), middleware API helpers | Analytics / LRS |
| `app.modules.identity` | Keycloak JWT verify + OIDC helpers for ops | Admin / API auth |
| `app.modules.analytics` | Tenant/learner KPIs + `class_coach_insights` (Phase B2) + Metabase/Yet status | BI / reporting |
| `app.modules.ai_assessment` | MCQs, simplify, grade assist, deep-link & next-step suggestions; E04 OpenAI + local HTTP | Assessment authoring |
| `app.modules.ai_authoring` | D13 teacher SME authoring assistant (grounded drafts) | Authoring |
| `app.modules.ai_tutor` | Student hints + Ask Vidura; portable `run_coach_turn` / feedback / flashcards | Tutoring (copy module) |
| `app.modules.jev` | TypeSafe Jev System One decisions (coach strategy / on-topic + LLM cost routing + quiz coverage judge) | AI routing / gates |
| `app.modules.skills` | C8 competency registry + D23 roles + D08 framework import / TO review | Adaptive / gap / difference |
| `app.modules.adaptive` | C9/C10 + PLE + `learner_plan_summary` (Phase B1) + DCT / micro-learning | Tutoring / remediation |
| `app.modules.signals` | Fuse chatbot + Moodle/LMS + VR xAPI → adapt each learner’s open plan ([SIGNALS.md](SIGNALS.md)) | Personalization / PLE |
| `app.modules.sme` | C13 SME source registry: approved manuals/lessons for Ask Vidura | Tutoring / RAG grounding |
| `app.modules.nrps` | LTI Advantage NRPS: Moodle roster cache (awareness only) | Class / membership awareness |
| `app.modules.receipts` | HMAC-sealed grade receipts for attempt evidence | Audit / verify |
| `app.modules.tla` | CMM 1–4 TLA checklist; vendored xi-lite + CATAPULT requirements; catalogue / XI / profiles | Copy `shapes`/`xi_query`/`cmi5_requirements`/`vendor` into any mesh consumer |
| `app.modules.specials` | Receipts, teleport, radar, coach, stickers, capsule, incidents, competency map, at-risk rules | Product differentiation |
| `app.modules.lti_dynreg` | LTI Dynamic Registration invites + Moodle one-click install | Onboarding |
| `app.modules.isolation` | RLS cross-tenant proofs | CI / ops checks |

Infrastructure stays in `app.db` (Postgres + `SET LOCAL app.tenant_id`) and `app.settings`.

**Portable backend contract:** [`app/modules/PORTABILITY.md`](../app/modules/PORTABILITY.md) — import modules only; HTTP stays thin.

Legacy shims (`app.content`, `app.quiz_content`, `app.tenancy`, …) re-export these modules.

See also: [SKILLS.md](SKILLS.md); [DIFFERENCE.md](DIFFERENCE.md); [SME.md](SME.md); [EBOOK.md](EBOOK.md); [ADAPTIVE.md](ADAPTIVE.md) / [PLE.md](PLE.md) / [DCT.md](DCT.md); [XAPI.md](XAPI.md); [PEBL_XAPI_CHAT.md](PEBL_XAPI_CHAT.md); [ANALYTICS.md](ANALYTICS.md); [YET_LRS_METABASE.md](YET_LRS_METABASE.md); [JEV.md](JEV.md); [TLA.md](TLA.md); [TLA_REQUIREMENTS.md](TLA_REQUIREMENTS.md); [NRPS.md](NRPS.md); [RECEIPTS.md](RECEIPTS.md); [MULTI_LMS.md](MULTI_LMS.md) / [CANVAS.md](CANVAS.md).
