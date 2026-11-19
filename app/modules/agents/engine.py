"""BF-01: Automated Intervention Rules Engine Service & Router.

Evaluates student telemetry against configurable intervention conditions (e.g., score < 60%
OR days inactive >= 3) and unlocks targeted tutoring scaffolding with 100% native EdVidura branding.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/agents", tags=["Automated Intervention Rules Engine"])

_DEFAULT_TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

_RULES_STORE: List[Dict[str, Any]] = [
    {
        "id": "rule-01",
        "tenant_id": _DEFAULT_TENANT,
        "rule_name": "Low Quiz Score Scaffolding",
        "metric": "quiz_score",
        "operator": "<",
        "threshold": 60,
        "action_type": "unlock_guided_tutoring",
        "action_payload": {"coach_module": "linear-equations", "hint_level": "worked_example"},
        "is_active": True,
        "trigger_count": 8,
        "last_evaluated_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "rule-02",
        "tenant_id": _DEFAULT_TENANT,
        "rule_name": "3-Day Inactivity Retention Prompt",
        "metric": "days_inactive",
        "operator": ">=",
        "threshold": 3,
        "action_type": "send_practice_nudge",
        "action_payload": {"notification": "Keep your Riverside High streak alive with a 2-min concept reel!"},
        "is_active": True,
        "trigger_count": 5,
        "last_evaluated_at": datetime.now(timezone.utc).isoformat()
    }
]

class RuleCreate(BaseModel):
    rule_name: str
    metric: str  # quiz_score, days_inactive, lab_completion
    operator: str  # <, <=, >, >=, ==
    threshold: float
    action_type: str = "unlock_guided_tutoring"
    action_payload: Optional[Dict[str, Any]] = None

class EvaluateAgentRequest(BaseModel):
    user_id: str = "6"
    metrics: Dict[str, float]  # e.g. {"quiz_score": 52.0, "days_inactive": 1}

@router.get("/status")
def get_agents_status() -> Dict[str, Any]:
    active_count = sum(1 for r in _RULES_STORE if r["is_active"])
    total_triggered = sum(r["trigger_count"] for r in _RULES_STORE)
    return {
        "ok": True,
        "total_rules": len(_RULES_STORE),
        "active_rules": active_count,
        "total_interventions_triggered": total_triggered,
        "rules": _RULES_STORE
    }

@router.post("/rules")
def create_intervention_rule(payload: RuleCreate) -> Dict[str, Any]:
    rule_id = f"rule-{uuid4().hex[:8]}"
    rec = {
        "id": rule_id,
        "tenant_id": _DEFAULT_TENANT,
        "rule_name": payload.rule_name,
        "metric": payload.metric,
        "operator": payload.operator,
        "threshold": payload.threshold,
        "action_type": payload.action_type,
        "action_payload": payload.action_payload or {},
        "is_active": True,
        "trigger_count": 0,
        "last_evaluated_at": datetime.now(timezone.utc).isoformat()
    }
    _RULES_STORE.append(rec)
    return {"ok": True, "created_rule": rec}

@router.post("/evaluate")
def evaluate_student_rules(payload: EvaluateAgentRequest) -> Dict[str, Any]:
    triggered = []
    
    for r in _RULES_STORE:
        if not r["is_active"]:
            continue
        m = r["metric"]
        if m in payload.metrics:
            val = payload.metrics[m]
            thresh = r["threshold"]
            op = r["operator"]
            
            cond_met = False
            if op == "<" and val < thresh: cond_met = True
            elif op == "<=" and val <= thresh: cond_met = True
            elif op == ">" and val > thresh: cond_met = True
            elif op == ">=" and val >= thresh: cond_met = True
            elif op == "==" and val == thresh: cond_met = True
            
            if cond_met:
                r["trigger_count"] += 1
                r["last_evaluated_at"] = datetime.now(timezone.utc).isoformat()
                triggered.append({
                    "rule_id": r["id"],
                    "rule_name": r["rule_name"],
                    "triggered_metric": m,
                    "student_value": val,
                    "action_type": r["action_type"],
                    "payload": r["action_payload"]
                })

    return {
        "ok": True,
        "user_id": payload.user_id,
        "total_rules_evaluated": len(_RULES_STORE),
        "interventions_triggered": len(triggered),
        "triggered_actions": triggered
    }
