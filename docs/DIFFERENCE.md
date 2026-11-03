# Difference training (D23)

Role → required skills → gap path for learners who pick a **target role**.

## Flow

1. Teacher seeds **role profiles** + required skills (`Teach → Skills registry`)
2. Teacher (optional) generates a **differential curriculum** on `/teacher/dct` — drafts remediation lessons for role gaps that lack a linked lesson (`adaptive.generate_difference_curriculum`)
3. Learner opens **My plan** and selects a target role
4. If the learner has **no graded profile**, all required skills count as gaps and a **placement assessment** CTA appears (`skills.placement_assessment_for_role` → practice quiz)
5. Otherwise EdVidura computes **required − demonstrated mastery** from the latest graded attempt
6. Ordered path: review per gap skill → practice → graded retry (same PLE persistence)

Untested required skills count as gaps. `strong` / `mastered` skills are excluded.

## Domain

`app.modules.skills`

- `role_profiles` / `role_skill_requirements` (RLS)
- `ensure_default_roles`, `skill_gaps_for_role`, `required_skills_for_role`

`app.modules.adaptive`

- `build_difference_path` (`mode=difference`)
- `resolve_learner_plan(..., role_code=)`

Session field: `target_role` (quiz launch context).

## UI

| Who | Where |
|-----|--------|
| Teacher | `/teacher/skills` — role pack, assign skills |
| Learner | `/learn/gap` — role picker; Home Continue follows open plan |

## Related

- [SKILLS.md](SKILLS.md) — competency registry
- [ADAPTIVE.md](ADAPTIVE.md) / [PLE.md](PLE.md) — gap path persistence
