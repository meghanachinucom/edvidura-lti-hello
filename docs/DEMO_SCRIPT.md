# Pilot demo script (Release 1 / Slice A+)

**Goal:** Onboard a Moodle → launch → assess → grade back → teacher view → prove Tenant A ≠ Tenant B.

**Time:** ~20–25 minutes.

## Prep (once)

1. Postgres + app + Moodle running (`db/`, uvicorn `:8000`, Moodle `:8085`).
2. Follow [`AGS_CHECKLIST.md`](AGS_CHECKLIST.md).
3. Seed schools if needed: `python scripts/seed_schools.py` (+ Moodle users script if used).
4. Confirm `/health` → `db_ok: true`.

## Walkthrough

### 1. Operator onboarding (2 min)

1. Open http://127.0.0.1:8000/onboard  
2. Show tool URLs to paste into Moodle.  
3. Show registered platforms + launch status.

### 2. Student journey (8 min)

1. Moodle login as demo student (e.g. Riverside Alice).  
2. Open EdVidura LTI activity (**new window**).  
3. **Home** → continue / **Lessons** → mark complete → **Quiz** → submit.  
4. Show **My results** score.  
5. Moodle gradebook → score present (if AGS checklist passed).

### 3. Teacher journey (6 min)

1. Launch as teacher.  
2. **Upload content** — draft/publish or reorder a lesson (optional).  
3. **Manual versions** — open versioned manual (Slice B start).  
4. **Class results** — filters + CSV export + best scores.

### 4. Isolation proof (3 min)

1. Open http://127.0.0.1:8000/dev/tenancy/cross-check → `ok: true`.  
2. Or: `pytest -q tests/test_tenant_isolation.py` with Postgres up.  
3. Narrative: Tenant A cannot read Tenant B under RLS.

### 5. Close (1 min)

- Official grade = Moodle gradebook; EdVidura keeps attempt history.  
- BYO Moodle; shared DB + RLS for cloud SaaS (DEC-006).  
- Not in scope this demo: AI, XR, Keycloak front door, air-gap.

## Fallback if AGS fails live

Still show EdVidura attempt + Class results; open checklist and name the Moodle toggle as the fix. Do not invent a second gradebook.
