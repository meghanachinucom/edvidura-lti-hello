# Jev (TypeSafe System One) — decisions beside the LLM

Jev does **not** replace Ask Vidura or OpenAI. It is a System One model:
unstructured **state** in → typed **Choice / Score / Noul** out (with
confidence). EdVidura uses those answers to **gate**, **route**, and
**judge** before or after generative LLM work.

Official docs: https://thejevai.com/docs · TypeSafe:
https://typesafe.ai/blog/introducing-system-one-models-and-jev

## Why combine with our LLM (cost + quality)

| Job | Who | Why |
|-----|-----|-----|
| Guardrail (on-topic?) | **Jev** | Refuse off-class coach questions **before** chat tokens |
| Teaching strategy | **Jev** | Pick socratic / hint / explain / practice without an LLM call |
| **LLM tier** (local vs remote) | **Jev** | Skip expensive chat when heuristics are enough |
| Full-book coverage judge | **Jev** | After quiz gen — remediate if later pages missing |
| Student-facing prose / MCQ stems | **LLM** (or local heuristic) | Only when generation is needed |

**Cost shape (vendor published):** Jev ≈ **$0.042 / MTok input**, **output free**,
~70–500 ms. Chat LLMs are typically **$0.20–$10 / MTok input** plus costly
output. Routing one decision to Jev and skipping a full quiz/coach completion
often saves **~100×–400×** on that step (workflow-dependent).

Pattern: **Jev decides → local heuristic OR remote LLM writes**.

## Enable

```env
JEV_ENABLED=1
TYPESAFE_API_KEY=…          # TypeSafe console
JEV_MODEL=jev-latest        # pin e.g. jev-1.13.0 after tuning
JEV_MIN_CONFIDENCE=0.55
JEV_ROUTE_LLM=1             # default on — let Jev skip remote chat when confident
```

When disabled or the API is down, heuristics keep working unchanged.

## Where it runs

| Surface | Decision | Module |
|---------|----------|--------|
| Ask Vidura | On-topic? + strategy + **llm_tier** | `coach_decisions` → `ai_tutor` (after integrity + clarify gates) |
| Personalized quiz | **Pre-route** local vs remote; post **coverage** OK? | `route_llm_tier` via `run_ai` + `quiz_coverage_ok` |
| Teacher MCQ draft | **Pre-route** local vs remote | `run_ai(..., route_state=…)` in `ai_assessment` |
| Shared AI runner | Optional cost gate | `app.modules.ai_assessment.llm.run_ai` |

xAPI coach statements record `jev_used`, `jev_model`, strategy source/confidence,
and on-topic probability when used. Responses may include `jev_route` /
`jev_skipped_remote` when a remote LLM was avoided.

## Module

`app.modules.jev` — `decide`, `coach_decisions`, `route_llm_tier`,
`quiz_coverage_ok`, `jev_status`.

## Ops checklist

1. Set `TYPESAFE_API_KEY` + `JEV_ENABLED=1` on Railway (or local `.env`).
2. Confirm `GET /api/v1/ai/status` → `jev.configured: true`.
3. Leave `JEV_ROUTE_LLM=1` unless you want every feature to always call the chat LLM.
4. Pin `JEV_MODEL` after you like the thresholds in production.
