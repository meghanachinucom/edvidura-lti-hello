# SME sources & study coach (C13 / D01)

## SME source registry

Tenant-scoped table (RLS): `sme_sources`

- `source_kind`: `manual` | `lesson`
- Manuals may set `pin_version` (version lock) and `focus_slug` (`##` heading)
- Lessons are whole reading items

Module: `app.modules.sme`

Teacher UI: **Teach → SME sources** (`/teacher/sme`)

## Study coach (learner)

`/learn/coach` answers **only from the bound class course’s lessons** (LTI session `edvidura_course_id`).

- Corpus = reading lessons on that course (quizzes excluded)
- If the teacher curated SME **lesson** sources for that course, those are preferred
- Tenant-wide manuals / other courses are **not** mixed in
- Off-topic questions → `grounded=false`, `refusal_reason=off_class_materials`
- Missing course/lessons → `refusal_reason=no_class_materials`

### Citations UX

Citation cards show title link, kind, pinned version, and a short excerpt. Invented titles are dropped.

### Guardrails

- Answer only from this class’s lesson chunks
- Require at least one in-class citation when `grounded=true`
- `grounded=false` + `refusal_reason` when off-class / empty materials
- Never writes Moodle grades
- LLM prompt forbids general knowledge and other courses

### Retention

Default **stateless** — turns are not stored (`COACH_STORE_TURNS=0`). Set `COACH_STORE_TURNS=1` only when a future turn store is enabled.

### Practice handoff (D02)

After an answer, **Practice related quiz** → `/quiz?practice=1` (sandbox lane).

## Authoring assistant (D13)

Separate teacher surface: `/teacher/ai/author` — see [AI.md](AI.md). Does **not** reuse the learner coach persona.

## Seed

Riverside seed registers the Algebra handbook (v1), a Variables focus row, and the first reading lesson.
