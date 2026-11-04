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
        "state": "thin",
        "cap_keys": ("asset_repo_3d",),
        "depends_on": ("lti_integration", "xr_store"),
        "notes": "Wave B — shared glTF catalog for XR experiences",
    },
    "asset_configurator_3d": {
        "name": "3D Asset Configurator",
        "state": "thin",
        "cap_keys": ("asset_configurator_3d",),
        "depends_on": ("asset_repo_3d",),
        "notes": "Wave B — scale / lighting / collision presets",
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
        "state": "thin",
        "cap_keys": ("ar_assistance",),
        "depends_on": ("xr_store", "asset_repo_3d"),
        "notes": "Wave B — AR-capable store apps + field checklist",
    },
    "document_search": {
        "name": "Document Search (provisional)",
        "state": "thin",
        "cap_keys": ("document_search", "ask_vidura"),
        "depends_on": ("ebook_creator",),
        "notes": "Wave A — SME index search over approved manuals",
    },
    "vr_maintainer_training": {
        "name": "VR Maintainer Training",
        "state": "thin",
        "cap_keys": ("vr_maintainer",),
        "depends_on": ("xr_store", "immersive_labs"),
        "notes": "Wave B — industrial procedure scenario on XR runtime",
    },
    "xr_store": {
        "name": "XR Store",
        "state": "thin",
        "cap_keys": ("xr_store",),
        "depends_on": ("lti_integration",),
        "notes": "Wave B — curated catalog + SPA launch surface",
    },
    "immersive_labs": {
        "name": "Immersive Labs",
        "state": "thin",
        "cap_keys": ("immersive_labs",),
        "depends_on": ("xr_store",),
        "notes": "Wave B — lab experiences from XR Store",
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
        "cap_keys": ("airgap_pack",),
        "depends_on": ("lti_integration",),
        "notes": "Wave A — pack checklist + AIRGAP_PACK.md ship kit",
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
        "cap_keys": ("skills_passport", "learner_progress"),
        "depends_on": ("competency_generation",),
        "notes": "Wave A — passport_summary + Progress Skills tab",
    },
    "audit_pro": {
        "name": "AuditPro",
        "state": "thin",
        "cap_keys": ("audit_pro",),
        "depends_on": ("data_ingestion", "assessment_tool"),
        "notes": "Wave A — sealed grade receipts trail for teachers",
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
        "state": "thin",
        "cap_keys": ("iq_review",),
        "depends_on": ("assessment_tool",),
        "notes": "Wave A — item correct-rate flags (too hard / too easy)",
    },
    "sim_to_real_analytics": {
        "name": "Sim-to-Real Transfer Analytics",
        "state": "thin",
        "cap_keys": ("sim_to_real",),
        "depends_on": ("analytics_dashboard", "xr_store"),
        "notes": "Wave C — XR vs observed score transfer gaps",
    },
    "apprenticeship_manager": {
        "name": "Apprenticeship Manager",
        "state": "thin",
        "cap_keys": ("apprenticeship",),
        "depends_on": ("skills_passport",),
        "notes": "Wave C — mentor/apprentice board + hours",
    },
    "qualification_continuity_tracker": {
        "name": "Qualification & Continuity Tracker",
        "state": "thin",
        "cap_keys": ("qualification_continuity",),
        "depends_on": ("skills_passport",),
        "notes": "Wave C — credential currency / renewal board",
    },
}

_SHIPPABLE = frozenset({"live", "thin"})

# Step 3 ranking — see docs/BLOCKS_QUEUE.md
# track: shipped | in_house | partner | content | research
# queue: lower = sooner (in_house only)
_TRACK: dict[str, str] = {
    # Partner forever (incl. LMS spine owned outside EdVidura)
    "lms_core": "partner",
    "virtual_classroom": "partner",
    "grants_pro": "partner",
    # Content packs
    "bits_math": "content",
    "train_the_trainer": "content",
    # Research — no brief
    "pwe": "research",
    "atoms": "research",
    "a_pro": "research",
    "coda": "research",
    # In-house queue empty — Waves A–C thin; remaining = partner/content/research
}

_QUEUE: dict[str, int] = {}


def _track_for(block_id: str, state: str) -> str:
    if block_id in _TRACK:
        return _TRACK[block_id]
    if state in _SHIPPABLE:
        return "shipped"
    if state == "partner":
        return "partner"
    return "research"


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
        "audit_pro",
        "iq_review_pattern",
        "document_search",
    ),
    "wave_a_pack": (
        "lms_core",
        "lti_integration",
        "assessment_tool",
        "skills_passport",
        "audit_pro",
        "iq_review_pattern",
        "document_search",
        "private_air_gapped_ai",
        "data_ingestion",
        "ebook_creator",
        "smp_chatbot",
    ),
    "wave_b_xr": (
        "lms_core",
        "lti_integration",
        "xr_store",
        "asset_repo_3d",
        "asset_configurator_3d",
        "immersive_labs",
        "ar_assistance",
        "vr_maintainer_training",
    ),
    "wave_c_workforce": (
        "lms_core",
        "lti_integration",
        "skills_passport",
        "apprenticeship_manager",
        "qualification_continuity_tracker",
        "analytics_dashboard",
        "xr_store",
        "sim_to_real_analytics",
        "assessment_tool",
        "eval_pro",
    ),
}


def list_blocks() -> list[dict[str, Any]]:
    """Catalog rows for admin / docs (stable id order)."""
    out: list[dict[str, Any]] = []
    for bid, meta in BLOCKS.items():
        state = str(meta["state"])
        track = _track_for(bid, state)
        out.append(
            {
                "id": bid,
                "name": meta["name"],
                "state": state,
                "track": track,
                "queue": _QUEUE.get(bid),
                "cap_keys": list(meta.get("cap_keys") or ()),
                "depends_on": list(meta.get("depends_on") or ()),
                "notes": str(meta.get("notes") or ""),
                "shippable": state in _SHIPPABLE,
            }
        )
    return out


def list_build_queue() -> list[dict[str, Any]]:
    """In-house Park items ordered by queue (Step 3)."""
    rows = [b for b in list_blocks() if b.get("track") == "in_house"]
    rows.sort(key=lambda r: (r.get("queue") is None, r.get("queue") or 999, r["id"]))
    return rows


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
    "list_build_queue",
    "list_presets",
    "merge_blocks",
    "parse_enabled_blocks",
    "resolve_block_ids",
]
