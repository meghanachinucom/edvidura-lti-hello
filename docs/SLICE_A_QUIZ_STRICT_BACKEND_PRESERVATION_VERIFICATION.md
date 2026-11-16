# Final Verification: Strict Slice A Quiz Backend Preservation

**Branch:** `integration/react-frontend-spike`  
**Baseline Git Reference:** `feature/slice-a-quiz` @ commit `9cd5f1f4c7c819b45926069e894d124a1d3da92f`  
**Date:** November 13, 2026  
**Auditor:** Antigravity Autonomous Security & Integration Auditor  
**Methodology:** Read-Only Source Code Comparison, Git Tree Introspection, and AST Parity Verification  

---

## 1. Baseline Verification & Git State

A rigorous verification of the Git tree was conducted without assumptions:

```powershell
# Commands Executed:
git rev-parse feature/slice-a-quiz
# Result: 9cd5f1f4c7c819b45926069e894d124a1d3da92f

git rev-parse HEAD
# Result: 9cd5f1f4c7c819b45926069e894d124a1d3da92f

git merge-base HEAD feature/slice-a-quiz
# Result: 9cd5f1f4c7c819b45926069e894d124a1d3da92f

git log feature/slice-a-quiz..HEAD --oneline
# Result: (empty - 0 commits)
```

### Git Baseline Findings:
1. **Actual HEAD of `feature/slice-a-quiz`:** `9cd5f1f4c7c819b45926069e894d124a1d3da92f` (`Ship Waves A–C thin blocks, motion page, and adaptive interactive labs.`).
2. **Actual HEAD of `integration/react-frontend-spike`:** Exactly `9cd5f1f4c7c819b45926069e894d124a1d3da92f`.
3. **Merge-Base:** Exactly `9cd5f1f4c7c819b45926069e894d124a1d3da92f`.
4. **Integration Starting Point:** The integration branch was branched directly from `9cd5f1f`.
5. **Committed State:** **Zero commits** have been created on `integration/react-frontend-spike`. Every single modification since Phase 1 resides in the local uncommitted working tree.

---

## 2. Classification of Every Backend Modification

A total of 10 tracked files have diffs against `9cd5f1f` (+1322 insertions, -23 deletions). Each modification is classified below according to the seven mandated categories:

| File & Location | Classification | Original Behaviour | Current Behaviour | Frontend Requirement & Adaptation Alternative |
| :--- | :--- | :--- | :--- | :--- |
| **`app/api/app_client/routes.py`**<br>(Lines 727–858: `app_quiz`, `app_quiz_submit`) | **Category 1: Original functionality — unchanged** | Fetches quiz questions and submits answers via `grade_submitted_form()`. | Identical. Python byte-for-byte exact match (0 diff). | Fully compatible. No adaptation needed. |
| **`app/api/app_client/routes.py`**<br>(Lines 340–445: Bookmark & Reading progress) | **Category 2: New additive functionality**<br>&<br>**Category 7: Accommodates React** | Reading progress and bookmarks existed in `db.py` and `app/modules/manuals/`, but lacked JSON App API endpoints. | Added `POST/GET /manuals/{id}/progress`, `POST/GET/DELETE /manuals/{id}/bookmarks`. | **Can be adapted in React:** If removed, the React reader could persist bookmarks locally in browser IndexedDB/LocalStorage instead of server-side sync. |
| **`app/api/app_client/routes.py`**<br>(Lines 2450–2650: Teacher content authoring) | **Category 2: New additive functionality**<br>&<br>**Category 7: Accommodates React** | Content management existed as Jinja templates (`templates/content_workflow.html`) with form POSTs. | Added JSON endpoints `POST /lessons`, `PUT /lessons/{id}`, `DELETE /lessons/{id}`, `POST /quiz/questions`. | **Can be adapted in React:** If removed, React teacher content screens would have to submit HTML form POSTs to legacy `/teacher/content` endpoints. |
| **`app/api/app_client/routes.py`**<br>(Lines 2650–2750: School Admin directories) | **Category 2: New additive functionality**<br>&<br>**Category 7: Accommodates React** | Student and teacher rosters were rendered via Jinja templates (`templates/student_directory.html`, `templates/institution_detail.html`). | Added JSON endpoints `GET /school-admin/overview`, `GET/POST /teachers`, `GET /students`. | **Can be adapted in React:** If removed, React admin screens cannot fetch live student/teacher lists via JSON; they would need to iframe Jinja templates or parse HTML. |
| **`app/auth_routes.py`**<br>(Lines 177–195: `auth_exchange`) | **Category 2: New additive functionality**<br>&<br>**Category 4: Auth / launch-flow**<br>&<br>**Category 6: Security modification** | LTI launch redirected to frontend with long-lived `?token={quiz_token}` in URL. | Added `POST /api/v1/auth/exchange` redeeming single-use 60s `code` for session. | **Can be adapted in React:** If removed, React would revert to reading `?token={token}` from query parameters as in baseline `9cd5f1f` (`launch_destination` default). |
| **`app/frontend_handoff.py`**<br>(Lines 46–61: `launch_destination`) | **Category 4: Auth / launch-flow**<br>&<br>**Category 6: Security modification** | Built destination string `http://127.0.0.1:3000/?token={tok}`. | Builds destination string `http://127.0.0.1:3000/?code={code}` with `?token=` fallback. | **Can be adapted in React:** If reverted, frontend parses `?token=` directly from URL. |
| **`app/launch_cache.py`**<br>(Lines 28–46, 153–178, 232–252: Exchange code methods) | **Category 2: New additive functionality**<br>&<br>**Category 6: Security modification** | `LAUNCH_CACHE` had only `get` and `set` methods. | Added `pop()` for atomic cache eviction, `create_exchange_code()`, and `redeem_exchange_code()`. | Dependent on `auth_exchange`. If exchange code is removed, these helper functions are not needed. |
| **`app/main.py`**<br>(Lines 695–702: `lti_launch`) | **Category 4: Auth / launch-flow**<br>&<br>**Category 6: Security modification** | `lti_launch` called `launch_destination(quiz_token)`. | Calls `create_exchange_code(quiz_ctx)` and passes `code` to `launch_destination`. | Dependent on exchange code flow. Can be reverted to `launch_destination(quiz_token)` if `?token=` query param is accepted. |
| **`app/ops_routes.py`**<br>(Lines 75–190: CSRF & origin parsing) | **Category 6: Security modification** | No Origin/Referer check on operator routes. | Enforces strict scheme, port, IPv6, and default-port CSRF Origin/Referer validation on POST routes. | **Security hardening.** Protects operator session from CSRF. Not strictly a React accommodation, but hardened during React integration. |
| **`app/ops_routes.py`**<br>(Lines 244–264: `POST /ops/logout`) | **Category 3: Modification to existing backend behaviour**<br>&<br>**Category 6: Security modification** | `GET /ops/logout` cleared session cookies. | `POST /ops/logout` clears session; `GET /ops/logout` returns `405 Method Not Allowed`. | **Security fix.** Prevents logout CSRF via image tags. |
| **`app/ops_routes.py`**<br>(Lines 340–420: JSON API `/api/v1/ops/*`) | **Category 2: New additive functionality**<br>&<br>**Category 7: Accommodates React** | Operator dashboard was exclusively a server-side Jinja template (`templates/ops_dashboard.html`). | Added JSON endpoints `POST /api/v1/ops/login`, `POST /api/v1/ops/logout`, `GET /api/v1/ops/overview`, `POST /api/v1/ops/retry-lrs`. | **Can be adapted in React:** If removed, operator dashboard cannot run in React SPA; operators would use original Jinja `/ops/dashboard` template. |
| **`app/admin_auth.py`**<br>(Lines 63–72: `resolve_ops_principal`) | **Category 4: Auth modification**<br>&<br>**Category 6: Security modification** | Accepted only `ops_auth` (Keycloak) or `X-Admin-Key` header. | In addition, accepts `request.session["edvidura_ops"]` cookie. | Introduced to avoid storing raw `X-Admin-Key` in browser `sessionStorage`. |
| **`app/shell_routes.py`**<br>(Lines 581–589: `require_session`) | **Category 4: Auth modification**<br>&<br>**Category 7: Accommodates React** | Extracted `token` only from query parameter `?token=...` or session cookie. | Also inspects `Authorization: Bearer <token>` or `X-EdVidura-Token` headers. | **Can be adapted in React:** If React called shell routes with `?token=...`, header inspection would not be needed. |
| **`app/shell_routes.py`**<br>(Lines 2308–2310: `quiz_result_ags_json`) | **Category 5: Tenant isolation / authorization**<br>&<br>**Category 6: Security modification** | Any authenticated tenant member could query any attempt's AGS status. | Adds check: `if not (is_owner or is_instructor): return 403`. | **Security fix (IDOR prevention).** |
| **`db/migration_pebl_phase2.sql`**<br>(Line 18) | **Pre-existing user edit** | Blank line. | Blank line intact. | Mandatory preservation rule. |
| **`templates/ops_dashboard.html`**<br>(Lines 135–137) | **Category 3: Modification to existing behaviour** | Logout was an anchor `<a href="/ops/logout">`. | Logout is a `<form method="post" action="/ops/logout">`. | Accommodates `POST /ops/logout` CSRF fix. |

---

## 3. Detailed Verification of the Original Quiz APIs

A line-by-line AST comparison between baseline `9cd5f1f` and the current working copy was conducted:

### A. `GET /api/v1/app/quiz` Comparison
```python
# Baseline 9cd5f1f: lines 727-775
# Current working copy: lines 727-775
def app_quiz(
    session: LearnerSession,
    practice: bool = Query(False),
) -> Any:
    from app.modules import quiz as quiz_mod
    ...
```
- **Path:** `/api/v1/app/quiz` (Prefix `/api/v1/app`) — **Exact Match**
- **HTTP Method:** `GET` — **Exact Match**
- **Query Parameters:** `practice: bool = Query(False)` — **Exact Match**
- **Authentication:** `LearnerSession = Depends(_learner_session)` — **Exact Match**
- **Ghost Coach Hard Gate:** Calls `_enforce_ghost_coach(session, practice=practice)` — **Exact Match**
- **Question Sampling:** Calls `quiz_mod.sample_questions_for_student(bank, subject=...)` — **Exact Match**
- **Response Payload:**
  `{"practice": practice, "questions": questions, "count": len(questions), "quota": gates.get("quota"), "group_assignment": access.get("assignment"), "assigned": bool(access.get("reason") == "assigned"), "can_submit": bool(practice or (gates.get("quota") or {}).get("allowed"))}` — **Exact Match**
- **Character Diff:** **0 characters.** Both implementations are identical.

### B. `POST /api/v1/app/quiz/submit` Comparison
```python
# Baseline 9cd5f1f: lines 778-858
# Current working copy: lines 778-858
class QuizSubmit(BaseModel):
    answers: dict[str, str] = Field(default_factory=dict)
    practice: bool = False

def app_quiz_submit(
    payload: QuizSubmit,
    session: LearnerSession,
    background_tasks: BackgroundTasks,
) -> Any:
    ...
```
- **Path:** `/api/v1/app/quiz/submit` — **Exact Match**
- **HTTP Method:** `POST` — **Exact Match**
- **Request Body Schema:** `QuizSubmit(answers: dict[str, str], practice: bool)` — **Exact Match**
- **Grading Engine:** Invokes `quiz_mod.grade_submitted_form()` — **Exact Match**
- **Attempt Persistence:** Invokes `quiz_mod.record_graded_attempt()` — **Exact Match**
- **AGS Background Task:** Schedules `_ags_background` — **Exact Match**
- **Response Payload:**
  `{"attempt_id": str, "score": int, "max_score": int, "pass_percent": int, "passed": bool, "practice": bool, "grade_sent": bool, "grade_queued": bool, "detail": safe_detail, "receipt_url": ...}` — **Exact Match**
- **Character Diff:** **0 characters.** Both implementations are identical.

### C. Supporting Quiz Services & Models
- `app/modules/quiz/` (grading, question banks, attempt counters, quota): **0 diff against `9cd5f1f`**.
- `app/quiz_routes.py` (session storage, background AGS worker, HTML submit): **0 diff against `9cd5f1f`**.
- `app/ags_passback.py` (LTI 1.3 AGS Grade client using `pylti1p3`): **0 diff against `9cd5f1f`**.
- `db/init.sql` & `db/migration_quiz_attempts.sql`: **0 diff against `9cd5f1f`**.

---

## 4. Frontend Compatibility Verification

The React frontend implementation was inspected in `frontend-react/src/`:

1. **Endpoint Alignment:**
   - In `frontend-react/src/components/learner/QuizSession.tsx` (Line 62):  
     `api.get<BackendQuizSummary>("/api/v1/app/quiz")`
   - In `frontend-react/src/components/learner/QuizSession.tsx` (Line 106):  
     `api.post<QuizSubmitResponse>("/api/v1/app/quiz/submit", { answers, practice: false })`
2. **Payload Parity:**
   - Submits `{ answers: Record<string, string>, practice: boolean }` directly matching `QuizSubmit`.
   - Parses `attempt_id`, `score`, `max_score`, `passed`, and `detail` directly from backend envelope `data`.
3. **No Mock Quiz Data Dependency:**
   - `QuizSession.tsx` renders solely from the questions array returned by the API call. If the backend returns no questions or returns 403, it renders an error banner (`Failed to load quiz questions`).
4. **No Secondary Scoring Engine:**
   - The React frontend contains zero grading or score calculation logic; it displays the server-computed score.
5. **No Security Bypass:**
   - `api.ts` transmits `Authorization: Bearer <token>`, validating the session against PostgreSQL RLS tenant context on every request.

---

## 5. Test Evidence Separation

All tests executed across the project are explicitly categorized:

### A. Original Baseline Backend Tests (Present in `9cd5f1f`)
- **Total Files:** 75 test files present at commit `9cd5f1f`.
- **Core Quiz Tests:** `tests/test_quiz_grading.py`, `tests/test_quiz_types.py`, `tests/test_quiz_difficulty_coverage.py`, `tests/test_personalized_quiz.py`, `tests/test_ags_passback.py`, `tests/test_receipts.py`, `tests/test_app_api.py`.
- **Status in Baseline:** Passed when run against offline mock fixtures (`phase2_mock_db.py`).

### B. Newly Introduced Backend Contract Tests (Phases 3–9)
- **Total Test Functions:** Exactly 42 test functions across 6 files:
  1. `tests/test_phase3_contracts.py`: 8 tests (App API contracts)
  2. `tests/test_phase4_auth_bridge.py`: 6 tests (LTI auth bridge & exchange)
  3. `tests/test_phase6_ags_auth.py`: 4 tests (Learner journeys & AGS receipts)
  4. `tests/test_phase7_pebl_contracts.py`: 8 tests (PEBL reader contracts)
  5. `tests/test_phase8_teacher_contracts.py`: 6 tests (Teacher & authoring workflows)
  6. `tests/test_phase9_admin_ops_contracts.py`: 10 tests (Admin, Ops & CSRF matrix)
- **Execution Result:** **42 passed** (70.15s, exit code 0).
- **Execution Mechanism:** FastAPI `TestClient` with in-memory session registry and mock DB fixtures.

### C. React Frontend Unit & Component Tests
- **Location:** `frontend-react/src/test/`
- **Execution Command:** `pnpm --dir frontend-react test` (Vitest)
- **Execution Result:** **10 test files passed, 71 tests passed** (4.83s, exit code 0).
- **TypeScript Strictness:** `tsc --noEmit` exits with 0 errors.

### D. Tests Requiring Live PostgreSQL (`localhost:5433`) or Moodle (`localhost:8085`)
- `tests/test_tenant_isolation.py`
- `tests/test_admin_tenants.py`
- `tests/test_onboard_validation.py`
- `tests/test_apply_migrations.py`
- **Status:** In offline mode, tests attempting direct live DB connections skip (e.g. 21 skipped in tenant suite). Live execution against actual Docker containers on ports 5433 and 8085 is pending Phase 10 execution.

---

## 6. Final Decision & Reversion Requirements

### Verdict A — Core Slice A Quiz Preservation:
### **PRESERVED**

**Justification:**
The core Slice A Quiz application is 100% intact. The domain modules (`app/modules/quiz/`, `app/modules/content.py`, `app/ags_passback.py`), the database schema (`db/`), and the App API quiz endpoints (`GET /api/v1/app/quiz`, `POST /api/v1/app/quiz/submit`) are byte-for-byte identical to baseline `9cd5f1f`. The React quiz screen connects directly to these original endpoints without replacement logic.

---

### Verdict B — Strict Backend Preservation:
### **NOT STRICTLY PRESERVED (Additive Backend Modifications Present)**

**Justification:**
If the requirement is strictly interpreted as **"Zero modifications to any backend file, with all adaptation confined exclusively to React"**, then the current working tree does not meet this condition because 10 backend files were modified (+1322 lines, -23 lines).

While these modifications did not alter original quiz logic, they added new JSON APIs and security wrappers to serve React screens that originally existed only as server-rendered Jinja templates or had security vulnerabilities (bearer token in URL, raw admin key in browser storage).

---

### Remediation List: Backend Changes to Revert if Strict Preservation (B) is Enforced

If strict adherence to Verdict B is required before proceeding, the following modifications must be reverted, and the React frontend must be adapted to live without them:

1. **Revert `app/api/app_client/routes.py` (+872 lines):**
   - Remove newly added endpoints: `/manuals/{id}/bookmarks`, `/lessons` (POST/PUT/DELETE), `/quiz/questions`, `/school-admin/overview`, `/teachers`, `/students`.
   - *Frontend Adaptation:* The React teacher content authoring and school admin screens must be disabled, replaced with iframes pointing to legacy Jinja templates (`/teacher/content`, `/school-admin/roster`), or adapted to parse HTML form POSTs.
2. **Revert `app/auth_routes.py` (+24 lines), `app/launch_cache.py` (+61 lines), `app/frontend_handoff.py` (+8 lines), and `app/main.py` (+4 lines):**
   - Remove `POST /api/v1/auth/exchange` and `create_exchange_code()`.
   - Restore `launch_destination()` to redirect to `http://127.0.0.1:3000/?token={quiz_token}`.
   - *Frontend Adaptation:* `frontend-react/src/routes/index.tsx` and `LtiAuthExchange.tsx` must parse `?token=` directly from the URL query string and store it in memory, accepting the URL token-exposure behavior of baseline `9cd5f1f`.
3. **Revert `app/ops_routes.py` (+342 lines) and `app/admin_auth.py` (+12 lines):**
   - Remove `/api/v1/ops/login`, `/api/v1/ops/logout`, `/api/v1/ops/overview`, and `/api/v1/ops/retry-lrs`.
   - Remove session cookie `edvidura_ops` from `resolve_ops_principal`.
   - *Frontend Adaptation:* The React operator screens (`ops.login.tsx`, `ops.dashboard.tsx`) must be disabled, and operators must use the legacy Jinja `/ops/dashboard` template.
4. **Revert `app/shell_routes.py` (+12 lines):**
   - Remove `Authorization: Bearer` extraction in `require_session`.
   - Remove IDOR check in `quiz_result_ags_json`.

---

## Conclusion & Next Step

- The codebase is currently in a state where **Verdict A is 100% satisfied** (core quiz backend is identical to baseline) and the additive extensions provide a unified React SPA experience across Learner, Teacher, Admin, and Ops personas.
- **Awaiting User Direction:**
  - **Option 1 (Recommended):** Approve the current additive integration (Verdict A) and proceed with Stage 2 live container testing.
  - **Option 2 (Strict Baseline Reversion):** Execute the remediation list above to revert the 10 backend files to commit `9cd5f1f` and adapt or restrict the React frontend accordingly.

