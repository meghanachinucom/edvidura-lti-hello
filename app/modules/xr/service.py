"""Wave B XR facades — curated catalog Live (platform catalog; runtimes per deal)."""
from __future__ import annotations

import re
from typing import Any

from app.modules.xr.catalog import ASSETS_3D, CONFIG_PRESETS, STORE_APPS

_CATEGORY_RE = re.compile(r"^[a-z0-9-]{0,64}$")
_TAG_RE = re.compile(r"^[a-z0-9_-]{0,64}$")
_ASSET_ID_RE = re.compile(r"^[a-z0-9-]{0,64}$")


def _clean_category(category: str | None) -> str:
    cat = (category or "").strip().lower()[:64]
    if cat and not _CATEGORY_RE.match(cat):
        return ""
    return cat


def _clean_tag(tag: str | None) -> str:
    needle = (tag or "").strip().lower()[:64]
    if needle and not _TAG_RE.match(needle):
        return ""
    return needle


def _clean_asset_id(asset_id: str | None) -> str:
    aid = (asset_id or "").strip()[:64]
    if aid and not _ASSET_ID_RE.match(aid):
        return ""
    return aid


def store_catalog(*, category: str | None = None) -> dict[str, Any]:
    cat = _clean_category(category)
    apps = list(STORE_APPS)
    if cat and cat not in {"", "all"}:
        apps = [a for a in apps if str(a.get("category") or "") == cat]
    return {
        "product": "XR Store",
        "wave": "B",
        "state": "live",
        "count": len(apps),
        "categories": sorted({str(a["category"]) for a in STORE_APPS}),
        "apps": apps,
        "note": (
            "Live curated catalog + WebGL/WebXR launch stubs. "
            "Headset runtime binaries still ship per deal."
        ),
    }


def asset_repository(*, tag: str | None = None) -> dict[str, Any]:
    needle = _clean_tag(tag)
    assets = list(ASSETS_3D)
    if needle:
        assets = [
            a
            for a in assets
            if needle in {str(t).lower() for t in (a.get("tags") or ())}
            or needle in str(a.get("name") or "").lower()
        ]
    return {
        "product": "3D Asset Repository",
        "wave": "B",
        "state": "live",
        "count": len(assets),
        "assets": assets,
        "formats": ["glTF"],
        "note": "Shared meshes referenced by XR Store experiences.",
    }


def asset_configurator(asset_id: str | None = None) -> dict[str, Any]:
    aid = _clean_asset_id(asset_id)
    asset = next((a for a in ASSETS_3D if a["id"] == aid), None) if aid else None
    return {
        "product": "3D Asset Configurator",
        "wave": "B",
        "state": "live",
        "asset": asset,
        "presets": list(CONFIG_PRESETS),
        "knobs": ("scale", "lighting", "collision", "lod"),
        "note": "Live preset packs; full LOD editor remains a future deepen.",
    }


def immersive_labs() -> dict[str, Any]:
    labs = [a for a in STORE_APPS if a.get("kind") == "lab"]
    return {
        "product": "Immersive Labs",
        "wave": "B",
        "state": "live",
        "count": len(labs),
        "labs": labs,
        "depends_on": "xr_store",
        "note": "Experiences launched from XR Store; WebGL fallback when headset absent.",
    }


def ar_assistance_pack() -> dict[str, Any]:
    apps = [
        a
        for a in STORE_APPS
        if a.get("kind") == "ar" or a.get("compatibility", {}).get("mobileAr")
    ]
    return {
        "product": "AR Assistance",
        "wave": "B",
        "state": "live",
        "count": len(apps),
        "apps": apps,
        "modes": ("tabletop", "marker", "world"),
        "note": "AR-capable catalog entries + field assist checklist.",
        "checklist": [
            "ARKit / ARCore device approved",
            "Anchor desk / equipment in room",
            "Overlay procedure steps from SME source",
        ],
    }


def vr_maintainer_pack() -> dict[str, Any]:
    apps = [a for a in STORE_APPS if a.get("kind") == "vr_maintainer"]
    return {
        "product": "VR Maintainer Training",
        "wave": "B",
        "state": "live",
        "count": len(apps),
        "scenarios": apps,
        "procedure_steps": [
            "PPE and lockout / tagout",
            "Isolate energy sources",
            "Replace seal kit",
            "Verify and restore",
        ],
        "note": "Industrial scenario pack on XR Store runtime.",
    }


def wave_b_overview() -> dict[str, Any]:
    return {
        "wave": "B",
        "state": "live",
        "products": [
            store_catalog()["product"],
            asset_repository()["product"],
            asset_configurator()["product"],
            immersive_labs()["product"],
            ar_assistance_pack()["product"],
            vr_maintainer_pack()["product"],
        ],
        "store_apps": len(STORE_APPS),
        "assets": len(ASSETS_3D),
    }
