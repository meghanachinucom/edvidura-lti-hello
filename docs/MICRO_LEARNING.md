# Micro-learning

Skill **video reels** students swipe — teachers publish short clips from the planner.

## Student

| Route | Behavior |
|-------|----------|
| `/learn/micro` | Full-screen video reels (swipe up) — skill title + one caption |
| Practice / Full lesson | CTAs on each reel |

## Teacher

| Route | Behavior |
|-------|----------|
| `/teacher/dct` → **Publish a skill reel** | Upload mp4/webm/mov (≤40MB) or paste URL → linked to skill |
| Generate draft | Optional text micro-lesson for skills still missing content |

Domain: `adaptive.publish_skill_reel` + `micro_learning_catalog` (reads `lessons.video_url`).

## Flow

```
Teacher uploads reel for skill
        │
        ▼
 Lesson (type=video) + skill_remediation link
        │
        ▼
 Student /learn/micro → swipe video → Practice
```

## Related

- [DCT.md](DCT.md) — planner + display reorder
- [SKILLS.md](SKILLS.md) — registry + remediation loop
- [ADAPTIVE.md](ADAPTIVE.md) — gap / PLE paths
