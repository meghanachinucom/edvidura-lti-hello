# Identity (Keycloak) — ops / API auth

**Status:** Implemented (optional). Moodle LTI remains the learner/teacher front door.

## Preferred model (SaaS)

- **Single realm** `edvidura` with optional **`tenant_id`** user attribute on tokens.
- Realm role **`ops`** gates `/admin/*` and onboarding saves.
- Legacy **`X-Admin-Key` / `ADMIN_API_KEY`** still accepted (dual auth).

## Run Keycloak (dev)

```bash
cd identity
docker compose up -d
```

- Console: http://localhost:8087 — `admin` / `admin`
- Realm: `edvidura` (imported from `realm-edvidura.json`)
- Ops user: `ops` / `OpsPass123!` (role `ops`)
- Client: `edvidura-api` · secret `edvidura-api-dev-secret`

## App `.env`

```env
KEYCLOAK_ENABLED=1
KEYCLOAK_URL=http://localhost:8087
KEYCLOAK_REALM=edvidura
KEYCLOAK_CLIENT_ID=edvidura-api
KEYCLOAK_CLIENT_SECRET=edvidura-api-dev-secret
```

## Flows

| Path | How |
|------|-----|
| Browser onboarding | http://127.0.0.1:8000/auth/login → Keycloak → `/onboard` |
| Admin API | `Authorization: Bearer <access_token>` **or** `X-Admin-Key` |
| Status | `GET /auth/status` · `GET /auth/me` |

## Not preferred for SaaS

- Realm-per-tenant — heavy ops; only for paid enclave customers.
