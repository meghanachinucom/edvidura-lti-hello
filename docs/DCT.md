# Dynamic lesson order & DCT authoring

Display-only reordering of the course path from weak skills. Author `lessons.position` is never rewritten.

## Behavior

| Surface | Effect when learner has open gaps |
|---------|-----------------------------------|
| `/lessons` | Gap-linked incomplete lessons first; **Priority** badge + skill label |
| Lesson prev/next | Follows adaptive list order |
| Home Continue | Uses reordered `next_lesson` when PLE step isn’t overriding |

Sources for gap codes (in order): open **PLE** skills → latest graded attempt weak skills → skill remediation `lesson_id`.

## D11 teacher planner

`Teach → DCT planner` (`/teacher/dct`)

- Lists skills **missing** a linked remediation lesson
- **Generate draft** → AI/local micro-lesson preview → save & link (`prefer_path=lessons`)
- Returns to the planner after save

Domain: `adaptive.dct_planner_pack` + existing `generate_remediation_micro_lesson` / `content.create_lesson`.

## Domain

`app.modules.adaptive`

- `weak_skill_codes_for_subject`
- `order_lessons_for_gaps` (pure)
- `apply_dynamic_lesson_order` (wraps `course_progress`)
- `dct_planner_pack`

## Related

- [PLE.md](PLE.md) — persisted personal plan
- [DIFFERENCE.md](DIFFERENCE.md) — role gap paths
- [ADAPTIVE.md](ADAPTIVE.md) — C9/C10 overview
- Teacher **AI tools** → Remediation micro-lesson (same save path)
