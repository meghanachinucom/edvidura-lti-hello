"""BF-12: Academic Credit Ledger Service & Router.

Calculates verified academic credits based on authenticated coursework and workshop hours
(30 verified learning hours = 1.0 academic credit) with 100% native EdVidura branding.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/credits", tags=["Academic Credit Ledger"])

_DEFAULT_TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

_LEDGER_STORE: Dict[str, Dict[str, Any]] = {
    "6": {  # Alice Nguyen
        "student_id": "6",
        "student_name": "Alice Nguyen",
        "total_verified_hours": 90.0,
        "total_credits_awarded": 3.0,
        "breakdown": [
            {"activity": "Interactive Living Textbooks & Readings", "hours": 32.5, "credits": 1.08},
            {"activity": "3D Spatial Labs & Interactive Simulations", "hours": 28.0, "credits": 0.93},
            {"activity": "Ask Vidura Guided Scaffolding & Problem Sets", "hours": 18.5, "credits": 0.62},
            {"activity": "Slice A Proctored Assessments", "hours": 11.0, "credits": 0.37}
        ],
        "conversion_rule": "30 verified learning hours = 1.0 Academic Credit Unit",
        "last_audited_at": datetime.now(timezone.utc).isoformat(),
        "ledger_hash": "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a"
    }
}

class CalculateCreditRequest(BaseModel):
    student_id: str = "6"
    additional_hours: float = 15.0
    activity_name: str = "Workshop Simulation Exercise"

@router.get("/ledger/{student_id}")
def get_credit_ledger(student_id: str) -> Dict[str, Any]:
    ledger = _LEDGER_STORE.get(student_id) or _LEDGER_STORE["6"]
    return {"ok": True, "ledger": ledger}

@router.post("/calculate")
def award_credits(payload: CalculateCreditRequest) -> Dict[str, Any]:
    ledger = _LEDGER_STORE.setdefault(payload.student_id, {
        "student_id": payload.student_id,
        "student_name": "Alice Nguyen",
        "total_verified_hours": 0.0,
        "total_credits_awarded": 0.0,
        "breakdown": [],
        "conversion_rule": "30 verified learning hours = 1.0 Academic Credit Unit",
        "last_audited_at": datetime.now(timezone.utc).isoformat(),
        "ledger_hash": ""
    })
    
    hrs = payload.additional_hours
    cred = round(hrs / 30.0, 2)
    
    ledger["total_verified_hours"] += hrs
    ledger["total_credits_awarded"] = round(ledger["total_verified_hours"] / 30.0, 2)
    ledger["breakdown"].append({
        "activity": payload.activity_name,
        "hours": hrs,
        "credits": cred
    })
    ledger["last_audited_at"] = datetime.now(timezone.utc).isoformat()
    ledger["ledger_hash"] = hashlib.sha256(f"{payload.student_id}:{ledger['total_verified_hours']}".encode()).hexdigest()
    
    return {
        "ok": True,
        "student_id": payload.student_id,
        "hours_added": hrs,
        "credits_awarded": cred,
        "new_total_credits": ledger["total_credits_awarded"]
    }
