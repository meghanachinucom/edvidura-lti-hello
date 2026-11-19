"""BF-19 Sim-to-Real Transfer Benchmark Ledger.

Tracks and benchmarks learner performance transition from virtual 3D simulations
to hands-on physical workshop tasks without exposing any external simulator brands.
"""

from datetime import datetime, timezone
import os
from typing import Any, Dict, List, Optional
import uuid

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/workforce", tags=["Workforce & Sim-to-Real Transfer"])

# Dual-mode persistence: live Postgres or thread-safe in-memory store
_IN_MEMORY_TRANSFERS: List[Dict[str, Any]] = [
    {
        "id": "trans-001",
        "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "student_id": "p-rajesh",
        "simulation_id": "sim-electrical-01",
        "physical_task_id": "phys-earthing-rig-01",
        "sim_score": 92.0,
        "real_score": 88.5,
        "transfer_delta": -3.5,
        "efficiency_ratio": 0.962,
        "readiness_tier": "certified",
        "evaluator_id": "TCH-01",
        "notes": "Excellent circuit continuity demonstration on physical earthing electrode.",
        "created_at": "2026-10-24T10:30:00Z",
    },
    {
        "id": "trans-002",
        "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "student_id": "p-priya",
        "simulation_id": "sim-motor-wiring-02",
        "physical_task_id": "phys-3phase-stator-02",
        "sim_score": 85.0,
        "real_score": 82.0,
        "transfer_delta": -3.0,
        "efficiency_ratio": 0.965,
        "readiness_tier": "certified",
        "evaluator_id": "TCH-02",
        "notes": "Handled phase reversal check safely in workshop test rig.",
        "created_at": "2026-10-24T11:15:00Z",
    },
]


class TransferLogRequest(BaseModel):
    student_id: str = Field(..., description="Student identifier")
    simulation_id: str = Field(..., description="Virtual simulation identifier")
    physical_task_id: str = Field(..., description="Workshop task identifier")
    sim_score: float = Field(..., ge=0.0, le=100.0, description="Virtual lab score (0-100)")
    real_score: float = Field(..., ge=0.0, le=100.0, description="Physical workshop score (0-100)")
    transfer_delta: Optional[float] = Field(None, description="Difference (real - sim)")
    evaluator_id: str = Field("TCH-01", description="Master trainer or evaluator ID")
    notes: Optional[str] = Field(None, description="Evaluator observation notes")
    tenant_id: Optional[str] = Field(None, description="Tenant UUID")


def _calculate_readiness_tier(real_score: float, efficiency_ratio: float) -> str:
    if real_score >= 80.0 and efficiency_ratio >= 0.85:
        return "certified"
    elif real_score >= 60.0:
        return "supervised"
    return "needs_remediation"


@router.post("/transfer-log")
async def log_transfer_benchmark(req: TransferLogRequest) -> Dict[str, Any]:
    transfer_id = f"trans-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    tenant = req.tenant_id or os.getenv("DEFAULT_TENANT_ID", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

    delta = req.transfer_delta if req.transfer_delta is not None else round(req.real_score - req.sim_score, 2)
    eff_ratio = round(req.real_score / req.sim_score, 3) if req.sim_score > 0 else 0.0
    tier = _calculate_readiness_tier(req.real_score, eff_ratio)

    record = {
        "id": transfer_id,
        "tenant_id": tenant,
        "student_id": req.student_id,
        "simulation_id": req.simulation_id,
        "physical_task_id": req.physical_task_id,
        "sim_score": req.sim_score,
        "real_score": req.real_score,
        "transfer_delta": delta,
        "efficiency_ratio": eff_ratio,
        "readiness_tier": tier,
        "evaluator_id": req.evaluator_id,
        "notes": req.notes or "",
        "created_at": now_iso,
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
                    INSERT INTO sim_to_real_transfers (
                        id, tenant_id, student_id, simulation_id, physical_task_id,
                        sim_score, real_score, transfer_delta, evaluator_id, notes, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        record["id"], record["tenant_id"], record["student_id"],
                        record["simulation_id"], record["physical_task_id"],
                        record["sim_score"], record["real_score"], record["transfer_delta"],
                        record["evaluator_id"], record["notes"], record["created_at"]
                    )
                )
                conn.commit()
            conn.close()
        except Exception:
            pass

    _IN_MEMORY_TRANSFERS.insert(0, record)
    return {
        "ok": True,
        "transfer": record,
        "message": f"Successfully recorded transfer benchmark for student {req.student_id} ({tier}).",
    }


@router.get("/transfer-report")
async def get_transfer_report(student_id: Optional[str] = Query(None)) -> Dict[str, Any]:
    records = _IN_MEMORY_TRANSFERS
    if student_id:
        records = [r for r in records if r["student_id"] == student_id]

    if not records:
        return {
            "student_id": student_id or "all",
            "count": 0,
            "average_sim_score": 0.0,
            "average_real_score": 0.0,
            "average_transfer_delta": 0.0,
            "readiness_index": 0.0,
            "records": [],
        }

    count = len(records)
    avg_sim = round(sum(r["sim_score"] for r in records) / count, 1)
    avg_real = round(sum(r["real_score"] for r in records) / count, 1)
    avg_delta = round(sum(r["transfer_delta"] for r in records) / count, 1)
    readiness_idx = round(avg_real / avg_sim, 2) if avg_sim > 0 else 1.0

    return {
        "student_id": student_id or "all",
        "count": count,
        "average_sim_score": avg_sim,
        "average_real_score": avg_real,
        "average_transfer_delta": avg_delta,
        "readiness_index": readiness_idx,
        "records": records,
    }
