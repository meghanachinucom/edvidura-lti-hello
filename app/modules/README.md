# EdVidura reusable modules

Import domain logic from `app.modules.*` — not from FastAPI route files.

**Portability:** see [`PORTABILITY.md`](PORTABILITY.md). Domain modules have no FastAPI/Jinja.
Take `app/modules/` + migrations into another project; provide `app.db` / `app.settings` adapters.

## Layout

| Module | Responsibility | Reuse elsewhere |
|--------|----------------|-----------------|
| `app.modules.tenancy` | Resolve LTI → tenant, request context, tool conf; school/corporate/government segment + caps | Any LTI multi-tenant service |
| `app.modules.content` | Courses, lessons, progress, teacher authoring | LMS / curriculum services |
| `app.modules.quiz` | Question bank, grade, load per tenant; personalized AI quizzes (level + complexity + coverage + study-plan validation) | Assessment services |
| `app.modules.school` | Classes, curriculum links, LTI context bindings (people live in Moodle) | SIS / school org |
| `app.modules.manuals` | Versioned manuals / PeBL-lite eBook (TOC, class links, signed reader, state languages) | Curriculum publishing |
| `app.modules.pebl` | In-book Discuss rail (class threads); separate chat product not required | PeBL discussion |
| `app.modules.pravachana` | AP government pravachana catalogue (videos, progress, notes, dept stats) | Cultural / public media |
| `app.modules.events` | EVENT_ENVELOPE_V1 outbox + D17 webhook drain | Any domain event pipeline |
| `app.modules.xapi` | xAPI 1.0.3 build/store, tiers, Yet/generic LRS forward (`lrs_client`), middleware (assignment dashboard, JSON fetcher, inbound grades, attempt counters, file streamer + type routing) | Analytics / LRS |
| `app.modules.identity` | Keycloak JWT verify + OIDC helpers for ops | Admin / API auth |
| `app.modules.analytics` | Tenant + learner KPIs, date×learner LRS heatmap, 8-grain time series, Metabase/Yet status | BI / reporting |
| `app.modules.ai_assessment` | MCQs, 100+ test bank, PDF/MD export, essay grade vs instructor+RAG, simplify, suggestions | Assessment authoring |
| `app.modules.ai_authoring` | D13 teacher SME authoring assistant (grounded drafts) | Authoring |
| `app.modules.ai_tutor` | Student hints + Ask Vidura (citations, voice, shortcuts, clarify-once, integrity refuse, flashcards) | Tutoring — portable domain; routes stay thin |
| `app.modules.jev` | TypeSafe Jev System One: coach on-topic/strategy + LLM cost routing + quiz coverage judge | AI gates |
| `app.modules.skills` | C8 competency registry + D23 roles + D08 framework import / CAT mapper + 20+ TO question bank | Adaptive / gap / difference |
| `app.modules.adaptive` | C9/C10 adaptive next + gap/difference paths + PLE + DCT order/planner | Tutoring / remediation |
| `app.modules.signals` | Fuse chatbot + Moodle/LMS + VR xAPI → adapt each learner’s open plan | Personalization / PLE |
| `app.modules.sme` | C13 SME source registry: approved manuals/lessons for Ask Vidura | Tutoring / RAG grounding |
| `app.modules.nrps` | LTI Advantage NRPS: Moodle roster cache (awareness only) | Class / membership awareness |
| `app.modules.lti_groups` | LTI Advantage Group Services cache + local groups + group-based assignment access | LMS groups |
| `app.modules.receipts` | HMAC-sealed grade receipts for attempt evidence | Audit / verify |
| `app.modules.tla` | Achieved CMM-2 / operating CMM-3; xi-lite XI (courses+lessons+manuals); CATAPULT; catalogue / profiles | Copy `shapes`/`xi_query`/`cmi5_requirements`/`vendor` into any mesh consumer |

HTTP (not a domain module): `app.api.app_client` — `/api/v1/app` shared web+mobile JSON ([docs/MOBILE_API.md](../../docs/MOBILE_API.md)).
| `app.modules.specials` | Receipts, teleport, radar, coach, stickers, capsule, incidents, competency map, at-risk rules | Product differentiation |
| `app.modules.lti_dynreg` | LTI Dynamic Registration invites + Moodle one-click install | Onboarding |
| `app.modules.isolation` | RLS cross-tenant proofs | CI / ops checks |

Infrastructure stays in `app.db` (Postgres + `SET LOCAL app.tenant_id`) and `app.settings`.

Legacy shims (`app.content`, `app.quiz_content`, `app.tenancy`, …) re-export these modules.
