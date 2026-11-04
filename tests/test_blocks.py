"""Lego block catalog + merge_blocks."""
from __future__ import annotations

import pytest

from app.modules.tenancy.blocks import (
    BLOCKS,
    PRESETS,
    list_blocks,
    merge_blocks,
    resolve_block_ids,
)
from app.modules.tenancy.capabilities import CAP_KEYS


def test_catalog_covers_sheet_size():
    from app.modules.tenancy.blocks import list_build_queue

    assert len(BLOCKS) >= 38
    rows = list_blocks()
    assert len(rows) == len(BLOCKS)
    assert all("state" in r and "shippable" in r and "track" in r for r in rows)
    queue = list_build_queue()
    assert queue == []
    assert any(r["id"] == "xr_store" and r["state"] == "thin" for r in rows)
    assert any(r["id"] == "apprenticeship_manager" and r["state"] == "thin" for r in rows)
    assert any(r["id"] == "sim_to_real_analytics" and r["state"] == "thin" for r in rows)
    assert any(r["id"] == "virtual_classroom" and r["track"] == "partner" for r in rows)
    assert any(r["id"] == "bits_math" and r["track"] == "content" for r in rows)


def test_presets_resolve():
    for pid in PRESETS:
        ids = resolve_block_ids(preset=pid)
        assert "lti_integration" in ids
        assert len(ids) >= 4


def test_merge_starter_enables_assessment_and_coach():
    result = merge_blocks("school", preset="classroom_starter_4")
    caps = result["capabilities"]
    assert caps["quiz_graded"] is True
    assert caps["ask_vidura"] is True
    assert caps["manuals"] is True
    assert caps["lessons"] is False
    assert caps["study_plan"] is False
    assert "assessment_tool" in result["applied_blocks"]
    assert result["unavailable"] == []


def test_merge_park_recorded_not_shipped():
    result = merge_blocks(
        "school",
        ["lti_integration", "assessment_tool", "atoms"],
    )
    assert "atoms" in result["enabled_blocks"]
    assert any(u["id"] == "atoms" for u in result["unavailable"])
    assert result["capabilities"]["quiz_graded"] is True
    assert all(k in CAP_KEYS for k in result["capabilities"])


def test_merge_wave_b_enables_xr_caps():
    result = merge_blocks("school", preset="wave_b_xr")
    caps = result["capabilities"]
    assert caps["xr_store"] is True
    assert caps["immersive_labs"] is True
    assert caps["asset_repo_3d"] is True
    assert caps["ar_assistance"] is True
    assert caps["vr_maintainer"] is True
    assert result["unavailable"] == []


def test_merge_deps_pull_spine():
    ids = resolve_block_ids(["assessment_tool"])
    assert ids.index("lms_core") < ids.index("lti_integration")
    assert ids.index("lti_integration") < ids.index("assessment_tool")


def test_unknown_block_raises():
    with pytest.raises(ValueError, match="Unknown block"):
        resolve_block_ids(["not_a_real_block"])


def test_unknown_preset_raises():
    with pytest.raises(ValueError, match="Unknown preset"):
        merge_blocks("school", preset="nope_sku")


def test_replace_false_ors_onto_segment_defaults():
    result = merge_blocks(
        "corporate",
        ["ebook_creator"],
        replace=False,
    )
    # Corporate defaults keep video_library; ebook adds manuals
    assert result["capabilities"]["video_library"] is True
    assert result["capabilities"]["manuals"] is True
    assert result["capabilities"]["quiz_graded"] is False
