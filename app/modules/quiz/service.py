"""Tenant-scoped quiz questions (fallback to built-in Slice A bank)."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from app import db


@dataclass(frozen=True)
class Question:
    id: str
    prompt: str
    choices: tuple[str, ...]
    correct_index: int
    topic: str = ""


# Built-in fallback when a tenant has no published quiz yet
FALLBACK_QUESTIONS: tuple[Question, ...] = (
    Question(
        id="q1",
        prompt="How did you open EdVidura from Moodle?",
        choices=(
            "Through a trusted LTI launch Moodle opened for you",
            "By creating a new EdVidura password",
            "By guessing a shared classroom PIN",
            "By downloading the course as a ZIP file",
        ),
        correct_index=0,
    ),
    Question(
        id="q2",
        prompt="What keeps another institution’s data out of your workspace?",
        choices=(
            "Different button colors in the UI",
            "Each school is isolated in its own tenant workspace",
            "Teachers email CSV exports every Friday",
            "Nothing — everyone shares one list",
        ),
        correct_index=1,
    ),
    Question(
        id="q3",
        prompt="Where should the official course score live?",
        choices=(
            "Only in a private EdVidura note",
            "In the Moodle gradebook (EdVidura can send the score back)",
            "Only on a printed certificate",
            "Scores are never saved anywhere",
        ),
        correct_index=1,
    ),
)

# Back-compat for imports that still expect QUESTIONS / MAX_SCORE
QUESTIONS = FALLBACK_QUESTIONS
MAX_SCORE = len(FALLBACK_QUESTIONS)


def _row_to_question(row: dict[str, Any]) -> Question:
    choices = row.get("choices") or []
    if isinstance(choices, str):
        import json

        choices = json.loads(choices)
    return Question(
        id=str(row["question_key"]),
        prompt=str(row["prompt"]),
        choices=tuple(str(c) for c in choices),
        correct_index=int(row["correct_index"]),
    )


def get_primary_quiz(tenant_id: UUID | str) -> dict[str, Any] | None:
    return get_quiz_for_course(tenant_id, course_id=None)


def get_quiz_for_course(
    tenant_id: UUID | str, course_id: UUID | str | None = None
) -> dict[str, Any] | None:
    """Published quiz for a curriculum course, else first published quiz."""
    try:
        with db.tenant_connection(tenant_id) as conn:
            if course_id:
                row = conn.execute(
                    """
                    SELECT id, tenant_id, course_id, slug, title, description, status
                    FROM quizzes
                    WHERE status = 'published' AND course_id = %s
                    ORDER BY created_at ASC
                    LIMIT 1
                    """,
                    (str(course_id),),
                ).fetchone()
                if row:
                    return dict(row)
            row = conn.execute(
                """
                SELECT id, tenant_id, course_id, slug, title, description, status
                FROM quizzes
                WHERE status = 'published'
                ORDER BY created_at ASC
                LIMIT 1
                """
            ).fetchone()
            return dict(row) if row else None
    except Exception:  # noqa: BLE001
        return None


def list_quiz_questions(
    tenant_id: UUID | str, quiz_id: UUID | str
) -> list[Question]:
    return [_row_to_question(r) for r in list_quiz_question_rows(tenant_id, quiz_id)]


def list_quiz_question_rows(
    tenant_id: UUID | str, quiz_id: UUID | str
) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT id, question_key, prompt, choices, correct_index, position
            FROM quiz_questions
            WHERE quiz_id = %s
            ORDER BY position ASC
            """,
            (str(quiz_id),),
        ).fetchall()
        out = []
        for r in rows:
            item = dict(r)
            item["id"] = str(item["id"])
            choices = item.get("choices") or []
            if isinstance(choices, str):
                import json

                choices = json.loads(choices)
            item["choices"] = list(choices)
            out.append(item)
        return out


def questions_for_tenant(
    tenant_id: UUID | str | None,
    *,
    course_id: UUID | str | None = None,
) -> tuple[Question, ...]:
    """Load this school's quiz for a bound course; fall back to primary / built-in."""
    authored = tenant_authored_questions(tenant_id, course_id=course_id)
    if authored:
        return authored
    return FALLBACK_QUESTIONS


# How many teacher-bank items each student attempt gets (not the full bank).
STUDENT_QUIZ_SIZE = 6


def sample_questions_for_student(
    questions: tuple[Question, ...] | list[Question],
    *,
    subject: str,
    size: int = STUDENT_QUIZ_SIZE,
    salt: str = "",
) -> list[Question]:
    """Pick ~5–6 items from the teacher bank, stable per student (+ optional salt)."""
    import hashlib
    import random

    bank = list(questions)
    if not bank:
        return []
    target = max(1, min(int(size or STUDENT_QUIZ_SIZE), 6))
    # Prefer 6; if bank is tiny, use all.
    if len(bank) <= target:
        return bank
    # When bank has 5, serve 5; when larger, serve 6 (or 5 if size=5).
    n = target if len(bank) >= target else len(bank)
    if n < 5 and len(bank) >= 5:
        n = 5
    digest = hashlib.sha256(
        f"{subject}|quiz-sample|{salt}|{n}".encode("utf-8")
    ).hexdigest()
    rng = random.Random(int(digest[:16], 16))
    picked = bank[:]
    rng.shuffle(picked)
    return picked[:n]


def tenant_authored_questions(
    tenant_id: UUID | str | None,
    *,
    course_id: UUID | str | None = None,
) -> tuple[Question, ...]:
    """Teacher-authored bank only. Empty if none — never the built-in fallback.

    Prefers the course-bound quiz when it has items; otherwise the published
    quiz with the most questions (teachers often add to the primary school quiz).
    """
    if not tenant_id:
        return ()
    tid = str(tenant_id)
    try:
        with db.tenant_connection(tid) as conn:
            quiz_id = None
            if course_id:
                row = conn.execute(
                    """
                    SELECT q.id, COUNT(qq.id) AS n
                    FROM quizzes q
                    LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
                    WHERE q.status = 'published' AND q.course_id = %s
                    GROUP BY q.id
                    ORDER BY COUNT(qq.id) DESC, q.created_at ASC
                    LIMIT 1
                    """,
                    (str(course_id),),
                ).fetchone()
                if row and int(row["n"] or 0) > 0:
                    quiz_id = row["id"]
            if not quiz_id:
                row = conn.execute(
                    """
                    SELECT q.id, COUNT(qq.id) AS n
                    FROM quizzes q
                    LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
                    WHERE q.status = 'published'
                    GROUP BY q.id
                    ORDER BY COUNT(qq.id) DESC, q.created_at ASC
                    LIMIT 1
                    """
                ).fetchone()
                if row and int(row["n"] or 0) > 0:
                    quiz_id = row["id"]
            if not quiz_id:
                return ()
            rows = conn.execute(
                """
                SELECT id, question_key, prompt, choices, correct_index, position
                FROM quiz_questions
                WHERE quiz_id = %s
                ORDER BY position ASC, created_at ASC
                """,
                (str(quiz_id),),
            ).fetchall()
    except Exception:  # noqa: BLE001
        return ()
    return tuple(_row_to_question(dict(r)) for r in rows)


def grade_answers(
    submitted: dict[str, str | int],
    questions: tuple[Question, ...] | list[Question] | None = None,
) -> tuple[int, dict[str, object]]:
    """Return (score, detail) where detail maps question id → result info."""
    bank = tuple(questions) if questions is not None else FALLBACK_QUESTIONS
    score = 0
    detail: dict[str, object] = {}
    for q in bank:
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
            "topic": getattr(q, "topic", "") or "",
        }
    return score, detail
