"""Tests for Phase 3 Open-Source AI Capabilities and Phase 4 Voice/Multilingual endpoints."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_linked_data_graph():
    """Verify IEEE 1484.20.3 / ADL TLA JSON-LD graph endpoint."""
    resp = client.get("/api/v1/ld/graph")
    assert resp.status_code == 200
    assert "application/ld+json" in resp.headers.get("content-type", "")

    data = resp.json()
    assert "@context" in data
    assert "@graph" in data
    assert len(data["@graph"]) >= 5

    # Check IEEE 1484.20.3 competency presence
    comp_ids = [item.get("id") for item in data["@graph"]]
    assert "urn:edvidura:competency:variables" in comp_ids
    assert "urn:edvidura:competency:solve-linear" in comp_ids


def test_linked_data_single_entity():
    """Verify entity lookup and incoming links."""
    resp = client.get("/api/v1/ld/entity/competency/variables")
    assert resp.status_code == 200
    assert "application/ld+json" in resp.headers.get("content-type", "")

    entity = resp.json()
    assert entity["id"] == "urn:edvidura:competency:variables"
    assert entity["type"] == "ieee1484:Competency"
    assert "incomingLinks" in entity
    # solve-linear has variables as prerequisite
    incoming_subjects = [link["subject"] for link in entity["incomingLinks"]]
    assert "urn:edvidura:competency:solve-linear" in incoming_subjects


def test_voice_cleanup_freeflow():
    """Verify FreeFlow AI voice cleanup strips fillers and formats equations."""
    resp = client.post(
        "/api/v1/app/voice/cleanup",
        json={
            "transcript": "um uh like 2 x plus 5 equals to 15 you know",
            "language": "en-IN",
        },
    )
    assert resp.status_code == 200
    res = resp.json()
    assert res.get("ok") is True
    cleaned = res["data"]["cleaned"]
    assert "um" not in cleaned.lower()
    assert "uh" not in cleaned.lower()
    assert "you know" not in cleaned.lower()
    assert "2x + 5 = 15" in cleaned


def test_deep_link_items():
    """Verify LTI 1.3 Deep Link content picker endpoint lists textbooks & quiz."""
    resp = client.get("/api/v1/app/deep-link/items")
    assert resp.status_code == 200
    res = resp.json()
    assert res.get("ok") is True
    items = res.get("items") or res.get("data", {}).get("items")
    assert len(items) >= 5
    types = {item["type"] for item in items}
    assert "manual" in types
    assert "quiz" in types
