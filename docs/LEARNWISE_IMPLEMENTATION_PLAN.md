# LearnWise review → EdVidura implement plan

**Source:** `LearnWise_AI_Feature_Specification.docx` (v1.0, 1 Oct 2026)  
**Rule:** We do **not** clone LearnWise. We **steal requirements that fit EdVidura**, reuse modules, and ship in thin slices.

---

## 0. Core software fundamentals (non-negotiable)

| Principle | How we apply it |
|-----------|-----------------|
| **Product identity** | EdVidura = Moodle-launched **class learning** (coach, quiz, xAPI, adaptive). LearnWise = campus widget + grader + ops agent. Only overlap with our identity gets built. |
| **Reuse before invent** | Prefer `ai_tutor`, `sme`, `jev`, `quiz`, `xapi`, `adaptive`, `signals`, `ai_assessment`, `tenancy`. New module only when no home fits. |
| **Thin routes / fat modules** | Domain in `app/modules/<name>/`; routes parse → call → respond. No SQL in routes. |
| **Tenant isolation** | Every new table: migration + RLS + `tenant_connection`. Never trust client `tenant_id`. |
| **YAGNI** | Skip CS campus widget, 400-tool library, Teams/SharePoint, Ops write-agent, auto-grader passback until a sheet row and customer need exist. |
| **Decide ≠ write** | Keep **JEV / rules for decisions**; LLM only for student/teacher-facing text. Matches LearnWise “agentic” idea without copying their stack. |
| **Human in the loop for grades** | No silent Moodle grade write from AI. Grade assist stays draft; AGS only from real quiz flow. |
| **Feature flags** | New behaviour behind settings (`*_ENABLED`) with safe heuristic fallback (same pattern as JEV). |
| **Testable exit gates** | Each phase ends with: automated tests + one Riverside demo script + sheet status update. |
| **Observability first** | New AI paths emit xAPI (or outbox events) so Metabase/Yet can prove value. |

---

## 1. Product mapping (wise, not 1:1)

| LearnWise product | EdVidura stance |
|-------------------|-----------------|
| **AI Campus Support** | **Out of scope** for now (widget, help desks, ticketing). Revisit only if sheet adds “campus chatbot.” |
| **AI Student Tutor** | **Core overlap** — deepen Ask Vidura + study tools on existing LTI/SME/JEV path. |
| **AI Feedback & Grader** | **Partial** — keep teacher grade-assist drafts; **no** SpeedGrader embed / auto-grade until liability + AGS policy clear. |
| **AI Ops Assistant** | **Later / high risk** — read-only LMS queries maybe; **bulk write with approval** last. |

Shared LearnWise ideas we **do** want in EdVidura language:

- Walled garden + citations + refuse off-class → already started (`sme` + `ai_tutor` + JEV)
- Role-aware answers → extend from LTI roles
- Study quizzes / plans → extend `quiz` + `adaptive` / PLE
- Teacher insights → extend `analytics` + xAPI
- Clarifying question / shortcuts / thumbs → small UX + module APIs on coach
- Flows / Help Desks → **do not build** until Campus Support is in scope

---

## 2. Gap map (status language: Have / Partial / Missing / Skip)

### Tutor & coach (build here)

| LW ID | Idea (plain) | EdVidura today | Plan |
|-------|--------------|----------------|------|
| TU-01 | Course-scoped LTI tutor | **Have** — Ask Vidura + course bind | Keep; harden tests |
| TU-02 | Sync LMS course files | **Partial** — lessons/manuals/SME, not full Moodle scrape | Phase B: optional Moodle content import |
| TU-03 | Extra course files | **Partial** — manuals / SME upload | Extend SME kinds carefully |
| TU-04 | Cross-course chat | **Skip** by default (breaks walled garden) | Flag only if requested |
| TU-05 | Study plans | **Partial** — adaptive / PLE / signals | Phase B: student-visible plan UI |
| TU-06 | Quizzes + flashcards | **Partial** — quizzes yes; flashcards **Missing** | Phase A: flashcards from lesson chunks |
| TU-07 | Role-play | **Missing** | Phase C (nice) |
| TU-08 | H5P | **Missing** | Skip unless PeBL/ebook needs it |
| TU-09 | Won’t write exams | **Partial** — off-class refuse; add integrity style | Phase A: integrity prompt + JEV gate |
| TU-10 | Teacher shortcuts / welcome | **Missing** | Phase A: coach shortcuts |
| TU-11 | Teacher insights | **Partial** — Yet/Metabase/xAPI | Phase B: coach dashboard slice |
| TU-12 | Video timestamps | **Missing** | Phase C |
| CS-01/02 | Cited Q&A | **Have** / partial click-through | Phase A: stronger citation links |
| CS-05 | Clarify when unclear | **Missing** | Phase A |
| CS-15 | Thumbs on answers | **Missing** | Phase A → xAPI |
| CS-04 | Role-aware | **Partial** (LTI roles exist) | Phase B |
| CS-10 | Multilingual | **Have** (voice + languages) | Keep |

### Explicitly Skip (until product decision)

Campus widget (CS-03–14 except above), Help Desks, Flows, ticketing, 400-tool library, Teams/SharePoint, Ops bulk writes, automated LMS grade write, SOC2 programme as “feature work.”

### Grader

| LW ID | Stance |
|-------|--------|
| GR-01–03, GR-05 | Improve **in-app** grade assist (`ai_assessment`) — Phase B |
| GR-09–11 auto / SpeedGrader | **Skip** until legal + Moodle Asset Processor decision |
| GR-13 consistency | Use JEV/rubric checks later — Phase C |

---

## 3. Architecture (fundamentals)

```
Moodle (LTI) ──► shell_routes (thin)
                    │
                    ├─► modules.ai_tutor   (coach turns, clarify, integrity)
                    ├─► modules.sme        (walled garden sources)
                    ├─► modules.jev        (decide: on-topic / strategy / tier)
                    ├─► modules.quiz       (personalised quiz + future flashcards helper)
                    ├─► modules.adaptive   (study plan truth)
                    ├─► modules.signals    (adapt plan from chat + LMS + VR)
                    ├─► modules.xapi       (evidence for every new behaviour)
                    └─► modules.analytics  (teacher insights reads)
```

**New module only if needed:** e.g. `modules.coach_ux` is **not** required — keep shortcuts/feedback on `ai_tutor` + small tables under coach/SME.

**Data:** prefer extend existing tables; new tables get `db/migrations` + `rls_template` + CI migration step.

---

## 4. Phased delivery (exit gates)

### Phase A — Coach parity slice (4–6 weeks of focused work)

**Goal:** LearnWise tutor *feel* where we already compete — without a campus product.

1. Teacher-configurable **shortcuts** on Ask Vidura (welcome chips) — **Done** (`ai_tutor.shortcuts`, `/teacher/coach/shortcuts`)  
2. **Clarify once** when question is ambiguous — **Done** (`ai_tutor.clarify` + session skip)  
3. **Thumbs up/down** → xAPI (`responded`) — **Done** (`record_coach_feedback`)  
4. **Integrity mode** — refuse “write my assignment / exam answers” — **Done** (`ai_tutor.integrity`)  
5. **Flashcards** from class lessons (local + optional LLM) — **Done** (`ai_tutor.flashcards`, `/learn/flashcards`)  
6. **JEV enablement** when API key exists — **Ready** (`JEV_ENABLED` + `TYPESAFE_API_KEY`; heuristics if off)

**Exit gate**

- [x] Unit/integration tests for refuse / clarify / feedback store (`tests/test_coach_phase_a.py`)  
- [ ] Riverside demo: shortcut → ask → thumb → flashcard  
- [ ] Sheet: “Chatbot further Integration” updated with concrete sub-bullets Done/WIP  
- [x] No new Moodle grade writes  

### Phase B — Study loop + teacher visibility (next)

1. Student-visible **study plan** from `adaptive` / `signals` — **Done** (`learner_plan_summary`, My progress card, Home → `/learn/gap`)  
2. Teacher **coach insights** (topics, refusals, thumbs, skipped remote) — **Done** (`analytics.class_coach_insights`, `/teacher/coach/insights`)  
3. Stronger **grade-assist** UX (still copy-to-Moodle) — next  
4. Optional **Moodle file sync** into SME (read-only import) — later  

**Exit gate:** teacher can answer “what are students stuck on?” from EdVidura without opening LearnWise envy list — **partial** (insights + signals gap board).

### Phase C — Differentiate / optional

Role-play, video grounding, Canvas depth, PeBL/ebook chat decision, micro-learning polish.

### Phase D — Do not start without written go

Campus Support widget, Help Desks, Flows, Ops write agent, auto-grader to gradebook.

---

## 5. How we review each LearnWise row (checklist)

Before coding any LW ID:

1. **Fit?** Does it serve a class learner/teacher in Moodle LTI?  
2. **Home?** Which existing module owns it?  
3. **Smallest vertical?** One API + one UI path + one xAPI event.  
4. **Flag?** Default off or safe fallback.  
5. **Test?** Happy path + refuse path + tenant isolation.  
6. **Sheet?** Map to an existing requirements row or add one — no orphan features.

Reject rows that fail (1) or have no (6).

---

## 6. Immediate next actions (after plan approval)

1. Freeze Phase A backlog as tickets/IDs (`EV-LW-A1` …) in this doc or sheet.  
2. Implement A1–A3 first (shortcuts, clarify, thumbs) — highest reuse, lowest risk.  
3. Keep HTML/PPT manager story updated: “We take LearnWise *tutor* ideas; we are not building LearnWise.”

---

## 7. Explicit non-goals (say this in meetings)

- We are **not** rebuilding LearnWise in 18 months.  
- We are **not** shipping a campus helpdesk widget in Phase A–C.  
- We **will not** auto-post AI grades to Moodle.  
- JEV is a **decision layer**, not a LearnWise competitor product.
