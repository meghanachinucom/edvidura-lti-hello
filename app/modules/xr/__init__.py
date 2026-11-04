"""Wave B XR stack — store, 3D assets, labs, AR, VR maintainer (thin)."""

from app.modules.xr.service import (
    ar_assistance_pack,
    asset_configurator,
    asset_repository,
    immersive_labs,
    store_catalog,
    vr_maintainer_pack,
    wave_b_overview,
)

__all__ = [
    "store_catalog",
    "asset_repository",
    "asset_configurator",
    "immersive_labs",
    "ar_assistance_pack",
    "vr_maintainer_pack",
    "wave_b_overview",
]
