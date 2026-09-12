"""ADL / TLA reference catalogue — portable (no app imports)."""
from __future__ import annotations

from typing import Any, TypedDict


class AdlRef(TypedDict):
    id: str
    name: str
    github: str
    role: str
    integrate: str  # reference | adapter | vendored | optional | out_of_scope


ADL_REFS: list[AdlRef] = [
    {
        "id": "tla_ref",
        "name": "TLA reference implementation",
        "github": "https://github.com/adlnet/tla",
        "role": "Full mesh (Keycloak, Kafka, XI, LRS, LEM) — component checklist source",
        "integrate": "reference",
    },
    {
        "id": "xi_lite",
        "name": "Experience Index Lite",
        "github": "https://github.com/adlnet/xi-lite",
        "role": "schema.org Course XI API; vendored app.js/mongo.js + Python port",
        "integrate": "vendored",
    },
    {
        "id": "elrr_docs",
        "name": "ELRR documentation",
        "github": "https://github.com/adlnet/elrr-documentation",
        "role": "Enterprise Learner Record (IEEE P2997) concepts",
        "integrate": "reference",
    },
    {
        "id": "elrr_services",
        "name": "ELRR services",
        "github": "https://github.com/adlnet/elrr-services",
        "role": "Learner API for external ELRR",
        "integrate": "optional",
    },
    {
        "id": "catapult",
        "name": "cmi5 CATAPULT",
        "github": "https://github.com/adlnet/CATAPULT",
        "role": "requirements.json vendored; player/LTS optional",
        "integrate": "vendored",
    },
    {
        "id": "xapi_spec",
        "name": "xAPI specification",
        "github": "https://github.com/adlnet/xAPI-Spec",
        "role": "Statement vocabulary; ADL verb IRIs in app.modules.xapi",
        "integrate": "adapter",
    },
]


def list_adl_refs() -> list[dict[str, Any]]:
    return [dict(r) for r in ADL_REFS]
