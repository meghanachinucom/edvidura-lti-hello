"""Hardcoded Slice A quiz (3 questions)."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Question:
    id: str
    prompt: str
    choices: tuple[str, ...]
    correct_index: int


QUESTIONS: tuple[Question, ...] = (
    Question(
        id="q1",
        prompt="What does LTI stand for?",
        choices=(
            "Learning Tools Interoperability",
            "Local Tenant Isolation",
            "Linked Teaching Interface",
            "Learner Tracking Index",
        ),
        correct_index=0,
    ),
    Question(
        id="q2",
        prompt="In EdVidura, how is the tenant identified on launch?",
        choices=(
            "From the email domain",
            "From a typed URL parameter",
            "From the verified LTI registration (issuer + client_id + deployment)",
            "From the course name",
        ),
        correct_index=2,
    ),
    Question(
        id="q3",
        prompt="Where should the official grade live for Release 1?",
        choices=(
            "Only in EdVidura",
            "In the Moodle gradebook (EdVidura passes the score back)",
            "In a spreadsheet exported weekly",
            "Nowhere — scores are display-only",
        ),
        correct_index=1,
    ),
)

MAX_SCORE = len(QUESTIONS)


def grade_answers(submitted: dict[str, str | int]) -> tuple[int, dict[str, object]]:
    """Return (score, detail) where detail maps question id → result info."""
    score = 0
    detail: dict[str, object] = {}
    for q in QUESTIONS:
        raw = submitted.get(q.id)
        try:
            chosen = int(raw) if raw is not None and str(raw) != "" else -1
        except (TypeError, ValueError):
            chosen = -1
        correct = chosen == q.correct_index
        if correct:
            score += 1
        detail[q.id] = {
            "chosen": chosen,
            "correct_index": q.correct_index,
            "correct": correct,
            "prompt": q.prompt,
        }
    return score, detail
