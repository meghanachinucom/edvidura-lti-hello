"""Wave C — apprenticeship, continuity, sim-to-real."""
from __future__ import annotations

from app.modules.tenancy.blocks import BLOCKS, merge_blocks
from app.modules.workforce import (
    apprenticeship_board,
    continuity_tracker,
    sim_to_real_report,
    wave_c_overview,
)


def test_wave_c_blocks_are_thin():
    for bid in (
        "apprenticeship_manager",
        "qualification_continuity_tracker",
        "sim_to_real_analytics",
    ):
        assert BLOCKS[bid]["state"] == "thin", bid


def test_wave_c_preset():
    result = merge_blocks("corporate", preset="wave_c_workforce")
    caps = result["capabilities"]
    assert caps["apprenticeship"] is True
    assert caps["qualification_continuity"] is True
    assert caps["sim_to_real"] is True
    assert caps["skills_passport"] is True
    assert result["unavailable"] == []


def test_workforce_facades():
    board = apprenticeship_board()
    assert board["wave"] == "C"
    assert board["count"] >= 1
    cont = continuity_tracker()
    assert cont["due_soon"] >= 1
    sim = sim_to_real_report()
    assert sim["pair_count"] >= 1
    assert wave_c_overview()["wave"] == "C"
