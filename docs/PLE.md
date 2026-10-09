# Personal learning plan (PLE)

Persisted gap path per LTI subject — the first slice of full DCT/PLE on top of C9/C10.

## Behavior

| Event | Plan action |
|-------|-------------|
| Graded quiz with misses | Upsert **open** plan (supersedes previous) |
| Practice submit | Mark **practice** step done |
| Graded retry with no gaps | Mark plan **completed** |
| Open review lesson/manual (`loop=1`) | Mark matching **review** step done |
| `/learn/gap` → Mark done | Explicit step complete |
| Home Continue | Next incomplete step from open plan |
| Ask Vidura / chatbot turn | Fuse discussion topics into gaps → adapt plan ([SIGNALS.md](SIGNALS.md)) |
| Lesson progress (Moodle path) | Progress + quiz evidence re-rank skills on the plan |
| VR / sim xAPI (`channel=vr`) | Failed/low-score skills raised on the same plan |

Moodle still owns people; plans key only on `tenant_id` + LTI `subject`.

## Domain

- Table: `learner_plans` ([db/migration_learner_plans.sql](../db/migration_learner_plans.sql))
- Module: `app.modules.adaptive` — `upsert_open_plan`, `get_open_plan`, `mark_plan_step_done`, `resolve_learner_plan`, `sync_plan_after_attempt`
- Signals: `app.modules.signals` — chatbot + Moodle + VR → skill gaps → plan refresh
- UI: `/learn/gap` (My plan), quiz result “Learning plan saved”

## Not in this slice

- AI-generated remediation lessons
- Rewriting course lesson order in DB *(see [DCT.md](DCT.md) for display reorder)*
- Role skill matrices
