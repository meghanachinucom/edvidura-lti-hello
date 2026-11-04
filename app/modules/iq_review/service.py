"""IQ review — thin item analysis from sealed quiz attempt answers."""
from __future__ import annotations

from collections import defaultdict
from typing import Any
from uuid import UUID

from app import db


def item_quality_report(
    tenant_id: UUID | str,
    *,
    limit: int = 80,
) -> dict[str, Any]:
    """Per-question correct rate + flags for too-hard / too-easy items."""
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT id, answers, score, max_score, created_at
            FROM quiz_attempts
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (max(1, min(int(limit or 80), 200)),),
        ).fetchall()

    tallies: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"attempts": 0, "correct": 0, "prompt": ""}
    )
    scanned = 0
    for row in rows:
        answers = row.get("answers") if isinstance(row, dict) else None
        if answers is None and hasattr(row, "get"):
            answers = row["answers"] if "answers" in row.keys() else None  # type: ignore[index]
        raw = dict(row) if not isinstance(row, dict) else row
        answers = raw.get("answers")
        if isinstance(answers, str):
            import json

            try:
                answers = json.loads(answers)
            except Exception:  # noqa: BLE001
                answers = {}
        if not isinstance(answers, dict):
            continue
        scanned += 1
        # Prefer structured per-question map: {qid: {correct: bool, prompt?: str}}
        items = answers.get("items") if isinstance(answers.get("items"), list) else None
        if items:
            for it in items:
                if not isinstance(it, dict):
                    continue
                qid = str(it.get("id") or it.get("question_id") or "").strip() or "unknown"
                bucket = tallies[qid]
                bucket["attempts"] += 1
                if it.get("correct") is True or it.get("is_correct") is True:
                    bucket["correct"] += 1
                prompt = str(it.get("prompt") or it.get("stem") or "")[:120]
                if prompt and not bucket["prompt"]:
                    bucket["prompt"] = prompt
            continue
        # Fallback: {qid: true/false} or {qid: {correct: bool}}
        for qid, val in answers.items():
            if qid in {"items", "meta", "score", "summary"}:
                continue
            key = str(qid)
            bucket = tallies[key]
            bucket["attempts"] += 1
            ok = False
            if isinstance(val, bool):
                ok = val
            elif isinstance(val, dict):
                ok = bool(val.get("correct") or val.get("is_correct"))
                prompt = str(val.get("prompt") or val.get("stem") or "")[:120]
                if prompt and not bucket["prompt"]:
                    bucket["prompt"] = prompt
            if ok:
                bucket["correct"] += 1

    questions: list[dict[str, Any]] = []
    for qid, bucket in tallies.items():
        n = int(bucket["attempts"] or 0)
        if n <= 0:
            continue
        rate = round(100.0 * int(bucket["correct"]) / n, 1)
        flag = "ok"
        if rate < 30:
            flag = "too_hard"
        elif rate > 90:
            flag = "too_easy"
        questions.append(
            {
                "question_id": qid,
                "prompt": bucket["prompt"] or qid,
                "attempts": n,
                "correct": int(bucket["correct"]),
                "correct_pct": rate,
                "flag": flag,
            }
        )
    questions.sort(key=lambda q: (q["flag"] != "too_hard", q["correct_pct"], q["question_id"]))

    return {
        "product": "IQ review pattern",
        "wave": "A",
        "state": "thin",
        "attempts_scanned": scanned,
        "question_count": len(questions),
        "too_hard": sum(1 for q in questions if q["flag"] == "too_hard"),
        "too_easy": sum(1 for q in questions if q["flag"] == "too_easy"),
        "questions": questions[:50],
        "note": (
            "Thin Wave A: rates from recent attempt answer payloads. "
            "Enrich stems as the bank stores prompts on attempts."
        ),
    }
