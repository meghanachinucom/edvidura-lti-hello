# EdVidura reusable modules

Import domain logic from `app.modules.*` — not from FastAPI route files.

## Layout

| Module | Responsibility | Reuse elsewhere |
|--------|----------------|-----------------|
| `app.modules.tenancy` | Resolve LTI → tenant, request context, tool conf | Any LTI multi-tenant service |
| `app.modules.content` | Courses, lessons, progress, teacher authoring | LMS / curriculum services |
| `app.modules.quiz` | Question bank, grade, load per tenant | Assessment services |
| `app.modules.school` | Admins, teachers, classes, roster snapshot | SIS / school org |
| `app.modules.isolation` | RLS cross-tenant proofs | CI / ops checks |

Infrastructure stays in `app.db` (Postgres + `SET LOCAL app.tenant_id`) and `app.settings`.

Legacy shims (`app.content`, `app.quiz_content`, `app.tenancy`, …) re-export these modules.
