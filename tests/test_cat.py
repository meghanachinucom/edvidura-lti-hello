"""Competency Assessment Tool F-1 (20+ bank) and F-4 (mapper)."""
from __future__ import annotations

from app.modules.skills.cat import CAT_MIN_BANK, generate_cat_bank
from app.modules.skills.mapper import extract_objectives, map_competencies_from_text

_TO = """
TO-100 Welding Safety
Terminal Objective: Demonstrate safe setup of a welding booth.
Enabling Objective EO-1.1: List the steps to inspect a regulator.
The technician shall identify PPE required for SMAW.
Competency: Arc length control during fillet welds
2. Explain polarity for DCEN and DCEP on a constant-current machine.
## Isolation of tenant data
"""


def test_extract_objectives_from_technical_order():
    rows = extract_objectives(_TO)
    labels = " ".join(r["label"].lower() for r in rows)
    assert any("welding" in r["label"].lower() or "to_100" in r["to_code"] for r in rows)
    assert "ppe" in labels or "regulator" in labels or "welding" in labels
    assert len(rows) >= 3


def test_mapper_matches_existing_skill():
    mapped = map_competencies_from_text(
        "The learner shall explain tenant isolation with Postgres RLS.\n"
        "Competency: Gradebook sync to Moodle via AGS.",
        existing=[
            {
                "id": "s1",
                "skill_code": "tenant_isolation",
                "label": "Tenant isolation",
            },
            {
                "id": "s2",
                "skill_code": "gradebook_sync",
                "label": "Gradebook sync",
            },
        ],
    )
    codes = {r["skill_code"] for r in mapped}
    assert "tenant_isolation" in codes or "gradebook_sync" in codes
    assert any(r["matched"] for r in mapped)


def test_cat_bank_is_at_least_20():
    body = (
        "Technical Order TO-200 covers LTI launch from Moodle, tenant isolation "
        "with row-level security, and Assignment and Grade Services passback.\n"
        "The technician shall inspect the launch claim before opening the tool.\n"
        "Objective: Describe how practice attempts skip the Moodle gradebook.\n"
    ) * 4
    result = generate_cat_bank(body, count=20, title="TO-200 LTI")
    assert result["min_size"] == CAT_MIN_BANK
    assert result["bank_size"] >= 20
    assert len(result["questions"]) >= 20
    assert result["review_required"] is True
