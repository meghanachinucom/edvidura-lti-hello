# SME sources & study coach (C13 / D01)

## SME source registry

Tenant-scoped table (RLS): `sme_sources`

- `source_kind`: `manual` | `lesson`
- Manuals may set `pin_version` (version lock) and `focus_slug` (`##` heading)
- Lessons are whole reading items

Module: `app.modules.sme`

Teacher UI: **Teach → SME sources** (`/teacher/sme`)

## Study coach (learner)

`/learn/coach` answers only from approved registry chunks (manuals preferred).

When the registry is empty, `ensure_default_sources` pins published manuals + course reading lessons once.

### Citations UX

Citation cards show title link, kind, pinned version, and a short excerpt.

### Guardrails

- Answer only from approved SME chunks
- `grounded=false` + `refusal_reason` when off-curriculum / empty sources
- Never writes Moodle grades

### Retention

Default **stateless** — turns are not stored (`COACH_STORE_TURNS=0`). Set `COACH_STORE_TURNS=1` only when a future turn store is enabled.

### Practice handoff (D02)

After an answer, **Practice related quiz** → `/quiz?practice=1` (sandbox lane).

## Authoring assistant (D13)

Separate teacher surface: `/teacher/ai/author` — see [AI.md](AI.md). Does **not** reuse the learner coach persona.

## Seed

Riverside seed registers the Algebra handbook (v1), a Variables focus row, and the first reading lesson.
