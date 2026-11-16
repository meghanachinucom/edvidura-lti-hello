# EdVidura · 3D Lab Studio (standalone demo)

**Chapter PDF → planner (LLM or heuristic) → configurable 3D template → approve → student**

Title, summary, callouts, objectives, quiz, and slider/hotspot labels are built from the uploaded chapter. The 3D mesh still comes from the closest Indian-school template (not AI mesh generation). Not wired to Moodle/LTI.

## Templates

| Id | Topic | Graphics |
|----|--------|----------|
| **`cell_tour`** | Fundamental unit of life (Class 9) | **Showcase** — glass, bloom, orbit |
| **`water_cycle`** | Water cycle / monsoon (Class 6–7) | **Showcase** — ocean, vapour, storm, rain |
| `fraction_bar` | Fractions (Class 6) | Demo |
| `photosynthesis` | Nutrition in plants (Class 7) | Demo |
| `digestive` | Digestion path (Class 7) | Demo |
| `light_mirror` | Reflection at plane mirror (Class 8/10) | Demo |
| `forces` | Force & laws of motion (Class 9) | Demo |
| `circuit` | Electric circuit (Class 7/10) | Demo |

## Planner tech

| Mode | When | What |
|------|------|------|
| **Heuristic** | Default (offline) | Keyword → template; callouts/quiz/objectives from chapter sentences |
| **LLM** | `VITE_OPENAI_API_KEY` or `VITE_LLM_BASE_URL` | OpenAI-compatible JSON plan (title, summary, callouts, sliders, quiz) |

Copy `.env.example` → `.env` and restart Vite to enable LLM.

## Run

```bash
cd demos/3d-lab-studio
npm install
npm run dev
```

Open http://localhost:5177/

## 5-minute demo

1. Teacher → **Chapter PDF** (text PDF / NCERT digital).
2. Planner fills draft (note shows heuristic vs LLM).
3. Confirm **Template** → edit callouts → **Approve & publish**.
4. Student → textbook + goals + quiz + 3D with chapter labels on controls.

## Port to EdVidura

- Planner → `app/modules/interactive_labs` + `ai_authoring` / `local_http`
- Runtimes → `frontend/src/components/` playgrounds
- Packs → `lab_packs` with `scene` JSON (labels/sliders/quiz)
