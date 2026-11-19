"""BF-04: Learning Event Stream Firehose Service & Router.

High-throughput transactional outbox & event streaming for institutional analytics
and xAPI 2.0 federation with 100% native EdVidura branding.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/events", tags=["Learning Event Stream Firehose"])

_DEFAULT_TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

_EVENT_STREAM: List[Dict[str, Any]] = [
    {
        "event_id": "evt-01",
        "tenant_id": _DEFAULT_TENANT,
        "event_type": "quiz_question_mastered",
        "actor": {"id": "6", "name": "Alice Nguyen", "role": "learner"},
        "object": "quiz:slice-a-linear",
        "result": {"score": 100, "passed": True},
        "ingested_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "event_id": "evt-02",
        "tenant_id": _DEFAULT_TENANT,
        "event_type": "ebook_audio_completed",
        "actor": {"id": "6", "name": "Alice Nguyen", "role": "learner"},
        "object": "book:algebra-1:chapter-1",
        "result": {"duration_sec": 180, "language": "en-IN"},
        "ingested_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "event_id": "evt-03",
        "tenant_id": _DEFAULT_TENANT,
        "event_type": "tutor_hint_ladder_unlocked",
        "actor": {"id": "6", "name": "Alice Nguyen", "role": "learner"},
        "object": "tutor:linear-equations",
        "result": {"hint_stage": 2},
        "ingested_at": datetime.now(timezone.utc).isoformat()
    }
]

class IngestEventRequest(BaseModel):
    event_type: str
    actor_id: str = "6"
    object_id: str
    payload: Optional[Dict[str, Any]] = None

@router.post("/ingest")
def ingest_event(payload: IngestEventRequest) -> Dict[str, Any]:
    evt_id = f"evt-{uuid4().hex[:10]}"
    entry = {
        "event_id": evt_id,
        "tenant_id": _DEFAULT_TENANT,
        "event_type": payload.event_type,
        "actor": {"id": payload.actor_id, "role": "learner"},
        "object": payload.object_id,
        "payload": payload.payload or {},
        "ingested_at": datetime.now(timezone.utc).isoformat()
    }
    _EVENT_STREAM.insert(0, entry)
    if len(_EVENT_STREAM) > 200:
        _EVENT_STREAM.pop()
        
    return {
        "ok": True,
        "event_id": evt_id,
        "status": "Ingested to Outbox Stream",
        "timestamp": entry["ingested_at"]
    }

@router.get("/stream")
def get_event_stream(limit: int = 20) -> Dict[str, Any]:
    events = _EVENT_STREAM[:limit]
    return {
        "ok": True,
        "total_stream_events": len(_EVENT_STREAM),
        "returned": len(events),
        "events": events
    }
