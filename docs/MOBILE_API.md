# EdVidura App API (web + mobile)

**One JSON API for both platforms.** Native apps and future web SPAs use the same
contract under `/api/v1/app`.

Ops/integration routes under `/api/v1/*` (TLA, xAPI admin, institutions) stay
separate and use `X-Admin-Key`.

## Contract

```json
{
  "ok": true,
  "data": { },
  "error": null,
  "meta": { }
}
```

Error:

```json
{
  "ok": false,
  "data": null,
  "error": { "code": "auth_required", "message": "…" }
}
```

Schema id: `edvidura.app.v1`

## Auth (after Moodle LTI)

1. User launches EdVidura from Moodle (LTI) — web view or custom tab.
2. Capture `quiz_token` from the redirect / launch handoff.
3. Call App API with either:

```http
Authorization: Bearer <quiz_token>
```

or

```http
X-EdVidura-Token: <quiz_token>
```

or `?token=<quiz_token>` (**development only** — ignored in production/staging).
Same-origin web may also use the LTI cookie session.

Quiz submit `detail` never includes `correct_index`. Manuals/discuss endpoints
require a class binding for learners (no tenant-wide fallback).

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/app/health` | No auth — ping |
| GET | `/api/v1/app/session` | Learner profile + token |
| GET | `/api/v1/app/manuals` | Class manuals |
| GET | `/api/v1/app/manuals/{id}` | Reader (TOC + HTML + PeBL counts) |
| POST | `/api/v1/app/manuals/{id}/page-time` | Per-page / chapter dwell time → xAPI `experienced` |
| GET | `/api/v1/app/manuals/{id}/discussions?chapter=` | PeBL thread |
| POST | `/api/v1/app/manuals/{id}/discussions` | Post / sync message |
| GET | `/api/v1/app/micro` | Micro-learning catalog |
| POST | `/api/v1/app/micro/viewed` | Reel view xAPI |
| GET | `/api/v1/app/plan` | Study plan card |
| GET | `/api/v1/app/home` | SPA bootstrap: session + course + lessons + progress |
| GET | `/api/v1/app/lessons` | Lesson cards for the bound course (403 `capability_denied` if segment disables lessons) |
| GET | `/api/v1/app/lessons/{id}` | Lesson body HTML + neighbors |
| POST | `/api/v1/app/lessons/{id}/complete` | Mark lesson complete for the learner subject |
| GET | `/api/v1/app/progress` | Completion percent + next lesson |
| GET | `/api/v1/app/attempts` | Own attempts (learner) or class attempts (staff); includes `quota` (used/limit/remaining) and `counters` |
| GET | `/api/v1/app/analytics` | Teacher KPI roll-up (xAPI verbs, attempts, completions, by-tool grouping, sessions, date×learner heatmap, per-student day/week/month/quarter series). 403 for learners |
| GET | `/api/v1/app/quiz?practice=` | Questions with `qtype` (no correct keys); 403 `capability_denied` if segment disables quiz; graded path may also 403 `ghost_coach_gate`, `not_assigned` (group assignment), or return `quota` / `can_submit` |
| POST | `/api/v1/app/quiz/submit` | Grade + save attempt (`passed` at 60%); queues Moodle AGS when not practice (`grade_queued`); 403 `attempt_limit` / `not_assigned` |
| POST | `/api/v1/app/quiz/policy` | Teacher: set graded `max_attempts` (1–20, default 3) |
| GET | `/api/v1/app/assignments` | F-3 assignment dashboard (own groups for learners; class for staff) |
| GET | `/api/v1/app/files/{id}` | F-4 JSON file fetcher (`quiz`, `assignments`, stored JSON); 406 `not_json` |
| GET | `/api/v1/app/files/{id}/stream` | F-9 raw bytes (PDF/MD/JSON) |
| GET | `/api/v1/app/files/{id}/meta` | F-10 kind + route |
| POST | `/api/v1/app/files` | Teacher: store a middleware file |
| POST | `/api/v1/app/grades` | Teacher: F-5 inbound grade from an external module (never replaces Moodle AGS) |
| POST | `/api/v1/app/quiz/bank/generate` | Teacher: 100+ draft test bank + review flags |
| GET | `/api/v1/app/quiz/bank` | Teacher: draft bank items + live quiz count |
| POST | `/api/v1/app/quiz/bank/review` | Teacher: approve/reject drafts; optional promote into live quiz |
| GET | `/api/v1/app/quiz/export?format=md\|pdf` | Teacher: Markdown or base64 PDF of the live assessment |
| POST | `/api/v1/app/quiz/essay-grade` | Teacher: essay vs instructor answer + RAG; never AGS |
| GET | `/api/v1/app/groups` | LTI/local groups + assignments (learners see own groups) |
| POST | `/api/v1/app/groups` | Teacher: create a local group |
| POST | `/api/v1/app/groups/assign` | Teacher: assign quiz/lesson/manual to a group |
| POST | `/api/v1/app/coach` | Ask Vidura turn (citations, clarify, integrity — same as shell) |

## Example

```http
GET /api/v1/app/session
Authorization: Bearer eyJ…
```

```json
{
  "ok": true,
  "data": {
    "token": "…",
    "tenant_id": "…",
    "subject": "175",
    "learner_name": "Ada",
    "class_name": "Welding 101",
    "is_instructor": false,
    "segment": "school",
    "is_corporate": false,
    "capabilities": {
      "lessons": true,
      "quiz_graded": true,
      "video_library": true
    }
  },
  "error": null
}
```

```http
POST /api/v1/app/coach
Authorization: Bearer …
Content-Type: application/json

{ "question": "What PPE is required?", "reply_language": "en-IN" }
```

## OpenAPI

On **non-production** environments: interactive docs at `/docs` (tag **App (web + mobile)**),
schema at `/openapi.json`. Export that file for the mobile team.

Production hides `/docs`; share staging OpenAPI or this markdown.

## Local SPA (`frontend/`)

Vite on `http://127.0.0.1:3000` proxies `/api` and `/dev` to FastAPI `:8000`.

Moodle on `:8085` (LTI launch) and `/dev/client-launch` both redirect to the SPA
with `?token=` in local development. Jinja hub: `?ui=shell` on `/launch-hub`,
or `spa=0` on client-launch, or `FRONTEND_SHELL=1`.

## Note on today’s HTML shell

The Moodle-launched Jinja UI still uses cookie + page routes. New web/mobile
clients should prefer `/api/v1/app` so both platforms stay aligned.
