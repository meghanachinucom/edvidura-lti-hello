# EdVidura web SPA

Vanilla TypeScript UI from the Academic Learning zip. Talks to the FastAPI App API under `/api/v1/app`. Jinja shell stays on `:8000` as the Moodle fallback.

## Local run (with backend)

1. Postgres + API: from the repo root, start `db/docker-compose.yml` and `uvicorn app.main:app --reload --port 8000`.
2. In this folder: `npm install` then `npm run dev` (Vite on http://127.0.0.1:3000, proxies `/api` and `/dev` to `:8000`).
3. Open a tenant without Moodle:

```
http://127.0.0.1:8000/dev/client-launch?slug=riverside&role=student&key=YOUR_ADMIN_API_KEY&spa=1
```

That mints a learner token and redirects to the SPA with `?token=`. Use `slug=ap-chaganti` (government pravachanalu, no Moodle), `welding-corp`, or `riverside`; `role=teacher` or `role=admin` for staff.

Without a token the screens stay on the design mock data.

## What is live vs mock

| Screen | Backend |
|--------|---------|
| Session / header name | `GET /api/v1/app/session` + `/home` |
| Lessons list + reader + complete | `/lessons`, `/lessons/{id}`, `POST .../complete` |
| Quiz + results | `/quiz`, `POST /quiz/submit` |
| Manuals + reader | `/manuals`, `/manuals/{id}` |
| Ask Vidura | `POST /coach` |
| Progress % | `/progress` |
| Teacher gradebook rows | `/attempts` |
| AP Chaganti library / player / notes / dept | `/pravachanas`, `/pravachanas/{id}`, progress, notes, `/stats` |
| XR Labs, admin tabs, heatmaps | Design mock (no App API yet) |
