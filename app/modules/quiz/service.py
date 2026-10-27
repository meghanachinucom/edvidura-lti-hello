"""Tenant-scoped quiz questions (fallback to built-in Slice A bank)."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from app import db


# Auto-gradable types served to students (SPA + App API).
QUESTION_TYPES: tuple[str, ...] = (
    "single",
    "true_false",
    "short",
    "multi",
    "numeric",
    "essay",
)
PASS_PERCENT = 60


@dataclass(frozen=True)
class Question:
    id: str
    prompt: str
    choices: tuple[str, ...]
    correct_index: int
    topic: str = ""
    qtype: str = "single"
    correct_text: str = ""
    correct_indices: tuple[int, ...] = ()


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

# Extra typed items so the student bank covers all six designer types.
TYPED_QUESTIONS: tuple[Question, ...] = (
    Question(
        id="q4",
        prompt="EdVidura opens from Moodle through a trusted LTI launch.",
        choices=("True", "False"),
        correct_index=0,
        qtype="true_false",
    ),
    Question(
        id="q5",
        prompt="Name the service that sends a quiz score back to Moodle (three letters).",
        choices=(),
        correct_index=0,
        qtype="short",
        correct_text="AGS",
    ),
    Question(
        id="q6",
        prompt="Select every item that belongs in a tenant-isolated classroom.",
        choices=(
            "This school's lessons",
            "Another district's gradebook",
            "This class quiz bank",
            "A shared PIN for every school",
        ),
        correct_index=0,
        qtype="multi",
        correct_indices=(0, 2),
    ),
    Question(
        id="q7",
        prompt="A learner scored 3 out of 5. What percent is that? (whole number)",
        choices=(),
        correct_index=0,
        qtype="numeric",
        correct_text="60",
    ),
    Question(
        id="q8",
        prompt="In two sentences, explain why the official course score should live in Moodle.",
        choices=(),
        correct_index=0,
        qtype="essay",
    ),
)

# Back-compat for imports that still expect QUESTIONS / MAX_SCORE
QUESTIONS = FALLBACK_QUESTIONS
MAX_SCORE = len(FALLBACK_QUESTIONS)


def _normalize_qtype(value: str | None) -> str:
    raw = (value or "single").strip().lower().replace("-", "_")
    aliases = {
        "mcq": "single",
        "multiple_choice": "single",
        "tf": "true_false",
        "truefalse": "true_false",
        "fill_blank": "short",
        "fill_in": "short",
        "number": "numeric",
        "multi_select": "multi",
        "open": "essay",
    }
    mapped = aliases.get(raw, raw)
    return mapped if mapped in QUESTION_TYPES else "single"


def _row_to_question(row: dict[str, Any]) -> Question:
    choices = row.get("choices") or []
    if isinstance(choices, str):
        import json

        choices = json.loads(choices)
    indices_raw = row.get("correct_indices") or ()
    if isinstance(indices_raw, str):
        import json

        try:
            indices_raw = json.loads(indices_raw)
        except Exception:  # noqa: BLE001
            indices_raw = ()
    indices = tuple(int(i) for i in (indices_raw or ()) if str(i).strip() != "")
    qtype = _normalize_qtype(str(row.get("qtype") or "single"))
    return Question(
        id=str(row["question_key"]),
        prompt=str(row["prompt"]),
        choices=tuple(str(c) for c in (choices or [])),
        correct_index=int(row.get("correct_index") or 0),
        topic=str(row.get("topic") or ""),
        qtype=qtype,
        correct_text=str(row.get("correct_text") or ""),
        correct_indices=indices,
    )


def public_question_dict(question: Question) -> dict[str, Any]:
    """Student-facing payload — never includes answer keys."""
    qtype = _normalize_qtype(question.qtype)
    choices = list(question.choices)
    if qtype in {"short", "numeric", "essay"}:
        choices = []
    return {
        "id": question.id,
        "prompt": question.prompt,
        "qtype": qtype,
        "choices": choices,
        "topic": question.topic or "",
    }


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
            SELECT id, question_key, prompt, choices, correct_index, position,
                   COALESCE(qtype, 'single') AS qtype,
                   COALESCE(correct_text, '') AS correct_text,
                   COALESCE(topic, '') AS topic
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
    return FALLBACK_QUESTIONS + TYPED_QUESTIONS


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
                SELECT id, question_key, prompt, choices, correct_index, position,
                       COALESCE(qtype, 'single') AS qtype,
                       COALESCE(correct_text, '') AS correct_text,
                       COALESCE(topic, '') AS topic
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
    """Return (score, detail) where detail maps question id → result info.

    ``detail`` may include ``correct_index`` for server-side review/retry.
    Never send raw detail to browsers — use ``client_safe_grade_detail``.
    """
    bank = tuple(questions) if questions is not None else FALLBACK_QUESTIONS
    score = 0
    detail: dict[str, object] = {}
    for q in bank:
        raw = submitted.get(q.id)
        raw_s = "" if raw is None else str(raw).strip()
        qtype = _normalize_qtype(getattr(q, "qtype", "single"))
        chosen: int | str | list[int] = raw_s
        correct = False
        if qtype in {"single", "true_false"}:
            try:
                chosen = int(raw_s) if raw_s != "" else -1
            except (TypeError, ValueError):
                chosen = -1
            correct = chosen == q.correct_index
        elif qtype == "short":
            expected = (q.correct_text or (q.choices[0] if q.choices else "")).strip()
            correct = bool(expected) and raw_s.casefold() == expected.casefold()
        elif qtype == "numeric":
            expected = (q.correct_text or (q.choices[0] if q.choices else "")).strip()
            try:
                correct = abs(float(raw_s) - float(expected)) < 1e-6
            except (TypeError, ValueError):
                correct = False
        elif qtype == "multi":
            got = _parse_index_set(raw_s)
            want = set(q.correct_indices) if q.correct_indices else {q.correct_index}
            chosen = sorted(got)
            correct = bool(got) and got == want
        elif qtype == "essay":
            # Heuristic autograde: a substantive written response scores.
            correct = len(raw_s) >= 20
        if correct:
            score += 1
        info: dict[str, Any] = {
            "chosen": chosen,
            "correct_index": q.correct_index,
            "correct": correct,
            "prompt": q.prompt,
            "topic": getattr(q, "topic", "") or "",
            "qtype": qtype,
        }
        if q.correct_text:
            info["correct_text"] = q.correct_text
        if q.correct_indices:
            info["correct_indices"] = list(q.correct_indices)
        detail[q.id] = info
    return score, detail


def _parse_index_set(raw: str) -> set[int]:
    out: set[int] = set()
    for part in (raw or "").replace(" ", "").split(","):
        if part == "":
            continue
        try:
            out.add(int(part))
        except (TypeError, ValueError):
            continue
    return out


def passed_attempt(score: int, max_score: int, *, pass_percent: int = PASS_PERCENT) -> bool:
    cap = max(int(max_score or 0), 0)
    if cap <= 0:
        return False
    threshold = max(1, min(int(pass_percent or PASS_PERCENT), 100))
    return round(100 * int(score or 0) / cap) >= threshold


def client_safe_grade_detail(detail: Any) -> Any:
    """Drop answer keys from grading detail before returning to a client."""
    if isinstance(detail, dict):
        out: dict[str, Any] = {}
        for qid, info in detail.items():
            if not isinstance(info, dict):
                out[str(qid)] = info
                continue
            out[str(qid)] = {
                k: v
                for k, v in info.items()
                if k not in {"correct_index", "correct_text", "correct_indices"}
            }
        return out
    if isinstance(detail, list):
        safe_rows: list[Any] = []
        for row in detail:
            if isinstance(row, dict):
                safe_rows.append(
                    {
                        k: v
                        for k, v in row.items()
                        if k not in {"correct_index", "correct_text", "correct_indices"}
                    }
                )
            else:
                safe_rows.append(row)
        return safe_rows
    return detail


def strip_answer_keys_from_bank(bank: Any) -> Any:
    """Remove ``correct_index`` from a personal quiz bank (cookie-safe)."""
    if not isinstance(bank, dict):
        return bank
    questions = bank.get("questions")
    if not isinstance(questions, list):
        return dict(bank)
    public_qs: list[dict[str, Any]] = []
    for item in questions:
        if not isinstance(item, dict):
            continue
        public_qs.append(
            {
                k: v
                for k, v in item.items()
                if k not in {"correct_index", "correct_text", "correct_indices"}
            }
        )
    return {**bank, "questions": public_qs}


def cookie_safe_session(session: dict[str, Any] | None) -> dict[str, Any]:
    """Copy of learner session safe for the signed browser cookie.

    Answer keys stay in server-side quiz_token context only.
    """
    if not isinstance(session, dict):
        return {}
    out = dict(session)
    bank = out.get("personal_quiz_bank")
    if isinstance(bank, dict):
        out["personal_quiz_bank"] = strip_answer_keys_from_bank(bank)
    return out
