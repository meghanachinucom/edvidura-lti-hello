# Skills registry & remediation loop (C8)

## Skills registry

Tenant-scoped tables (RLS):

- `skills` — competency codes + labels
- `skill_items` — `question_key` → skill (one skill per question)
- `skill_remediation` — lesson / manual / focus / teleport copy
- `role_profiles` / `role_skill_requirements` — D23 role → required skills
- `skill_framework_imports` / `skill_external_ids` / `to_skill_proposals` — D08 framework import + TO review

Module: `app.modules.skills` (+ `framework.py` for import)

Teacher UI: **Teach → Skills registry** (`/teacher/skills`)

- Load defaults (LTI demo pack) or create skills
- Link quiz `question_key`s
- Set prefer path (`lessons` | `manuals`), focus slug, labels
- Role matrices (load default roles / assign skills)
- **Framework import (D08):** upload CSV/JSON → pending draft → approve → upsert skills + queue TO→skill proposals

Ops API: `/api/v1/skills/framework/*`, `/api/v1/skills/to-proposals/*` (ops auth).

Seed (`reset_seed_single_school.py`) creates Algebra competencies for Riverside + a versioned handbook with focus headings + difference-training roles.

## Closed remediation loop

On a quiz result with misses:

1. **Review** — teleport to lesson or pinned manual section (`focus=`, `loop=1`, `from_attempt=`)
2. **Practice** — `/quiz?practice=1&retry=<attempt>&loop=1` (no AGS)
3. **Graded retry** — `/quiz?retry=<attempt>&loop=1` (AGS when available)

Competency maps on results / class overview prefer the skills registry when present; otherwise fall back to hard-coded `COMPETENCIES` / `REMEDIATION` in `app.modules.specials`.

## Adaptive / gap / difference

See [ADAPTIVE.md](ADAPTIVE.md) and [DIFFERENCE.md](DIFFERENCE.md). Weak skills (or role gaps) drive an ordered path and optional adaptive lesson recommendation on Home.
