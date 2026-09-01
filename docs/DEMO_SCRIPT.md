# Pilot demo script (Release 1 vertical)

**Canonical runbook:** [`PILOT.md`](PILOT.md)

**Goal:** Moodle → LTI launch → class-bound lessons/quiz → grade back → teacher analytics → prove tenant isolation.

**Time:** ~20–25 minutes.

## Prep (once)

1. Postgres + Moodle + app — see [`PILOT.md`](PILOT.md).
2. [`AGS_CHECKLIST.md`](AGS_CHECKLIST.md).
3. `python scripts/reset_seed_single_school.py` (binds Moodle context `5` → Algebra).
4. `/health` → `db_ok: true`.

## Walkthrough

### 1. Operator (2 min)

http://127.0.0.1:8000/onboard — tool URLs + platform match Moodle.

### 2. Student (8 min)

1. Moodle login (create/enrol users **in Moodle**).
2. Open EdVidura activity (**new window**).
3. Home → **Algebra** path → Lessons → Quiz → submit.
4. Results + Moodle gradebook (if AGS configured).

### 3. Teacher (6 min)

1. Launch as teacher from same course.
2. **Class results** — radar, at-risk, AI next steps, CSV.
3. **Analytics** — school KPIs.
4. Optional: Upload content / AI tools.

### 4. Isolation (3 min)

`pytest -q tests/test_tenant_isolation.py` or `/dev/tenancy/cross-check` with `X-Admin-Key`.

### 5. Close (1 min)

- Official grade = Moodle; EdVidura = learning path + evidence.
- People = Moodle; classes/bindings = EdVidura.
- Not in this pilot: XR, Open edX pack, air-gap. Canvas = manual LTI key ([CANVAS.md](CANVAS.md)).

## Fallback if AGS fails

Show EdVidura attempt + Class results; use AGS checklist. Do not invent a second gradebook.
