# Learner signals (chatbot · Moodle · VR)

Per-individual evidence fusion that **adapts the open study plan** as new
inputs arrive. Plans still live in `learner_plans`; this module decides
*which skills* should be on the path.

## Channels

| Channel | Inputs | How EdVidura sees them |
|---------|--------|-------------------------|
| **Chatbot** | Ask Vidura / study coach turns | xAPI `channel=study_coach` (strategy, grounded Q&A text) |
| **Moodle / LMS** | Graded quiz attempts, lesson progress | `quiz_attempts`, `lesson_progress` (people stay in Moodle/NRPS) |
| **VR / sim** | Federate/HLA or any VR xAPI | `POST /api/v1/xapi/statements` with `channel=vr` or `sim` (or VR activity type) |

All three are keyed by **tenant + LTI `subject`** so adaptation is always
per learner.

## Flow

```
chatbot turn ─┐
Moodle quiz / progress ─┼─► signals.build_learner_signal_profile
VR xAPI statement ─┘         │
                             ▼
                   suggest_skill_gaps_from_signals
                             │
                             ▼
              adaptive.build_gap_path → upsert_open_plan
                             │
                             ▼
                    My plan / Home Continue / personalized quiz
```

## Module

`app.modules.signals`

- `build_learner_signal_profile(tenant_id, subject, …)`
- `suggest_skill_gaps_from_signals(tenant_id, profile)`
- `refresh_open_plan_from_signals(…)` — write adapted PLE when gaps change
- `note_learner_activity(…, channel=)` — thin hook after coach / quiz / lesson / VR

`adaptive.resolve_learner_plan` calls signal refresh so Home and **My plan**
stay current. Ask Vidura learner context also merges fused weak skills.

## VR ingest convention

```json
{
  "actor": { "account": { "name": "<lti-subject>", "homePage": "…" } },
  "verb": { "id": "http://adlnet.gov/expapi/verbs/completed" },
  "object": {
    "id": "https://example.org/vr/module-1",
    "definition": {
      "type": "https://w3id.org/xapi/virtual-reality/activity-types/vr-experience",
      "name": { "en-US": "Pipe isolation drill" }
    }
  },
  "result": { "success": false, "score": { "scaled": 0.4 } },
  "context": {
    "extensions": {
      "https://edvidura.local/xapi/extensions/channel": "vr",
      "https://edvidura.local/xapi/extensions/skill_code": "alg.vars"
    }
  }
}
```

Failed or low-score VR tasks raise those skills on the learner’s plan.

## Related

- [PLE.md](PLE.md) — persisted plan steps  
- [ADAPTIVE.md](ADAPTIVE.md) — C9/C10 gap path  
- [FEDERATE_HLA.md](FEDERATE_HLA.md) — future VR federation track  
- [XAPI.md](XAPI.md) — statement store / LRS  
