# Sealed grade receipts

EdVidura issues **HMAC-SHA256 sealed** learning evidence for quiz attempts. Moodle remains the official gradebook; the seal proves EdVidura’s attempt payload was not altered after issue.

## What you get

| Surface | Behavior |
|---------|----------|
| Quiz result | Sealed badge, seal prefix, download JSON, verify link; skill xAPI count when competency statements exist |
| `GET /quiz/result/{id}/receipt.json` | Full sealed payload |
| `GET|POST /receipts/verify` | Paste JSON → valid / mismatch |

## Canonical fields

`attempt_id`, `tenant_id`, `subject`, `learner_name`, `score`, `max_score`, `percent`, `grade_sent`, `practice`, `xapi_statement_id` (quiz assessment), `issued_at` — sorted JSON, then HMAC.

Per-skill competency statements (D15) are stored separately on the same `attempt_id` and shown as a count on the result page; they are not part of the seal canonical body.

## Config

- `RECEIPT_SIGNING_KEY` (optional) — dedicated HMAC secret
- Falls back to `SESSION_SECRET` in development

## Domain

- Module: `app.modules.receipts`
- Builds on `specials.grade_receipt` then attaches `seal` / `alg` / `sealed`
