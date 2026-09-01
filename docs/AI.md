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
| **AI quiz** (MCQs from lesson) | Teacher | Upload content → AI quiz |
| **PDF / text → MCQ** | Teacher | AI tools → upload PDF/.txt → review → save |
| **Remediation micro-lesson (DCT)** | Teacher | AI tools → pick skill → review → save draft/published + link skill |
| **SME authoring assistant (D13)** | Teacher | AI tools → Authoring assistant → draft lesson/manual/MCQ from SME sources → save |
| **Grade assist** (open response) | Teacher | AI tools → suggest score (**never** auto-sent to Moodle; copy into LMS) |
| **AI next steps** | Teacher | Class results |
| **Deep-link suggestions** | Teacher | LTI Deep Linking picker |
| **AI hint** on missed items | Student | Quiz result → AI hint |
| **Study coach (D01)** | Student | Study coach — citations + practice handoff; answers from approved SME sources |

## Modules

- `app.modules.ai_assessment` — teacher drafting & suggestions  
- `app.modules.ai_tutor` — student hints & coach  
- `app.modules.ai_authoring` — D13 teacher SME authoring assistant  
- `app.modules.sme` — C13 approved source registry  

## Guardrails

- No auto grade passback from AI — teacher confirms / copies into Moodle  
- Grade assist sets `moodle_passback: false` and never calls AGS  
- Coach only uses teacher-approved SME sources (version-pinned manuals / lessons)  
- Authoring assistant is a **different** persona from the learner coach  
- Tenant isolation unchanged (RLS)  
- Coach retention default: **stateless** (`COACH_STORE_TURNS`)
