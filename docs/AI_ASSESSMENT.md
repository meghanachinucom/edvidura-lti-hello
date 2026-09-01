# AI assessment (slice)

See **[AI.md](AI.md)** for the full feature list and how to enable OpenAI.

## Flows

| Flow | Input | Output |
|------|--------|--------|
| Lesson → MCQ | Reading lesson `body_md` | Draft MCQs → teacher saves to quiz bank |
| PDF/text → MCQ | Upload `.pdf` / `.txt` / `.md` | Extract text → same draft preview |
| Grade assist | Prompt + rubric + answer | Suggested score + copy text (**no AGS**) |
| Simplify | Lesson body | Draft rewrite → teacher applies |

## Module

`app.modules.ai_assessment` (+ `app.modules.ai_tutor` for students)

| Mode | When | Behavior |
|------|------|----------|
| **local** (default) | No key, or `AI_ENABLED` off | Heuristics — works offline |
| **openai** | `AI_ENABLED=1` + `OPENAI_API_KEY` | Chat Completions JSON; falls back to local on error |

PDF extraction uses **pypdf** (`pip install pypdf`). Scanned image-only PDFs need OCR elsewhere — paste text or use a text PDF.

## Env

```env
AI_ENABLED=1
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

## Teacher UI

- Teach → **AI tools** (`/teacher/ai`) — PDF→MCQ + grade assist
- Upload content → **AI quiz** / **Simplify**
- Class results → AI next steps

## Safety

- Grade assist never calls Moodle AGS (`moodle_passback: false`)
- Teacher copies suggestion into the LMS gradebook manually
