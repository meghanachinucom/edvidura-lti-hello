"""Wave B XR facades — catalog + thin product packs (no FastAPI)."""
from __future__ import annotations

from typing import Any

from app.modules.xr.catalog import ASSETS_3D, CONFIG_PRESETS, STORE_APPS


def store_catalog(*, category: str | None = None) -> dict[str, Any]:
    cat = (category or "").strip().lower()
    apps = list(STORE_APPS)
    if cat and cat not in {"", "all"}:
        apps = [a for a in apps if str(a.get("category") or "") == cat]
    return {
        "product": "XR Store",
        "wave": "B",
        "state": "thin",
        "count": len(apps),
        "categories": sorted({str(a["category"]) for a in STORE_APPS}),
        "apps": apps,
        "note": "Thin Wave B: curated catalog + WebGL/WebXR launch stubs. Runtime binaries ship per deal.",
    }


def asset_repository(*, tag: str | None = None) -> dict[str, Any]:
    needle = (tag or "").strip().lower()
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
        "state": "thin",
        "count": len(assets),
        "assets": assets,
        "formats": ["glTF"],
        "note": "Shared meshes referenced by XR Store experiences.",
    }


def asset_configurator(asset_id: str | None = None) -> dict[str, Any]:
    aid = (asset_id or "").strip()
    asset = next((a for a in ASSETS_3D if a["id"] == aid), None) if aid else None
    return {
        "product": "3D Asset Configurator",
        "wave": "B",
        "state": "thin",
        "asset": asset,
        "presets": list(CONFIG_PRESETS),
        "knobs": ("scale", "lighting", "collision", "lod"),
        "note": "Thin: preset packs only — full LOD editor is Live-track.",
    }


def immersive_labs() -> dict[str, Any]:
    labs = [a for a in STORE_APPS if a.get("kind") == "lab"]
    return {
        "product": "Immersive Labs",
        "wave": "B",
        "state": "thin",
        "count": len(labs),
        "labs": labs,
        "depends_on": "xr_store",
        "note": "Experiences launched from XR Store; WebGL fallback when headset absent.",
    }


def ar_assistance_pack() -> dict[str, Any]:
    apps = [a for a in STORE_APPS if a.get("kind") == "ar" or a.get("compatibility", {}).get("mobileAr")]
    return {
        "product": "AR Assistance",
        "wave": "B",
        "state": "thin",
        "count": len(apps),
        "apps": apps,
        "modes": ("tabletop", "marker", "world"),
        "note": "Thin: AR-capable catalog entries + field assist checklist.",
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
        "state": "thin",
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
        "state": "thin",
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
