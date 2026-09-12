"""Mark Master Checklist Status from codebase capability grades.

Rules (honest, demo-oriented — not full enterprise evidence packs):
  Implemented products: Build -> Done; Test -> In progress
  Partial products:     Build -> In progress; Test unchanged
  Absent products:      unchanged

Also stamps LastUpdated + Notes, and refreshes Product Index Done/% done.
"""
from __future__ import annotations

import shutil
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

import openpyxl

SRC = Path(r"f:\Downloads\EdVidura_Master_Checklist_v3.xlsx")
BAK = Path(r"f:\Downloads\EdVidura_Master_Checklist_v3_backup_before_tick.xlsx")
TODAY = date(2026, 9, 5).isoformat()
NOTE = (
    "Codebase/Railway demo complete as of 2026-09-05 "
    "(edvidura-lti-hello). Not full enterprise evidence pack."
)

# From capability map vs repo + live demo
GRADE: dict[str, str] = {
    "D01": "Implemented",
    "D02": "Partial",
    "D03": "Absent",
    "D04": "Absent",
    "D05": "Absent",
    "D06": "Partial",
    "D07": "Partial",
    "D08": "Implemented",
    "D09": "Absent",
    "D10": "Implemented",
    "D11": "Implemented",
    "D12": "Implemented",
    "D13": "Implemented",
    "D14": "Partial",
    "D15": "Implemented",
    "D16": "Partial",
    "D17": "Implemented",
    "D18": "Implemented",
    "D19": "Absent",
    "D20": "Absent",
    "D22": "Absent",
    "D23": "Implemented",
    "D24": "Absent",
    "D25": "Absent",
    "D26": "Absent",
    "D27": "Absent",
    "D28": "Absent",
    "D29": "Absent",
    "E01": "Partial",
    "E02": "Partial",
    "E03": "Implemented",
    "E04": "Implemented",
    "E05": "Absent",
    "E06": "Absent",
    "E07": "Partial",
    "E08": "Partial",
    "E09": "Absent",
    "E10": "Absent",
    "E11": "Absent",
    "E12": "Absent",
    "E13": "Partial",
}


def new_status(grade: str, work_type: str, current: str) -> str | None:
    """Return new Status or None to leave unchanged."""
    wt = (work_type or "").strip()
    if grade == "Implemented":
        if wt == "Build":
            return "Done"
        if wt == "Test":
            return "In progress"
    elif grade == "Partial":
        if wt == "Build":
            return "In progress"
    return None


def main() -> None:
    if not BAK.exists():
        shutil.copy2(SRC, BAK)
        print("backup", BAK)

    wb = openpyxl.load_workbook(SRC)
    ws = wb["Master Checklist"]
    hdr = [c.value for c in ws[1]]
    cols = {str(h): i + 1 for i, h in enumerate(hdr) if h}  # 1-based

    changes = Counter()
    by_product = defaultdict(Counter)

    for r in range(2, ws.max_row + 1):
        rid = ws.cell(r, cols["ID"]).value
        if not rid:
            continue
        pid = str(ws.cell(r, cols["ProductID"]).value or "").strip()
        grade = GRADE.get(pid, "Absent")
        wt = str(ws.cell(r, cols["WorkType"]).value or "")
        cur = str(ws.cell(r, cols["Status"]).value or "Not started")
        nxt = new_status(grade, wt, cur)
        if not nxt or nxt == cur:
            continue
        ws.cell(r, cols["Status"]).value = nxt
        ws.cell(r, cols["LastUpdated"]).value = TODAY
        notes_cell = ws.cell(r, cols["Notes"])
        prev = str(notes_cell.value or "").strip()
        if NOTE not in prev:
            notes_cell.value = f"{prev}; {NOTE}".strip("; ") if prev else NOTE
        ev = ws.cell(r, cols["Evidence"])
        if not ev.value:
            ev.value = "Repo modules + Railway Moodle/LTI demo (2026-09-05)"
        changes[nxt] += 1
        by_product[pid][nxt] += 1

    # Refresh Product Index Done / % done / Blocked from Status counts
    # Count per product from checklist
    counts: dict[str, Counter] = defaultdict(Counter)
    totals: dict[str, int] = Counter()
    for r in range(2, ws.max_row + 1):
        if not ws.cell(r, cols["ID"]).value:
            continue
        pid = str(ws.cell(r, cols["ProductID"]).value or "").strip()
        st = str(ws.cell(r, cols["Status"]).value or "Not started")
        counts[pid][st] += 1
        totals[pid] += 1

    pi = wb["Product Index"]
    pi_hdr = [c.value for c in pi[4]]
    # Find header row — earlier inspect showed row 4 is first data with ProductID header on row 3?
    header_row = None
    for r in range(1, 10):
        vals = [c.value for c in pi[r]]
        if vals and vals[0] == "ProductID":
            header_row = r
            pi_hdr = vals
            break
    if header_row is None:
        raise SystemExit("Product Index header not found")

    pi_cols = {str(h): i + 1 for i, h in enumerate(pi_hdr) if h}
    print("PI cols", pi_cols)

    for r in range(header_row + 1, pi.max_row + 1):
        pid = pi.cell(r, pi_cols["ProductID"]).value
        if not pid:
            continue
        pid = str(pid).strip()
        done = counts[pid].get("Done", 0)
        blocked = counts[pid].get("Blocked", 0)
        total = totals.get(pid, 0) or int(pi.cell(r, pi_cols["Total"]).value or 0) or 1
        pct = round(100.0 * done / total, 1) if total else 0.0
        if "Done" in pi_cols:
            pi.cell(r, pi_cols["Done"]).value = done
        if "% done" in pi_cols:
            pi.cell(r, pi_cols["% done"]).value = pct
        if "Blocked" in pi_cols:
            pi.cell(r, pi_cols["Blocked"]).value = blocked

    # Summary sheet — update headline numbers if present as static text
    if "Summary" in wb.sheetnames:
        sm = wb["Summary"]
        # Append a progress note rather than rewriting locked structure
        # Find first empty-ish area near bottom of used rows
        note_row = sm.max_row + 2
        sm.cell(note_row, 1).value = "Codebase progress stamp"
        sm.cell(note_row + 1, 1).value = TODAY
        sm.cell(note_row + 1, 2).value = (
            f"Status updated from repo capability map: "
            f"{changes.get('Done', 0)} Done, {changes.get('In progress', 0)} In progress. "
            f"Backup: {BAK.name}"
        )

    wb.save(SRC)
    print("saved", SRC)
    print("changes", dict(changes))
    print("products touched", len(by_product))
    # Verify
    wb2 = openpyxl.load_workbook(SRC, data_only=True)
    ws2 = wb2["Master Checklist"]
    hdr2 = [c.value for c in ws2[1]]
    c2 = {str(h): i for i, h in enumerate(hdr2) if h}
    final = Counter()
    for row in ws2.iter_rows(min_row=2, values_only=True):
        if row[0]:
            final[row[c2["Status"]]] += 1
    print("final_status", dict(final))


if __name__ == "__main__":
    main()
