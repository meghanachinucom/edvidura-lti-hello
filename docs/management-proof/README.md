# EdVidura — Management proof pack (Done requirements)

**Source sheet:** [EdVidura Requirements List (Meetings)](https://docs.google.com/spreadsheets/d/1n39jx3aQ_pHLpz_BGHo198WrUKZDeEWqG_lAN8WQ4so/edit?usp=sharing)  
**Live app:** https://edvidura-app-production.up.railway.app  
**Generated:** 2026-10-03  

Open [`index.html`](index.html) in a browser for the clickable pack with screenshots.

---

## Done items (from sheet Status = Done)

| # | Meeting | Requirement | Live proof entry | Notes |
|---|---------|-------------|------------------|-------|
| 1 | 17/07 | Moodle LTI 1.3 Integration | Landing + `/onboard` LTI URLs + JWKS | Screens: `01`, `03`, `04` |
| 2 | 17/07 | Onboarding APIs | `/onboard` (create school / dynreg) | Screen: `03` |
| 3 | 17/07 | PostgreSQL data isolation | Landing copy + tenants Riverside / Lakeside on onboard | Screen: `01`, `03`; CI isolation proofs in repo |
| 4 | 17/07 | 3Q Quiz UI / score / results | **Needs Moodle LTI launch** → `/quiz` → result | Recording script §A |
| 5 | 17/07 | AGS grade passback | Result page “grade sent” / Moodle gradebook | Sheet marks **Testing: Roadblock** — record pass + note |
| 6 | 17/07 | Screen Design Ideas | Landing + shell UI | Screen: `01` |
| 7 | 08/09 | Multi-tenancy | Onboard school list (riverside / lakeside-peer) | Screen: `03` |
| 8 | 08/09 | LTI authorization | `/lti/login`, `/lti/launch`, JWKS | Screen: `04` |
| 9 | 08/09 | Yet LRS + Metabase | `/ops` owner console (Metabase + Yet) | Screen: `02` |
| 10 | 08/09 | AI-generated quizzes (per student, depth/complexity) | Teacher AI + student quiz | Recording script §B |
| 11 | 08/09 | Coach voice multi-language (Indian langs) | Ask Vidura language picker + mic/speak | Recording script §C |
| 12 | 08/09 | xAPI from chats (PeBL) | Activity feed / xAPI after coach turn | Recording script §C |
| 13 | 22/09 | Quiz multi-model parser: 3-level complexity, coverage, study-plan validation | Teacher AI quiz settings + student quiz profile cards | Recording script §B |
| 14 | 22/09 | JEV implementation + cost optimisation | `/ops` AI status + coach/quiz gates (`app/modules/jev`) | Enable with `JEV_ENABLED` + TypeSafe key |
| 15 | 22/09 | Chatbot further Integration | Ask Vidura: shortcuts / clarify / thumbs / integrity / flashcards | Phase A LearnWise |
| 16 | 22/09 | Chatbot + LMS/Moodle + VR → adaptive personalized plan | Study plan UI + signals fuse + teacher coach insights | Phase B1/B2 |

**Not Done on sheet (do not claim in this pack):** Micro-learning WIP, PeBL ebook WIP, Air-gap Yet to Start, TLA Yet to Start, PeBL chat for ebook WIP.

---

## Detailed per-feature recordings (Google Sheet Done rows)

One MP4 per Done requirement with:
- cleaner full-viewport frames (no letterbox squeeze)
- **animated mouse cursor** to each click
- **spoken narration** (edge-tts) of what is clicked and what the result is

Catalog: [`features.yaml`](features.yaml) (13 sheet rows)  
Output: [`videos/by-feature/index.html`](videos/by-feature/index.html) (turn sound on)

```bash
pip install playwright pyyaml pillow imageio imageio-ffmpeg edge-tts
playwright install chromium

# Refresh Moodle LTI sessions + record every Done row (cursor + audio)
python scripts/record_feature_proofs.py --refresh-session
```

Demo logins (Railway Moodle): `riverside_alice` / `Demo@12345` (student), `riverside_priya` / `Demo@12345` (teacher).  
Voice default: `en-IN-NeerjaNeural` (override with `--voice` / `EDVIDURA_PROOF_VOICE`).

## Agent walkthrough video (public surfaces)

Silent MP4 recorded from live production pages (no Moodle session):

- `videos/edvidura-done-public-walkthrough.mp4` — landing → `/health` → `/onboard` → `/ops` → JWKS → proof index (~22s)
- Frames: `videos/frames/` · rebuild: `python videos/stitch_walkthrough.py`

Moodle-gated Done items: prefer automated capture with storage_state; Loom §A–§C below is the manual backup.

---

## Screenshots captured (no Moodle login needed)

| File | Shows |
|------|--------|
| `screens/00-health.png` | Production `/health` JSON |
| `screens/01-landing-lti-branding.png` | Product home — Moodle / isolation / grade sync messaging |
| `screens/02-ops-metabase-owner-login.png` | Owner `/ops` — Metabase + Yet (schools don’t use this) |
| `screens/03-onboarding-apis-lti-urls.png` | `/onboard` — school create, LTI 1.3 URLs, dynreg, multi-tenant schools |
| `screens/04-lti-jwks-authorization.png` | Public JWKS for LTI 1.3 |

---

## Loom / screen-recording script (for remaining Done items)

Record **one Loom (or similar) per section** below. Keep each under ~2–3 minutes. Start each clip by saying the **requirement title** from the sheet.

### §A — Quiz UI + score + results (+ AGS)

1. Launch EdVidura from **Moodle** (teacher or student tool).  
2. Open **Take quiz** → answer (mix correct/wrong) → submit.  
3. Show **results page**: score, review, receipt.  
4. For AGS: show Moodle gradebook sync or “Synced” chip; if blocked, narrate the known roadblock from the sheet.

### §B — AI quizzes + multi-model parser (complexity / coverage / study plan)

1. Teacher launch → **AI tools** (`/teacher/ai`).  
2. Show **Tutor** cards: Level Easy/Medium/Hard, Complexity Recall/Apply/Analyze, Full-book coverage.  
3. Save settings; optionally upload PDF/text “Make a quiz”.  
4. Student launch → **Quiz** → show profile strip: Level, Complexity, Coverage, Study plan.  
5. Mention personalized generation + full-book coverage.

### §C — Coach voice (Indian languages) + xAPI from chat

1. Student → **Ask Vidura**.  
2. Switch reply language (e.g. Hindi / Telugu).  
3. Ask a class question; show answer + citations.  
4. Use **Mic / Speak** if available.  
5. Open Activity / recordings or note xAPI `study_coach` channel captured.

---

## How to send to management

1. Zip folder `docs/management-proof/` **or** open `index.html` and export PDF (Print → Save as PDF).  
2. Attach Loom links for §A–§C next to the matching rows in the Google Sheet (Notes column).  
3. Keep sheet Status honest: AGS remains **Roadblock** until gradebook proof is clean.
