"""FastAPI routes for I2IDL / ADL TLA Linked Data (JSON-LD) layer."""
from __future__ import annotations

import json
from typing import Any
from fastapi import APIRouter, HTTPException, Response

from app.modules.linked_data.service import get_entity, get_full_graph

router = APIRouter(prefix="/api/v1/ld", tags=["linked-data"])


@router.get("/graph")
def get_linked_data_graph() -> Response:
    """Return complete semantic graph in JSON-LD (application/ld+json)."""
    graph = get_full_graph()
    return Response(
        content=json.dumps(graph, indent=2),
        media_type="application/ld+json",
        headers={"Access-Control-Allow-Origin": "*"},
    )


@router.get("/entity/{entity_type}/{entity_id}")
def get_linked_data_entity(entity_type: str, entity_id: str) -> Response:
    """Return a single RDF / JSON-LD entity with incoming and outgoing triples."""
    entity = get_entity(entity_type, entity_id)
    if not entity:
        raise HTTPException(
            status_code=404,
            detail=f"Linked data entity not found: {entity_type}/{entity_id}",
        )
    return Response(
        content=json.dumps(entity, indent=2),
        media_type="application/ld+json",
        headers={"Access-Control-Allow-Origin": "*"},
    )
