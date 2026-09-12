# TLA requirements & ADL integration (all CMM levels)

## What was reviewed

| ADL component ([adlnet/tla](https://github.com/adlnet/tla)) | Integrate? | EdVidura approach |
|------------------------------------------------------------|------------|-------------------|
| Keycloak (`adl-auth`) | No (SaaS) | LTI 1.3 launch auth |
| Kafka (`adl-kafka`) | No (SaaS) | EVENT_ENVELOPE outbox / webhooks |
| Experience Index (`adl-xi` / [xi-lite](https://github.com/adlnet/xi-lite)) | **Yes** | Vendored + Python port |
| LRS + forward | Partial | Local xAPI store + `XAPI_LRS_*` |
| Content hosting | Partial | Manuals / courses catalogue |
| Learner profile / LEM | Partial profile only | Analytics + skills projection |
| Competency processor | Partial | `skills` + competency xAPI |
| ELRR | Optional later | Not started |
| cmi5 ([CATAPULT](https://github.com/adlnet/CATAPULT)) | **Requirements yes** | Vendored `requirements.json`; no player |

## Vendored ADL code

Under `app/modules/tla/vendor/` (see `ATTRIBUTION.md`):

- **xi-lite** `app.js` + `mongo.js` — reference for XI API contract
- **CATAPULT** `requirements/requirements.json` — full cmi5 requirement map

Python ports (portable, no DB):

- `xi_query.py` — in-memory filters matching xi-lite `competency` / `url` / `limit` / `offset`
- `cmi5_requirements.py` — loads vendored JSON

## CMM coverage

`requirements.py` enumerates CMM 1–4. Assess via:

```http
GET /api/v1/tla/maturity
X-Admin-Key: …
```

Per-level rollup is in `by_cmm`.

## APIs (ops auth)

| Endpoint | Source contract |
|----------|-----------------|
| `GET /api/v1/tla/maturity` | CMM checklist + ADL refs |
| `GET /api/v1/tla/cmi5/requirements` | CATAPULT requirements.json |
| `GET /api/v1/xi/experiences?tenant_id=&competency=&url=` | xi-lite |
| `GET /api/v1/xi/experiences/{id}?tenant_id=` | xi-lite |
| `GET /api/v1/catalogue/…` | TLA catalogue |
| `GET /api/v1/experiences?actor=` | xAPI activity stream |
| `GET /api/v1/profiles/{subject}` | Learner profile |

## Reuse in another app

Copy:

```
shapes.py  requirements.py  adl_refs.py
xi_query.py  cmi5_requirements.py  vendor/
```

Wire your own content/xAPI sources; do not copy EdVidura `service.py` unless you share the same modules.
