"""Portable quiz attempt persistence + grade/submit orchestration.

Wraps ``app.db`` quiz_attempts helpers so HTTP routes never call db for attempts.
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

from app import db
from app.modules.quiz.personalized import questions_from_payload
from app.modules.quiz.service import Question, grade_answers, questions_for_tenant


def insert_attempt(**kwargs: Any) -> dict[str, Any]:
    return db.insert_quiz_attempt(**kwargs)


def get_attempt(tenant_id: UUID | str, attempt_id: UUID | str) -> dict[str, Any] | None:
    return db.get_quiz_attempt(tenant_id, attempt_id)


def list_attempts_for_tenant(tenant_id: UUID | str, **kwargs: Any) -> list[dict[str, Any]]:
    return db.list_quiz_attempts_for_tenant(tenant_id, **kwargs)


def update_attempt_grade(**kwargs: Any) -> Any:
    return db.update_quiz_attempt_grade(**kwargs)


def quiz_attempt_class_summary(tenant_id: UUID | str, **kwargs: Any) -> Any:
    return db.quiz_attempt_class_summary(tenant_id, **kwargs)


def build_review_from_answers(
    answers: dict[str, Any] | None,
    *,
    questions: list[Any] | tuple[Any, ...] | None = None,
) -> list[dict[str, Any]]:
    """UI-ready review rows from a stored attempt answers payload.

    ``detail`` is normally a dict keyed by question id (from ``grade_answers``).
    """
    if not isinstance(answers, dict):
        return []
    detail = answers.get("detail")
    bank = list(questions) if questions is not None else []
    by_id = {getattr(q, "id", None): q for q in bank if getattr(q, "id", None)}

    out: list[dict[str, Any]] = []
    if isinstance(detail, dict):
        for qid, info in detail.items():
            if not isinstance(info, dict):
                continue
            q = by_id.get(str(qid))
            correct = bool(info.get("correct"))
            correct_choice = ""
            if q is not None:
                idx = int(getattr(q, "correct_index", -1))
                choices = list(getattr(q, "choices", []) or [])
                if 0 <= idx < len(choices):
                    correct_choice = str(choices[idx])
            out.append(
                {
                    "question_id": str(qid),
                    "prompt": str(info.get("prompt") or (getattr(q, "prompt", "") if q else qid)),
                    "correct": correct,
                    "correct_choice": correct_choice if not correct else "",
                    "chosen": info.get("chosen"),
                }
            )
        return out
    if isinstance(detail, list):
        for row in detail:
            if not isinstance(row, dict):
                continue
            out.append(
                {
                    "question_id": str(row.get("id") or row.get("question_id") or ""),
                    "prompt": str(row.get("prompt") or ""),
                    "correct": bool(row.get("ok") or row.get("correct")),
                    "correct_choice": str(row.get("correct_choice") or ""),
                    "chosen": row.get("chosen") or row.get("selected"),
                }
            )
    return out


def grade_submitted_form(
    *,
    tenant_id: UUID | str,
    subject: str,
    course_id: UUID | str | None,
    form_keys: set[str],
    get_answer: Any,
    practice_mode: bool = False,
    personalized_mode: bool = False,
    personal_bank: dict[str, Any] | None = None,
    retry_from: str = "",
) -> dict[str, Any]:
    """Grade answers from a form-like source (callable get_answer(qid) -> str).

    Returns score, max_score, detail, answers_payload, questions (Question tuples).
    Does not persist.
    """
    all_questions = questions_for_tenant(tenant_id, course_id=course_id or None)
    bank = personal_bank
    if personalized_mode and isinstance(bank, dict):
        if str(bank.get("subject") or "") == str(subject or ""):
            all_questions = questions_from_payload(bank.get("questions"))
        else:
            bank = None

    questions = tuple(q for q in all_questions if q.id in form_keys)
    if not questions:
        questions = all_questions
    submitted = {q.id: str(get_answer(q.id) or "") for q in questions}
    score, detail = grade_answers(submitted, questions)
    max_score = len(questions)

    answers_payload: dict[str, Any] = {
        "submitted": submitted,
        "detail": detail,
    }
    if practice_mode:
        answers_payload["mode"] = "practice"
    if personalized_mode:
        answers_payload["personalized"] = True
        answers_payload["mode"] = "practice" if practice_mode else "personalized_ai"
        if bank and isinstance(bank.get("meta"), dict):
            answers_payload["personal_meta"] = bank["meta"]
        answers_payload["question_bank"] = [
            {
                "id": q.id,
                "prompt": q.prompt,
                "choices": list(q.choices),
                "correct_index": q.correct_index,
            }
            for q in questions
        ]
    if retry_from.strip():
        answers_payload["retry_from"] = retry_from.strip()

    return {
        "score": score,
        "max_score": max_score,
        "detail": detail,
        "answers_payload": answers_payload,
        "questions": questions,
        "practice_mode": practice_mode,
        "personalized_mode": personalized_mode,
    }


def record_graded_attempt(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str,
    course_label: str,
    graded: dict[str, Any],
    enqueue_events: bool = True,
    record_xapi: bool = True,
) -> dict[str, Any]:
    """Persist attempt + optional outbox/xAPI. Portable side effects."""
    practice_mode = bool(graded.get("practice_mode"))
    attempt = insert_attempt(
        tenant_id=tenant_id,
        subject=subject,
        learner_name=learner_name,
        course_label=course_label,
        score=int(graded["score"]),
        max_score=int(graded["max_score"]),
        answers=graded["answers_payload"],
        grade_sent=False,
        grade_error=(
            "Practice attempt — not sent to Moodle"
            if practice_mode
            else "Grade passback queued…"
        ),
    )

    if enqueue_events:
        try:
            from app.modules.events import enqueue_quiz_attempt_submitted

            enqueue_quiz_attempt_submitted(
                tenant_id=tenant_id,
                subject=subject,
                attempt_id=attempt["id"],
                score=int(graded["score"]),
                max_score=int(graded["max_score"]),
                course_label=course_label,
            )
        except Exception:  # noqa: BLE001
            pass

    if record_xapi:
        try:
            from app.modules.xapi import record_quiz_attempt, record_skill_assessments

            record_quiz_attempt(
                tenant_id=tenant_id,
                subject=subject,
                learner_name=learner_name,
                attempt_id=attempt["id"],
                score=int(graded["score"]),
                max_score=int(graded["max_score"]),
                course_label=course_label,
            )
            record_skill_assessments(
                tenant_id=tenant_id,
                subject=subject,
                learner_name=learner_name,
                attempt_id=attempt["id"],
                answers=graded["answers_payload"],
            )
        except Exception:  # noqa: BLE001
            pass

    if practice_mode:
        try:
            update_attempt_grade(
                tenant_id=tenant_id,
                attempt_id=attempt["id"],
                grade_sent=False,
                grade_error="Practice attempt — not sent to Moodle",
            )
        except Exception:  # noqa: BLE001
            pass

    return attempt


__all__ = [
    "Question",
    "build_review_from_answers",
    "get_attempt",
    "grade_submitted_form",
    "insert_attempt",
    "list_attempts_for_tenant",
    "quiz_attempt_class_summary",
    "record_graded_attempt",
    "update_attempt_grade",
]
