# TLA-shaped read APIs (D06 / D07 / D16)

EdVidura exposes **read-only** catalogue, Experience Index, activity stream, and
learner profile endpoints for Total Learning Architecture-style consumers.
Moodle remains SoR for people and grades.

Ops auth: `X-Admin-Key` (or Keycloak ops session).

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/tla/maturity` | CMM 1–4 requirements + ADL refs + vendored paths |
| `GET /api/v1/tla/cmi5/requirements` | Vendored CATAPULT cmi5 requirements |
| `GET /api/v1/xi/experiences` | **ADL xi-lite** Experience Index (competency/url) |
| `GET /api/v1/xi/experiences/{id}` | Single XI entry |
| `GET /api/v1/catalogue/courses?tenant_id=` | Published courses |
| `GET /api/v1/catalogue/courses/{id}?tenant_id=` | Course + lesson experiences |
| `GET /api/v1/experiences?tenant_id=&actor=` | Actor activity stream from xAPI |
| `GET /api/v1/profiles/{subject}?tenant_id=` | Learner analytics + competencies |

Module: `app.modules.tla` — see [TLA_REQUIREMENTS.md](TLA_REQUIREMENTS.md).
