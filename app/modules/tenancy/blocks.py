"""Sellable Lego blocks — catalog, presets, and capability merge.

Full product sheet stays selectable. Only live/thin blocks flip CAP_KEYS.
Partner/park can be recorded on a tenant deal but do not unlock UI/API.
"""
from __future__ import annotations

from typing import Any, Literal

from app.modules.tenancy.capabilities import (
    CAP_KEYS,
    defaults_for_segment,
    normalize_segment,
)

BlockState = Literal["live", "thin", "partner", "park"]

# ---------------------------------------------------------------------------
# Catalog (stable ids ↔ sales sheet names)
# ---------------------------------------------------------------------------

BLOCKS: dict[str, dict[str, Any]] = {
    "lms_core": {
        "name": "LMS Core",
        "state": "live",
        "cap_keys": (),
        "depends_on": (),
        "notes": "Moodle (or peer LMS) remains gradebook of record",
    },
    "lti_integration": {
        "name": "LTI Integration",
        "state": "live",
        "cap_keys": (),
        "depends_on": ("lms_core",),
        "notes": "Spine — launch, AGS, NRPS awareness",
    },
    "virtual_classroom": {
        "name": "Virtual Classroom",
        "state": "partner",
        "cap_keys": (),
        "depends_on": ("lms_core",),
        "notes": "Partner: Moodle / BBB / Zoom — not in EdVidura binary",
    },
    "assessment_tool": {
        "name": "Assessment Tool",
        "state": "live",
        "cap_keys": ("quiz_graded", "quiz_practice"),
        "depends_on": ("lti_integration",),
    },
    "micro_learning": {
        "name": "Micro-Learning",
        "state": "thin",
        "cap_keys": ("study_plan",),
        "depends_on": ("lti_integration",),
        "notes": "DCT / adaptive micro path",
    },
    "train_the_trainer": {
        "name": "Train the Trainer",
        "state": "park",
        "cap_keys": (),
        "depends_on": ("lti_integration",),
    },
    "tla": {
        "name": "TLA",
        "state": "thin",
        "cap_keys": (),
        "depends_on": ("lti_integration", "data_ingestion"),
        "notes": "TLA-shaped catalogue / profiles — module exists",
    },
    "data_ingestion": {
        "name": "Data Ingestion",
        "state": "thin",
        "cap_keys": (),
        "depends_on": ("lti_integration",),
        "notes": "xAPI + signals + event outbox",
    },
    "competency_generation": {
        "name": "Competency Generation",
        "state": "thin",
        "cap_keys": (),
        "depends_on": ("data_ingestion",),
        "notes": "skills registry / CAT — deepen for Skills Passport",
    },
    "ple": {
        "name": "PLE",
        "state": "live",
        "cap_keys": ("study_plan", "learner_progress"),
        "depends_on": ("lti_integration",),
    },
    "pwe": {
        "name": "PWE",
        "state": "park",
        "cap_keys": (),
        "depends_on": ("ple",),
    },
    "analytics_dashboard": {
        "name": "Analytics Dashboard",
        "state": "live",
        "cap_keys": ("learner_progress",),
        "depends_on": ("data_ingestion",),
    },
    "atoms": {
        "name": "ATOMS",
        "state": "park",
        "cap_keys": (),
        "depends_on": ("lti_integration",),
    },
    "ai_content_generator": {
        "name": "AI Content Generator",
        "state": "thin",
        "cap_keys": (),
        "depends_on": ("lesson_builder",),
        "notes": "ai_assessment / ai_authoring",
    },
    "lesson_builder": {
        "name": "Lesson Builder",
        "state": "thin",
        "cap_keys": ("lessons",),
        "depends_on": ("lti_integration",),
    },
    "ebook_creator": {
        "name": "e-Book Creator",
        "state": "thin",
        "cap_keys": ("manuals",),
        "depends_on": ("lti_integration",),
        "notes": "Manuals / PeBL reader strong; creator thin",
    },
    "a_pro": {
        "name": "A-Pro",
        "state": "park",
        "cap_keys": (),
        "depends_on": ("lti_integration",),
    },
    "asset_repo_3d": {
        "name": "3D Asset Repository",
        "state": "park",
        "cap_keys": (),
        "depends_on": ("lti_integration",),
    },
    "asset_configurator_3d": {
        "name": "3D Asset Configurator",
        "state": "park",
        "cap_keys": (),
        "depends_on": ("asset_repo_3d",),
    },
    "smp_chatbot": {
        "name": "SMP Chatbot",
        "state": "live",
        "cap_keys": ("ask_vidura", "flashcards", "ghost_coach_gate"),
        "depends_on": ("lti_integration",),
        "notes": "Ask Vidura",
    },
    "coda": {
        "name": "CODA",
        "state": "park",
        "cap_keys": (),
        "depends_on": ("lti_integration",),
    },
    "ar_assistance": {
        "name": "AR Assistance",
        "state": "park",
        "cap_keys": (),
        "depends_on": ("lti_integration",),
    },
    "document_search": {
        "name": "Document Search (provisional)",
        "state": "thin",
        "cap_keys": ("ask_vidura",),
        "depends_on": ("ebook_creator",),
        "notes": "SME / RAG path",
    },
    "vr_maintainer_training": {
        "name": "VR Maintainer Training",
        "state": "park",
        "cap_keys": (),
        "depends_on": ("xr_store",),
    },
    "xr_store": {
        "name": "XR Store",
        "state": "park",
        "cap_keys": (),
        "depends_on": ("lti_integration",),
        "notes": "SPA shell only — do not demo as product",
    },
    "immersive_labs": {
        "name": "Immersive Labs",
        "state": "park",
        "cap_keys": (),
        "depends_on": ("xr_store",),
    },
    "bits_math": {
        "name": "BITS MATH",
        "state": "park",
        "cap_keys": (),
        "depends_on": ("lesson_builder",),
        "notes": "Content pack, not a platform feature",
    },
    "private_air_gapped_ai": {
        "name": "Private Air-Gapped AI Platform",
        "state": "thin",
        "cap_keys": (),
        "depends_on": ("lti_integration",),
        "notes": "Deploy topology docs; packaging to harden",
    },
    "knowledge_pro_ai": {
        "name": "Knowledge Pro AI",
        "state": "thin",
        "cap_keys": ("ask_vidura",),
        "depends_on": ("smp_chatbot", "document_search"),
    },
    "skills_passport": {
        "name": "Skills Passport",
        "state": "thin",
        "cap_keys": ("learner_progress",),
        "depends_on": ("competency_generation",),
    },
    "audit_pro": {
        "name": "AuditPro",
        "state": "park",
        "cap_keys": (),
        "depends_on": ("data_ingestion",),
        "notes": "Receipts / isolation helpers exist; product not shipped",
    },
    "eval_pro": {
        "name": "EvalPro",
        "state": "thin",
        "cap_keys": ("quiz_graded", "learner_progress"),
        "depends_on": ("assessment_tool", "analytics_dashboard"),
    },
    "grants_pro": {
        "name": "GrantsPro",
        "state": "park",
        "cap_keys": (),
        "depends_on": ("lti_integration",),
    },
    "chat_pro": {
        "name": "ChatPro",
        "state": "thin",
        "cap_keys": ("ask_vidura",),
        "depends_on": ("smp_chatbot",),
        "notes": "Ask Vidura + PeBL discuss",
    },
    "iq_review_pattern": {
        "name": "IQ review pattern",
        "state": "park",
        "cap_keys": (),
        "depends_on": ("assessment_tool",),
    },
    "sim_to_real_analytics": {
        "name": "Sim-to-Real Transfer Analytics",
        "state": "park",
        "cap_keys": (),
        "depends_on": ("analytics_dashboard", "xr_store"),
    },
    "apprenticeship_manager": {
        "name": "Apprenticeship Manager",
        "state": "park",
        "cap_keys": (),
        "depends_on": ("skills_passport",),
    },
    "qualification_continuity_tracker": {
        "name": "Qualification & Continuity Tracker",
        "state": "park",
        "cap_keys": (),
        "depends_on": ("skills_passport",),
    },
}

# Named SKU presets (not limits — any custom list is also valid).
PRESETS: dict[str, tuple[str, ...]] = {
    "classroom_starter_4": (
        "lms_core",
        "lti_integration",
        "assessment_tool",
        "smp_chatbot",
        "ebook_creator",
    ),
    "school_standard_5": (
        "lms_core",
        "lti_integration",
        "assessment_tool",
        "smp_chatbot",
        "ebook_creator",
        "ple",
    ),
    "school_pro_6": (
        "lms_core",
        "lti_integration",
        "assessment_tool",
        "smp_chatbot",
        "ebook_creator",
        "ple",
        "analytics_dashboard",
        "eval_pro",
    ),
    "adaptive_pro_8": (
        "lms_core",
        "lti_integration",
        "assessment_tool",
        "smp_chatbot",
        "ebook_creator",
        "ple",
        "analytics_dashboard",
        "eval_pro",
        "competency_generation",
        "skills_passport",
        "tla",
        "micro_learning",
        "data_ingestion",
    ),
}

_SHIPPABLE = frozenset({"live", "thin"})


def list_blocks() -> list[dict[str, Any]]:
    """Catalog rows for admin / docs (stable id order)."""
    out: list[dict[str, Any]] = []
    for bid, meta in BLOCKS.items():
        out.append(
            {
                "id": bid,
                "name": meta["name"],
                "state": meta["state"],
                "cap_keys": list(meta.get("cap_keys") or ()),
                "depends_on": list(meta.get("depends_on") or ()),
                "notes": str(meta.get("notes") or ""),
                "shippable": meta["state"] in _SHIPPABLE,
            }
        )
    return out


def list_presets() -> list[dict[str, Any]]:
    return [
        {"id": pid, "blocks": list(bids), "count": len(bids)}
        for pid, bids in PRESETS.items()
    ]


def get_block(block_id: str) -> dict[str, Any] | None:
    meta = BLOCKS.get(block_id)
    if not meta:
        return None
    return {"id": block_id, **meta}


def resolve_block_ids(
    block_ids: list[str] | tuple[str, ...] | None = None,
    *,
    preset: str | None = None,
) -> list[str]:
    """Resolve preset or explicit ids; expand depends_on; preserve catalog order."""
    if preset:
        key = str(preset).strip().lower()
        if key not in PRESETS:
            raise ValueError(f"Unknown preset '{preset}'. Known: {', '.join(PRESETS)}")
        raw = list(PRESETS[key])
    else:
        raw = [str(b).strip() for b in (block_ids or []) if str(b).strip()]

    unknown = [b for b in raw if b not in BLOCKS]
    if unknown:
        raise ValueError(f"Unknown block id(s): {', '.join(unknown)}")

    needed: set[str] = set()

    def walk(bid: str) -> None:
        if bid in needed:
            return
        meta = BLOCKS[bid]
        for dep in meta.get("depends_on") or ():
            walk(str(dep))
        needed.add(bid)

    for bid in raw:
        walk(bid)

    # Stable order: catalog declaration order
    return [bid for bid in BLOCKS if bid in needed]


def _blank_capabilities() -> dict[str, bool]:
    return {k: False for k in CAP_KEYS}


def merge_blocks(
    segment: Any,
    block_ids: list[str] | tuple[str, ...] | None = None,
    *,
    preset: str | None = None,
    replace: bool = True,
) -> dict[str, Any]:
    """Merge selected blocks into capability flags.

    replace=True (default): start from all-false, then enable live/thin caps.
    replace=False: start from segment defaults, OR live/thin caps on top.

    Partner/park ids stay in enabled_blocks and unavailable; they do not flip caps.
    """
    seg = normalize_segment(segment)
    enabled = resolve_block_ids(block_ids, preset=preset)

    if replace:
        caps = _blank_capabilities()
    else:
        caps = defaults_for_segment(seg)

    unavailable: list[dict[str, str]] = []
    warnings: list[str] = []
    applied: list[str] = []

    for bid in enabled:
        meta = BLOCKS[bid]
        state = str(meta["state"])
        if state not in _SHIPPABLE:
            unavailable.append(
                {
                    "id": bid,
                    "name": str(meta["name"]),
                    "state": state,
                }
            )
            warnings.append(
                f"{meta['name']} ({bid}) is {state} — recorded but not shippable yet"
            )
            continue
        applied.append(bid)
        for key in meta.get("cap_keys") or ():
            if key in CAP_KEYS:
                caps[key] = True

    return {
        "segment": seg,
        "enabled_blocks": enabled,
        "applied_blocks": applied,
        "capabilities": caps,
        "unavailable": unavailable,
        "warnings": warnings,
        "preset": preset,
    }


def parse_enabled_blocks(raw: Any) -> list[str]:
    """Normalize DB/JSON enabled_blocks to a clean id list (unknown dropped)."""
    if raw is None:
        return []
    if isinstance(raw, str):
        import json

        try:
            raw = json.loads(raw)
        except Exception:  # noqa: BLE001
            return []
    if not isinstance(raw, (list, tuple)):
        return []
    out: list[str] = []
    for item in raw:
        bid = str(item or "").strip()
        if bid and bid in BLOCKS and bid not in out:
            out.append(bid)
    return out


__all__ = [
    "BLOCKS",
    "PRESETS",
    "get_block",
    "list_blocks",
    "list_presets",
    "merge_blocks",
    "parse_enabled_blocks",
    "resolve_block_ids",
]
