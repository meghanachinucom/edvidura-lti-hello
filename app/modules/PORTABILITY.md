# Portable backend contract

**Rule:** Import domain from `app.modules.*` only. Never import `shell_routes`,
`quiz_routes`, `main`, or Jinja templates into another product.

## Layers

| Layer | Package | May import |
|-------|---------|------------|
| Domain | `app.modules.<name>` | `app.db`, `app.settings`, other modules, stdlib, `httpx` |
| HTTP | `app/*_routes.py`, `app/api/`, `app/main.py` | modules + FastAPI/Starlette/Jinja |
| Infra | `app/db.py`, `app/settings.py`, `app/launch_cache.py` | Postgres / env |

Modules **must not** import FastAPI, Starlette `Request`, or Jinja2.

## Take into another project

1. Copy `app/modules/` (+ needed `db/migrations`).
2. Provide equivalents of:
   - `app.db.tenant_connection` (RLS `SET LOCAL app.tenant_id`)
   - `app.settings.get_settings()`
   - Optional: cache for `quiz.session_ctx` (`cache_get` / `cache_set`)
3. Write your own thin HTTP adapters that call module functions with **plain dicts**.

## Portable entry points (preferred)

| Domain | Call |
|--------|------|
| Ask Vidura turn | `ai_tutor.run_coach_turn(...)` → apply `session_patch` |
| Coach feedback | `ai_tutor.submit_coach_feedback(...)` |
| Flashcards | `ai_tutor.flashcards_for_session(...)` |
| Quiz grade+save | `quiz.grade_submitted_form` + `quiz.record_graded_attempt` |
| Quiz session ctx | `quiz.store_context` / `quiz.load_context` |
| Launch → class | `school.enrich_session_from_launch(session_dict)` |
| Attempts CRUD | `quiz.get_attempt` / `list_attempts_for_tenant` / … |
| Study plan card | `adaptive.learner_plan_summary(...)` |
| Coach class KPIs | `analytics.class_coach_insights(tenant_id, subjects=…)` |

## Still HTTP-owned (by design)

- Cookie / Starlette session middleware
- `require_session` / admin API key / OIDC redirect dance
- Template names, redirects, `BackgroundTasks` (e.g. AGS after module returns attempt)
- Static files

## Checklist when adding features

1. New business rule → `app/modules/<domain>/`
2. Route only: parse → call module → map response
3. Export from `__init__.py`
4. Update this file + `docs/MODULES.md` if a new module appears
