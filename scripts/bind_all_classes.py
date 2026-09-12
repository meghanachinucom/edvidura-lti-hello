"""Bind every Moodle Class 1–10 (+ Demo) context to EdVidura classes."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env", override=True)

from app.modules.school import (  # noqa: E402
    list_classes_with_roster,
    list_lti_context_bindings,
    set_class_course,
    upsert_lti_context_binding,
)
from app.tenancy import TENANT_A_ID  # noqa: E402

# Moodle: class01..class10 → course_id 6..15, context_id 113..122
MOODLE = [
    (1, "113", "6", "class01", "Class 1 · English & Numbers"),
    (2, "114", "7", "class02", "Class 2 · Reading & Maths"),
    (3, "115", "8", "class03", "Class 3 · Language & Maths"),
    (4, "116", "9", "class04", "Class 4 · Science & Maths"),
    (5, "117", "10", "class05", "Class 5 · General Studies"),
    (6, "118", "11", "class06", "Class 6 · Middle School Core"),
    (7, "119", "12", "class07", "Class 7 · Pre-Algebra Path"),
    (8, "120", "13", "class08", "Class 8 · Algebra I"),
    (9, "121", "14", "class09", "Class 9 · Geometry Path"),
    (10, "122", "15", "class10", "Class 10 · Advanced Maths"),
]


def main() -> None:
    classes = {c["class_code"]: c for c in list_classes_with_roster(TENANT_A_ID)}
    bound = 0
    for grade, ctx, course_id, short, full in MOODLE:
        code = f"RHS-C{grade:02d}"
        cls = classes.get(code)
        if not cls:
            print("MISSING class", code)
            continue
        if cls.get("course_id"):
            set_class_course(TENANT_A_ID, cls["id"], cls["course_id"])
        for lti_ctx, label in ((ctx, code), (course_id, short), (short, short)):
            upsert_lti_context_binding(
                TENANT_A_ID,
                lti_context_id=lti_ctx,
                class_id=cls["id"],
                course_id=cls.get("course_id"),
                context_label=label,
                context_title=full,
            )
            bound += 1
            print(f"bound {lti_ctx} -> {code}")

    c8 = classes["RHS-C08"]
    for lti_ctx, label, title in (
        ("54", "Demo", "Demo · Class 8 Algebra I"),
        ("5", "Demo", "Demo · Class 8 Algebra I"),
        ("Demo", "Demo", "Demo · Class 8 Algebra I"),
    ):
        upsert_lti_context_binding(
            TENANT_A_ID,
            lti_context_id=lti_ctx,
            class_id=c8["id"],
            course_id=c8.get("course_id"),
            context_label=label,
            context_title=title,
        )
        bound += 1
        print(f"bound {lti_ctx} -> RHS-C08 (Demo)")

    print("TOTAL upserts", bound)
    print("BIND COUNT", len(list_lti_context_bindings(TENANT_A_ID)))
    for b in sorted(
        list_lti_context_bindings(TENANT_A_ID),
        key=lambda x: (x.get("class_code") or "", x.get("lti_context_id") or ""),
    ):
        print(
            f"  {b['lti_context_id']:12} -> {b.get('class_code')} | {b.get('context_title')}"
        )


if __name__ == "__main__":
    main()
