# -*- coding: utf-8 -*-
"""Apply status colors to CrossCheck workbooks."""
from __future__ import annotations

from pathlib import Path

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

FILL = {
    "Implemented (code present)": PatternFill("solid", fgColor="D1FAE5"),
    "Implemented (accepted design)": PatternFill("solid", fgColor="DBEAFE"),
    "Not implemented": PatternFill("solid", fgColor="FFEDD5"),
    "Outside this repository": PatternFill("solid", fgColor="E5E7EB"),
}
FONT_RGB = {
    "Implemented (code present)": "065F46",
    "Implemented (accepted design)": "1E40AF",
    "Not implemented": "9A3412",
    "Outside this repository": "374151",
}
HEADER_FILL = PatternFill("solid", fgColor="111827")
HEADER_FONT = Font(color="FFFFFF", bold=True)
THIN = Border(
    left=Side(style="thin", color="E5E7EB"),
    right=Side(style="thin", color="E5E7EB"),
    top=Side(style="thin", color="E5E7EB"),
    bottom=Side(style="thin", color="E5E7EB"),
)


def style_crosscheck(ws) -> None:
    headers = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
    col = {h: i + 1 for i, h in enumerate(headers)}
    status_col = col.get("Status")
    max_row, max_col = ws.max_row, ws.max_column
    for c in range(1, max_col + 1):
        cell = ws.cell(1, c)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(wrap_text=True, vertical="center")
    for r in range(2, max_row + 1):
        status = (ws.cell(r, status_col).value or "").strip() if status_col else ""
        fill = FILL.get(status)
        rgb = FONT_RGB.get(status)
        for c in range(1, max_col + 1):
            cell = ws.cell(r, c)
            cell.border = THIN
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            if fill:
                cell.fill = fill
            if rgb and c == status_col:
                cell.font = Font(color=rgb, bold=True)
    widths = {
        "Component": 28,
        "ID": 14,
        "Feature": 42,
        "Status": 28,
        "Evidence in repository": 55,
        "What remains": 40,
        "Wave": 8,
        "Now (3 Nov 2026)": 36,
        "Now (28 Oct 2026)": 36,
        "Test URL": 45,
    }
    for h, idx in col.items():
        ws.column_dimensions[get_column_letter(idx)].width = widths.get(h, 18)
    ws.row_dimensions[1].height = 32
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(max_col)}{max_row}"


def style_summary(ws) -> None:
    if ws["A1"].value:
        ws["A1"].font = Font(size=16, bold=True, color="111827")
    if ws["A2"].value:
        ws["A2"].font = Font(color="64748B")
    for row in ws.iter_rows(min_row=1, max_row=ws.max_row, max_col=4):
        for cell in row:
            val = str(cell.value or "")
            if val in FILL:
                cell.fill = FILL[val]
                cell.font = Font(color=FONT_RGB[val], bold=True)
            cell.alignment = Alignment(wrap_text=True, vertical="top")
    for letter, w in [("A", 42), ("B", 48), ("C", 28), ("D", 55), ("F", 32), ("G", 36)]:
        ws.column_dimensions[letter].width = w
    ws["F1"] = "Legend"
    ws["F1"].font = Font(bold=True, color="111827")
    legend = [
        ("Implemented (code present)", "Mint — built in repo"),
        ("Implemented (accepted design)", "Sky — accepted design"),
        ("Not implemented", "Coral — parked / deferred"),
        ("Outside this repository", "Gray — separate product"),
    ]
    for i, (status, note) in enumerate(legend, start=2):
        a = ws.cell(i, 6, status)
        b = ws.cell(i, 7, note)
        a.fill = FILL[status]
        a.font = Font(color=FONT_RGB[status], bold=True)
        b.font = Font(color="64748B")


def main() -> None:
    candidates = [
        Path("docs/EdVidura_Requirements_CrossCheck_closed.xlsx"),
        Path("docs/EdVidura_Requirements_CrossCheck.xlsx"),
    ]
    src = next(p for p in candidates if p.exists())
    wb = openpyxl.load_workbook(src)
    style_crosscheck(wb["Cross-check"])
    if "Summary" in wb.sheetnames:
        style_summary(wb["Summary"])
    if "Waves" in wb.sheetnames:
        w = wb["Waves"]
        for c in range(1, w.max_column + 1):
            cell = w.cell(1, c)
            if cell.value:
                cell.fill = HEADER_FILL
                cell.font = HEADER_FONT
        for r in range(2, w.max_row + 1):
            for c in range(1, w.max_column + 1):
                cell = w.cell(r, c)
                cell.border = THIN
                val = str(cell.value or "")
                if val in FILL:
                    cell.fill = FILL[val]
                    cell.font = Font(color=FONT_RGB[val], bold=True)
    if "Test" in wb.sheetnames:
        t = wb["Test"]
        for c in range(1, t.max_column + 1):
            cell = t.cell(1, c)
            if cell.value:
                cell.fill = HEADER_FILL
                cell.font = HEADER_FONT

    for target in [
        Path("docs/EdVidura_Requirements_CrossCheck_styled.xlsx"),
        Path("docs/EdVidura_Requirements_CrossCheck_closed.xlsx"),
        Path("docs/EdVidura_Requirements_CrossCheck.xlsx"),
    ]:
        try:
            wb.save(target)
            print("saved", target)
        except PermissionError:
            print("LOCKED", target)


if __name__ == "__main__":
    main()
