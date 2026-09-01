# Multi-LMS (E03)

EdVidura is an **LTI 1.3 Advantage** tool. Moodle is the proven vertical; Canvas / Open edX use the same registration model (`lti_platforms` → tenant).

## Product rule

- **LMS** owns people and the official gradebook  
- **EdVidura** owns paths, content, evidence (receipts, PLE, skills)

## What shipped in this epic

| Piece | Behavior |
|-------|----------|
| `detect_lms_name(issuer)` | Moodle / Canvas / Open edX / Blackboard / LMS |
| Session | `lms_name`, `lms_return_url`, `lms_base_url` (+ Moodle aliases) |
| Shell | “Back to {LMS}” via `/return-to-lms` |
| Onboard | Canvas Developer Key checklist + manual issuer for any LMS |

## Capability matrix

| Capability | Moodle | Canvas target |
|------------|--------|----------------|
| Launch | Proven | Required |
| AGS | Proven | Required |
| NRPS sync | Proven | Required |
| Deep Linking | Proven | Nice-to-have |
| Dynamic Registration | Preferred | Often skip — manual key |

## Docs

- [CANVAS.md](CANVAS.md) — install playbook  
- [ONBOARDING.md](ONBOARDING.md) — Moodle dynreg + manual  
- [LTI_CONNECTION_MODEL.md](LTI_CONNECTION_MODEL.md) — platforms table  

## Explicitly later

Open edX pack, Blackboard pack, Canvas REST (non-LTI) sync.
