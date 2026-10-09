# AI in EdVidura

AI helps with **content and feedback inside a Moodle-launched class**. Moodle still owns people and the gradebook.

## How to get AI access

### OpenAI (cloud)

```env
AI_ENABLED=1
AI_PROVIDER=auto
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
```

### Anthropic (Claude)

```env
AI_ENABLED=1
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```

With `AI_PROVIDER=auto`, Anthropic is preferred when `ANTHROPIC_API_KEY` is set, then OpenAI, then local HTTP.

### Local OpenAI-compatible (E04)

Point at Ollama, vLLM, LM Studio, etc. (must expose `/v1/chat/completions`):

```env
AI_ENABLED=1
AI_PROVIDER=local_http
# or: AI_FORCE_LOCAL=1 with AI_PROVIDER=auto
LOCAL_AI_BASE_URL=http://127.0.0.1:11434/v1
LOCAL_AI_API_KEY=
LOCAL_AI_MODEL=llama3.2
```

Without a remote endpoint, every feature still runs in **local heuristic** mode so demos work offline.

Check status: Teach → **AI tools** (`/teacher/ai`) or `GET /api/v1/ai/status` (ops auth).
Shows `provider: openai | local_http | local`.

## Features

| Feature | Who | Where |
|---------|-----|--------|
| **Make quiz** from a lesson | Teacher | Content → Easy/Medium/Hard + Recall/Apply/Analyze → questions from the **whole** lesson |
| **Student quizzes** | Student | Unique questions from **every page/section**; teacher sets level + complexity (or Auto); open **study plan** gap skills are validated per learner from scores |
| **Quiz from PDF / text** (multi-model parser) | Teacher | AI tools → upload → pick level + complexity → OpenAI or local LLM parses all pages → you check before save |
| **Remediation micro-lesson (DCT)** | Teacher | AI tools → pick skill → review → save draft/published + link skill |
| **SME authoring assistant (D13)** | Teacher | AI tools → Authoring assistant → draft lesson/manual/MCQ from SME sources → save |
| **Grade assist** (open response) | Teacher | AI tools → suggest score (**never** auto-sent to Moodle; copy into LMS) |
| **AI next steps** | Teacher | Class results |
| **Deep-link suggestions** | Teacher | LTI Deep Linking picker |
| **AI hint** on missed items | Student | Quiz result → AI hint |
| **Ask Vidura (D01)** | Student | Ask Vidura — citations + practice handoff; answers from approved SME sources |
| **Shortcuts / clarify / integrity / thumbs / flashcards (Phase A)** | Student + Teacher | Welcome chips (`/teacher/coach/shortcuts`); clarify-once; refuse exam/assignment writing; thumbs → xAPI `responded`; `/learn/flashcards` |
| **Cognitive tutor moves** | Student | Ask Vidura picks socratic / hint / explain / practice from quiz level + weak skills; shows a check question; xAPI records `coach_strategy` |
| **Jev decisions (optional)** | System | TypeSafe System One: on-topic + strategy + **local/remote LLM routing** for coach; quiz/MCQ cost gate + full-book coverage judge (`JEV_ENABLED` + `TYPESAFE_API_KEY`; see [JEV.md](JEV.md)) |
| **Coach voice (Indian languages)** | Student | Ask Vidura — Mic (STT) + Speak (TTS) via browser Web Speech; reply language picker (Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Gujarati, Bengali, Punjabi, Odia, Urdu, Assamese, Sanskrit, Nepali, English) |

## Modules

- `app.modules.ai_assessment` — teacher drafting & suggestions  
- `app.modules.ai_tutor` — student hints & coach (`voice`, `cognitive`, `integrity`, `clarify`, `shortcuts`, `flashcards`)
- `app.modules.jev` — optional TypeSafe Jev decisions (see [JEV.md](JEV.md))
- `app.modules.ai_authoring` — D13 teacher SME authoring assistant  
- `app.modules.sme` — C13 approved source registry  

## Guardrails

- No auto grade passback from AI — teacher confirms / copies into Moodle  
- Grade assist sets `moodle_passback: false` and never calls AGS  
- Coach only uses teacher-approved SME sources (version-pinned manuals / lessons)  
- Integrity mode refuses writing exams / assignments / answer keys (`COACH_INTEGRITY_ENABLED`)  

- Authoring assistant is a **different** persona from the learner coach  
- Tenant isolation unchanged (RLS)  
- Coach retention default: **stateless** (`COACH_STORE_TURNS`)
