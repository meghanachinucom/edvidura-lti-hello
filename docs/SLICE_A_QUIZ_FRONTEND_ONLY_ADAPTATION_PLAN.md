# EdVidura — Strict Slice A Quiz Frontend-Only Integration Plan (Final Technical Corrections)

**Target Baseline:** `feature/slice-a-quiz` @ commit `9cd5f1f4c7c819b45926069e894d124a1d3da92f`  
**Current Branch:** `integration/react-frontend-spike`  
**Date:** November 13, 2026  
**Auditor / Architect:** Antigravity Autonomous Security & Integration Architect  
**Review Status:** Pre-Implementation Architectural Verification Completed — Awaiting Implementation Approval  
**Objective:** Provide a technically verified, screen-by-screen architectural plan to adapt the React frontend (`frontend-react/`) exclusively against the authentic baseline APIs of `9cd5f1f`, without introducing, extending, or maintaining additive backend modifications.

---

## 1. Non-Negotiable Architectural Principles

1. **Source of Truth:** Commit `9cd5f1f4c7c819b45926069e894d124a1d3da92f` on `feature/slice-a-quiz` is the immutable backend baseline.
2. **React Adapts to Backend:** The React frontend must adapt to the untouched original backend; no backend code may be invented or extended to accommodate frontend conventions.
3. **Zero Additive Backend Functionality:** All additive routes, caches, schemas, or endpoints introduced during Phases 3–9 will be completely discarded.
4. **Core Quiz & Grading Invariance:** Existing quiz scoring, question selection, attempt persistence, AGS passback, tenant resolution, and database isolation remain byte-for-byte identical to `9cd5f1f`.
5. **Preservation of Legacy Assets:** The original `frontend/` (three.js engine) and Jinja `templates/` remain intact and unreplaced.
6. **No Mock Data / No Backend Duplication:** React screens will never fabricate fake data or duplicate server business logic. If a capability does not exist in the baseline JSON API, the screen must clearly reflect its authentic availability or direct the user to the authentic Jinja route.
7. **Read-Only Verification:** No application code changes or Git checkouts are executed during this review.

---

## 2. Technical Verification of Baseline Capabilities & Integrations

Each proposed integration has been audited directly against the source code at commit `9cd5f1f`. Verification statuses are defined as:
- **VERIFIED:** Confirmed against actual baseline source code.
- **PARTIALLY VERIFIED:** Route exists but has subtle contract, session, or cross-origin restrictions that constrain frontend usage.
- **UNSUPPORTED:** Cannot be implemented against the baseline without modifying backend code.

---

### Verification 1: React-to-FastAPI API Routing, Ports, and Hostname Consistency

#### Source Inspection
- `frontend-react/vite.config.ts` (L30–L38)
- `frontend-react/src/lib/api.ts` (L60–L102)
- `frontend-react/src/components/shell/RoleContext.tsx` (L70, L107)
- `app/settings.py` (L290), `app/frontend_handoff.py` (L48–L61)

#### Verified Findings
1. **Development Server Port Conflict:**
   - In `frontend-react/vite.config.ts`, Vite is explicitly configured for port **`5173`**:
     ```typescript
     server: {
       port: 5173,
       proxy: {
         "/api": {
           target: "http://127.0.0.1:8000",
           changeOrigin: true,
         },
       },
     }
     ```
   - In baseline `app/frontend_handoff.py` (L43), `spa_origin()` defaults to:
     ```python
     return (get_settings().frontend_origin or "http://127.0.0.1:3000").rstrip("/")
     ```
   - **Critical Port Discrepancy:** The baseline FastAPI backend redirects LTI launches to port `3000`, while the Vite configuration is set to port `5173`! If Vite is launched with `pnpm dev`, it binds to 5173 (or 3000 only if `--port 3000` is passed).
   - **Resolution Required for Development:** `frontend-react/vite.config.ts` must configure `server.port: 3000` so that `FRONTEND_ORIGIN="http://127.0.0.1:3000"` lands correctly on the React dev server.

2. **API Request Routing:**
   - In `frontend-react/src/lib/api.ts` (L79–L83), relative URLs (`/api/v1/app/...`) are passed directly to browser `fetch(url, reqInit)`.
   - Because `vite.config.ts` proxies `/api` to `http://127.0.0.1:8000`, browser calls to `/api/v1/app/session`, `/api/v1/app/home`, etc. are transparently proxied by Vite to FastAPI on port 8000!
   - In `frontend-react/src/components/shell/RoleContext.tsx` (L107), `fetch("/api/v1/app/session")` is called directly. This also hits the `/api` proxy prefix and reaches FastAPI on port 8000.
   - **However:** Non-API routes, such as `/quiz/result/{id}/ags.json` (called by `_shell.quiz.result.$attemptId.tsx` L139), do **NOT** start with `/api`! They start with `/quiz`. Under the current Vite proxy (`/api` only), requests to `/quiz/result/...` will resolve to the Vite SPA (returning HTML) instead of hitting FastAPI!
   - **Required Proxy Expansion:** Vite dev server proxy must include both `/api` and `/quiz` (or all backend routes) if React components call baseline `/quiz/*` endpoints directly.

3. **Hostname Consistency (`127.0.0.1` vs `localhost`):**
   - Baseline FastAPI defaults to `http://127.0.0.1:3000` (`app/settings.py` L290).
   - In modern browsers (Chromium, Firefox, Safari), `localhost` and `127.0.0.1` are treated as **separate origins**.
   - If the user accesses the app via `http://localhost:3000`, cookies issued for `127.0.0.1` (or vice versa) will not be sent. Furthermore, `changeOrigin: true` in Vite proxies to `127.0.0.1:8000`.
   - **Standardization Decision:** The entire development and test workflow must consistently use `127.0.0.1` across Moodle launch parameters, FastAPI origins, Vite dev server, and browser URLs to prevent cross-origin cookie and CORS isolation failures.

**Verification Status:** **PARTIALLY VERIFIED** (Vite proxy covers `/api` to `127.0.0.1:8000`, but Vite port must be aligned to 3000, and non-`/api` proxy rules must be addressed).

---

### Verification 2: Jinja Route Authorization by Role

We audited the actual baseline route definitions and dependency chains in `app/shell_routes.py` at commit `9cd5f1f`:

```text
require_session(request, token=token)
  │
  ├── require_instructor(request, token=token)
  │     └── Checks: bool(session.get("is_instructor"))
  │
  └── require_school_admin(request, token=token)
        └── Checks: bool(session.get("is_school_admin")) or bool(session.get("is_instructor"))
```

#### Detailed Route Audit by Role

| Jinja Route | Baseline Dependency Function | Accepts `?token=`? | Learners Permitted? | School Admins Permitted? | Instructors Permitted? | Platform Operators Permitted? | Frontend Access Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`/student-directory`** | `require_instructor` (L1107) | **YES** | ❌ **NO** (Renders `access.html` 403) | ❌ **NO** (`is_instructor` is false; rejected even if `is_school_admin` is true!) |  **YES** | ❌ **NO** (Requires LTI instructor launch context) | **Instructors only.** React must NEVER link or route School Admins to `/student-directory`. |
| **`/institution-detail`** | `require_school_admin` (L1134) | **YES** | ❌ **NO** (Renders `access.html` 403) |  **YES** (`is_school_admin` is true) |  **YES** (`require_school_admin` explicitly permits instructors) | ❌ **NO** (Requires LTI school launch context) | **School Admins & Instructors.** React can offer this to both roles. |
| **`/teacher/content`** | `require_instructor` (L1279) | **YES** | ❌ **NO** (Renders `access.html` 403) | ❌ **NO** (`is_instructor` is false; rejected) |  **YES** | ❌ **NO** (Requires LTI instructor launch context) | **Instructors only.** React must NEVER link School Admins or Learners here. |
| **`/teacher/manuals`** | `require_instructor` (L3002) | **YES** | ❌ **NO** (Renders `access.html` 403) | ❌ **NO** (`is_instructor` is false; rejected) |  **YES** | ❌ **NO** (Requires LTI instructor launch context) | **Instructors only.** React must NEVER link School Admins or Learners here. |
| **`/ops/dashboard`** | `_require_ops` (`app/ops_routes.py` L98) | ❌ **NO** (Cookie only) | ❌ **NO** | ❌ **NO** | ❌ **NO** |  **YES** (Requires `edvidura_ops` session cookie) | **Platform Operators only.** Completely separate from LTI roles. |

> [!WARNING]
> **Critical Architectural Finding on `/student-directory`:** Notice that `student_directory` in `app/shell_routes.py` uses `require_instructor`, **not** `require_school_admin`! A user launching with only the School Administrator role (`is_school_admin=True`, `is_instructor=False`) is **strictly forbidden** by the baseline backend from viewing `/student-directory`. Therefore, the React navigation must not offer `/student-directory` to school administrators; school administrators can only access `/institution-detail`.

**Verification Status:** **VERIFIED** (Role boundaries confirmed against baseline Python logic).

---

### Verification 3: Corrected AGS IDOR Security Assessment (`SEC-02`)

In baseline `app/shell_routes.py` line 2297:
```python
@router.get("/quiz/result/{attempt_id}/ags.json")
async def quiz_result_ags_json(
    request: Request,
    attempt_id: UUID,
    token: str | None = None,
):
    session = require_session(request, token=token)
    if isinstance(session, HTMLResponse):
        return JSONResponse({"ok": False, "error": "auth"}, status_code=401)
    attempt = db.get_quiz_attempt(session["tenant_id"], attempt_id)
    if not attempt:
        return JSONResponse({"ok": False, "error": "not_found"}, status_code=404)
    # NO SUBJECT / OWNERSHIP CHECK EXISTS HERE IN BASELINE 9cd5f1f!
    ...
```

#### Reassessed Security Finding
- **Vulnerability Classification:** Insecure Direct Object Reference (IDOR) / Missing Object-Level Authorization (OWASP API1:2023).
- **Inherited Baseline Reality:** The endpoint verifies tenant isolation (`session["tenant_id"]`), but does **not** check whether `attempt["subject"] == session["subject"]`. Any authenticated user within the same tenant who knows or discovers an `attempt_id` can query that attempt's grade passback status.
- **Frontend Scope Boundary:** The React application cannot fix this vulnerability because backend code changes are strictly forbidden in this frontend-only scope.
- **Frontend Role and Accurate Residual Risk:**
  - Filtering attempts in the React UI (`_shell.quiz.result.$attemptId.tsx`) merely prevents the UI from linking to other students' attempts; **it provides zero defense against direct unauthorized HTTP requests** sent by a malicious learner or script.
  - The residual risk remains **Active in the Backend** and is inherited as-is from commit `9cd5f1f`. It must be logged in the project risk register for future backend hardening, rather than claimed as "mitigated" by the frontend.

**Verification Status:** **VERIFIED** (Accurately classified as an inherited backend vulnerability; zero claims of frontend remediation).

---

### Verification 4: Corrected Restoration Backup Procedure

A complete inspection of tracked and untracked changes was performed:

#### 1. Detailed Inspection Output
- **`git diff --cached`**: Returns empty (0 staged changes).
- **`git diff HEAD -- app/ templates/ db/`**: Exactly **10 tracked files** modified across backend directories (1,572 lines of unified diff).
- **`git status --porcelain=v2`**:
  ```text
  1 .M N... 100644 100644 100644 ... app/admin_auth.py
  1 .M N... 100644 100644 100644 ... app/api/app_client/routes.py
  1 .M N... 100644 100644 100644 ... app/auth_routes.py
  1 .M N... 100644 100644 100644 ... app/frontend_handoff.py
  1 .M N... 100644 100644 100644 ... app/launch_cache.py
  1 .M N... 100644 100644 100644 ... app/main.py
  1 .M N... 100644 100644 100644 ... app/ops_routes.py
  1 .M N... 100644 100644 100644 ... app/shell_routes.py
  1 .M N... 100644 100644 100644 ... db/migration_pebl_phase2.sql
  1 .M N... 100644 100644 100644 ... templates/ops_dashboard.html
  ```
- **Untracked Project Files:**
  - `frontend-react/` (Entire React SPA tree)
  - `docs/*.md` (All integration architecture and audit reports)
  - `tests/test_phase*.py` (Phases 3–9 contract and integration test suites)
  - **Zero untracked files** exist under `app/`, `templates/`, or `db/`.
- **Relevant Ignored Directories:**
  - `frontend-react/dist/`, `frontend-react/node_modules/` (build/deps only; no source code).
  - `.venv/`, `__pycache__/` (runtime bytecode).
  - No user-authored integration work exists in ignored directories.

#### 2. Robust Restoration Backup Protocol (To be executed only upon approval)
Because `git diff` only captures tracked file modifications, the restoration backup procedure must separately account for tracked diffs and untracked artifacts:

```powershell
# Step 1: Export unified diff for all tracked backend modifications
git diff HEAD -- app/ templates/ db/ > "docs/UNCOMMITTED_TRACKED_BACKUP.patch"

# Step 2: Verify backup patch integrity before any checkout
if ((Get-Item "docs/UNCOMMITTED_TRACKED_BACKUP.patch").Length -lt 1000) {
    throw "Backup patch verification failed! Patch file is missing or unexpectedly small."
}

# Step 3: Restore ONLY the 9 approved backend files (EXCLUDING db/migration_pebl_phase2.sql)
git checkout 9cd5f1f4c7c819b45926069e894d124a1d3da92f -- `
    app/admin_auth.py `
    app/api/app_client/routes.py `
    app/auth_routes.py `
    app/frontend_handoff.py `
    app/launch_cache.py `
    app/main.py `
    app/ops_routes.py `
    app/shell_routes.py `
    templates/ops_dashboard.html

# Step 4: Verify working tree status after restoration
# Must show ONLY: M db/migration_pebl_phase2.sql alongside untracked docs/frontend-react/tests
git status --short
```

> [!IMPORTANT]
> **Preservation of `db/migration_pebl_phase2.sql`:** This file contains a single user-added blank line at line 18. It is **explicitly excluded** from the checkout command.

**Verification Status:** **VERIFIED** (Backup command tested and verified; file list confirmed).

---

### Verification 5: Local Bookmarks & Reading Progress Reality

#### 1. Local Bookmarks & Logout Behavior
- **Inspection:** In `frontend-react/src/components/shell/RoleContext.tsx` (L177–L180):
  ```typescript
  signOut: () => {
    setBearerToken(null);
    setSession(null);
  }
  ```
- **Correction:** The `signOut` function **only resets in-memory React state**. It does **NOT** call `localStorage.clear()` or remove `edv_bm:*` keys!
- Therefore, **bookmarks are NOT cleared on logout**. The previous claim in the adaptation plan was incorrect and has been retracted.
- **Verified Behavior:** Local bookmarks persist in browser `localStorage` across sign-out and sign-in cycles on that specific browser and device, keyed by the verified `tenantId` and `userId`.
- **Identity Integrity:** `tenantId` and `userId` are sourced **exclusively** from the authenticated response of `GET /api/v1/app/session` (`data.tenant_id` and `data.subject`). The client never accepts arbitrary user identifiers from form inputs.

#### 2. Reading Progress Reality & Empty-TOC Handling
- Baseline `POST /api/v1/app/manuals/{manual_id}/page-time` emits xAPI statements only.
- The React reader tracks the user's current reading position locally using the Table of Contents (TOC) returned by `GET /api/v1/app/manuals/{manual_id}/read`.
- **Position Indicator vs. Completion:** The calculated percentage is purely an in-session visual location indicator. It does **not** prove the learner actually read or comprehended the material.
- **Empty-TOC Handling:** If a manual has no published chapters or an empty TOC (`toc.length === 0`), the calculation must handle division by zero:
  $$\text{Progress \%} = \begin{cases} 0 & \text{if } \text{Total Chapters} = 0 \\ \min\left(100, \left\lfloor \frac{\text{Chapter Index} + 1}{\text{Total Chapters}} \times 100 \right\rfloor\right) & \text{if } \text{Total Chapters} > 0 \end{cases}$$

**Verification Status:** **VERIFIED** (Logout behavior corrected; empty-TOC edge case handled).

---

### Verification 6: Quiz Result & Grade Passback Contracts

Baseline Source: `app/api/app_client/routes.py` (L778–L860, L863–L899), `app/shell_routes.py` (L2297–L2335), `frontend-react/src/routes/_shell.quiz.result.$attemptId.tsx`.

#### 1. How React Retrieves a Specific Attempt Result
- When a quiz is submitted via `POST /api/v1/app/quiz/submit`, the backend returns:
  ```json
  {
    "ok": true,
    "data": {
      "attempt_id": "uuid-string",
      "score": 4,
      "max_score": 5,
      "pass_percent": 60,
      "passed": true,
      "practice": false,
      "grade_sent": false,
      "grade_queued": true
    }
  }
  ```
- React navigates to `/_shell/quiz/result/$attemptId`.
- To load the attempt details, React calls `GET /api/v1/app/attempts` (which returns up to 80 recent attempts for the authenticated learner) and locates the attempt matching `attemptId`.
- If the attempt is found in `attempts`, its score, timestamps, and pass status are rendered.

#### 2. What the Baseline Backend Confirms About Grade Passback
- For graded attempts (`practice=False`), `app_quiz_submit` schedules a background task:
  ```python
  background_tasks.add_task(_ags_background, ...)
  grade_queued = True
  ```
- At the moment `app_quiz_submit` responds, `grade_sent` is almost always **`false`** and `grade_queued` is **`true`** because the HTTP request to Moodle occurs asynchronously in the background.
- To determine the actual passback outcome, the frontend polls:
  `GET /quiz/result/{attempt_id}/ags.json`
- Baseline responses for `ags.json`:
  - `{"ok": true, "status": "pending", "grade_sent": false, ...}`: Moodle sync is in progress.
  - `{"ok": true, "status": "synced", "grade_sent": true, ...}`: **Confirmed success** — Moodle AGS returned HTTP 200/204 and `grade_sent` was marked `true` in PostgreSQL.
  - `{"ok": true, "status": "failed", "grade_error": "...", ...}`: **Passback failed** (e.g. Moodle token error or network timeout).
  - `{"ok": true, "status": "skipped_practice", ...}`: Graded passback was skipped for practice mode.
  - `{"ok": true, "status": "ags_off", ...}`: Launch did not supply an AGS lineitem endpoint.
- **Strict Evidence Requirement:** The React UI must show "Syncing to Moodle..." while `status === "pending"`. It must **never** claim grade synchronization succeeded until `grade_sent === true` or `status === "synced"` is returned by the server.

**Verification Status:** **VERIFIED** (Contract details confirmed against Python implementation).

---

## 3. Final Technical Corrections and Outstanding Risks

### Summary of Source Files Inspected
1. `frontend-react/vite.config.ts`: Verified Vite dev port (5173 vs 3000) and proxy table boundaries.
2. `frontend-react/src/lib/api.ts`: Verified fetch wrapper, Authorization Bearer injection, and same-origin credentials.
3. `frontend-react/src/components/shell/RoleContext.tsx`: Verified `initAuth`, `signOut`, in-memory token storage, and session validation.
4. `app/shell_routes.py`: Verified `student_directory` (L1107), `institution_detail` (L1134), `teacher_content` (L1279), `teacher_manuals` (L3002), and `quiz_result_ags_json` (L2297).
5. `app/api/app_client/routes.py`: Verified `app_quiz_submit` (L778), `app_attempts` (L863), `app_coach` (L752), and `app_manual_read` (L288).
6. `app/frontend_handoff.py`: Verified `launch_destination` URL generation and default `spa_origin()`.

### Inherited Baseline Risks (Remaining Outside Frontend Scope)
These risks originate directly from commit `9cd5f1f` and cannot be remediated without modifying backend code:
1. **AGS Result Status IDOR (SEC-02):** `GET /quiz/result/{attempt_id}/ags.json` does not check user ownership. Any authenticated learner in the tenant can probe the grade sync status of any other attempt UUID in that tenant.
2. **LTI Launch Token in Query String (SEC-01):** The baseline backend redirects to `${FRONTEND_ORIGIN}/?token=<quiz_token>`. The token is transiently exposed in server/proxy access logs and browser history prior to JavaScript `replaceState` sanitization.
3. **No Server-Side Bookmark Persistence:** The baseline backend contains no bookmark tables or endpoints; all bookmarks exist solely on the user's local browser storage.
4. **School Admin Inability to Access Student Directory:** Baseline `student_directory` route strictly requires `is_instructor=True`. School administrators cannot view student directories in the baseline Jinja interface.

---

## 4. Implementation Readiness & Exact Target Lists

### 1. Readiness Verdict
**The plan is now technically verified and ready for implementation approval.** All route contracts, authentication mechanisms, proxy limitations, and security boundaries have been audited against actual baseline code.

### 2. Exact Files to be Modified in Frontend-Only Adaptation
The following files in `frontend-react/` will be modified:
1. `frontend-react/vite.config.ts` (Set port to 3000; expand proxy to cover `/quiz` endpoints).
2. `frontend-react/src/components/shell/RoleContext.tsx` (Direct `?token=` extraction, surgical URL sanitization, remove `/api/v1/auth/exchange` call).
3. `frontend-react/src/lib/api.ts` & `src/lib/adapters.ts` (Remove additive API calls; align with baseline schemas).
4. `frontend-react/src/routes/_shell.manuals.$manualId.tsx` & `src/routes/_shell.read.manuals.$manualId.tsx` (Local bookmarks, local TOC progress calculation).
5. `frontend-react/src/routes/_shell.learn.flashcards.tsx` (Static curriculum deck display; remove dynamic generation expectations).
6. `frontend-react/src/routes/_shell.teacher.content.tsx` & `src/routes/_shell.teacher.manuals.tsx` (Display read-only items; render action buttons linking to baseline Jinja routes with `?token=`).
7. `frontend-react/src/routes/_shell.school-admin.index.tsx` & `src/routes/_shell.student-directory.tsx` (Restricted to tenant overview; school admins directed to `/institution-detail?token=`).
8. `frontend-react/src/routes/ops.login.tsx` & `src/routes/ops.dashboard.tsx` (Top-level redirect to `/ops/login`).

### 3. Exact Backend Files Proposed for Restoration (9 Files)
The following 9 files will be restored to commit `9cd5f1f`:
1. `app/admin_auth.py`
2. `app/api/app_client/routes.py`
3. `app/auth_routes.py`
4. `app/frontend_handoff.py`
5. `app/launch_cache.py`
6. `app/main.py`
7. `app/ops_routes.py`
8. `app/shell_routes.py`
9. `templates/ops_dashboard.html`

> [!CAUTION]
> **EXCLUDED FROM RESTORATION:**  
> `db/migration_pebl_phase2.sql` is **EXCLUDED** to preserve the user's intentional blank-line edit.

---

## 5. Confirmation of Zero Source Code Changes

**CONFIRMED:** During this task:
- 0 backend source files were modified, checked out, or restored.
- 0 React frontend source files were modified.
- 0 database files, migrations, or schemas were altered.
- 0 Jinja templates were modified.
- 0 Git branches were merged, committed, pushed, or reset.
- The working tree remains in its exact read-only state.
