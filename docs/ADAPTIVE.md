# Adaptive path & gap training (C9 / C10)

Pilot-sized Dynamic Content (C9) + Difference / gap training (C10 / D23) on top of the **C8 skills registry**.

**Persisted PLE** (saved personal plan with step progress): see [PLE.md](PLE.md).  
**Role difference training**: see [DIFFERENCE.md](DIFFERENCE.md).

## What it does

| Piece | Behavior |
|-------|----------|
| **C10 gap path** | From latest graded attempt: weak/developing skills → ordered **review → practice → graded** |
| **D23 difference** | Target role required skills − mastery → same ordered path (`mode=difference`) |
| **C9 adaptive next** | If a weak skill has a linked lesson, Home “Continue” prefers that lesson over linear next |
| **PLE plan** | Same path stored in `learner_plans` until completed or superseded |
| **DCT lesson order** | Lessons list + prev/next reordered for gap-linked lessons (display only) |
| **DCT micro-lessons** | Teacher AI / DCT planner drafts remediation lessons per skill ([DCT.md](DCT.md), [AI.md](AI.md)) |

## Module

`app.modules.adaptive`

- `weak_skills_from_attempt`
- `build_gap_path` / `build_difference_path`
- `recommend_next_lesson`
- `gap_path_from_latest_attempt`
- `resolve_learner_plan` / `sync_plan_after_attempt` / `mark_plan_step_done`
- `dct_planner_pack`

## Student UI

- Quiz result → **Learning plan saved** when gaps persist (or difference plan when a target role is set)
- Home → Continue uses next open plan step
- Nav → **My plan** (`/learn/gap`) with progress, Mark done, and optional role picker

## Teacher

- Skills registry → role matrices
- **DCT planner** (`/teacher/dct`) → generate & link remediation lessons
- Class competency map still shows weak skills

## Out of scope (later)

- Full KB rebuild / auto-publish without teacher review
- Auto-assign LMS roles to EdVidura target roles
