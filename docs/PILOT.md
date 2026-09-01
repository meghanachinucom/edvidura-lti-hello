# Pilot-ready vertical

**Vertical:** Moodle (people + gradebook) → LTI launch → class-bound lessons/quiz → AGS grade → teacher analytics.

**Time:** ~25 minutes live.

## One-time prep (local)

```powershell
# Docker: Postgres :5433 + Moodle :8085
docker start db-db-1 moodle-postgres-1 moodle-moodle-1

# Schema + demo school (Riverside)
$env:DATABASE_URL = "postgresql://edvidura:edvidura@127.0.0.1:5433/edvidura"
python scripts/apply_migrations.py
python scripts/reset_seed_single_school.py

# App
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Confirm: http://127.0.0.1:8000/health → `db_ok: true`.

Seed includes:

| Item | Value |
|------|--------|
| Tenant | `riverside` |
| LTI | `http://localhost:8085` / client `2HXWneHjMgBHNNl` |
| Moodle context → class | context id `5` → Algebra Period 1 / Algebra I curriculum |
| Override context | `SEED_MOODLE_CONTEXT_ID=<id>` before seed |
| Isolation peer | Hidden `lakeside-peer` tenant (for RLS proofs only) |

## Moodle setup

1. Follow [`AGS_CHECKLIST.md`](AGS_CHECKLIST.md) (Accept grades = Yes, new window).
2. External tool Client ID / Deployment ID must match `/onboard`.
3. Activity lives in a course whose LTI `context.id` is **5** (or re-bind under School → Classes & links).

Moodle admin (typical local): `admin` / `Admin@12345`.

Create/enrol **real Moodle users** for the demo (students & teachers). EdVidura does **not** create logins.

## Live walkthrough

### 1. Operator (2 min)
- http://127.0.0.1:8000/onboard — platform registered, URLs OK.

### 2. Student (8 min)
1. Moodle → course → **Open EdVidura** (new window).
2. Home shows **Algebra** path (bound class).
3. Lessons → complete → Quiz → submit.
4. Result: score + receipt; Moodle gradebook if AGS on.

### 3. Teacher (8 min)
1. Launch as teacher from same course.
2. **Class results** — bound class filter, radar, at-risk, AI next steps, CSV.
3. **Skills registry** — competencies linked to quiz items + remediation paths.
4. **SME sources** — approved manuals for the study coach.
5. **Analytics** — school KPIs.
6. Optional: **AI tools** — PDF→MCQ draft, grade assist (copy only, no Moodle send).

### Student remediation loop (optional 3 min)
1. Miss an item → result shows **1 Review → 2 Practice → 3 Graded retry**.
2. Open pinned handbook/lesson → Practice (no Moodle) → Graded retry (AGS).

### Study coach (optional 2 min)
1. Student → **Study coach** → ask “What is a variable?”
2. Answer cites handbook section (version-pinned).

### Gap training / PLE (optional 2 min)
1. Miss items on quiz → result shows **Learning plan saved**.
2. Home Continue → next open step; or nav → **My plan** (progress + Mark done).
3. Practice → graded retry clears gaps → plan completes.

### Adaptive lessons / DCT (optional 2 min)
1. After a miss with skill→lesson links, open **Lessons** — gap lessons show **Priority** first.
2. Author order in Upload is unchanged; this is display-only DCT.
3. Teacher → **AI tools** → Remediation micro-lesson → save draft → publish → Gaps use the new lesson.

### 4. School admin (3 min) — Moodle Administrator role
1. **Classes & links** — show Moodle context binding + curriculum link.
2. Teachers/Students pages point to Moodle for people.

### 5. Isolation (2 min)
```powershell
pytest -q tests/test_tenant_isolation.py
# or
curl -H "X-Admin-Key: YOUR_ADMIN_API_KEY" http://127.0.0.1:8000/dev/tenancy/cross-check
```

## Success criteria

- [ ] Student sees Algebra lessons (not wrong subject)
- [ ] Quiz attempt stored in EdVidura
- [ ] Moodle gradebook updated **or** AGS gap explained via checklist (no fake second gradebook)
- [ ] Teacher Class results shows class-filtered attempts
- [ ] Tenant isolation proof passes

## Fallback

| Failure | Action |
|---------|--------|
| Wrong curriculum | School admin → bind Moodle context id to class + course |
| Unknown platform | Fix client/issuer on `/onboard` |
| No Moodle grade | AGS checklist — still show EdVidura attempt |
| App down | Restart uvicorn; check `/health` |

## Out of scope for this pilot

XR, Open edX pack, full TLA mesh, enclave / air-gap.
(Canvas LTI is supported via manual Developer Key — see [CANVAS.md](CANVAS.md).)
