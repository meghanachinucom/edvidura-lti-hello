# EdVidura LTI Hello

EdVidura LTI Hello is a FastAPI-based LTI 1.3 application that integrates with Moodle. This project demonstrates secure LTI launches, tenant (institution) resolution, and institution/student onboarding APIs.

## Tech Stack

- FastAPI
- PostgreSQL
- Moodle (Docker)
- Python 3.11+

---

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure the project

```bash
copy config.example.env .env
python scripts/generate_keys.py
```

### 3. Start PostgreSQL

```bash
cd db
docker compose up -d
```

### 4. Start the backend

```bash
py -m uvicorn app.main:app --reload
```

Backend:
http://127.0.0.1:8000

Swagger:
http://127.0.0.1:8000/docs

### 5. Start Moodle

```bash
cd moodle
docker compose up -d
```

Moodle:
http://localhost:8085

---

## Tenant onboarding (BYO Moodle)

Guided UI: http://127.0.0.1:8000/onboard

Seed two demo schools + students (idempotent):

```bash
python scripts/seed_schools.py
```

Creates **Riverside High** and **Lakeside Academy** with classes, teachers,
students, chapters, and school-specific quizzes (tenant-isolated).

```bash
# once per DB
Get-Content db/migration_school_org.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1
python scripts/seed_schools.py
```

Admin API (header `X-Admin-Key` = `ADMIN_API_KEY` from `.env`):

- `POST /admin/tenants` — create tenant
- `POST /admin/tenants/{id}/lti-platforms` — register Moodle issuer + Client ID + deployments
- `GET /admin/tenants` / `GET /admin/lti-platforms`

Runtime LTI config is always loaded from Postgres `lti_platforms` (not from `MOODLE_*` env).  
`MOODLE_*` is only for optional local seed (`python scripts/seed_platforms.py`).

Contracts: `docs/decisions/DEC-006.md`, `docs/TENANT_RESOLUTION.md`, `docs/EVENT_ENVELOPE_V1.md`.

Pilot scripts: `docs/DEMO_SCRIPT.md`, AGS: `docs/AGS_CHECKLIST.md`, backups: `docs/BACKUP.md`.

If the DB already existed before newer slices, also apply:

```bash
Get-Content db/migration_lesson_workflow.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1
Get-Content db/migration_event_outbox.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1
Get-Content db/migration_manuals.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1
```

---

## API Testing

### Institution

- `POST /api/v1/institutions`
- `GET /api/v1/institutions`

### Student

- `POST /api/v1/students`
- `GET /api/v1/students`

Test the APIs using Swagger:

http://127.0.0.1:8000/docs

---

## LTI Launch Testing (Slice A)

1. Start Postgres, FastAPI, and Moodle.
2. If the DB already existed before Slice A / course content, apply:
   `psql ... -f db/migration_quiz_attempts.sql`
   and `psql ... -f db/migration_course_content.sql`
3. In Moodle external tool settings, enable **Accept grades from the tool** (AGS) so scores can pass back.
4. Launch the tool as a student → **Home** → **Lessons** (tenant-private) → **Quiz**.
5. Submit → see score; check Moodle gradebook if AGS is enabled.
6. Launch as a teacher → **Upload content** (draft/publish, reorder, edit/delete, file attach) → **Class results** (filters, CSV, best scores + lesson progress).

---

## Available URLs

| Service | URL |
|---------|-----|
| Backend | http://127.0.0.1:8000 |
| Swagger | http://127.0.0.1:8000/docs |
| Health | http://127.0.0.1:8000/health |
| Quiz (after launch) | http://127.0.0.1:8000/quiz |
| Teacher attempts | http://127.0.0.1:8000/teacher/attempts |
| Moodle | http://localhost:8085 |

---

## Tenant isolation tests (CI)

Postgres must be running (`cd db && docker compose up -d`) and `DATABASE_URL` must use the non-superuser role `edvidura_app` (see `config.example.env`).

```bash
pytest -q tests/test_tenant_isolation.py
```

Or hit the live proof endpoint: `GET /dev/tenancy/cross-check`

These tests prove Tenant A cannot read Tenant B `launch_events` under RLS, forged inserts are rejected, and unknown LTI platforms fail closed.

## Notes

- Tenant resolution is based on registered LTI platforms.
- Institution and Student APIs are available through Swagger.
- Moodle handles authentication and launches the tool.
