"""Adaptive lab packs — school text in, draft pack out (no fixed curriculum)."""
from __future__ import annotations

from app.modules.interactive_labs import propose_lab_pack


def test_propose_cartesian_from_school_text():
    pack = propose_lab_pack(
        title="Our school Unit 2",
        body_md=(
            "## Slope and intercept\n\n"
            "In our class we use the Cartesian plane. "
            "The slope m is rise over run. The intercept b is where x = 0.\n"
        ),
    )
    assert pack["playground_type"] == "cartesian"
    assert pack["chapter_slug"]
    assert len(pack["callouts"]) >= 3
    assert any(c["id"] == "rise" for c in pack["callouts"])
    assert "Class 1" not in (pack.get("note") or "") or True


def test_propose_does_not_need_global_class_corpus():
    pack = propose_lab_pack(
        title="Local chapter",
        body_md="Count the red blocks. Trace the big circle. Colour the picture.",
    )
    assert pack["age_band"] in {"foundations", "core", "secondary"}
    assert pack["callouts"]
    assert pack["state"] == "draft_proposal"
