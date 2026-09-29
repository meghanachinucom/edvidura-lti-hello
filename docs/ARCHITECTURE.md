# EdVidura — repository architecture

How this repo is laid out on GitHub, where code belongs, and how branches protect you when something breaks.

For module details see [MODULES.md](MODULES.md). For Git branch workflow see [../.github/BRANCHING.md](../.github/BRANCHING.md).

## Design rule (non‑negotiable)

| Layer | Put it here | Do not put |
|-------|-------------|------------|
| **Domain** | `app/modules/<name>/` | SQL / business rules in routes or templates |
| **HTTP** | `app/*_routes.py`, `app/api/` | Domain logic |
| **Infra** | `app/db.py`, `app/settings.py` | Product rules |
| **UI** | `templates/`, `app/static/` | SQL / grading / tenant rules |

Cursor enforces the same map in `.cursor/rules/module-architecture.mdc`.

## Top-level map

```
edvidura-lti-hello/
├── app/                    # FastAPI application
│   ├── main.py             # App factory, router include, health
│   ├── *_routes.py         # Thin HTTP (shell, quiz, ops, auth, onboard, LTI…)
│   ├── api/                # JSON APIs under /api/v1/…
│   ├── modules/            # ★ Domain packages (source of truth)
│   ├── static/             # CSS / JS / static HTML
│   ├── db.py               # Postgres + tenant RLS helpers
│   └── settings.py         # Env config
├── templates/              # Jinja2 pages (presentation only)
├── db/                     # SQL migrations + Docker compose profiles
├── tests/                  # pytest
├── scripts/                # Ops / Railway / Metabase bootstrap
├── docs/                   # Product + architecture docs
├── identity/               # Keycloak realm / ops identity assets
├── infra/                  # Infra helpers
├── moodle/                 # Moodle theme / local LMS assets
├── keys/                   # Env examples (never commit real secrets)
├── .github/                # CI, branching rules, PR template
└── .cursor/rules/          # Agent / team coding rules
```

## `app/modules/` (domain)

Each package owns one capability. Public API = `__init__.py` exports + `service.py`.

| Area | Modules |
|------|---------|
| School / LTI | `tenancy`, `school`, `nrps`, `lti_dynreg` |
| Learning | `content`, `quiz`, `manuals`, `adaptive`, `skills`, `sme` |
| AI | `ai_assessment`, `ai_tutor`, `ai_authoring`, `jev` |
| Evidence / BI | `xapi`, `analytics`, `events`, `receipts` |
| Platform | `identity`, `isolation`, `tla`, `specials` |

## HTTP entry points (thin)

| File | Role |
|------|------|
| `shell_routes.py` | Teacher / learner / school-admin HTML shell |
| `quiz_routes.py` | Quiz attempt flow |
| `ops_routes.py` | EdVidura **owner** console (`/ops`) — Metabase / Yet |
| `auth_routes.py` | Keycloak OIDC for ops |
| `onboard_routes.py` | School connect / dynreg |
| `api/*` | Machine APIs (analytics, xAPI, admin tenants, …) |

## Data & deploy

| Path | Role |
|------|------|
| `db/migration_*.sql` | Schema + RLS; apply via documented scripts |
| `Dockerfile` / `railway.toml` | Production app container |
| `.github/workflows/` | CI (tenant isolation, deploy hooks) |

## Docs index (start here)

| Doc | Topic |
|-----|--------|
| [MODULES.md](MODULES.md) | Module catalog |
| [ANALYTICS.md](ANALYTICS.md) / [YET_LRS_METABASE.md](YET_LRS_METABASE.md) | BI + owner Metabase |
| [JEV.md](JEV.md) | Decision layer (gates, not prose) |
| [AI.md](AI.md) | LLM providers |
| [ONBOARDING.md](ONBOARDING.md) | Connect a school |
| [XAPI.md](XAPI.md) | Learning records |

## What “good” looks like when adding a feature

1. Prefer an **existing** module; add `app/modules/<new>/` only for a new domain.
2. Add/adjust **migration + RLS** if there is a new table.
3. Keep routes to: parse → call module → render/JSON.
4. Update `docs/MODULES.md` + `app/modules/README.md`.
5. Ship on a **named feature branch** (see `.github/BRANCHING.md`), not a mixed dump on `main`.
