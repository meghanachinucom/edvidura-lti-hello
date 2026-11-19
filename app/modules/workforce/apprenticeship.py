"""BF-20 Apprenticeship & OJT Hours Exporter.

Tracks on-the-job training (OJT) and related technical instruction (RTI/classroom)
hours for state and national apprenticeship compliance filings without external branding.
"""

from datetime import datetime, timezone
import hashlib
import json
import os
from typing import Any, Dict, List, Optional
import uuid

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/workforce/apprenticeship", tags=["Apprenticeship & OJT Hours"])

# Default required hours standard
REQUIRED_OJT_HOURS = 2000.0
REQUIRED_CLASSROOM_HOURS = 144.0

_IN_MEMORY_FILINGS: List[Dict[str, Any]] = [
    {
        "filing_id": "file-ojt-001",
        "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "apprentice_id": "p-rajesh",
        "sponsor_id": "SPONSOR-RIVERSIDE-ELEC",
        "wage_tier": 2,
        "on_the_job_hours": 420.0,
        "classroom_hours": 64.0,
        "total_hours": 484.0,
        "compliance_status": "compliant",
        "occupation_code": "47-2111.00",  # Electrician
        "period_start": "2026-06-01",
        "period_end": "2026-09-30",
        "filing_timestamp": "2026-10-01T08:00:00Z",
        "verification_hash": "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
    },
    {
        "filing_id": "file-ojt-002",
        "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "apprentice_id": "p-priya",
        "sponsor_id": "SPONSOR-RIVERSIDE-ELEC",
        "wage_tier": 3,
        "on_the_job_hours": 860.0,
        "classroom_hours": 110.0,
        "total_hours": 970.0,
        "compliance_status": "compliant",
        "occupation_code": "47-2111.00",
        "period_start": "2026-01-01",
        "period_end": "2026-06-30",
        "filing_timestamp": "2026-07-01T08:00:00Z",
        "verification_hash": "b2c3d4e5f6a17890123456789abcdef0123456789abcdef0123456789abcdef1",
    },
]


class FilingGenerationRequest(BaseModel):
    apprentice_id: str = Field(..., description="Apprentice student identifier")
    wage_tier: int = Field(1, ge=1, le=8, description="Current wage progression tier (1-8)")
    on_the_job_hours: float = Field(..., ge=0.0, description="OJT hours for period")
    classroom_hours: float = Field(..., ge=0.0, description="Classroom / RTI instruction hours")
    sponsor_id: str = Field("SPONSOR-RIVERSIDE-ELEC", description="Apprenticeship sponsor org ID")
    occupation_code: str = Field("47-2111.00", description="Standard occupational classification")
    period_start: str = Field(..., description="Start date (YYYY-MM-DD)")
    period_end: str = Field(..., description="End date (YYYY-MM-DD)")
    tenant_id: Optional[str] = Field(None, description="Tenant UUID")


def _generate_verification_hash(data: Dict[str, Any]) -> str:
    content = json.dumps(data, sort_keys=True).encode("utf-8")
    return hashlib.sha256(content).hexdigest()


@router.post("/generate-filing")
async def generate_apprenticeship_filing(req: FilingGenerationRequest) -> Dict[str, Any]:
    filing_id = f"file-ojt-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    tenant = req.tenant_id or os.getenv("DEFAULT_TENANT_ID", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    total_hours = round(req.on_the_job_hours + req.classroom_hours, 1)

    compliance_status = "compliant" if req.on_the_job_hours >= 40.0 else "pending_hours"

    payload_for_hash = {
        "filing_id": filing_id,
        "apprentice_id": req.apprentice_id,
        "sponsor_id": req.sponsor_id,
        "total_hours": total_hours,
        "wage_tier": req.wage_tier,
        "period_start": req.period_start,
        "period_end": req.period_end,
    }
    v_hash = _generate_verification_hash(payload_for_hash)

    record = {
        "filing_id": filing_id,
        "tenant_id": tenant,
        "apprentice_id": req.apprentice_id,
        "sponsor_id": req.sponsor_id,
        "wage_tier": req.wage_tier,
        "on_the_job_hours": req.on_the_job_hours,
        "classroom_hours": req.classroom_hours,
        "total_hours": total_hours,
        "compliance_status": compliance_status,
        "occupation_code": req.occupation_code,
        "period_start": req.period_start,
        "period_end": req.period_end,
        "filing_timestamp": now_iso,
        "verification_hash": v_hash,
    }

    # Attempt Postgres insert if available
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        try:
            import psycopg2
            conn = psycopg2.connect(db_url, connect_timeout=3)
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO apprenticeship_filing_records (
                        filing_id, tenant_id, apprentice_id, wage_tier, on_the_job_hours,
                        classroom_hours, sponsor_id, occupation_code, period_start, period_end,
                        filing_timestamp, verification_hash
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        record["filing_id"], record["tenant_id"], record["apprentice_id"],
                        record["wage_tier"], record["on_the_job_hours"], record["classroom_hours"],
                        record["sponsor_id"], record["occupation_code"], record["period_start"],
                        record["period_end"], record["filing_timestamp"], record["verification_hash"]
                    )
                )
                conn.commit()
            conn.close()
        except Exception:
            pass

    _IN_MEMORY_FILINGS.insert(0, record)
    return {
        "ok": True,
        "filing": record,
        "download_url": f"/api/v1/workforce/apprenticeship/download/{filing_id}",
        "message": f"Successfully minted compliance filing {filing_id} for apprentice {req.apprentice_id}.",
    }


@router.get("/status")
async def get_apprenticeship_status(apprentice_id: Optional[str] = Query(None)) -> Dict[str, Any]:
    app_id = apprentice_id or "p-rajesh"
    filings = [f for f in _IN_MEMORY_FILINGS if f["apprentice_id"] == app_id]

    total_ojt = round(sum(f["on_the_job_hours"] for f in filings), 1)
    total_class = round(sum(f["classroom_hours"] for f in filings), 1)
    current_tier = max((f["wage_tier"] for f in filings), default=1)

    pct_complete = round(min(100.0, (total_ojt / REQUIRED_OJT_HOURS) * 100), 1)
    status_label = "in_progress" if pct_complete < 100.0 else "completed"

    return {
        "apprentice_id": app_id,
        "current_wage_tier": current_tier,
        "total_ojt_hours": total_ojt,
        "total_classroom_hours": total_class,
        "required_ojt_hours": REQUIRED_OJT_HOURS,
        "required_classroom_hours": REQUIRED_CLASSROOM_HOURS,
        "percent_complete": pct_complete,
        "status": status_label,
        "filings": filings,
    }
