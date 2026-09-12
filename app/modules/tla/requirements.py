"""TLA CMM requirements at all levels — portable (no app imports).

Levels follow ADL Total Learning Architecture Capability Maturity Model
guidance (CMM 1–4) plus the adlnet/tla reference component checklist.
"""
from __future__ import annotations

from typing import Any, Literal, TypedDict

Status = Literal["complete", "partial", "not_started", "out_of_scope"]


class Requirement(TypedDict):
    id: str
    level: str
    cmm: int
    title: str
    adl_component: str
    adl_refs: list[str]
    description: str
    evidence_key: str


REQUIREMENTS: list[Requirement] = [
    # —— CMM 1: Data foundation ——
    {
        "id": "tla.cmm1.xapi_emit",
        "level": "CMM-1 Data",
        "cmm": 1,
        "title": "Emit conformant xAPI statements",
        "adl_component": "xAPI",
        "adl_refs": ["xapi_spec"],
        "description": "Learning events use ADL verb/activity IRIs; statements stored.",
        "evidence_key": "xapi_emit",
    },
    {
        "id": "tla.cmm1.lrs",
        "level": "CMM-1 Data",
        "cmm": 1,
        "title": "LRS store or forward",
        "adl_component": "LRS",
        "adl_refs": ["tla_ref", "xapi_spec"],
        "description": "Local statement store and/or HTTP forward to an external LRS.",
        "evidence_key": "lrs",
    },
    # —— CMM 2: Index + profile + content ——
    {
        "id": "tla.cmm2.experience_index",
        "level": "CMM-2 Index",
        "cmm": 2,
        "title": "Experience Index (XI) metadata API",
        "adl_component": "adl-xi / xi-lite",
        "adl_refs": ["xi_lite", "tla_ref"],
        "description": "schema.org Course entries queryable by competency + url (xi-lite contract).",
        "evidence_key": "experience_index",
    },
    {
        "id": "tla.cmm2.activity_stream",
        "level": "CMM-2 Index",
        "cmm": 2,
        "title": "Actor experience / activity stream",
        "adl_component": "LEM resolver patterns",
        "adl_refs": ["tla_ref"],
        "description": "Per-actor statement projection from stored xAPI.",
        "evidence_key": "activity_stream",
    },
    {
        "id": "tla.cmm2.catalogue",
        "level": "CMM-2 Content",
        "cmm": 2,
        "title": "Content / course catalogue",
        "adl_component": "adl-content",
        "adl_refs": ["tla_ref"],
        "description": "Published learning opportunities as catalogue entries.",
        "evidence_key": "catalogue",
    },
    {
        "id": "tla.cmm2.learner_profile",
        "level": "CMM-2 Profile",
        "cmm": 2,
        "title": "Basic learner profile",
        "adl_component": "adl-lem/profile",
        "adl_refs": ["tla_ref", "elrr_docs"],
        "description": "Per-learner analytics + competency projection (LMS subject).",
        "evidence_key": "learner_profile",
    },
    {
        "id": "tla.cmm2.auth",
        "level": "CMM-2 Auth",
        "cmm": 2,
        "title": "Enterprise auth for tool access",
        "adl_component": "adl-auth (Keycloak) / LTI 1.3",
        "adl_refs": ["tla_ref"],
        "description": "Trusted launch identity. EdVidura uses LTI 1.3 instead of Keycloak SSO.",
        "evidence_key": "auth",
    },
    # —— CMM 3: Competency-based ——
    {
        "id": "tla.cmm3.competency",
        "level": "CMM-3 Competency",
        "cmm": 3,
        "title": "Competency registry + assessments",
        "adl_component": "Competency processor",
        "adl_refs": ["tla_ref"],
        "description": "Skills registry, competency xAPI, gap/difference paths.",
        "evidence_key": "competency",
    },
    {
        "id": "tla.cmm3.elrr",
        "level": "CMM-3 Record",
        "cmm": 3,
        "title": "ELRR / P2997 learner record",
        "adl_component": "ELRR services",
        "adl_refs": ["elrr_docs", "elrr_services"],
        "description": "Enterprise learner record sync (external ELRR).",
        "evidence_key": "elrr",
    },
    {
        "id": "tla.cmm3.cmi5",
        "level": "CMM-3 Launch",
        "cmm": 3,
        "title": "cmi5 package launch + requirements",
        "adl_component": "CATAPULT",
        "adl_refs": ["catapult"],
        "description": "Vendored CATAPULT requirements.json; player runtime optional.",
        "evidence_key": "cmi5",
    },
    {
        "id": "tla.cmm3.lem",
        "level": "CMM-3 LEM",
        "cmm": 3,
        "title": "Learning Effector Manager services",
        "adl_component": "adl-lem",
        "adl_refs": ["tla_ref"],
        "description": "Goals, scheduler, assertion generator (full LEM suite).",
        "evidence_key": "lem",
    },
    # —— CMM 4: Mesh ——
    {
        "id": "tla.cmm4.bus",
        "level": "CMM-4 Mesh",
        "cmm": 4,
        "title": "Enterprise event bus (Kafka-style)",
        "adl_component": "adl-kafka",
        "adl_refs": ["tla_ref"],
        "description": "Streaming learning events across systems. SaaS uses HTTP outbox.",
        "evidence_key": "bus",
    },
    {
        "id": "tla.cmm4.federation",
        "level": "CMM-4 Mesh",
        "cmm": 4,
        "title": "Cross-org federation",
        "adl_component": "TLA enclave mesh",
        "adl_refs": ["tla_ref", "elrr_docs"],
        "description": "Multi-organization profile/experience mesh.",
        "evidence_key": "federation",
    },
]


EDVIDURA_EVIDENCE: dict[str, Status] = {
    "xapi_emit": "complete",
    "lrs": "partial",
    "experience_index": "partial",  # xi-lite contract implemented in-process
    "activity_stream": "partial",
    "catalogue": "partial",
    "learner_profile": "partial",
    "auth": "complete",  # LTI 1.3
    "competency": "partial",
    "elrr": "not_started",
    "cmi5": "partial",  # requirements.json vendored; no player
    "lem": "not_started",
    "bus": "partial",
    "federation": "out_of_scope",
}


def assess_requirements(
    evidence: dict[str, Status] | None = None,
) -> dict[str, Any]:
    """Return a portable maturity report with per-CMM rollups."""
    ev = dict(EDVIDURA_EVIDENCE if evidence is None else evidence)
    items: list[dict[str, Any]] = []
    counts: dict[str, int] = {
        "complete": 0,
        "partial": 0,
        "not_started": 0,
        "out_of_scope": 0,
    }
    by_cmm: dict[int, dict[str, int]] = {
        1: dict(counts),
        2: dict(counts),
        3: dict(counts),
        4: dict(counts),
    }
    for req in REQUIREMENTS:
        status = ev.get(req["evidence_key"], "not_started")
        if status not in counts:
            status = "not_started"
        counts[status] += 1
        by_cmm[req["cmm"]][status] += 1
        items.append(
            {
                "id": req["id"],
                "level": req["level"],
                "cmm": req["cmm"],
                "title": req["title"],
                "adl_component": req["adl_component"],
                "status": status,
                "adl_refs": list(req["adl_refs"]),
                "description": req["description"],
            }
        )
    scored = counts["complete"] + counts["partial"] + counts["not_started"]
    weight = counts["complete"] + 0.5 * counts["partial"]
    maturity_pct = round(100.0 * weight / scored, 1) if scored else 0.0

    cmm_summary = []
    for level in (1, 2, 3, 4):
        c = by_cmm[level]
        s = c["complete"] + c["partial"] + c["not_started"]
        w = c["complete"] + 0.5 * c["partial"]
        cmm_summary.append(
            {
                "cmm": level,
                "counts": c,
                "maturity_pct": round(100.0 * w / s, 1) if s else 0.0,
            }
        )

    return {
        "schema": "edvidura.tla.requirements.v2",
        "counts": counts,
        "maturity_pct": maturity_pct,
        "by_cmm": cmm_summary,
        "requirements": items,
    }
