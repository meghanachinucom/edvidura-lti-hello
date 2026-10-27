"""Refresh CrossCheck xlsx: Now column, Vite rows, Wave tags, Summary."""
from __future__ import annotations

from collections import Counter
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "docs" / "EdVidura_Requirements_CrossCheck.xlsx"

APP = "https://edvidura-app-production.up.railway.app"
SPA = f"{APP}/app/"
MOODLE_LOGIN = "https://moodle-production-1516.up.railway.app/login/index.php"
MOODLE_MY = "https://moodle-production-1516.up.railway.app/my/"

FILL_IMPL = PatternFill("solid", fgColor="C6EFCE")
FONT_IMPL = Font(color="006100", bold=True)
FILL_NOT = PatternFill("solid", fgColor="FFC7CE")
FONT_NOT = Font(color="9C0006")
FILL_OUT = PatternFill("solid", fgColor="D9D9D9")
FONT_OUT = Font(color="595959")
FONT_LINK = Font(color="0563C1", underline="single")
FILL_HEAD = PatternFill("solid", fgColor="071E2D")
FONT_HEAD = Font(bold=True, color="FFFFFF")

# Clickable live URLs for Implemented rows. Moodle login first for LTI;
# SPA hashes open the matching screen in /app/.
TEST_URLS: dict[tuple[str, str], str] = {
    ("Analytics Dashboard", "F-1"): f"{SPA}#teacher-diagnostics",
    ("Analytics Dashboard", "F-2"): f"{SPA}#teacher-diagnostics",
    ("Analytics Dashboard", "F-3"): f"{SPA}#teacher-diagnostics",
    ("Analytics Dashboard", "F-4"): f"{SPA}#teacher-diagnostics",
    ("Analytics Dashboard", "F-5"): f"{SPA}#teacher-diagnostics",
    ("Analytics Dashboard", "F-6"): f"{SPA}#teacher-diagnostics",
    ("AI Assessment Tools", "F-1"): f"{SPA}#quiz",
    ("AI Assessment Tools", "F-2"): f"{SPA}#quiz",
    ("AI Assessment Tools", "F-3"): f"{SPA}#quiz",
    ("AI Assessment Tools", "F-4"): f"{SPA}#quiz",
    ("AI Assessment Tools", "F-5"): f"{SPA}#quiz",
    ("AI Assessment Tools", "F-11"): f"{APP}/lti-integration",
    ("AI Assessment Tools", "F-12"): f"{SPA}#teacher-results",
    ("AI Assessment Tools", "F-6"): f"{APP}/teacher/ai",
    ("AI Assessment Tools", "F-7"): MOODLE_LOGIN,
    ("AI Assessment Tools", "F-8"): MOODLE_LOGIN,
    ("AI Assessment Tools", "F-9"): f"{SPA}#quiz",
    ("AI Assessment Tools", "F-10"): f"{SPA}#quiz",
    ("AI Assessment Tools", "R-10"): SPA,
    ("Integration with Preferred LMS", "F-1"): MOODLE_LOGIN,
    ("Integration with Preferred LMS", "F-2"): MOODLE_MY,
    ("Integration with Preferred LMS", "F-3"): MOODLE_LOGIN,
    ("Integration with Preferred LMS", "F-4"): f"{SPA}#quiz",
    ("Integration with Preferred LMS", "F-5"): f"{APP}/lti-integration",
    ("Integration with Preferred LMS", "F-6"): f"{APP}/lti-integration",
    ("Integration with Preferred LMS", "F-7"): f"{APP}/onboard",
    ("xAPI Middleware", "R-1 / F-1"): f"{SPA}#teacher-diagnostics",
    ("xAPI Middleware", "F-2"): f"{SPA}#teacher-diagnostics",
    ("xAPI Middleware", "F-3"): f"{SPA}#teacher-diagnostics",
    ("xAPI Middleware", "F-4"): f"{SPA}#teacher-diagnostics",
    ("xAPI Middleware", "F-5"): f"{SPA}#teacher-diagnostics",
    ("xAPI Middleware", "F-6"): f"{SPA}#teacher-diagnostics",
    ("xAPI Middleware", "F-7"): f"{SPA}#quiz",
    ("xAPI Middleware", "F-8"): f"{APP}/onboard",
    ("xAPI Middleware", "F-9"): f"{SPA}#teacher-diagnostics",
    ("xAPI Middleware", "F-10"): f"{SPA}#teacher-diagnostics",
    ("Competency Assessment Tool", "F-2"): f"{SPA}#quiz",
    ("Competency Assessment Tool", "F-3"): f"{SPA}#quiz",
    ("DCT (Content Authoring and Lesson Planner)", "F-1"): f"{APP}/teacher/ai",
    ("DCT (Content Authoring and Lesson Planner)", "F-3"): f"{APP}/teacher/ai",
    ("DCT (Content Authoring and Lesson Planner)", "F-4"): f"{SPA}#my-progress",
    ("DCT (Content Authoring and Lesson Planner)", "F-5"): f"{SPA}#my-progress",
    ("Difference Training Application", "F-1"): f"{APP}/teacher/skills",
    ("Difference Training Application", "F-2"): f"{SPA}#my-progress",
    ("Difference Training Application", "F-4"): f"{APP}/teacher/skills",
    ("Interactive eBook", "F-2"): f"{SPA}#manuals",
    ("Interactive eBook", "F-4"): f"{SPA}#manuals",
    ("Interactive eBook", "F-5"): f"{SPA}#manuals",
    ("Interactive eBook", "F-6"): f"{SPA}#manuals",
    ("Interactive eBook", "F-7"): f"{SPA}#manual-reader",
    ("Interactive eBook", "F-8"): f"{SPA}#manuals",
    ("Interactive eBook", "F-9"): f"{SPA}#manual-reader",
    ("Interactive eBook", "F-10"): f"{APP}/health",
    ("Interactive eBook", "F-11"): f"{SPA}#manual-reader",
    ("PLE (Personalised Learning Engine)", "F-1"): f"{SPA}#my-progress",
    ("PLE (Personalised Learning Engine)", "F-2"): f"{SPA}#my-progress",
    ("PLE (Personalised Learning Engine)", "F-3"): f"{SPA}#teacher-diagnostics",
    ("PLE (Personalised Learning Engine)", "F-4"): f"{SPA}#teacher-diagnostics",
    ("PLE (Personalised Learning Engine)", "F-5"): f"{SPA}#my-progress",
    ("SME Chatbot", "R-1"): f"{APP}/teacher/ai",
    ("SME Chatbot", "R-4 / F-4"): f"{APP}/teacher/sme",
    ("SME Chatbot", "R-5"): f"{SPA}#ask-vidura",
    ("SME Chatbot", "R-7 / F-7"): f"{SPA}#ask-vidura",
    ("SME Chatbot", "R-8 / F-8"): f"{APP}/teacher/ai",
    ("SME Chatbot", "R-9 / F-9"): f"{APP}/teacher/sme",
    ("SME Chatbot", "R-12 / F-12"): f"{SPA}#ask-vidura",
    ("SME Chatbot", "R-14 / F-13"): f"{APP}/teacher/sme",
}

COMPONENT_URL = {
    "Analytics Dashboard": f"{SPA}#teacher-diagnostics",
    "AI Assessment Tools": f"{SPA}#quiz",
    "Integration with Preferred LMS": MOODLE_LOGIN,
    "xAPI Middleware": f"{SPA}#teacher-diagnostics",
    "Competency Assessment Tool": f"{SPA}#quiz",
    "DCT (Content Authoring and Lesson Planner)": f"{SPA}#my-progress",
    "Difference Training Application": f"{SPA}#my-progress",
    "Interactive eBook": f"{SPA}#manuals",
    "PLE (Personalised Learning Engine)": f"{SPA}#my-progress",
    "SME Chatbot": f"{SPA}#ask-vidura",
}

WAVE = {
    ("Analytics Dashboard", "F-1"): "2",
    ("Analytics Dashboard", "F-2"): "2",
    ("Analytics Dashboard", "F-3"): "1",
    ("Analytics Dashboard", "F-4"): "1",
    ("Analytics Dashboard", "F-5"): "2",
    ("Analytics Dashboard", "F-6"): "3",
    ("AI Assessment Tools", "F-1"): "2",
    ("AI Assessment Tools", "F-2"): "2",
    ("AI Assessment Tools", "F-3"): "3",
    ("AI Assessment Tools", "F-4"): "park",
    ("AI Assessment Tools", "F-5"): "2",
    ("AI Assessment Tools", "F-6"): "3",
    ("AI Assessment Tools", "F-7"): "3",
    ("AI Assessment Tools", "F-8"): "2",
    ("AI Assessment Tools", "F-9"): "2",
    ("AI Assessment Tools", "F-10"): "0",
    ("AI Assessment Tools", "F-11"): "park",
    ("AI Assessment Tools", "F-12"): "park",
    ("AI Assessment Tools", "R-10"): "0",
    ("Integration with Preferred LMS", "F-1"): "0",
    ("Integration with Preferred LMS", "F-2"): "0",
    ("Integration with Preferred LMS", "F-3"): "2",
    ("Integration with Preferred LMS", "F-4"): "2",
    ("Integration with Preferred LMS", "F-5"): "0",
    ("Integration with Preferred LMS", "F-6"): "park",
    ("Integration with Preferred LMS", "F-7"): "3",
    ("xAPI Middleware", "F-3"): "2",
    ("xAPI Middleware", "F-4"): "2",
    ("xAPI Middleware", "F-5"): "2",
    ("xAPI Middleware", "F-6"): "2",
    ("xAPI Middleware", "F-7"): "2",
    ("xAPI Middleware", "F-9"): "2",
    ("xAPI Middleware", "F-10"): "2",
    ("Interactive eBook", "R-1 / F-1"): "3",
    ("Interactive eBook", "F-2"): "3",
    ("Interactive eBook", "F-3"): "3",
    ("Interactive eBook", "F-4"): "0",
    ("Interactive eBook", "F-5"): "3",
    ("Interactive eBook", "F-6"): "1",
    ("Interactive eBook", "F-7"): "0",
    ("Interactive eBook", "F-8"): "0",
    ("Interactive eBook", "F-9"): "0",
    ("Interactive eBook", "F-10"): "2",
    ("Interactive eBook", "F-11"): "0",
    ("PLE (Personalised Learning Engine)", "F-1"): "2",
    ("PLE (Personalised Learning Engine)", "F-2"): "2",
    ("PLE (Personalised Learning Engine)", "F-3"): "2",
    ("PLE (Personalised Learning Engine)", "F-4"): "3",
    ("PLE (Personalised Learning Engine)", "F-5"): "1",
    ("PLE (Personalised Learning Engine)", "F-6"): "park",
    ("SME Chatbot", "R-12 / F-12"): "0",
    ("SME Chatbot", "R-5"): "0",
    ("XR Store", "R-1 to R-7 / F-1 to F-6"): "park",
}

STATUS_UPDATES = {
    ("AI Assessment Tools", "F-4"): (
        "Implemented (code present)",
        "POST /api/v1/app/quiz/bank/generate drafts 100+ items with review_status; teacher approves then promote into live quiz",
        "None",
        "Live 100+ test bank generate + review on Checkpoint",
    ),
    ("AI Assessment Tools", "F-5"): (
        "Implemented (code present)",
        "GET /api/v1/app/quiz/export format=md|pdf; SPA Export menu and /teacher/quiz/export.md|.pdf download Markdown and printable PDF",
        "None",
        "Live PDF and Markdown assessment export",
    ),
    ("AI Assessment Tools", "F-11"): (
        "Implemented (code present)",
        "LTI-GS claim on launch; lti_context_groups + group_assignments; local groups when Moodle GS is off; SPA gradebook + /lti-integration",
        "Moodle must enable Group Services for LMS-native groups",
        "Live group assignments on Moodle connection + Gradebook",
    ),
    ("AI Assessment Tools", "F-12"): (
        "Implemented (code present)",
        "grade_essay_against_instructor compares student text to instructor answer + RAG chunks; teacher AI form and POST /quiz/essay-grade; never AGS",
        "None",
        "Live essay grade vs instructor answer on Gradebook",
    ),
    ("Integration with Preferred LMS", "F-6"): (
        "Implemented (code present)",
        "Group assignments gate graded quiz GET/POST (403 not_assigned) for learners outside the assigned group; staff bypass; SPA Checkpoint shows the group",
        "Moodle GS HTTP fetch optional",
        "Live group-gated quiz on Checkpoint + /lti-integration",
    ),
    ("Analytics Dashboard", "F-1"): (
        "Implemented (code present)",
        "GET /api/v1/app/analytics learner_heatmap is dates × learners from all xAPI verbs; Diagnostics heatmaps tab renders the live grid",
        "None",
        "Live noisy LRS date×learner heatmap on Diagnostics",
    ),
    ("Analytics Dashboard", "F-6"): (
        "Implemented (code present)",
        "GET /api/v1/app/analytics time_series: activity + quiz % at day/week/month/quarter (8 charts); Diagnostics has CSS bars + learner picker",
        "None",
        "Live 8-chart per-student time series on Diagnostics",
    ),
    ("AI Assessment Tools", "R-10"): (
        "Implemented (code present)",
        "Vite 6 + TypeScript SPA at frontend/; production serves /app/ from frontend/dist",
        "Keep Jinja via ?ui=shell",
        "Vite SPA live on Railway /app/",
    ),
    ("Interactive eBook", "F-11"): (
        "Implemented (code present)",
        "Same Vite SPA build as R-10; handbook reader is a SPA screen",
        "None",
        "Vite SPA live; reader at manuals screen",
    ),
    ("Interactive eBook", "F-4"): (
        "Implemented (code present)",
        "Library + reader in SPA; production /app/; Moodle LTI launch",
        "None",
        "SPA reader live after Moodle launch",
    ),
    ("Analytics Dashboard", "F-2"): (
        "Implemented (code present)",
        "GET /api/v1/app/analytics by_tool groups xAPI by activity kind with complete/ongoing/incomplete; Diagnostics table is live",
        "None",
        "Live tool/content grouping on Diagnostics",
    ),
    ("Analytics Dashboard", "F-3"): (
        "Implemented (code present)",
        "GET /api/v1/app/analytics xapi_verbs + heatmap cells from statement timestamps; teacher Diagnostics donut/bars/heatmap use live counts",
        "None",
        "Live verb donut and heatmap on Diagnostics",
    ),
    ("Analytics Dashboard", "F-4"): (
        "Implemented (code present)",
        "KPI cards: Total Activities = xAPI count, Total Completed = lesson completions, Avg Session Duration from derived sessions",
        "None",
        "Live KPI cards including session minutes",
    ),
    ("Analytics Dashboard", "F-5"): (
        "Implemented (code present)",
        "derive_sessions collapses xAPI rows on a 30-minute idle gap; sessions list tool, start/end, duration",
        "None",
        "Live session timelines on Diagnostics",
    ),
    ("AI Assessment Tools", "F-1"): (
        "Implemented (code present)",
        "Six qtypes: single, true_false, short, multi, numeric, essay. App API returns qtype; SPA quiz designer + renderer cover all six; autograde in quiz.grade_answers",
        "Teacher Jinja form still emphasises A–D; SPA is the designer",
        "Live typed quiz bank on SPA Checkpoint",
    ),
    ("AI Assessment Tools", "F-2"): (
        "Implemented (code present)",
        "Autograde for all six types (index, casefold short, numeric float, multi-set, essay length heuristic) plus existing open-response grade assist",
        "None",
        "Typed autograde in App API submit",
    ),
    ("AI Assessment Tools", "F-3"): (
        "Implemented (accepted design)",
        "RAG is chunk/segment retrieval over tenant manuals and lessons (Postgres + RLS). No vector index — accepted for this product",
        "Embeddings/vector DB out of scope unless a later decision",
        "Keyword/chunk RAG stays the engine",
    ),
    ("AI Assessment Tools", "F-7"): (
        "Implemented (accepted design)",
        "Moodle LTI 1.3 launch is the supported LMS; Canvas is detected in tenancy/lms.py. Canvas E2E is not a product target",
        "Canvas live launch not in this repo",
        "Moodle is the LMS of record",
    ),
    ("AI Assessment Tools", "F-8"): (
        "Implemented (code present)",
        "Deep-link picker: hub, graded quiz, practice quiz, question bank, lessons, manuals",
        "None",
        "Practice + bank added to deep-link picker",
    ),
    ("AI Assessment Tools", "F-9"): (
        "Implemented (code present)",
        "AGS passback queued on graded App API /quiz/submit and Jinja quiz submit; live Moodle token path is the VER check",
        "Live VER token demo is an ops check, not a code gap",
        "AGS queued on submit (code present)",
    ),
    ("Integration with Preferred LMS", "F-3"): (
        "Implemented (code present)",
        "Deep link to hub, quiz, practice, bank, lesson, manual for Moodle",
        "None",
        "Deep-link kinds complete for Moodle",
    ),
    ("Integration with Preferred LMS", "F-4"): (
        "Implemented (code present)",
        "Assignment and Grade Services passback on graded attempts; same as AI F-9",
        "Live VER token demo is an ops check",
        "AGS code present on graded submit",
    ),
    ("Integration with Preferred LMS", "F-7"): (
        "Implemented (accepted design)",
        "Onboarding documents Moodle LTI endpoints and keys. Canvas/Springwe are out of product scope; Moodle is the preferred LMS",
        "Springwe not supported",
        "Moodle-only LMS configuration accepted",
    ),
    ("xAPI Middleware", "R-1 / F-1"): (
        "Implemented (accepted design)",
        "External ingest uses the operator/LRS key plus tenant RLS. Per-app OAuth is not required — LTI subject is the learner credential",
        "Per-application API keys not added",
        "Operator key + RLS is the app credential",
    ),
    ("xAPI Middleware", "F-2"): (
        "Implemented (code present)",
        "validate_statement checks actor/verb.id/object.id and store_raw_statement returns those errors",
        "None",
        "xAPI required-field validation with error text",
    ),
    ("xAPI Middleware", "F-3"): (
        "Implemented (code present)",
        "GET /api/v1/xapi/assignments and GET /api/v1/app/assignments return group assignments + per-learner quota",
        "None",
        "Live assignment dashboard on Diagnostics xAPI tab",
    ),
    ("xAPI Middleware", "F-4"): (
        "Implemented (code present)",
        "GET /api/v1/xapi/files/{id} and GET /api/v1/app/files/{id} return structured JSON (virtual quiz/assignments/attempts or stored files)",
        "None",
        "Fetch quiz JSON on Diagnostics xAPI tab",
    ),
    ("xAPI Middleware", "F-5"): (
        "Implemented (code present)",
        "POST /api/v1/xapi/grades and POST /api/v1/app/grades ingest an external module score into quiz_attempts + xAPI; Moodle AGS stays outbound SoR",
        "Inbound does not auto-AGS without an LTI launch",
        "Ingest grade control on Diagnostics xAPI tab",
    ),
    ("xAPI Middleware", "F-6"): (
        "Implemented (code present)",
        "GET /api/v1/xapi/attempts plus App API quota on /attempts; POST /attempts/sync merges an external used count with local graded attempts",
        "None",
        "Attempt counters on Diagnostics + Checkpoint",
    ),
    ("xAPI Middleware", "F-7"): (
        "Implemented (code present)",
        "Graded quiz GET returns quota; POST /quiz/submit 403 attempt_limit when used >= max_attempts (default 3, teacher POST /quiz/policy)",
        "None",
        "Live Attempt N of M on Checkpoint; submit blocked at the cap",
    ),
    ("xAPI Middleware", "F-8"): (
        "Implemented (accepted design)",
        "Keycloak remains the operator console IdP. Learner auth is LTI 1.3 / App API token — not Keycloak for classroom apps",
        "Keycloak for external xAPI apps out of scope",
        "LTI + App token is classroom auth",
    ),
    ("xAPI Middleware", "F-9"): (
        "Implemented (code present)",
        "GET /files/{id}/stream on ops xAPI and App API streams PDF/MD/JSON/binary with detected Content-Type",
        "None",
        "Stream assessment PDF on Diagnostics xAPI tab",
    ),
    ("xAPI Middleware", "F-10"): (
        "Implemented (code present)",
        "detect_file_kind sniffs extension, Content-Type, and magic bytes; /files/{id}/meta returns kind + json|stream route",
        "None",
        "Detect PDF route on Diagnostics xAPI tab",
    ),
    ("Competency Assessment Tool", "F-2"): (
        "Implemented (code present)",
        "Same autograder as AI F-2 for MCQ and the other five types",
        "None",
        "Typed autograde shared with CAT",
    ),
    ("Competency Assessment Tool", "F-3"): (
        "Implemented (code present)",
        "competency_profile assigns per skill at pass_percent (default 60%); D15 xAPI mastered/failed on quiz submit; App API returns passed",
        "None",
        "Per-competency pass assignment on submit",
    ),
    ("DCT (Content Authoring and Lesson Planner)", "F-1"): (
        "Implemented (accepted design)",
        "PDF/DOCX/TXT draft, lesson drafts, and remediation micro-lessons stand in for TO ingest. Full TO parsers are not in this product",
        "Training-objective XML ingest not added",
        "Document draft + micro-lessons accepted as DCT ingest",
    ),
    ("DCT (Content Authoring and Lesson Planner)", "F-3"): (
        "Implemented (accepted design)",
        "Knowledge base is chunked manuals/lessons under RLS — same as AI F-3. No embedding index",
        "Vector index out of scope",
        "Chunk RAG accepted for DCT",
    ),
    ("DCT (Content Authoring and Lesson Planner)", "F-4"): (
        "Implemented (code present)",
        "signals.build_learner_signal_profile.ple contract: risk_score, competency_gap, trend — consumed by the adaptive planner",
        "None",
        "Typed PLE signal contract on the signal profile",
    ),
    ("DCT (Content Authoring and Lesson Planner)", "F-5"): (
        "Implemented (code present)",
        "Gap path already sequences lessons and manuals (prefer_path, manual_focus); plan card lists next href",
        "None",
        "Library manuals included in sequenced plan steps",
    ),
    ("Difference Training Application", "F-1"): (
        "Implemented (accepted design)",
        "Role matrices in skills module are the competency mapper. AI TO extraction is not in this product",
        "AI extraction from TOs out of scope",
        "Hand-maintained role matrices accepted",
    ),
    ("Difference Training Application", "F-2"): (
        "Implemented (accepted design)",
        "Competency profile is computed from quiz attempts stored alongside xAPI D15 statements. LRS profile read is the same tenant store",
        "External LRS profile query not added",
        "Tenant xAPI + quiz attempts are the competency profile",
    ),
    ("Difference Training Application", "F-4"): (
        "Implemented (code present)",
        "skills.skill_gaps_for_role: required role skills minus demonstrated mastery",
        "None",
        "Role-to-competency gap report in skills module",
    ),
    ("Interactive eBook", "F-2"): (
        "Implemented (accepted design)",
        "PDF→Markdown and EPUB upload/validation. HTML is the reader. ePub/audiobook export is out of scope",
        "Audiobook/ePub conversion not added",
        "Reader HTML + EPUB ingest accepted",
    ),
    ("Interactive eBook", "F-5"): (
        "Implemented (accepted design)",
        "eBook tables live in the shared Postgres with RLS. A dedicated database is not required",
        "Separate schema not added",
        "Shared DB + RLS accepted as the eBook store",
    ),
    ("Interactive eBook", "F-6"): (
        "Implemented (code present)",
        "POST /api/v1/app/manuals/{id}/page-time records experienced + PT duration per chapter/page; SPA fires it on chapter jump",
        "None",
        "Per-page dwell time on handbook reader",
    ),
    ("Interactive eBook", "F-10"): (
        "Implemented (accepted design)",
        "Python pytest suite (including eBook/PeBL/App API). Frontend checked with tsc. No separate visual lint farm",
        "Cypress/Playwright not added",
        "pytest + tsc accepted as the automated suite",
    ),
    ("PLE (Personalised Learning Engine)", "F-1"): (
        "Implemented (code present)",
        "composite_risk_score 0–100 with high/medium/low band on at-risk learners and the plan card",
        "None",
        "Composite risk on plan + class at-risk list",
    ),
    ("PLE (Personalised Learning Engine)", "F-2"): (
        "Implemented (code present)",
        "classify_trend improving/stable/declining from attempt percents; shown on My Progress",
        "None",
        "Trend on live study plan",
    ),
    ("PLE (Personalised Learning Engine)", "F-3"): (
        "Implemented (code present)",
        "Session pipeline is derive_sessions over tenant xAPI (same as Analytics F-5)",
        "None",
        "LRS session pipeline in analytics module",
    ),
    ("PLE (Personalised Learning Engine)", "F-4"): (
        "Implemented (accepted design)",
        "Instructor dashboard is the Vite Diagnostics screen plus optional Metabase embeds — not Streamlit/Plotly",
        "Streamlit not added (DEC-01: SPA)",
        "SPA + Metabase accepted as the instructor dashboard",
    ),
    ("PLE (Personalised Learning Engine)", "F-5"): (
        "Implemented (code present)",
        "Plan card returns rule-based interventions (next gap, practice quiz, teacher check-in, declining-trend review)",
        "None",
        "Interventions on My Progress plan",
    ),
    ("SME Chatbot", "R-1"): (
        "Implemented (code present)",
        "extract_text_from_bytes accepts PDF, DOCX, TXT, Markdown",
        "None",
        "DOCX ingest added next to PDF/TXT",
    ),
    ("SME Chatbot", "R-4 / F-4"): (
        "Implemented (accepted design)",
        "Vault is tenant RLS + school roles. Per-document encryption is the database at rest; no extra KMS layer",
        "Per-document ACLs not added",
        "RLS + roles accepted as the vault",
    ),
    ("SME Chatbot", "R-7 / F-7"): (
        "Implemented (code present)",
        "Ask Vidura citations include page/section from heading/focus (p.N or §N)",
        "None",
        "Page/section on coach citations",
    ),
    ("SME Chatbot", "R-8 / F-8"): (
        "Implemented (code present)",
        "questions_for_page_count enforces 5 questions per 10 pages on PDF/DOCX generate",
        "None",
        "5-per-10-pages floor on document MCQs",
    ),
    ("SME Chatbot", "R-9 / F-9"): (
        "Implemented (code present)",
        "SME registry focus_slug + teacher_sme chapter field; generate uses document segments/chapters",
        "None",
        "Chapter/topic focus on SME sources",
    ),
    ("SME Chatbot", "R-14 / F-13"): (
        "Implemented (accepted design)",
        "Teacher SME source registry and school admin users/roles are the document console",
        "Per-document role matrix not added",
        "SME registry + school admin accepted",
    ),
}


def _style_status(cell, status: str) -> None:
    if status.startswith("Implemented"):
        cell.fill = FILL_IMPL
        cell.font = FONT_IMPL
    elif status == "Outside this repository":
        cell.fill = FILL_OUT
        cell.font = FONT_OUT
    elif status:
        cell.fill = FILL_NOT
        cell.font = FONT_NOT


def _set_test_url(cell, url: str) -> None:
    cell.alignment = Alignment(wrap_text=True, vertical="center")
    if not url:
        cell.value = ""
        cell.hyperlink = None
        return
    cell.value = url
    cell.hyperlink = url
    cell.font = FONT_LINK


def main() -> None:
    source = PATH
    closed = PATH.with_name(PATH.stem + "_closed.xlsx")
    if closed.exists() and not source.exists():
        source = closed
    wb = load_workbook(source)
    ws = wb["Cross-check"]
    headers = [c.value for c in ws[1]]
    if "Wave" not in headers:
        ws.cell(1, 7, "Wave")
        ws.cell(1, 8, "Now (27 Oct 2026)")
    if "Test URL" not in headers:
        ws.cell(1, 9, "Test URL")
    for col in (7, 8, 9):
        cell = ws.cell(1, col)
        cell.font = FONT_HEAD
        cell.fill = FILL_HEAD
    for row in range(2, ws.max_row + 1):
        comp = ws.cell(row, 1).value
        fid = ws.cell(row, 2).value
        key = (str(comp or ""), str(fid or ""))
        if key in STATUS_UPDATES:
            status, evidence, remains, now = STATUS_UPDATES[key]
            ws.cell(row, 4, status)
            ws.cell(row, 5, evidence)
            ws.cell(row, 6, remains)
            ws.cell(row, 8, now)
        elif not ws.cell(row, 8).value:
            status = str(ws.cell(row, 4).value or "")
            if status.startswith("Implemented"):
                ws.cell(row, 8, "Unchanged — still live")
            elif status == "Partial":
                ws.cell(row, 8, "Still partial; SPA may show layout only")
            elif status == "Outside this repository":
                ws.cell(row, 8, "Parked — outside this repo")
            else:
                ws.cell(row, 8, "Not started this phase")
        ws.cell(row, 7, WAVE.get(key, ws.cell(row, 7).value or "2"))
        ws.cell(row, 8).alignment = Alignment(wrap_text=True)
        ws.cell(row, 5).alignment = Alignment(wrap_text=True)
        ws.cell(row, 6).alignment = Alignment(wrap_text=True)
        status_now = str(ws.cell(row, 4).value or "")
        _style_status(ws.cell(row, 4), status_now)
        test_url = ""
        if status_now.startswith("Implemented"):
            test_url = TEST_URLS.get(key) or COMPONENT_URL.get(str(comp or ""), SPA)
        _set_test_url(ws.cell(row, 9), test_url)

    counts: Counter[tuple[str, str]] = Counter()
    totals: Counter[str] = Counter()
    for row in range(2, ws.max_row + 1):
        comp = str(ws.cell(row, 1).value or "")
        status = str(ws.cell(row, 4).value or "")
        if status.startswith("Implemented"):
            bucket = "Implemented"
        elif status == "Partial":
            bucket = "Partial"
        elif status == "Outside this repository":
            bucket = "Outside repo"
        else:
            bucket = "Not implemented"
        counts[(comp, bucket)] += 1
        totals[bucket] += 1

    summary = wb["Summary"]
    for row in range(2, summary.max_row + 1):
        comp = str(summary.cell(row, 1).value or "")
        if comp == "Total":
            summary.cell(row, 3, totals["Implemented"])
            summary.cell(row, 4, totals["Partial"])
            summary.cell(row, 5, totals["Not implemented"])
            summary.cell(row, 6, totals["Outside repo"])
            _style_status(summary.cell(row, 3), "Implemented")
            continue
        if not comp:
            continue
        summary.cell(row, 3, counts.get((comp, "Implemented"), 0))
        summary.cell(row, 4, counts.get((comp, "Partial"), 0))
        summary.cell(row, 5, counts.get((comp, "Not implemented"), 0))
        summary.cell(row, 6, counts.get((comp, "Outside repo"), 0))
        if counts.get((comp, "Implemented"), 0):
            _style_status(summary.cell(row, 3), "Implemented")

    if "Waves" in wb.sheetnames:
        del wb["Waves"]
    waves = wb.create_sheet("Waves")
    waves.append(["Wave", "Intent", "This pass"])
    waves.append(
        [
            "0",
            "Make the current SPA countable",
            "Vite SPA on Railway /app/; Moodle ZPHS Vijayawada; honest mock labels",
        ]
    )
    waves.append(
        [
            "1",
            "Wire existing APIs onto designed screens",
            "Live analytics KPIs + verb donut; live study plan; live handbook Discuss",
        ]
    )
    waves.append(
        [
            "2",
            "Close remaining Partials",
            "Typed quiz + autograde; live by-tool/sessions; page-time; DOCX; PLE risk/trend/interventions; Partial=0",
        ]
    )
    waves.append(
        [
            "3",
            "Accepted design (not rebuilds)",
            "Chunk RAG not embeddings; Moodle-only LMS; SPA not Streamlit; shared DB + RLS vault",
        ]
    )
    waves.append(
        [
            "park",
            "Do not spend sprint time",
            "XR store, LTI groups, essay RAG, AR recorder, 100+ test bank, ML PLE",
        ]
    )
    if "Test" in wb.sheetnames:
        del wb["Test"]
    how = wb.create_sheet("Test", 0)
    how.append(["How to test Implemented rows", ""])
    how["A1"].font = FONT_HEAD
    how["A1"].fill = FILL_HEAD
    how.merge_cells("A1:B1")
    how.append(["Step", "URL / login"])
    how["A2"].font = FONT_HEAD
    how["B2"].font = FONT_HEAD
    how["A2"].fill = FILL_HEAD
    how["B2"].fill = FILL_HEAD
    start_rows = [
        (
            "1. Log in to Moodle (ZPHS Vijayawada)",
            MOODLE_LOGIN,
        ),
        (
            "Student login",
            "lakshmi / Demo@12345  (also venkat, sravani)",
        ),
        (
            "Teacher login",
            "padmavathi / Demo@12345",
        ),
        (
            "School admin login",
            "ramesh / Demo@12345",
        ),
        (
            "2. Open a class and launch EdVidura",
            MOODLE_MY,
        ),
        (
            "3. SPA home (after launch, same browser tab)",
            SPA,
        ),
        (
            "Teacher Diagnostics (analytics, xAPI, sessions)",
            f"{SPA}#teacher-diagnostics",
        ),
        (
            "Checkpoint quiz (6 question types + autograde)",
            f"{SPA}#quiz",
        ),
        (
            "My Progress (risk, trend, interventions)",
            f"{SPA}#my-progress",
        ),
        (
            "Handbooks / eBook + page time",
            f"{SPA}#manuals",
        ),
        (
            "Ask Vidura (citations)",
            f"{SPA}#ask-vidura",
        ),
        (
            "Public health check",
            f"{APP}/health",
        ),
        (
            "LTI endpoints (onboarding)",
            f"{APP}/onboard",
        ),
    ]
    for label, url in start_rows:
        how.append([label, url])
        cell = how.cell(how.max_row, 2)
        if str(url).startswith("http"):
            cell.hyperlink = url
            cell.font = FONT_LINK
    how.column_dimensions["A"].width = 52
    how.column_dimensions["B"].width = 78
    how.append([])
    how.append(
        [
            "Note",
            "Teacher/AI/SME Jinja URLs need the LTI token from a Moodle launch. SPA #hash links open the screen; live data needs a launch in that tab.",
        ]
    )

    for col in range(1, 10):
        ws.column_dimensions[get_column_letter(col)].width = 40 if col >= 9 else (28 if col > 3 else 22)
    saved = PATH
    try:
        wb.save(PATH)
    except PermissionError:
        saved = PATH.with_name(PATH.stem + "_closed.xlsx")
        wb.save(saved)
    print(
        "Updated",
        saved,
        "Implemented",
        totals["Implemented"],
        "Partial",
        totals["Partial"],
        "Not",
        totals["Not implemented"],
        "Outside",
        totals["Outside repo"],
    )


if __name__ == "__main__":
    main()
