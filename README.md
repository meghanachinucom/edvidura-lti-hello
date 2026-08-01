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

## LTI Launch Testing

1. Start Moodle and the FastAPI application.
2. Log in to Moodle.
3. Open the configured **EdVidura Hello** external tool.
4. Verify the launch displays:
   - Learner Name
   - Institution/Tenant
   - Course
   - Role

---

## Available URLs

| Service | URL |
|---------|-----|
| Backend | http://127.0.0.1:8000 |
| Swagger | http://127.0.0.1:8000/docs |
| Health | http://127.0.0.1:8000/health |
| Moodle | http://localhost:8085 |

---

## Notes

- Tenant resolution is based on registered LTI platforms.
- Institution and Student APIs are available through Swagger.
- Moodle handles authentication and launches the tool.
