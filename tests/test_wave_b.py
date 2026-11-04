"""Wave B — XR Store / assets / labs / AR / VR maintainer."""
from __future__ import annotations

from app.modules.tenancy.blocks import BLOCKS, merge_blocks
from app.modules.xr import (
    ar_assistance_pack,
    asset_configurator,
    asset_repository,
    immersive_labs,
    store_catalog,
    vr_maintainer_pack,
    wave_b_overview,
)


def test_wave_b_blocks_are_thin():
    for bid in (
        "xr_store",
        "asset_repo_3d",
        "asset_configurator_3d",
        "immersive_labs",
        "ar_assistance",
        "vr_maintainer_training",
    ):
        assert BLOCKS[bid]["state"] == "thin", bid


def test_wave_b_preset():
    result = merge_blocks("corporate", preset="wave_b_xr")
    assert "xr_store" in result["applied_blocks"]
    assert result["capabilities"]["xr_store"] is True


def test_store_catalog_and_overview():
    pack = store_catalog()
    assert pack["wave"] == "B"
    assert pack["count"] >= 4
    assert any(a["id"] == "xr-cartesian-3d" for a in pack["apps"])
    labs = immersive_labs()
    assert labs["count"] >= 1
    assets = asset_repository()
    assert assets["count"] >= 5
    cfg = asset_configurator("mesh-axes")
    assert cfg["asset"]["id"] == "mesh-axes"
    assert len(cfg["presets"]) >= 2
    ar = ar_assistance_pack()
    assert ar["count"] >= 1
    vr = vr_maintainer_pack()
    assert vr["count"] >= 1
    overview = wave_b_overview()
    assert len(overview["products"]) == 6
