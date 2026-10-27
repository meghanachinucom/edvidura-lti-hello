# TLA-shaped read APIs (D06 / D07 / D16)

EdVidura exposes **read-only** catalogue, Experience Index, activity stream, and
learner profile endpoints for Total Learning Architecture-style consumers.
Moodle remains SoR for people and grades.

## Current maturity (EdVidura SaaS stance)

| Metric | Value |
|--------|--------|
| **Achieved CMM** | **CMM-2** (Data + Index / content / profile — all in-scope complete) |
| **Operating CMM** | **CMM-3** (competency complete; cmi5 = CATAPULT requirements only, no AU player) |
| Not in product scope | ELRR, full LEM suite, Kafka mesh, multi-org federation |

Assess live:

```http
GET /api/v1/tla/maturity
X-Admin-Key: …
```

Response includes `achieved_cmm`, `operating_cmm`, `by_cmm`, and requirement statuses.

Ops auth: `X-Admin-Key` (or Keycloak ops session).

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/tla/maturity` | CMM 1–4 requirements + ADL refs + vendored paths |
| `GET /api/v1/tla/cmi5/requirements` | Vendored CATAPULT cmi5 requirements |
| `GET /api/v1/xi/experiences` | **ADL xi-lite** Experience Index (courses, lessons, manuals) |
| `GET /api/v1/xi/experiences/{id}` | Single XI entry |
| `GET /api/v1/catalogue/courses?tenant_id=` | Published courses |
| `GET /api/v1/catalogue/courses/{id}?tenant_id=` | Course + lesson experiences |
| `GET /api/v1/experiences?tenant_id=&actor=` | Actor activity stream from xAPI |
| `GET /api/v1/profiles/{subject}?tenant_id=` | Learner analytics + competencies |

Module: `app.modules.tla` — see [TLA_REQUIREMENTS.md](TLA_REQUIREMENTS.md).

**Simulation track (later):** HLA → xAPI via Federate — [FEDERATE_HLA.md](FEDERATE_HLA.md).
