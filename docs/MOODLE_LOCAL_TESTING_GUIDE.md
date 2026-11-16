# EdVidura — Moodle Local Testing Guide (LTI 1.3)

## 1. Environment & Architecture Overview

EdVidura is integrated with a local Moodle instance via IMS Global LTI 1.3 Core (1.3.0) and Advantage extensions.

- **Moodle LMS**: `http://localhost:8085`
- **EdVidura Backend**: `http://127.0.0.1:8000`
- **EdVidura React Frontend**: `http://127.0.0.1:3000`
- **Database**: PostgreSQL 16 on `localhost:5433` (database: `edvidura`, user: `edvidura_app`)
- **Active Demo Tenant**: Riverside High (`aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`)
- **LTI Tool Configuration**:
  - Client ID: `PJtlEaxBXGpUK7c`
  - Tool Deployment IDs: `1,2,3,4,5,6,7,8,9,10`
  - Login Initiation URL: `http://localhost:8000/lti/login_initiation`
  - Tool Redirect URL: `http://localhost:8000/lti/launch`
  - JWKS Keyset URL: `http://localhost:8000/lti/jwks`

---

## 2. Course & Context Mapping

Moodle Course IDs are mapped to EdVidura classes and courses via `lti_context_bindings`.

| Moodle Course | Course Name | Activity ID | Activity Name | EdVidura Class ID | Class Code | EdVidura Course ID | Bound Curriculum |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Course 10** | Class 8 · Algebra I | **21** | Open EdVidura (Class 8) | `3d2c16bb-ed24-4b79-9326-b9a3ad3efdc5` | RHS-C08 | `cccccccc-cccc-cccc-cccc-cccccccccccc` | Riverside Algebra I |

---

## 3. Riverside Demo Personas & Testing Procedures

### Persona 1: Riverside Learner (`riverside_alice`)

1. **Log in to Moodle**:
   - Navigate to `http://localhost:8085/login/index.php`.
   - Username: `riverside_alice`.
   - Submit login form.
2. **Access Activity**:
   - Go to `http://localhost:8085/mod/lti/view.php?id=21`.
   - Click **Open EdVidura (Class 8)** or the LTI launch link.
3. **SPA Landing**:
   - The browser lands on `http://127.0.0.1:3000/lessons`.
   - The navigation badge confirms Learner role: `Alice Nguyen · Riverside High`.
4. **Learning Lesson Flow**:
   - Open Chapter 1: `http://127.0.0.1:3000/lessons/a17ebf8d-c92f-4bfd-91a1-f7bccdd54785`.
   - Read course material: *"Chapter 1: Welcome to Riverside Algebra"*.
5. **PEBL eBook Flow**:
   - Open Manuals Library: `http://127.0.0.1:3000/manuals`.
   - Select and launch the *Algebra I: Foundations & Functions Handbook*: `http://127.0.0.1:3000/read/manuals/de7900fd-488b-4740-bf7e-7a11b3475cd6`.
   - Scrolling / reading logs page interaction via `POST /api/v1/app/manuals/{id}/page-time` (HTTP 200 OK), persisting an xAPI statement (`experienced`).
6. **Quiz Assessment Flow**:
   - Open Quiz Gate: `http://127.0.0.1:3000/quiz`.
   - Complete questions for *Riverside Algebra check* (`aa11aa11-aa11-aa11-aa11-aa11aa11aa11`):
     - Q1: *Which school owns this Algebra course?* $\rightarrow$ **Riverside High**
     - Q2: *In 2x + 3 = 11, what is x?* $\rightarrow$ **4**
     - Q3: *Can Lakeside teachers see Riverside quiz attempts?* $\rightarrow$ **No — tenants are isolated**
   - Click **Submit quiz** and confirm.
   - Result screen loads (`http://127.0.0.1:3000/quiz/result/{attempt_id}`) displaying score 3/3 (100%), generating an xAPI statement (`passed`).
7. **Return to LMS**:
   - Click **Back to Moodle** in the application header.
   - Browser navigates seamlessly back to Moodle Course 10 (`http://localhost:8085/course/view.php?id=10`).

---

### Persona 2: Riverside Instructor (`riverside_priya`)

1. **Log in to Moodle**:
   - Navigate to `http://localhost:8085/login/index.php`.
   - Username: `riverside_priya`.
2. **Access Activity & Launch**:
   - Open `http://localhost:8085/mod/lti/view.php?id=21`.
   - Launch activity.
3. **Instructor Landing**:
   - Automatically directed to `http://127.0.0.1:3000/teacher/attempts`.
   - Navigation bar confirms Instructor role with tabs: Results, Content, Analytics, Activity.
4. **Content Studio & Authoring**:
   - Navigate to `http://127.0.0.1:3000/teacher/content`.
   - Create or edit a draft lesson note (`POST /api/v1/app/lessons` $\rightarrow$ `PUT /api/v1/app/lessons/{id}`).
   - Verify persistence via `GET /api/v1/app/lessons/{id}` and Postgres database inspection.
5. **Class Analytics**:
   - Navigate to `http://127.0.0.1:3000/teacher/analytics`.
   - View aggregated class mastery, attempt distributions, and remediation queues.
6. **Role & Tenant Enforcement Check**:
   - Attempt direct navigation to `http://127.0.0.1:3000/school-admin`.
   - Access is immediately blocked with the *Access Unavailable* security barrier.
7. **Moodle Gradebook Inspection**:
   - Return to Moodle and open Course 10 Grader Report: `http://localhost:8085/grade/report/grader/index.php?id=10`.
   - Notice: Grade passback via LTI Advantage AGS remains explicitly UNVERIFIED in the local container setup.
