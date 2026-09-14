"""Per-student AI quizzes: unique items from class chapters at the right depth."""
from __future__ import annotations

import hashlib
from typing import Any
from uuid import UUID

from app.modules.ai_assessment.llm import openai_chat_json, run_ai
from app.modules.quiz.service import Question

DIFFICULTY_LEVELS = ("foundational", "core", "challenge")

_DIFFICULTY_HINTS = {
    "foundational": (
        "Use easy recall and basic understanding. Short stems, clear wording, "
        "one idea per question. Suitable for students still building basics."
    ),
    "core": (
        "Use standard chapter checks: apply ideas, compare terms, simple "
        "multi-step thinking. Match typical classroom quiz depth."
    ),
    "challenge": (
        "Use deeper application and analysis within the chapter material. "
        "Still fair for secondary school — no trick questions outside the text."
    ),
}


def infer_difficulty(
    *,
    score_ratio: float | None,
    attempts: int = 0,
) -> str:
    """Map recent performance to foundational / core / challenge."""
    if score_ratio is None or attempts <= 0:
        return "core"
    if score_ratio < 0.45:
        return "foundational"
    if score_ratio >= 0.8:
        return "challenge"
    return "core"


def student_performance_profile(
    tenant_id: UUID | str,
    subject: str,
    *,
    course_label: str = "",
) -> dict[str, Any]:
    """Summarize prior attempts for personalization (under RLS via list helpers)."""
    from app import db

    subject_s = str(subject or "").strip()
    try:
        rows = db.list_quiz_attempts_for_tenant(tenant_id, limit=40)
    except Exception:  # noqa: BLE001
        rows = []
    mine = [
        r
        for r in rows
        if str(r.get("subject") or "") == subject_s
        and not (
            isinstance(r.get("answers"), dict)
            and str((r.get("answers") or {}).get("mode") or "") == "practice"
        )
    ]
    # Prefer recent attempts for this course label when present.
    if course_label:
        labeled = [
            r
            for r in mine
            if course_label.lower() in str(r.get("course_label") or "").lower()
        ]
        if labeled:
            mine = labeled
    mine = mine[:8]
    ratios: list[float] = []
    weak_prompts: list[str] = []
    for r in mine:
        mx = int(r.get("max_score") or 0) or 1
        ratios.append(int(r.get("score") or 0) / mx)
        ans = r.get("answers") if isinstance(r.get("answers"), dict) else {}
        detail = ans.get("detail") if isinstance(ans.get("detail"), dict) else {}
        for _qid, info in detail.items():
            if not isinstance(info, dict):
                continue
            if info.get("correct") is False and info.get("prompt"):
                weak_prompts.append(str(info["prompt"])[:120])
    avg = sum(ratios) / len(ratios) if ratios else None
    difficulty = infer_difficulty(score_ratio=avg, attempts=len(ratios))
    return {
        "attempts": len(mine),
        "avg_score_ratio": avg,
        "difficulty": difficulty,
        "weak_prompts": weak_prompts[:6],
        "subject": subject_s,
    }


def chapter_topics_for_course(
    tenant_id: UUID | str,
    course_id: UUID | str | None,
    *,
    list_lessons_fn,
    get_bound_course_fn,
) -> tuple[str, list[dict[str, str]]]:
    """Reading lessons = chapters/topics for the bound class course."""
    if not tenant_id or not course_id:
        return "", []
    course = get_bound_course_fn(tenant_id, course_id)
    if not course:
        return "", []
    title = str(course.get("title") or "")
    topics: list[dict[str, str]] = []
    for L in list_lessons_fn(tenant_id, course["id"]) or []:
        if L.get("lesson_type") == "quiz":
            continue
        body = str(L.get("body_md") or "").strip()
        if len(body) < 20:
            continue
        topics.append(
            {
                "title": str(L.get("title") or "Lesson"),
                "body": body[:2000],
            }
        )
    return title, topics


def _student_seed(subject: str, extra: str = "") -> int:
    raw = f"{subject}|{extra}".encode("utf-8")
    return int(hashlib.sha256(raw).hexdigest()[:8], 16)


def _normalize_mcq_items(
    raw: list[Any],
    *,
    count: int,
    seed: int,
) -> list[Question]:
    out: list[Question] = []
    for i, item in enumerate(raw[:count]):
        if not isinstance(item, dict):
            continue
        choices = item.get("choices") or []
        if not isinstance(choices, list) or len(choices) < 2:
            continue
        choices = [str(c).strip() for c in choices][:4]
        while len(choices) < 4:
            choices.append("Not covered in this chapter")
        try:
            ci = int(item.get("correct_index", 0))
        except (TypeError, ValueError):
            ci = 0
        ci = max(0, min(ci, len(choices) - 1))
        prompt = str(item.get("prompt") or "").strip()
        if not prompt:
            continue
        # Stable unique ids per student seed + index
        qid = f"pq{(seed + i) % 100000:05d}"
        out.append(
            Question(
                id=qid,
                prompt=prompt,
                choices=tuple(choices),
                correct_index=ci,
            )
        )
    return out


def _local_personalized_mcqs(
    topics: list[dict[str, str]],
    *,
    count: int,
    difficulty: str,
    seed: int,
    course_title: str,
) -> list[Question]:
    """Deterministic-but-unique local items (no LLM)."""
    from app.modules.ai_assessment.service import GENERIC_DISTRACTORS, _sentences

    facts: list[tuple[str, str]] = []
    for t in topics:
        title = t["title"]
        for s in _sentences(t["body"])[:4]:
            facts.append((title, s))
    if not facts:
        facts = [
            (
                course_title or "this course",
                f"{course_title or 'This course'} covers the class chapters.",
            )
        ]
    # Rotate starting point by student seed so peers get different sets.
    start = seed % len(facts)
    ordered = facts[start:] + facts[:start]
    if difficulty == "challenge":
        ordered = list(reversed(ordered))
    questions: list[Question] = []
    for i in range(min(count, max(1, len(ordered)))):
        title, fact = ordered[i % len(ordered)]
        others = [f for j, (_t, f) in enumerate(ordered) if j != i][:3]
        while len(others) < 3:
            others.append(GENERIC_DISTRACTORS[len(others) % 3])
        correct_index = (seed + i) % 4
        choices = [""] * 4
        choices[correct_index] = fact[:160]
        di = 0
        for idx in range(4):
            if idx == correct_index:
                continue
            choices[idx] = others[di][:160]
            di += 1
        if difficulty == "foundational":
            prompt = f"From “{title}”: which statement is true?"
        elif difficulty == "challenge":
            prompt = (
                f"Based on “{title}”, which choice best applies the idea "
                f"behind: “{fact[:70]}…”?"
            )[:240]
        else:
            prompt = f"According to “{title}”, which statement is correct?"
        questions.append(
            Question(
                id=f"pq{(seed + i) % 100000:05d}",
                prompt=prompt,
                choices=tuple(choices),
                correct_index=correct_index,
            )
        )
    return questions


def _openai_personalized_mcqs(
    topics: list[dict[str, str]],
    *,
    count: int,
    difficulty: str,
    course_title: str,
    focus_hints: list[str],
    student_seed: str,
) -> list[Question]:
    corpus = [
        {"chapter": t["title"], "text": t["body"][:1200]} for t in topics[:10]
    ]
    hint = _DIFFICULTY_HINTS.get(difficulty, _DIFFICULTY_HINTS["core"])
    focus = "; ".join(focus_hints[:5]) if focus_hints else "cover each main chapter fairly"
    data = openai_chat_json(
        system=(
            "You write personalized school quiz MCQs for ONE student. "
            "Use ONLY the provided chapter texts. "
            f"Difficulty guidance: {hint} "
            "Make items different from a generic quiz — vary stems and scenarios "
            "using the student_seed as a creativity salt (do not mention the seed). "
            "Cover required chapter depth; do not invent facts outside the texts. "
            "Return ONLY JSON: "
            '{"questions":[{"prompt":"...","choices":["A","B","C","D"],'
            '"correct_index":0,"chapter":"..."}]} '
            "Exactly 4 choices; correct_index is 0-based. No markdown."
        ),
        user=(
            f"Course: {course_title or 'class course'}\n"
            f"Student seed: {student_seed}\n"
            f"Target difficulty: {difficulty}\n"
            f"Focus: {focus}\n"
            f"Create {count} unique MCQs from these chapters:\n{corpus}"
        ),
        temperature=0.45,
    )
    raw = data.get("questions") if isinstance(data, dict) else None
    if not isinstance(raw, list):
        raise ValueError("Model response missing questions list")
    seed = _student_seed(student_seed, difficulty)
    return _normalize_mcq_items(raw, count=count, seed=seed)


def generate_personalized_quiz(
    *,
    tenant_id: UUID | str,
    subject: str,
    course_id: UUID | str | None,
    list_lessons_fn,
    get_bound_course_fn,
    count: int = 4,
    course_label: str = "",
    learner_name: str = "",
) -> dict[str, Any]:
    """Build a unique AI quiz for this student from class chapter materials."""
    course_title, topics = chapter_topics_for_course(
        tenant_id,
        course_id,
        list_lessons_fn=list_lessons_fn,
        get_bound_course_fn=get_bound_course_fn,
    )
    if not topics:
        raise ValueError(
            "No class chapter lessons found for a personalized quiz. "
            "Ask your teacher to publish reading lessons for this course."
        )
    profile = student_performance_profile(
        tenant_id, subject, course_label=course_label or course_title
    )
    difficulty = str(profile.get("difficulty") or "core")
    n = max(2, min(int(count), 6))
    seed_s = f"{subject}|{learner_name}|{course_id or ''}"
    seed = _student_seed(seed_s, difficulty)
    focus = list(profile.get("weak_prompts") or [])
    # Prefer chapters matching weak areas; else all chapter titles.
    focus_topics = [t["title"] for t in topics]
    if focus:
        bumped = [
            t["title"]
            for t in topics
            if any(
                w.lower()[:40] in (t["title"] + t["body"]).lower()
                for w in focus
            )
        ]
        if bumped:
            focus_topics = bumped + [t for t in focus_topics if t not in bumped]

    def _openai():
        qs = _openai_personalized_mcqs(
            topics,
            count=n,
            difficulty=difficulty,
            course_title=course_title,
            focus_hints=focus_topics[:6] + focus[:3],
            student_seed=seed_s,
        )
        if len(qs) < 2:
            raise ValueError("Not enough personalized questions from model")
        return {"questions": qs}

    def _local():
        return {
            "questions": _local_personalized_mcqs(
                topics,
                count=n,
                difficulty=difficulty,
                seed=seed,
                course_title=course_title,
            )
        }

    result = run_ai(openai_fn=_openai, local_fn=_local, feature="personalized_quiz")
    questions: list[Question] = list(result.get("questions") or [])
    if not questions:
        questions = _local_personalized_mcqs(
            topics,
            count=n,
            difficulty=difficulty,
            seed=seed,
            course_title=course_title,
        )
    payload_qs = [
        {
            "id": q.id,
            "prompt": q.prompt,
            "choices": list(q.choices),
            "correct_index": q.correct_index,
        }
        for q in questions
    ]
    return {
        "questions": questions,
        "question_payload": payload_qs,
        "course_title": course_title,
        "difficulty": difficulty,
        "topics": [t["title"] for t in topics],
        "focus_topics": focus_topics[:8],
        "profile": {
            "attempts": profile.get("attempts"),
            "avg_score_ratio": profile.get("avg_score_ratio"),
        },
        "provider": result.get("provider"),
        "model": result.get("model"),
        "student_seed": seed_s,
        "mode": "personalized_ai",
    }


def questions_from_payload(payload: list[dict[str, Any]] | None) -> tuple[Question, ...]:
    if not payload:
        return tuple()
    out: list[Question] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        choices = item.get("choices") or []
        if not isinstance(choices, list) or len(choices) < 2:
            continue
        try:
            ci = int(item.get("correct_index", 0))
        except (TypeError, ValueError):
            ci = 0
        choices_t = tuple(str(c) for c in choices[:4])
        ci = max(0, min(ci, len(choices_t) - 1))
        out.append(
            Question(
                id=str(item.get("id") or f"pq{len(out)}"),
                prompt=str(item.get("prompt") or "").strip() or "Question",
                choices=choices_t,
                correct_index=ci,
            )
        )
    return tuple(out)


__all__ = [
    "DIFFICULTY_LEVELS",
    "chapter_topics_for_course",
    "generate_personalized_quiz",
    "infer_difficulty",
    "questions_from_payload",
    "student_performance_profile",
]
