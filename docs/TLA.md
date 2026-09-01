# TLA-shaped read APIs (D06 / D07 / D16)

EdVidura exposes **read-only** catalogue, experience index, and learner profile endpoints shaped for Total Learning Architecture-style consumers. Moodle remains SoR for people and grades; these APIs project EdVidura content + xAPI + analytics.

Ops auth: `X-Admin-Key` (or Keycloak ops session).

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/catalogue/courses?tenant_id=` | Published courses |
| `GET /api/v1/catalogue/courses/{id}?tenant_id=` | Course + lesson experiences |
| `GET /api/v1/experiences?tenant_id=&actor=` | Experience index from `xapi_statements` |
| `GET /api/v1/profiles/{subject}?tenant_id=` | Learner analytics + competency list |

Module: `app.modules.tla` (adapters only — no new SoR tables).
