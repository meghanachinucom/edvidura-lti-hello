# EdVidura – Phase 6 Independent Technical Audit Report
## Learner Journeys, Quiz Submission, Results and Moodle AGS

**Date:** 2026-11-12  
**Authorising Prompt:** Phase 6 Final Instructor Authorisation Review  
**Branch:** `integration/react-frontend-spike`  
**Starting / Ending Commit Hash:** `9cd5f1f4c7c819b45926069e894d124a1d3da92f`  
**Audit Type:** Verification, Security Remediation, and Final Instructor Authorisation Scope Audit  

---

## 1. Executive Summary & Verification Matrix

An independent technical audit and final verification were conducted on the Phase 6 implementation of the React learner experience in `frontend-react/` and its corresponding FastAPI backend endpoints. All learner screens operate on real backend contracts, eliminating hardcoded prototype fallbacks. All prior conditions (ESLint trailing line correction, AGS status subject authorisation verification, and instructor permission scoping analysis) have been resolved and verified with 100% test pass rates across both Python and TypeScript test suites.

| Subsystem / Area | Audit Status | Key Audit Finding |
|---|:---:|---|
| **Learner Launch Hub** | **PASS** | Hydrates learner identity and course context from `GET /api/v1/app/home`; attempts scoped to learner via `GET /api/v1/app/attempts`. |
| **Lessons Catalogue & Player** | **PASS** | Uses `GET /api/v1/app/lessons` and `GET /api/v1/app/lessons/{id}`; server-escaped safe HTML/Markdown rendering; completion updates authenticated subject only. |
| **Quiz Execution & Submission** | **PASS** | Authoritative server-side grading; frontend cannot tamper with scores; duplicate submission prevented via UI state and query client policy. |
| **Attempt Ownership & IDOR** | **PASS** | URL `$attemptId` tampering cannot expose another learner's score/answers; `/receipt.json` and `/ags.json` enforce subject ownership with 403; `/attempts` filters by `session.subject`. |
| **Instructor Authorisation Scope** | **PASS** | Confirmed tenant-wide instructor access model: any instructor within a tenant can inspect any attempt within that tenant. Database models (`quiz_attempts`) have no class/course foreign keys. Cross-tenant access is blocked with 404 via Postgres RLS. |
| **Moodle AGS Passback** | **PASS** | Distinguishes quiz submission from Moodle AGS grade passback; displays real-time status (`synced`, `pending`, `failed`, `ags_off`, `skipped_practice`). |
| **Automated Testing Suite** | **PASS** | 41 / 41 React Vitest tests passed; 28 / 28 backend Pytest contract/auth tests passed (including 4 Phase 6 AGS auth regression tests). |
| **Code Quality & Linter** | **PASS** | ESLint exits code 0 with 0 errors (9 non-fatal Fast Refresh warnings). Prettier trailing newline resolved. |
| **Live Daemon Verification** | **NOT VERIFIED** | Local daemons (Moodle port 8085, FastAPI port 8000, PostgreSQL port 5433) are stopped. |
| **Repository Integrity** | **PASS** | User modification in `db/migration_pebl_phase2.sql` preserved; legacy `frontend/` and `templates/` 100% untouched. |

---

## 2. Learner Launch Hub Audit (`_shell.launch-hub.tsx`)

- **Identity & Role Context (`_shell.launch-hub.tsx#L125-L135`):**  
  Learner greeting uses `session?.learner_name || session?.name` obtained from the authenticated Phase 4 LTI session. Course metadata is derived from `GET /api/v1/app/home` (`homeData?.course?.title`).
- **Real Completion Metrics (`_shell.launch-hub.tsx#L235-L245`):**  
  Progress ring and completed counters calculate `doneCount / totalCount` from `adaptLessons(homeData.lessons)`, reflecting actual completion state rather than prototype counts.
- **Learner Attempts Ownership (`_shell.launch-hub.tsx#L110-L125`):**  
  Queries `GET /api/v1/app/attempts`. Backend endpoint enforces `kwargs["subjects"] = {str(session.get("subject") or "")}` for non-staff learners (`app/api/app_client/routes.py#L2024`), ensuring learners view only their own attempt history.
- **Tenant Context Protection:**  
  Tenant ID is derived strictly from the server-side session (`session["tenant_id"]`). No tenant identifier or role claim is accepted from frontend request payloads.
- **Error & Loading States:**  
  Renders `<LoadingSkeleton variant="text" count={4} />` while fetching; renders `<ErrorAlert message={error} />` on network or backend failures; displays empty attempts note (`s("noAttempts")`) when no attempts exist.

---

## 3. Lessons Catalogue & Detail Audit (`_shell.lessons.index.tsx`, `_shell.lessons.$lessonId.tsx`)

- **Endpoint Paths & Methods:**
  - Lessons Catalogue: `GET /api/v1/app/lessons` (`app/api/app_client/routes.py#L1462`).
  - Lesson Detail: `GET /api/v1/app/lessons/{lesson_id}` (`app/api/app_client/routes.py#L1477`).
  - Lesson Completion: `POST /api/v1/app/lessons/{lesson_id}/complete` (`app/api/app_client/routes.py#L1527`).
- **Safe Content Rendering (`_shell.lessons.$lessonId.tsx#L170-L185`):**  
  Lesson HTML content is generated server-side by `content.body_md_to_html(body_md)` (`app/modules/content/service.py#L21`), which explicitly escapes raw HTML tags before converting Markdown headers and paragraphs, preventing XSS injection.
- **Neighbor Navigation (`_shell.lessons.$lessonId.tsx#L210-L235`):**  
  Previous and next lesson links use the real IDs returned by the backend (`prev.id` and `next.id`), enabling seamless navigation through course sequences.
- **Completion Ownership & RLS Isolation:**  
  When marking complete, the client sends no user or tenant parameters. The backend route extracts `subject` and `tenant_id` directly from `session`:
  ```python
  content.mark_lesson_completed(
      session["tenant_id"],
      course_id=course["id"],
      lesson_id=lesson_id,
      subject=str(session.get("subject") or ""),
  )
  ```
  It is impossible for a learner to modify another student's or tenant's completion status.
- **Duplicate Completion Prevention:**  
  `saving` state disables the "Mark Complete" button during in-flight network requests.

---

## 4. Critical Quiz Security Audit

- **Authoritative Server-Side Scoring (`app/api/app_client/routes.py#L808-L822`):**  
  The frontend transmits only user choices: `{ "answers": { [qid]: "A" }, "practice": false }`. The backend evaluates answers against the secure question bank stored in PostgreSQL using `quiz_mod.grade_submitted_form()`.
- **Zero Frontend Score Manipulation:**  
  The Pydantic schema `QuizSubmit` (`app/api/app_client/routes.py#L772`) accepts only `answers: dict[str, str]` and `practice: bool`. Clients cannot provide or alter score fields.
- **Attempt Ownership Enforcement (`app/api/app_client/routes.py#L816`):**  
  Attempts are recorded via `quiz_mod.record_graded_attempt()` using server session variables (`session["tenant_id"]`, `session["subject"]`, `session["learner_name"]`). Clients cannot attribute attempts to other users.
- **Tenant Context Verification:**  
  Questions are sampled only from the tenant's question bank (`quiz_mod.questions_for_tenant(session["tenant_id"])`). Cross-tenant quiz submission is rejected.
- **Non-Idempotent Duplicate Submission Prevention:**  
  In `QuizSession.tsx#L105-L115`, `submitting` state disables both the submit button and all radio input fieldsets upon submission. In `queryClient.ts#L25`, `mutations: { retry: false }` ensures mutations are never retried automatically on network timeout.
- **Failure Transparency:**  
  Submission failures surface genuine error alerts (`<ErrorAlert message={error} />`). A failed submission never triggers result navigation or displays false success.

---

## 5. Attempt Ownership and Grade Receipt Security (IDOR & Authorisation Audit)

A security audit was conducted to verify whether an attacker can modify `$attemptId` in the URL to view another student's score, answer breakdown, AGS status, or grade receipt, and to determine the boundary of instructor access.

### 5.1 Client-Side IDOR Defense (`_shell.quiz.result.$attemptId.tsx#L47-L66`)
When loading `/quiz/result/$attemptId`, the React component queries `GET /api/v1/app/attempts` to locate the attempt record:
```tsx
const resp = await api.get<AttemptsResponse>("/api/v1/app/attempts");
const found = adaptAttempts(resp.attempts).find((a) => a.id === attemptId);
if (found) { setAttempt(found); }
...
if (!attempt) return <AccessUnavailable />;
```
Because `GET /api/v1/app/attempts` is strictly scoped on the backend to the authenticated subject (`kwargs["subjects"] = {str(session.get("subject") or "")}`), attempts belonging to other learners are never returned. Tampering with `$attemptId` causes `found` to be `undefined`, immediately rendering `<AccessUnavailable />`. Another learner's score and breakdown are **never exposed**.

### 5.2 Grade Receipt IDOR Defense (`app/shell_routes.py#L2338-L2340`)
In `GET /quiz/result/{attempt_id}/receipt.json`:
```python
is_owner = str(attempt.get("subject")) == str(session.get("subject"))
if not (is_owner or session.get("is_instructor")):
    return JSONResponse({"error": "forbidden"}, status_code=403)
```
Server-side ownership is strictly enforced with HTTP 403 Forbidden.

### 5.3 AGS Status Endpoint Authorisation Remediation (`app/shell_routes.py#L2297-L2302`)
In `GET /quiz/result/{attempt_id}/ags.json`:
- Tenant isolation is enforced: `attempt = db.get_quiz_attempt(session["tenant_id"], attempt_id)`. If absent in the tenant, returns HTTP 404 (`{"ok": False, "error": "not_found"}`).
- **Remediation Implemented:** Added subject ownership and instructor authorization check matching the grade receipt pattern:
  ```python
  is_owner = str(attempt.get("subject")) == str(session.get("subject"))
  if not (is_owner or session.get("is_instructor")):
      return JSONResponse({"ok": False, "error": "forbidden"}, status_code=403)
  ```
- **Regression Suite:** Covered by `tests/test_phase6_ags_auth.py`.
- **Verdict: PASS (Complete server-side authorization and tenant isolation).**

### 5.4 Instructor Authorisation Scope & Permission Boundary Analysis

An in-depth review of existing EdVidura permission and domain models was conducted across the backend to evaluate whether instructor access to attempts, receipts, and AGS status is tenant-wide or restricted by class/course assignment:

1. **Database Schema Design (`db/migration_quiz_attempts.sql#L3-L32`):**  
   The `quiz_attempts` table schema contains columns `(id, tenant_id, subject, learner_name, course_label, score, max_score, answers, grade_sent, grade_error, created_at)`. It has **no foreign keys to `class_id`, `course_id`, or `teacher_id`**. PostgreSQL Row-Level Security (`quiz_attempts_tenant_isolation`) strictly isolates rows by `tenant_id = current_setting('app.tenant_id')::uuid`. Attempts are intrinsically tenant-scoped.
2. **Backend Attempt Access Policy (`app/api/app_client/routes.py#L2015-L2026`):**  
   In `GET /api/v1/app/attempts`:
   ```python
   def _is_staff(session: dict[str, Any]) -> bool:
       return bool(session.get("is_instructor") or session.get("is_school_admin"))

   kwargs: dict[str, Any] = {"limit": limit}
   if not _is_staff(session):
       kwargs["subjects"] = {str(session.get("subject") or "")}
   rows = quiz_mod.list_attempts_for_tenant(session["tenant_id"], **kwargs)
   ```
   When `_is_staff` is true, all tenant attempts are returned. No class/course restriction is applied to instructors.
3. **HTML Results & Grade Receipt Policy (`app/shell_routes.py#L1744-L1746`, `L2338-L2340`):**  
   Both the HTML attempt viewer and the sealed grade receipt download endpoints authorize access via:
   `is_owner or session.get("is_instructor")`
   Any authenticated instructor in the tenant can view any attempt or receipt.
4. **School Organization Models (`app/modules/school/service.py` & `app/shell_routes.py#L1980-L2015`):**  
   `classes`, `teachers`, and `class_enrollments` tables exist for instructional organization, reporting, and dashboard filtering (e.g. `instructor_overview` and `teacher_attempts_csv` accept optional `class_id` filter query parameters). They serve as **reporting filters**, not restrictive row-level access walls.

#### Expected Boundary Behavior Matrix

| # | Scenario | Expected Status | Enforcement Mechanism |
|---|---|:---:|---|
| 1 | Learner accessing their own attempt | **200 OK** | `is_owner == True` |
| 2 | Learner accessing another learner's attempt in same tenant | **403 Forbidden** | `is_owner == False` and `is_instructor == False` |
| 3 | Instructor accessing a learner assigned to that instructor | **200 OK** | `session.get("is_instructor") == True` in same tenant |
| 4 | Instructor accessing a learner not assigned to that instructor | **200 OK** | `session.get("is_instructor") == True` (Tenant-wide instructor model) |
| 5 | Instructor attempting to access an attempt from another tenant | **404 Not Found** | `db.get_quiz_attempt(tenant_id, attempt_id)` / Postgres RLS rejects cross-tenant access |

**Conclusion:** The existing EdVidura permission model explicitly allows **tenant-wide instructor access**. The implementation in `app/shell_routes.py` accurately reflects this domain policy without introducing artificial or breaking class-filter access walls. The code remains intact and unchanged.

---

## 6. Moodle AGS Passback Verification

The result screen distinguishes quiz submission from Moodle Gradebook sync:
1. **Submission vs. Passback:**  
   Receiving HTTP 201 from `/api/v1/app/quiz/submit` confirms local database persistence (`grade_queued: true`), NOT Moodle Gradebook receipt.
2. **Real-Time AGS State Polling (`_shell.quiz.result.$attemptId.tsx#L140-L165`):**  
   Polls `GET /quiz/result/{attempt_id}/ags.json` and updates the `StatusBanner`:
   - `"synced"` $\rightarrow$ Moodle Gradebook updated successfully.
   - `"pending"` $\rightarrow$ Queued in FastAPI background tasks for Moodle passback.
   - `"failed"` $\rightarrow$ Passback failed (displays the actual `grade_error` returned by Moodle).
   - `"ags_off"` $\rightarrow$ LTI launch lacked AGS Gradebook service capability.
   - `"skipped_practice"` $\rightarrow$ Practice attempt (passback intentionally skipped).
3. **Downloadable Cryptographic Receipt:**  
   Calls `GET /quiz/result/{attempt_id}/receipt.json` to download the HMAC-SHA256 sealed grade receipt containing attempt ID, score, timestamp, and signature.

---

## 7. Automated Test Suite Execution & Exit Codes

### 7.1 Backend Regressions (Pytest)
1. **Phase 6 AGS Status Authorisation (`tests/test_phase6_ags_auth.py`):**
   - **Command:** `python -m pytest tests/test_phase6_ags_auth.py`
   - **Exit Code:** `0`
   - **Output:** `4 passed, 2 warnings in 6.26s`
2. **Phase 3 Contracts (`tests/test_phase3_contracts.py`):**
   - **Command:** `python -m pytest tests/test_phase3_contracts.py`
   - **Exit Code:** `0`
   - **Output:** `8 passed, 2 warnings in 6.13s`
3. **Phase 4 Auth Bridge (`tests/test_phase4_auth_bridge.py`):**
   - **Command:** `python -m pytest tests/test_phase4_auth_bridge.py`
   - **Exit Code:** `0`
   - **Output:** `6 passed, 2 warnings in 68.11s`
4. **Backend App API (`tests/test_app_api.py`):**
   - **Command:** `python -m pytest tests/test_app_api.py`
   - **Exit Code:** `0`
   - **Output:** `10 passed, 2 warnings in 26.35s`

**Total Backend Pytest Results:** **28 passed, 0 failed (exit code 0).**

### 7.2 Frontend React Verification
1. **Vitest Suite (`src/test/`):**
   - **Command:** `npx --yes pnpm --dir frontend-react test`
   - **Exit Code:** `0`
   - **Output:** `41 passed (7 test files in 2.23s)`
     - `src/test/preWork.test.ts` (6 passed)
     - `src/test/rules.test.ts` (6 passed)
     - `src/test/learnerJourneys.test.ts` (8 passed)
     - `src/test/apiClient.test.ts` (8 passed)
     - `src/test/pass3.test.tsx` (8 passed)
     - `src/test/readerSpeech.test.tsx` (4 passed)
     - `src/test/app-routing.test.tsx` (1 passed)
2. **ESLint Linter:**
   - **Command:** `npx --yes pnpm --dir frontend-react lint`
   - **Exit Code:** `0`
   - **Output:** `0 errors, 9 warnings (Fast Refresh non-fatal warnings only)`.
3. **TypeScript Static Check:**
   - **Command:** `npx --yes pnpm --dir frontend-react exec tsc --noEmit`
   - **Exit Code:** `0` (Clean, 0 errors).
4. **Production Static Build:**
   - **Command:** `npx --yes pnpm --dir frontend-react run build`
   - **Exit Code:** `0` (Built static bundle in 595ms).

---

## 8. Repository Preservation & Boundaries

- **Branch:** `integration/react-frontend-spike`
- **Working Tree Diff Stat (`git diff --stat`):**
  ```text
   app/api/app_client/routes.py | 119 +++++++++++++++++++++++++++++++++++++++++++
   app/auth_routes.py           |  26 +++++++++-
   app/frontend_handoff.py      |  12 +++--
   app/launch_cache.py          |  61 ++++++++++++++++++++++
   app/main.py                  |   4 +-
   app/shell_routes.py          |   3 ++
   db/migration_pebl_phase2.sql |   1 +
   7 files changed, 219 insertions(+), 7 deletions(-)
  ```
- **Preserved SQL Modification:** `db/migration_pebl_phase2.sql` modification (single trailing newline) remains completely preserved.
- **Untouched Legacy Directories:** `frontend/` and `templates/` remain 100% untouched.
- **Uncommitted Status:** Zero commits, zero pushes, zero merges, zero resets.

---

## 9. End-to-End Live Daemon Status

- **Status:** **NOT VERIFIED in live daemon environment** (Blocker: Moodle port 8085, FastAPI port 8000, and PostgreSQL port 5433 are stopped).
- **Automated Verification:** Verified via 28 backend automated tests and 41 frontend integration tests.

---

## 10. Final Decision

### **APPROVED – INSTRUCTOR AUTHORISATION VERIFIED**

The independent technical review confirms:
1. `GET /quiz/result/{attempt_id}/ags.json` correctly enforces learner subject ownership (`is_owner`) while permitting tenant instructors (`is_instructor`) consistent with EdVidura's established authorization architecture across grade receipts, HTML results, and API attempt listings.
2. Cross-tenant access is securely rejected by PostgreSQL RLS with HTTP 404.
3. Attempt ownership is cleanly isolated by tenant and subject, preventing IDOR.
4. All test suites pass with exit code 0.

Execution is paused in compliance with strict instructions. Awaiting review and authorisation before Phase 7.
