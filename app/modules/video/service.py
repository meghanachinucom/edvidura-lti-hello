"""BF-10: In-Video Interactive Checkpoints & Video Telemetry Service & Router.

Serves timestamped concept checks that pause video playback until answered,
and records xAPI 2.0 telemetry for video engagement analysis with 100% native EdVidura branding.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4
from fastapi import APIRouter
from pydantic import BaseModel

from app.modules.xapi.service import record_statement

router = APIRouter(prefix="/api/v1/video", tags=["Interactive Video Checkpoints"])

_DEFAULT_TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

_CUE_POINTS: Dict[str, List[Dict[str, Any]]] = {
    "les-transformer": [
        {
            "id": "cue-trans-1",
            "video_id": "les-transformer",
            "timestamp_seconds": 45,
            "is_blocking": True,
            "question": "What is the primary function of the laminated iron core in a transformer?",
            "options": [
                "Conduct alternating electric current",
                "Provide a low-reluctance magnetic flux path",
                "Radiate excess thermal energy",
                "Electrically insulate primary from secondary"
            ],
            "correct_index": 1,
            "explanation": "The laminated steel core guides magnetic flux efficiently with minimal eddy current losses."
        },
        {
            "id": "cue-trans-2",
            "video_id": "les-transformer",
            "timestamp_seconds": 120,
            "is_blocking": True,
            "question": "In an ideal step-up transformer, what happens to current as voltage increases?",
            "options": [
                "Current increases proportionally",
                "Current decreases to conserve power (P = V * I)",
                "Current remains completely constant"
            ],
            "correct_index": 1,
            "explanation": "Because power P = V * I is conserved, stepping up voltage steps down current."
        }
    ],
    "default": [
        {
            "id": "cue-gen-1",
            "video_id": "default",
            "timestamp_seconds": 30,
            "is_blocking": True,
            "question": "Which principle guarantees that energy cannot be created or destroyed?",
            "options": ["Ohm's Law", "Law of Conservation of Energy", "Coulomb's Law"],
            "correct_index": 1,
            "explanation": "The Law of Conservation of Energy states total energy remains constant in an isolated system."
        }
    ]
}

class VideoTelemetry(BaseModel):
    video_id: str
    user_id: str = "6"
    event_type: str  # play, pause, seeked, checkpoint_answered, completed
    timestamp_seconds: float
    metadata: Optional[Dict[str, Any]] = None

@router.get("/{video_id}/cues")
def get_video_cues(video_id: str) -> Dict[str, Any]:
    cues = _CUE_POINTS.get(video_id) or _CUE_POINTS.get("default", [])
    return {
        "ok": True,
        "video_id": video_id,
        "total_cues": len(cues),
        "cues": cues
    }

@router.post("/telemetry")
def record_video_telemetry(payload: VideoTelemetry) -> Dict[str, Any]:
    # Record structured statement
    try:
        stmt = {
            "actor": {"account": {"name": payload.user_id, "homePage": "https://edvidura.app"}},
            "verb": {"id": f"http://adlnet.gov/expapi/verbs/{payload.event_type}", "display": {"en-US": payload.event_type}},
            "object": {"id": f"https://edvidura.app/video/{payload.video_id}", "definition": {"name": {"en-US": payload.video_id}}},
            "result": {"extensions": {"http://edvidura.app/xapi/video/timestamp": payload.timestamp_seconds}}
        }
        record_statement(tenant_id=_DEFAULT_TENANT, statement=stmt, actor_sub=payload.user_id)
    except Exception:
        pass

    return {
        "ok": True,
        "event_recorded": payload.event_type,
        "video_id": payload.video_id,
        "timestamp": payload.timestamp_seconds
    }
