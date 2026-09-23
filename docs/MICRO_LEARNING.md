# Micro-learning

Skill-scoped short lessons (remediation micro-lessons) as a first-class learner path.

## Student

| Route | Behavior |
|-------|----------|
| `/learn/micro` | Catalog of skill-linked micro-lessons; **Priority** from gap plan / weak skills |
| Home tile + **More → Micro-learning** | Entry points |
| My plan / quiz remediation | Same linked lessons via `skill_remediation` |

## Teacher

| Route | Behavior |
|-------|----------|
| `/teacher/dct` (**Micro-learning planner**) | Skills missing a lesson → AI draft → save & link |
| Teach → AI tools → Remediation micro-lesson | Same generator + save path |

Domain: `adaptive.micro_learning_catalog` + `dct_planner_pack` + `ai_assessment.generate_remediation_micro_lesson` + `skills.set_skill_remediation`.

## Flow

```
Weak skill / quiz miss
        │
        ▼
 Micro-lesson (short MD lesson linked to skill)
        │
        ▼
 Practice → Graded retry (remediation loop)
```

## Related

- [DCT.md](DCT.md) — planner + display reorder
- [SKILLS.md](SKILLS.md) — registry + remediation loop
- [ADAPTIVE.md](ADAPTIVE.md) — gap / PLE paths
- [AI.md](AI.md) — remediation generator
