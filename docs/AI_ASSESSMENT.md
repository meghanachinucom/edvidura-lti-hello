# AI assessment (slice)

Generate draft multiple-choice questions from a lesson body. Teachers review and save into the tenant quiz bank.

## Module

`app.modules.ai_assessment`

| Mode | When | Behavior |
|------|------|----------|
| **local** (default) | No key, or `AI_ENABLED` off | Heuristic MCQs from lesson sentences — works offline |
| **openai** | `AI_ENABLED=1` + `OPENAI_API_KEY` | Chat Completions JSON; falls back to local on error |

## Env

```env
# Optional — local generator works without these
AI_ENABLED=1
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

## Teacher UI

1. Teach → Upload content  
2. On a reading lesson with enough text → **AI quiz**  
3. Preview → select → **Save selected** → school quiz bank  

Routes: `POST /teacher/ai/generate`, `POST /teacher/ai/save`.

## Non-goals (this slice)

- Auto-grading open responses  
- PDF → questions pipeline  
- Student-facing chatbot  
