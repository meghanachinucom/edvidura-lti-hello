"""Fill Delivery Sheets Status (M) + Progress % (N) from live EdVidura capability.

Conservative, title-first classification. Status vocab:
Not Started | In Progress | In Testing | Blocked | Complete
"""
from __future__ import annotations

import zipfile
from datetime import date
from io import BytesIO
from pathlib import Path

import openpyxl

SRC = Path(r"f:\Downloads\EdVidura_Delivery_Sheets_Final.zip")
OUT = Path(r"f:\Downloads\EdVidura_Delivery_Sheets_Filled.zip")
TODAY = date(2026, 9, 5)
NOTE_TAG = "App demo fill 2026-09 (edvidura-lti-hello / Railway)"

# Product-level baseline when no title keyword hits.
# complete_frac drives default Progress % for unmatched rows under that baseline.
PRODUCT_BASE: dict[str, tuple[str, int]] = {
    # (default_status, default_progress)
    "SME_Chatbot.xlsx": ("In Progress", 40),  # D01 implemented (study coach + SME registry)
    "Autograder_AI Assessment Tools.xlsx": ("In Progress", 35),  # D02 partial
    "Analytics_Dashboard.xlsx": ("In Progress", 55),  # D18 implemented dashboards
    "Competency_Assessment_tool.xlsx": ("In Progress", 50),  # D15 implemented
    "DCT.xlsx": ("In Progress", 45),  # D11 implemented planner (not TipTap suite)
    "Difference_training_application.xlsx": ("In Progress", 45),  # D23
    "Interactive_eBook.xlsx": ("In Progress", 55),  # D12 manuals/PeBL
    "PLE.xlsx": ("In Progress", 40),  # D14 partial
    "EdVidura_Integration_Different LMS.xlsx": ("In Progress", 60),  # E03 Moodle LTI
    "EdVidura_xAPI_Middleware_Libraries.xlsx": ("In Progress", 40),  # E02 partial
    "XR_Store.xlsx": ("Not Started", 0),
}

# Title substring → (status, progress). Checked before product default.
# Prefer specific phrases; first match wins within each list order.
TITLE_RULES: dict[str, list[tuple[list[str], str, int]]] = {
    "SME_Chatbot.xlsx": [
        # Absent / far future
        (["voice", "speech", "gpu admission", "hindi", "devanagari", "ar video",
          "video compliance", "headset", "penetration test", "bge-m3", "opensearch",
          "pgvector", "nli citation", "prompt-injection", "wcag", "auto-quiz",
          "quiz customization", "vllm", "tombstone", "chaos drill", "benchmark",
          "enclave", "visual asset", "schematic"], "Not Started", 0),
        # Shipped in demo
        (["grounded rag", "refusal", "citation chip", "admin management"],
         "Complete", 100),
        # Partial / stub
        (["ingestion", "document acl", "embedding", "vector", "quiz generation"],
         "In Progress", 35),
    ],
    "Autograder_AI Assessment Tools.xlsx": [
        (["psychometrics", "group services", "hinglish", "bilingual",
          "reconciliation", "appeals", "pdf & markdown", "pdf &",
          "document persistence", "enclave", "burst load"], "Not Started", 0),
        (["objective scoring", "lti 1.3", "deep linking", "ags", "gradebook",
          "nrps", "quiz designer", "question-type"], "Complete", 100),
        (["rag question", "test-bank", "essay", "semantic grading", "prompt",
          "schema-constrained", "provenance"], "In Progress", 40),
    ],
    "Analytics_Dashboard.xlsx": [
        (["federation", "cross-command", "enclave", "xr telemetry"], "Not Started", 0),
        (["learner", "teacher", "school admin", "tenant", "kpi", "dashboard",
          "csv", "export", "metabase", "rls", "attempt", "progress"], "Complete", 100),
        (["tla", "realtime", "websocket", "alert", "at-risk"], "In Progress", 40),
    ],
    "Competency_Assessment_tool.xlsx": [
        (["blockchain", "open badge", "external credential", "enclave"], "Not Started", 0),
        (["competency", "skill registry", "xapi", "remediation", "statement",
          "assessment"], "Complete", 100),
        (["framework import", "badge", "credential", "pathway"], "In Progress", 40),
    ],
    "DCT.xlsx": [
        (["tiptap", "axe-core", "etims", "multilingual translation", "enclave",
          "cryptographic p2", "multi-stage review", "review workflow",
          "accessibility scanner", "course catalogue exporter", "enterprise course"],
         "Not Started", 0),
        (["competency registry", "lesson outline", "objective generator",
          "practice question", "ai lesson", "dynamic content selection",
          "sequencing", "metadata", "role taxonomy", "dependency graph",
          "rag ingestion", "author acceptance", "pedagogy", "pre-publish",
          "hierarchy", "version tree", "exercise widget"], "In Progress", 50),
        (["lesson planner", "dct"], "Complete", 100),
    ],
    "Difference_training_application.xlsx": [
        (["xr", "headset", "field observation", "moe ar", "enclave"], "Not Started", 0),
        (["role matrix", "difference", "adaptive", "skill path", "gap"], "Complete", 100),
        (["comparison", "delta", "profile"], "In Progress", 45),
    ],
    "Interactive_eBook.xlsx": [
        (["drm", "offline sync mesh", "epub storefront", "enclave"], "Not Started", 0),
        (["manual", "version", "toc", "reader", "signed", "standalone",
          "publish", "ebook", "pdf"], "Complete", 100),
        (["ocr", "chunk", "pebl", "annotation", "digitiz"], "In Progress", 50),
    ],
    "PLE.xlsx": [
        (["valkey", "redis", "enclave", "demographic", "disparity audit",
          "explainability", "remediation loop breaker"], "Not Started", 0),
        (["adaptive guidance", "prerequisite remediation", "enrichment pathway",
          "curriculum graph", "instructor override", "struggle", "behavioural",
          "behavioral", "tla multi-source", "device sync", "offline",
          "path change", "milestone", "audit vault", "alert"], "In Progress", 40),
        (["learner transparent", "nudge"], "Complete", 100),
    ],
    "EdVidura_Integration_Different LMS.xlsx": [
        (["blackboard", "brightspace", "sakai", "schoology", "enclave"], "Not Started", 0),
        (["lti 1.3", "moodle", "jwks", "oidc", "ags", "nrps", "deep link",
          "dynamic registration", "onboard", "launch", "platform", "deployment",
          "tenant"], "Complete", 100),
        (["canvas", "open edx", "multi-lms", "group"], "In Progress", 25),
    ],
    "EdVidura_xAPI_Middleware_Libraries.xlsx": [
        (["cmi5", "federation", "kafka", "full tla cmm", "enclave"], "Not Started", 0),
        (["xapi statement", "store", "tier", "middleware", "outbox",
          "event envelope", "attempt", "lesson progress"], "Complete", 100),
        (["lrs", "forward", "promote", "experience index", "elrr", "profile"],
         "In Progress", 40),
    ],
    "XR_Store.xlsx": [
        (["*"], "Not Started", 0),
    ],
}


def classify(filename: str, title: str) -> tuple[str, int]:
    text = (title or "").lower().strip()
    if not text or text == "none":
        return "Not Started", 0

    rules = TITLE_RULES.get(filename, [])
    for kws, status, pct in rules:
        if kws == ["*"]:
            return status, pct
        for kw in kws:
            if kw.lower() in text:
                return status, pct

    return PRODUCT_BASE.get(filename, ("Not Started", 0))


def fill_workbook(data: bytes, filename: str) -> tuple[bytes, dict]:
    wb = openpyxl.load_workbook(BytesIO(data))
    ws = wb["Implementation Plan"]
    stats: dict[str, int] = {
        "Complete": 0,
        "In Progress": 0,
        "In Testing": 0,
        "Blocked": 0,
        "Not Started": 0,
        "total": 0,
    }
    for r in range(6, 80):
        step = ws.cell(r, 1).value
        if not step:
            break
        title = str(ws.cell(r, 3).value or "")
        if title.lower() in ("", "none"):
            continue
        status, pct = classify(filename, title)
        ws.cell(r, 13).value = status  # M
        ws.cell(r, 14).value = pct  # N
        if status == "Complete":
            ws.cell(r, 11).value = TODAY
            ws.cell(r, 12).value = TODAY
        elif status == "In Progress":
            ws.cell(r, 11).value = TODAY
            ws.cell(r, 12).value = None
        else:
            ws.cell(r, 11).value = None
            ws.cell(r, 12).value = None
        stats[status] = stats.get(status, 0) + 1
        stats["total"] += 1

    if "Executive Scope" in wb.sheetnames:
        es = wb["Executive Scope"]
        note_row = 36
        for r in range(30, 45):
            if es.cell(r, 1).value is None:
                note_row = r
                break
        es.cell(note_row, 1).value = "App progress stamp"
        es.cell(note_row + 1, 1).value = NOTE_TAG
        es.cell(note_row + 2, 1).value = (
            f"Status fill: {stats.get('Complete', 0)} Complete, "
            f"{stats.get('In Progress', 0)} In Progress, "
            f"{stats.get('Not Started', 0)} Not Started of {stats['total']}"
        )

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue(), stats


def main() -> None:
    with zipfile.ZipFile(SRC, "r") as zin, zipfile.ZipFile(
        OUT, "w", compression=zipfile.ZIP_DEFLATED
    ) as zout:
        for info in zin.infolist():
            data = zin.read(info.filename)
            if info.filename.endswith(".xlsx") and not info.is_dir():
                fname = Path(info.filename).name
                filled, stats = fill_workbook(data, fname)
                zout.writestr(info.filename, filled)
                done = stats.get("Complete", 0)
                total = stats["total"] or 1
                avg = 0
                # rough overall progress from status mix
                print(
                    f"{fname}: Complete={done}/{total} "
                    f"IP={stats.get('In Progress', 0)} "
                    f"NS={stats.get('Not Started', 0)}"
                )
            else:
                zout.writestr(info, data)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
