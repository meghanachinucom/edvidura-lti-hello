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

## Examples

```python
from app.modules.tenancy import resolve_platform, with_tenant, TENANT_A_ID
from app.modules.content import list_lessons, create_lesson, get_primary_course
from app.modules.quiz import questions_for_tenant, grade_answers
from app.modules.school import school_snapshot

# Resolve school from LTI registration
tenant = resolve_platform(issuer, client_id, deployment_id)

# Author under RLS
create_lesson(tenant_id=tenant.tenant_id, title="Chapter 5", body_md="…")

# Student quiz
qs = questions_for_tenant(tenant.tenant_id)
score, detail = grade_answers(submitted_answers, qs)

# Ops snapshot
snap = school_snapshot(tenant.tenant_id)
```

Legacy imports (`app.content`, `app.quiz_content`, `app.tenancy`, …) still work as thin facades.
