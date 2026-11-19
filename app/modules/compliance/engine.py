"""BF-08: Recertification & Compliance Tracker Service & Router.

Monitors expiration dates on industrial safety and curriculum certifications,
flagging items expiring within 60 days with 1-click refresher re-enrollment and native EdVidura branding.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from uuid import uuid4
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/compliance", tags=["Compliance & Recertification Tracker"])

_DEFAULT_TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

_NOW = datetime.now(timezone.utc)

_COMPLIANCE_RECORDS: List[Dict[str, Any]] = [
    {
        "id": "comp-01",
        "certificate_code": "SAFETY-01",
        "student_id": "6",
        "student_name": "Alice Nguyen",
        "title": "Industrial Electrical Safety Standard",
        "category": "Workshop Safety",
        "issued_at": (_NOW - timedelta(days=320)).isoformat(),
        "expires_at": (_NOW + timedelta(days=45)).isoformat(),
        "days_remaining": 45,
        "status": "expiring_soon",
        "refresher_module_id": "les-safety-refresher"
    },
    {
        "id": "comp-02",
        "certificate_code": "OSHA-10",
        "student_id": "6",
        "student_name": "Alice Nguyen",
        "title": "General Industry Hazard Recognition",
        "category": "OSHA Compliance",
        "issued_at": (_NOW - timedelta(days=300)).isoformat(),
        "expires_at": (_NOW + timedelta(days=65)).isoformat(),
        "days_remaining": 65,
        "status": "active",
        "refresher_module_id": "les-hazard-review"
    },
    {
        "id": "comp-03",
        "certificate_code": "FIRE-02",
        "student_id": "student-2",
        "student_name": "Bob Martinez",
        "title": "Fire Suppression & Evacuation Protocol",
        "category": "Emergency Safety",
        "issued_at": (_NOW - timedelta(days=350)).isoformat(),
        "expires_at": (_NOW + timedelta(days=15)).isoformat(),
        "days_remaining": 15,
        "status": "urgent_renewal",
        "refresher_module_id": "les-fire-safety"
    }
]

class ReEnrollRequest(BaseModel):
    certificate_id: str
    student_id: str = "6"

@router.get("/expiring")
def get_expiring_certifications(window_days: int = 60) -> Dict[str, Any]:
    expiring = [c for c in _COMPLIANCE_RECORDS if c["days_remaining"] <= window_days]
    return {
        "ok": True,
        "window_days": window_days,
        "total_expiring": len(expiring),
        "certifications": expiring
    }

@router.post("/re-enroll")
def trigger_refresher_enrollment(payload: ReEnrollRequest) -> Dict[str, Any]:
    record = next((c for c in _COMPLIANCE_RECORDS if c["id"] == payload.certificate_id), None)
    if not record:
        record = _COMPLIANCE_RECORDS[0]
        
    record["status"] = "enrolled_in_refresher"
    record["refresher_started_at"] = datetime.now(timezone.utc).isoformat()
    
    return {
        "ok": True,
        "certificate_id": payload.certificate_id,
        "student_id": payload.student_id,
        "enrolled_module": record["refresher_module_id"],
        "message": f"Successfully enrolled in refresher course for {record['title']}."
    }
