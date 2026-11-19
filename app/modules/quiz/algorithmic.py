"""BF-06: Dynamic STEM Question Generator Service & Router.

Generates randomized numeric/algebraic variants per student and evaluates student answers
within tolerance using safe pure-Python AST expression evaluation (zero eval/injection risks).
"""
from __future__ import annotations

import ast
import operator
import random
from typing import Any, Dict, List, Optional
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db import connect

router = APIRouter(prefix="/api/v1/quiz/algorithmic", tags=["Dynamic STEM Question Generator"])

_DEFAULT_TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

# Safe AST arithmetic operators
_ALLOWED_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.USub: operator.neg,
    ast.Pow: operator.pow,
}

def safe_eval_expr(node: ast.AST, variables: Dict[str, float]) -> float:
    if isinstance(node, ast.Expression):
        return safe_eval_expr(node.body, variables)
    elif isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return float(node.value)
        raise ValueError(f"Unsupported constant type: {type(node.value)}")
    elif isinstance(node, ast.Name):
        if node.id in variables:
            return float(variables[node.id])
        raise ValueError(f"Unknown variable in formula: {node.id}")
    elif isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type in _ALLOWED_OPERATORS:
            return _ALLOWED_OPERATORS[op_type](safe_eval_expr(node.operand, variables))
        raise ValueError(f"Unsupported unary operator: {op_type}")
    elif isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type in _ALLOWED_OPERATORS:
            left_val = safe_eval_expr(node.left, variables)
            right_val = safe_eval_expr(node.right, variables)
            return _ALLOWED_OPERATORS[op_type](left_val, right_val)
        raise ValueError(f"Unsupported binary operator: {op_type}")
    raise ValueError(f"Unsafe AST element: {type(node)}")

def evaluate_safe_formula(formula: str, variables: Dict[str, float]) -> float:
    parsed = ast.parse(formula, mode='eval')
    return safe_eval_expr(parsed, variables)

TEMPLATES = {
    "linear-balance": {
        "key": "linear-balance",
        "title": "Two-Step Linear Equation Solver",
        "question_text": "Solve for x in the equation: {a}x + {b} = {c}",
        "formula": "(c - b) / a",
        "var_ranges": {"a": [2, 8], "b": [3, 20], "c": [25, 100]},
        "tolerance_pct": 1.0,
    },
    "circuit-ohms-law": {
        "key": "circuit-ohms-law",
        "title": "Ohm's Law Current & Power",
        "question_text": "A circuit has a supply voltage of {v} V and a resistor of {r} Ω. Calculate the current I in Amperes.",
        "formula": "v / r",
        "var_ranges": {"v": [110, 240], "r": [10, 80]},
        "tolerance_pct": 2.0,
    },
    "kinetic-energy": {
        "key": "kinetic-energy",
        "title": "Kinetic Energy Calculation",
        "question_text": "A projectile of mass {m} kg travels at a speed of {v} m/s. Calculate its kinetic energy (Joules).",
        "formula": "0.5 * m * (v ** 2)",
        "var_ranges": {"m": [2, 15], "v": [4, 25]},
        "tolerance_pct": 1.5,
    }
}

_MINTED_STORE: Dict[str, Dict[str, Any]] = {}

class MintRequest(BaseModel):
    template_key: str = "linear-balance"
    student_id: Optional[str] = "6"

class EvaluateRequest(BaseModel):
    variant_id: str
    student_answer: float

@router.post("/mint")
def mint_question_variant(payload: MintRequest) -> Dict[str, Any]:
    tpl = TEMPLATES.get(payload.template_key)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template key not found")
    
    # Pick randomized values within variable ranges
    vars_picked = {}
    for var, (low, high) in tpl["var_ranges"].items():
        vars_picked[var] = random.randint(low, high)
    
    # Compute true solution safely
    correct_val = evaluate_safe_formula(tpl["formula"], vars_picked)
    
    var_id = f"var-{uuid4().hex[:12]}"
    q_rendered = tpl["question_text"].format(**vars_picked)
    
    record = {
        "variant_id": var_id,
        "tenant_id": _DEFAULT_TENANT,
        "template_key": payload.template_key,
        "student_id": payload.student_id,
        "question_text": q_rendered,
        "variables": vars_picked,
        "correct_answer": round(correct_val, 4),
        "tolerance_pct": tpl["tolerance_pct"]
    }
    _MINTED_STORE[var_id] = record
    
    # Return question without exposing correct answer
    return {
        "ok": True,
        "variant_id": var_id,
        "title": tpl["title"],
        "question": q_rendered,
        "variables_rendered": vars_picked,
        "unit": "numeric"
    }

@router.post("/evaluate")
def evaluate_student_answer(payload: EvaluateRequest) -> Dict[str, Any]:
    rec = _MINTED_STORE.get(payload.variant_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Question variant expired or invalid")
    
    target = rec["correct_answer"]
    tol = rec["tolerance_pct"] / 100.0
    diff = abs(payload.student_answer - target)
    max_allowed_diff = max(abs(target * tol), 0.05)
    
    is_correct = diff <= max_allowed_diff
    
    return {
        "ok": True,
        "variant_id": payload.variant_id,
        "is_correct": is_correct,
        "submitted_answer": payload.student_answer,
        "correct_answer": target,
        "error_margin_pct": round((diff / abs(target)) * 100, 2) if target != 0 else 0.0,
        "feedback": "Correct! Mathematical solution confirmed within acceptable scientific tolerance." if is_correct else f"Incorrect. Target value was {target:.2f}."
    }
