"""I2IDL / ADL TLA Linked Data (JSON-LD) Service.

Conforms to:
- IEEE 1484.20.3 (Standard for Learning Technology - Data Model for Reusable Competency Definitions)
- IEEE 2881 (Standard for Learning Metadata)
- ADL Total Learning Architecture (TLA) Linked Data model with Subject-Predicate-Object triples
- W3C JSON-LD 1.1 Specification.
"""
from __future__ import annotations

from typing import Any

JSONLD_CONTEXT: dict[str, Any] = {
    "@vocab": "https://w3id.org/xapi/ontology#",
    "schema": "http://schema.org/",
    "ieee1484": "https://standards.ieee.org/ieee/1484.20.3/",
    "edv": "https://edvidura.app/ontology/",
    "id": "@id",
    "type": "@type",
    "name": "schema:name",
    "description": "schema:description",
    "prerequisite": {"@id": "ieee1484:prerequisite", "@type": "@id"},
    "teaches": {"@id": "schema:teaches", "@type": "@id"},
    "isPartOf": {"@id": "schema:isPartOf", "@type": "@id"},
    "evidencedBy": {"@id": "schema:evidence", "@type": "@id"},
    "alignment": "schema:educationalAlignment",
    "competencyCategory": "ieee1484:competencyCategory",
}

# Standardized IEEE 1484.20.3 Competency Definitions
COMPETENCY_DEFINITIONS = [
    {
        "id": "urn:edvidura:competency:variables",
        "type": "ieee1484:Competency",
        "name": "Variables & Algebraic Expressions",
        "description": "Ability to identify, define, and simplify algebraic terms and variables in symbolic expressions.",
        "competencyCategory": "Mathematics",
        "prerequisite": [],
        "evidencedBy": ["urn:edvidura:quiz:rhs-c08:q1"],
    },
    {
        "id": "urn:edvidura:competency:solve-linear",
        "type": "ieee1484:Competency",
        "name": "Solving Linear Equations",
        "description": "Apply balance methods and inverse operations to isolate unknowns in single-variable linear equations.",
        "competencyCategory": "Mathematics",
        "prerequisite": ["urn:edvidura:competency:variables"],
        "evidencedBy": ["urn:edvidura:quiz:rhs-c08:q2", "urn:edvidura:quiz:rhs-c08:q3"],
    },
    {
        "id": "urn:edvidura:competency:word-problems",
        "type": "ieee1484:Competency",
        "name": "Linear Word Problems",
        "description": "Formulate mathematical equations representing real-world quantitative conditions and verify constraints.",
        "competencyCategory": "Mathematics",
        "prerequisite": ["urn:edvidura:competency:solve-linear"],
        "evidencedBy": ["urn:edvidura:quiz:rhs-c08:q4", "urn:edvidura:quiz:rhs-c08:q5"],
    },
    {
        "id": "urn:edvidura:competency:railway-safety",
        "type": "ieee1484:Competency",
        "name": "Railway Signalling & Interlocking Safety",
        "description": "Apply fail-safe principles, track circuit inspection, and absolute block system protocols.",
        "competencyCategory": "Vocational & Technical Training",
        "prerequisite": [],
        "evidencedBy": ["urn:edvidura:quiz:railways:q1"],
    },
    {
        "id": "urn:edvidura:competency:ai-literacy",
        "type": "ieee1484:Competency",
        "name": "AI Literacy & Prompt Engineering",
        "description": "Understand transformer foundations, prompt structuring, data privacy, and ethical verification.",
        "competencyCategory": "Computer Science",
        "prerequisite": [],
        "evidencedBy": ["urn:edvidura:quiz:cs-ai:q1"],
    },
]

# Educational resources linked to competencies
LEARNING_RESOURCES = [
    {
        "id": "urn:edvidura:manual:11111111-2222-3333-4444-555555555551",
        "type": "schema:Book",
        "name": "Algebra I: Foundations, Variables & Linear Equations Handbook",
        "description": "Complete interactive textbook covering algebraic foundations with PaperMorph concept checks.",
        "teaches": [
            "urn:edvidura:competency:variables",
            "urn:edvidura:competency:solve-linear",
            "urn:edvidura:competency:word-problems",
        ],
    },
    {
        "id": "urn:edvidura:manual:11111111-2222-3333-4444-555555555553",
        "type": "schema:Book",
        "name": "Indian Railways Track Maintenance & Signalling Safety Manual",
        "description": "Technical field manual for railway engineering and interlocking safety protocols.",
        "teaches": ["urn:edvidura:competency:railway-safety"],
    },
    {
        "id": "urn:edvidura:manual:11111111-2222-3333-4444-555555555554",
        "type": "schema:Book",
        "name": "Digital Literacy, AI & Cybersecurity Foundations",
        "description": "Applied computing handbook covering algorithms, neural networks, and safe online practices.",
        "teaches": ["urn:edvidura:competency:ai-literacy"],
    },
]


def get_full_graph() -> dict[str, Any]:
    """Return the complete Linked Data knowledge graph in JSON-LD format."""
    return {
        "@context": JSONLD_CONTEXT,
        "@graph": COMPETENCY_DEFINITIONS + LEARNING_RESOURCES,
    }


def get_entity(entity_type: str, entity_id: str) -> dict[str, Any] | None:
    """Resolve an individual Linked Data entity by type and identifier."""
    target_urn = (
        entity_id
        if entity_id.startswith("urn:")
        else f"urn:edvidura:{entity_type}:{entity_id}"
    )

    all_items = COMPETENCY_DEFINITIONS + LEARNING_RESOURCES
    matched = None
    for item in all_items:
        if item["id"] == target_urn or item["id"].endswith(entity_id):
            matched = item
            break

    if not matched:
        return None

    # Compute incoming links (inverse triples)
    incoming: list[dict[str, str]] = []
    for other in all_items:
        for key, val in other.items():
            if isinstance(val, list) and target_urn in val:
                incoming.append(
                    {
                        "subject": other["id"],
                        "predicate": key,
                        "subject_name": other.get("name", other["id"]),
                    }
                )
            elif val == target_urn:
                incoming.append(
                    {
                        "subject": other["id"],
                        "predicate": key,
                        "subject_name": other.get("name", other["id"]),
                    }
                )

    return {
        "@context": JSONLD_CONTEXT,
        **matched,
        "incomingLinks": incoming,
    }
