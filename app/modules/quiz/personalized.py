"""Per-student AI quizzes: unique items covering every page/section of class books."""
from __future__ import annotations

import hashlib
from typing import Any
from uuid import UUID

from app.modules.ai_assessment.llm import openai_chat_json, run_ai
from app.modules.quiz.service import Question

DIFFICULTY_LEVELS = ("foundational", "core", "challenge")
COMPLEXITY_LEVELS = ("recall", "apply", "analyze")
# Align with PDF page extract limit — later pages must still be tested.
MAX_COVERAGE_UNITS = 40

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

_COMPLEXITY_HINTS = {
    "recall": (
        "COMPLEXITY=recall: Ask what the text says — definitions, facts, "
        "and direct statements. Do not require multi-step reasoning."
    ),
    "apply": (
        "COMPLEXITY=apply: Ask the student to use the idea in a short, "
        "realistic classroom situation still grounded in the text."
    ),
    "analyze": (
        "COMPLEXITY=analyze: Ask compare / why / best-reason items that "
        "stay inside the provided pages — no outside knowledge."
    ),
}

_DIFFICULTY_CACHE_TTL = 90 * 24 * 3600  # 90 days


def normalize_difficulty(value: str | None) -> str:
    from app.modules.ai_assessment.service import normalize_difficulty as _norm

    return _norm(value)


def normalize_complexity(value: str | None) -> str:
    raw = (value or "apply").strip().lower()
    aliases = {
        "shallow": "recall",
        "basic": "recall",
        "remember": "recall",
        "factual": "recall",
        "standard": "apply",
        "medium": "apply",
        "use": "apply",
        "deep": "analyze",
        "hard": "analyze",
        "analyse": "analyze",
        "analysis": "analyze",
    }
    if raw in COMPLEXITY_LEVELS:
        return raw
    if raw in aliases:
        return aliases[raw]
    return "apply"


def complexity_label(value: str | None) -> str:
    raw = (value or "").strip().lower()
    if raw == "auto":
        return "Auto"
    key = normalize_complexity(raw or "apply")
    return {
        "recall": "Recall",
        "apply": "Apply",
        "analyze": "Analyze",
    }.get(key, "Apply")


def difficulty_plain_label(value: str | None) -> str:
    from app.modules.ai_assessment import difficulty_label

    return difficulty_label(value)


def tenant_quiz_difficulty_key(tenant_id: UUID | str) -> str:
    return f"edvidura:quiz_difficulty:{tenant_id}"


def _read_tenant_quiz_blob(tenant_id: UUID | str) -> dict[str, Any]:
    from app.launch_cache import LAUNCH_CACHE

    raw = LAUNCH_CACHE.get(tenant_quiz_difficulty_key(tenant_id))
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return dict(raw)
    # Legacy: plain string was difficulty only.
    return {"difficulty": str(raw).strip().lower()}


def get_tenant_quiz_settings(tenant_id: UUID | str) -> dict[str, str]:
    """Teacher quiz customisation: difficulty + complexity (auto when unset)."""
    blob = _read_tenant_quiz_blob(tenant_id)
    diff = str(blob.get("difficulty") or "auto").strip().lower() or "auto"
    comp = str(blob.get("complexity") or "auto").strip().lower() or "auto"
    if diff not in {"auto", *DIFFICULTY_LEVELS}:
        diff = "auto" if diff in {""} else normalize_difficulty(diff)
        if diff not in DIFFICULTY_LEVELS:
            diff = "auto"
    if comp not in {"auto", *COMPLEXITY_LEVELS}:
        if comp in {"", "auto"}:
            comp = "auto"
        else:
            comp = normalize_complexity(comp)
    return {"difficulty": diff, "complexity": comp}


def get_tenant_quiz_difficulty(tenant_id: UUID | str) -> str | None:
    """Teacher-selected difficulty for student quizzes, or None = auto."""
    diff = get_tenant_quiz_settings(tenant_id)["difficulty"]
    if diff in {"", "auto"}:
        return None
    if diff in DIFFICULTY_LEVELS:
        return diff
    return normalize_difficulty(diff)


def get_tenant_quiz_complexity(tenant_id: UUID | str) -> str | None:
    """Teacher-selected complexity, or None = auto from performance."""
    comp = get_tenant_quiz_settings(tenant_id)["complexity"]
    if comp in {"", "auto"}:
        return None
    return normalize_complexity(comp)


def set_tenant_quiz_difficulty(
    tenant_id: UUID | str, difficulty: str | None
) -> str:
    """Persist difficulty; keep existing complexity."""
    settings = get_tenant_quiz_settings(tenant_id)
    return set_tenant_quiz_settings(
        tenant_id,
        difficulty=difficulty,
        complexity=settings.get("complexity") or "auto",
    )["difficulty"]


def set_tenant_quiz_settings(
    tenant_id: UUID | str,
    *,
    difficulty: str | None = None,
    complexity: str | None = None,
) -> dict[str, str]:
    """Persist teacher Easy/Medium/Hard + Recall/Apply/Analyze (or auto)."""
    from app.launch_cache import LAUNCH_CACHE

    current = get_tenant_quiz_settings(tenant_id)
    diff_raw = (
        difficulty
        if difficulty is not None
        else current.get("difficulty") or "auto"
    )
    comp_raw = (
        complexity
        if complexity is not None
        else current.get("complexity") or "auto"
    )
    diff_s = (diff_raw or "auto").strip().lower()
    comp_s = (comp_raw or "auto").strip().lower()
    if diff_s in {"", "auto"}:
        diff_out = "auto"
    else:
        diff_out = normalize_difficulty(diff_s)
    if comp_s in {"", "auto"}:
        comp_out = "auto"
    else:
        comp_out = normalize_complexity(comp_s)
    LAUNCH_CACHE.set(
        tenant_quiz_difficulty_key(tenant_id),
        {"difficulty": diff_out, "complexity": comp_out},
        exp=_DIFFICULTY_CACHE_TTL,
    )
    return {"difficulty": diff_out, "complexity": comp_out}


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


def infer_complexity(
    *,
    score_ratio: float | None,
    attempts: int = 0,
) -> str:
    """Map recent performance to recall / apply / analyze."""
    if score_ratio is None or attempts <= 0:
        return "apply"
    if score_ratio < 0.45:
        return "recall"
    if score_ratio >= 0.8:
        return "analyze"
    return "apply"


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
    complexity = infer_complexity(score_ratio=avg, attempts=len(ratios))
    return {
        "attempts": len(mine),
        "avg_score_ratio": avg,
        "difficulty": difficulty,
        "complexity": complexity,
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
                # Keep enough text so later pages/sections are not truncated away.
                "body": body[:12000],
            }
        )
    return title, topics


def _student_seed(subject: str, extra: str = "") -> int:
    raw = f"{subject}|{extra}".encode("utf-8")
    return int(hashlib.sha256(raw).hexdigest()[:8], 16)


def expand_topics_to_coverage_units(
    topics: list[dict[str, str]],
    *,
    max_units: int = MAX_COVERAGE_UNITS,
) -> list[dict[str, str]]:
    """Split every chapter into page/section units so quizzes cover the whole book.

    Long lessons become ordered parts (headings or equal chunks). Short lessons
    stay one unit. Caps at ``max_units`` while keeping early→late order.
    """
    from app.modules.ai_assessment.service import segment_text_for_coverage

    units: list[dict[str, str]] = []
    for ti, t in enumerate(topics):
        title = str(t.get("title") or "Chapter").strip() or "Chapter"
        body = str(t.get("body") or "").strip()
        if len(body) < 40:
            continue
        remaining = max_units - len(units)
        if remaining <= 0:
            break
        later_chapters = max(0, len(topics) - ti - 1)
        budget = max(1, remaining - later_chapters)
        segs = segment_text_for_coverage(body, title=title, max_segments=budget)
        if not segs:
            units.append({"title": title, "body": body[:2500], "chapter": title})
            continue
        for seg in segs:
            label = str(seg.get("label") or title).strip() or title
            if title.lower() not in label.lower():
                label = f"{title} · {label}"
            units.append(
                {
                    "title": label[:120],
                    "body": str(seg.get("text") or "")[:2500],
                    "chapter": title,
                }
            )
            if len(units) >= max_units:
                return units
    return units


def _unit_covered_by_prompt(unit_title: str, prompt: str, topic: str = "") -> bool:
    """True when a question clearly belongs to this page/section unit."""
    blob = f"{prompt} {topic}".lower()
    title = (unit_title or "").strip().lower()
    if not title:
        return False
    if title in blob:
        return True
    tokens = [
        w for w in title.replace("·", " ").replace("/", " ").split() if len(w) > 3
    ]
    if not tokens:
        return title[:12] in blob if len(title) >= 4 else False
    hits = sum(1 for w in tokens if w in blob)
    return hits >= max(1, min(2, len(tokens) // 2))


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
        topic = str(
            item.get("page") or item.get("chapter") or item.get("topic") or ""
        ).strip()
        qid = f"pq{(seed + i) % 100000:05d}"
        out.append(
            Question(
                id=qid,
                prompt=prompt,
                choices=tuple(choices),
                correct_index=ci,
                topic=topic,
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
    complexity: str = "apply",
) -> list[Question]:
    """Deterministic-but-unique local items covering every page/section unit."""
    from app.modules.ai_assessment.service import GENERIC_DISTRACTORS, _sentences

    level = normalize_difficulty(difficulty)
    depth = normalize_complexity(complexity)
    per_unit: list[list[tuple[str, str]]] = []
    for t in topics:
        title = t["title"]
        sents = _sentences(t["body"])[:4]
        if not sents:
            chunk = (t["body"] or "").strip()[:160] or title
            sents = [chunk]
        rot = seed % len(sents)
        ordered_s = sents[rot:] + sents[:rot]
        per_unit.append([(title, s) for s in ordered_s])
    if not per_unit:
        per_unit = [
            [
                (
                    course_title or "this course",
                    f"{course_title or 'This course'} covers the class chapters.",
                )
            ]
        ]

    first_pass = [unit[0] for unit in per_unit]
    extras: list[tuple[str, str]] = []
    max_len = max(len(u) for u in per_unit)
    for i in range(1, max_len):
        for unit in per_unit:
            if i < len(unit):
                extras.append(unit[i])
    start = seed % max(1, len(extras)) if extras else 0
    ordered_extras = extras[start:] + extras[:start] if extras else []
    if level == "challenge" or depth == "analyze":
        ordered_extras = list(reversed(ordered_extras))
    ordered = first_pass + ordered_extras

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
        if depth == "recall":
            prompt = f"From “{title}”: which fact is stated in the lesson?"
        elif depth == "analyze":
            prompt = (
                f"Using “{title}”, which choice best explains why this matters: "
                f"“{fact[:55]}…”?"
            )[:240]
        elif level == "foundational":
            prompt = f"From “{title}”: which statement is true?"
        elif level == "challenge":
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
                topic=title,
            )
        )
    return questions


def _fill_missing_coverage(
    questions: list[Question],
    units: list[dict[str, str]],
    *,
    difficulty: str,
    seed: int,
    course_title: str,
    complexity: str = "apply",
) -> list[Question]:
    """Append local items for any page/section the model skipped."""
    covered: set[str] = set()
    for q in questions:
        for u in units:
            if _unit_covered_by_prompt(u["title"], q.prompt, q.topic):
                covered.add(u["title"])
    missing = [u for u in units if u["title"] not in covered]
    if not missing:
        return questions
    fillers = _local_personalized_mcqs(
        missing,
        count=len(missing),
        difficulty=difficulty,
        seed=seed + 17,
        course_title=course_title,
        complexity=complexity,
    )
    return list(questions) + fillers


def _ensure_plan_skill_coverage(
    questions: list[Question],
    *,
    plan_skills: list[dict[str, str]],
    units: list[dict[str, str]],
    difficulty: str,
    complexity: str,
    seed: int,
) -> list[Question]:
    """Append local items so open study-plan gap skills appear in stems."""
    if not plan_skills or not units:
        return questions
    blob = _question_blob(questions)
    missing = [s for s in plan_skills if not _skill_matched(s, blob)]
    if not missing:
        return questions
    from app.modules.ai_assessment.service import GENERIC_DISTRACTORS, _sentences

    level = normalize_difficulty(difficulty)
    depth = normalize_complexity(complexity)
    out = list(questions)
    for i, sk in enumerate(missing):
        label = sk["label"]
        unit = units[(seed + i) % len(units)]
        title = unit["title"]
        sents = _sentences(unit.get("body") or "")[:2]
        fact = (sents[0] if sents else title)[:160]
        correct_index = (seed + i + 3) % 4
        choices = [""] * 4
        choices[correct_index] = fact
        di = 0
        for idx in range(4):
            if idx == correct_index:
                continue
            choices[idx] = GENERIC_DISTRACTORS[di % len(GENERIC_DISTRACTORS)][:160]
            di += 1
        if depth == "analyze" or level == "challenge":
            prompt = (
                f"For your study-plan gap “{label}”, using “{title}”, "
                f"which choice best applies the idea behind: “{fact[:60]}…”?"
            )[:240]
        elif depth == "recall" or level == "foundational":
            prompt = (
                f"Study-plan focus “{label}” — from “{title}”: "
                "which fact is stated in the lesson?"
            )
        else:
            prompt = (
                f"Study-plan focus “{label}” — according to “{title}”, "
                "which statement is correct?"
            )
        out.append(
            Question(
                id=f"ps{(seed + i) % 100000:05d}",
                prompt=prompt,
                choices=tuple(choices),
                correct_index=correct_index,
                topic=title,
            )
        )
        blob = _question_blob(out)
    return out


def _skill_label(skill: Any) -> str:
    if isinstance(skill, dict):
        return str(
            skill.get("label")
            or skill.get("title")
            or skill.get("skill_code")
            or skill.get("code")
            or ""
        ).strip()
    return str(skill or "").strip()


def _skill_code(skill: Any) -> str:
    if isinstance(skill, dict):
        return str(skill.get("skill_code") or skill.get("code") or "").strip()
    return ""


def extract_plan_skills(plan: dict[str, Any] | None) -> list[dict[str, str]]:
    """Normalize open study-plan skill rows for quiz validation."""
    if not plan or not plan.get("active"):
        return []
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for raw in plan.get("skills") or []:
        label = _skill_label(raw)
        code = _skill_code(raw)
        key = (code or label).lower()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append({"label": label or code, "skill_code": code})
    return out[:8]


def _question_blob(questions: list[Any]) -> str:
    parts: list[str] = []
    for q in questions:
        if isinstance(q, dict):
            parts.append(str(q.get("prompt") or ""))
            parts.append(str(q.get("topic") or ""))
        else:
            parts.append(str(getattr(q, "prompt", "") or ""))
            parts.append(str(getattr(q, "topic", "") or ""))
    return " ".join(parts).lower()


def _skill_matched(skill: dict[str, str], blob: str) -> bool:
    label = (skill.get("label") or "").lower()
    code = (skill.get("skill_code") or "").lower()
    if code and code in blob:
        return True
    if not label:
        return False
    if label in blob:
        return True
    tokens = [t for t in label.replace("-", " ").replace("_", " ").split() if len(t) > 3]
    if not tokens:
        return False
    hits = sum(1 for t in tokens if t in blob)
    return hits >= max(1, (len(tokens) + 1) // 2)


def validate_study_plan_for_quiz(
    *,
    plan: dict[str, Any] | None,
    questions: list[Any],
    profile: dict[str, Any],
    difficulty: str,
    complexity: str,
    covers_all_pages: bool,
) -> dict[str, Any]:
    """Check quiz aligns with learner performance + open gap study plan."""
    skills = extract_plan_skills(plan)
    blob = _question_blob(questions)
    aligned: list[str] = []
    missing: list[str] = []
    for sk in skills:
        label = sk["label"]
        if _skill_matched(sk, blob):
            aligned.append(label)
        else:
            missing.append(label)

    weak = [str(w)[:80] for w in (profile.get("weak_prompts") or [])[:4] if w]
    perf_level = str(profile.get("difficulty") or "core")
    perf_depth = str(profile.get("complexity") or "apply")
    performance_aligned = (
        normalize_difficulty(difficulty) == normalize_difficulty(perf_level)
        and normalize_complexity(complexity) == normalize_complexity(perf_depth)
    ) or int(profile.get("attempts") or 0) == 0

    has_plan = bool(skills)
    if not has_plan:
        valid = bool(covers_all_pages)
        message = (
            "No open study plan — quiz uses full-book coverage and this "
            "student's Easy/Medium/Hard + Recall/Apply/Analyze from scores."
        )
    else:
        # Require every plan skill when ≤2; otherwise at least half.
        need = len(skills) if len(skills) <= 2 else max(1, (len(skills) + 1) // 2)
        skills_ok = len(aligned) >= need
        valid = bool(covers_all_pages) and skills_ok
        if valid:
            message = (
                f"Study plan validated — quiz covers {len(aligned)}/{len(skills)} "
                "gap skills from this learner's plan."
            )
        else:
            message = (
                f"Study plan needs more coverage — missing gap skills: "
                f"{', '.join(missing[:4]) or 'unknown'}."
            )

    return {
        "has_plan": has_plan,
        "plan_id": str((plan or {}).get("plan_id") or "") if plan else "",
        "valid": valid,
        "covers_all_pages": bool(covers_all_pages),
        "skills_targeted": [s["label"] for s in skills],
        "skills_aligned": aligned,
        "skills_missing": missing,
        "weak_prompts": weak,
        "performance_level": difficulty_plain_label(perf_level),
        "performance_complexity": complexity_label(perf_depth),
        "performance_aligned": performance_aligned,
        "message": message,
    }


def _openai_personalized_mcqs(
    topics: list[dict[str, str]],
    *,
    count: int,
    difficulty: str,
    course_title: str,
    focus_hints: list[str],
    student_seed: str,
    complexity: str = "apply",
) -> list[Question]:
    corpus = [
        {
            "page": t["title"],
            "chapter": t.get("chapter") or t["title"],
            "text": t["body"][:1000],
        }
        for t in topics[:MAX_COVERAGE_UNITS]
    ]
    level = normalize_difficulty(difficulty)
    depth = normalize_complexity(complexity)
    hint = _DIFFICULTY_HINTS.get(level, _DIFFICULTY_HINTS["core"])
    depth_hint = _COMPLEXITY_HINTS.get(depth, _COMPLEXITY_HINTS["apply"])
    pages = [t["title"] for t in topics]
    focus = [str(h).strip() for h in focus_hints if str(h).strip()][:12]
    focus_line = (
        "Study-plan / weak areas to emphasize (still cover EVERY page): "
        + "; ".join(focus)
        if focus
        else "No extra focus — cover every page evenly."
    )
    data = openai_chat_json(
        system=(
            "You write personalized school quiz MCQs for ONE student. "
            "Use ONLY the provided page/section texts. "
            f"Difficulty guidance: {hint} "
            f"{depth_hint} "
            "Make items different for this student — vary stems and scenarios "
            "using the student_seed as a creativity salt (do not mention the seed). "
            "CRITICAL FAIRNESS RULE: every student must be tested on the WHOLE book. "
            "Include at least ONE question for EVERY page/section listed — "
            "do not skip later pages so a student who only studied early pages "
            "cannot get an unfair advantage. "
            "When study-plan focus areas are listed, weave those skills into "
            "stems where the page text supports them (do not invent outside facts). "
            "Return ONLY JSON: "
            '{"questions":[{"prompt":"...","choices":["A","B","C","D"],'
            '"correct_index":0,"page":"..."}]} '
            "Exactly 4 choices; correct_index is 0-based. No markdown."
        ),
        user=(
            f"Course: {course_title or 'class course'}\n"
            f"Student seed: {student_seed}\n"
            f"Target difficulty: {level}\n"
            f"Target complexity: {depth}\n"
            f"{focus_line}\n"
            f"All pages/sections (MUST each appear ≥1 time): {pages}\n"
            f"Create exactly {count} unique MCQs covering every page/section:\n{corpus}"
        ),
        temperature=0.45,
    )
    raw = data.get("questions") if isinstance(data, dict) else None
    if not isinstance(raw, list):
        raise ValueError("Model response missing questions list")
    seed = _student_seed(student_seed, f"{level}|{depth}")
    return _normalize_mcq_items(raw, count=count, seed=seed)


def generate_personalized_quiz(
    *,
    tenant_id: UUID | str,
    subject: str,
    course_id: UUID | str | None,
    list_lessons_fn,
    get_bound_course_fn,
    count: int | None = None,
    course_label: str = "",
    learner_name: str = "",
    difficulty: str | None = None,
    complexity: str | None = None,
) -> dict[str, Any]:
    """Build a unique AI quiz covering all pages with level + complexity.

    Fairness: at least one item per coverage unit. difficulty = Easy/Medium/Hard;
    complexity = Recall/Apply/Analyze.
    """
    from app.modules.ai_assessment.service import coverage_question_count

    course_title, topics = chapter_topics_for_course(
        tenant_id,
        course_id,
        list_lessons_fn=list_lessons_fn,
        get_bound_course_fn=get_bound_course_fn,
    )
    if not topics:
        raise ValueError(
            "No class chapter lessons found for a quiz. "
            "Ask your teacher to publish reading lessons for this course."
        )
    units = expand_topics_to_coverage_units(topics)
    if not units:
        raise ValueError(
            "Class lessons do not have enough text to build a full-book quiz."
        )
    profile = student_performance_profile(
        tenant_id, subject, course_label=course_label or course_title
    )
    if difficulty:
        level = normalize_difficulty(difficulty)
        difficulty_source = "teacher"
    else:
        teacher_level = get_tenant_quiz_difficulty(tenant_id)
        if teacher_level:
            level = teacher_level
            difficulty_source = "teacher"
        else:
            level = str(profile.get("difficulty") or "core")
            difficulty_source = "auto"

    if complexity:
        depth = normalize_complexity(complexity)
        complexity_source = "teacher"
    else:
        teacher_depth = get_tenant_quiz_complexity(tenant_id)
        if teacher_depth:
            depth = teacher_depth
            complexity_source = "teacher"
        else:
            depth = str(profile.get("complexity") or "apply")
            complexity_source = "auto"

    requested = len(units) if count is None else int(count)
    n = coverage_question_count(requested, len(units), cap=MAX_COVERAGE_UNITS)
    seed_s = f"{subject}|{learner_name}|{course_id or ''}|{depth}"
    seed = _student_seed(seed_s, level)
    chapter_titles = [t["title"] for t in topics]
    unit_titles = [u["title"] for u in units]

    open_plan: dict[str, Any] | None = None
    try:
        from app.modules import adaptive as adaptive_mod

        open_plan = adaptive_mod.get_open_plan(tenant_id, subject)
    except Exception:  # noqa: BLE001
        open_plan = None
    plan_skills = extract_plan_skills(open_plan)
    focus_hints = (
        [s["label"] for s in plan_skills]
        + list(profile.get("weak_prompts") or [])[:4]
        + unit_titles[:8]
    )

    def _openai():
        qs = _openai_personalized_mcqs(
            units,
            count=n,
            difficulty=level,
            complexity=depth,
            course_title=course_title,
            focus_hints=focus_hints,
            student_seed=seed_s,
        )
        qs = _fill_missing_coverage(
            qs,
            units,
            difficulty=level,
            complexity=depth,
            seed=seed,
            course_title=course_title,
        )
        if len(qs) < len(units):
            raise ValueError("Coverage incomplete after model fill")
        return {"questions": qs[: max(n, len(units))]}

    def _local():
        return {
            "questions": _local_personalized_mcqs(
                units,
                count=n,
                difficulty=level,
                complexity=depth,
                seed=seed,
                course_title=course_title,
            )
        }

    result = run_ai(
        openai_fn=_openai,
        local_fn=_local,
        feature="personalized_quiz",
        route_state={
            "unit_count": len(units),
            "difficulty": level,
            "complexity": depth,
            "course_title": course_title[:120],
            "has_study_plan_focus": bool(plan_skills),
            "goal": (
                "Build a full-book MCQ quiz. Prefer local when Easy/Recall and "
                "unit_count is modest; prefer remote for Analyze/Hard or large books."
            ),
        },
    )
    questions: list[Question] = list(result.get("questions") or [])
    if not questions:
        questions = _local_personalized_mcqs(
            units,
            count=n,
            difficulty=level,
            complexity=depth,
            seed=seed,
            course_title=course_title,
        )
    else:
        questions = _fill_missing_coverage(
            questions,
            units,
            difficulty=level,
            complexity=depth,
            seed=seed,
            course_title=course_title,
        )
    if len(questions) < len(units):
        questions = _local_personalized_mcqs(
            units,
            count=len(units),
            difficulty=level,
            complexity=depth,
            seed=seed,
            course_title=course_title,
        )
    covered = [
        u["title"]
        for u in units
        if any(_unit_covered_by_prompt(u["title"], q.prompt, q.topic) for q in questions)
    ]
    covers_all = len(covered) >= len(units)
    if not covers_all:
        questions = _local_personalized_mcqs(
            units,
            count=max(n, len(units)),
            difficulty=level,
            complexity=depth,
            seed=seed,
            course_title=course_title,
        )
        covers_all = True
        covered = unit_titles

    jev_coverage: dict[str, Any] = {"used": False}
    try:
        from app.modules import jev as jev_mod

        jev_coverage = jev_mod.quiz_coverage_ok(
            unit_titles=unit_titles,
            question_stems=[q.prompt for q in questions],
        )
        if jev_coverage.get("used") and jev_coverage.get("covers_all") is False:
            questions = _local_personalized_mcqs(
                units,
                count=max(n, len(units)),
                difficulty=level,
                complexity=depth,
                seed=seed + 31,
                course_title=course_title,
            )
            covers_all = True
            covered = unit_titles
            jev_coverage["remediated"] = True
    except Exception:  # noqa: BLE001
        jev_coverage = {"used": False, "fallback_reason": "jev_error"}

    questions = _ensure_plan_skill_coverage(
        questions,
        plan_skills=plan_skills,
        units=units,
        difficulty=level,
        complexity=depth,
        seed=seed + 53,
    )
    study_plan = validate_study_plan_for_quiz(
        plan=open_plan,
        questions=questions,
        profile=profile,
        difficulty=level,
        complexity=depth,
        covers_all_pages=covers_all,
    )

    payload_qs = [
        {
            "id": q.id,
            "prompt": q.prompt,
            "choices": list(q.choices),
            "correct_index": q.correct_index,
            "topic": q.topic,
        }
        for q in questions
    ]
    return {
        "questions": questions,
        "question_payload": payload_qs,
        "course_title": course_title,
        "difficulty": level,
        "difficulty_label": difficulty_plain_label(level),
        "difficulty_source": difficulty_source,
        "complexity": depth,
        "complexity_label": complexity_label(depth),
        "complexity_source": complexity_source,
        "topics": chapter_titles,
        "focus_topics": chapter_titles,
        "coverage_units": unit_titles,
        "coverage_unit_count": len(units),
        "covered_unit_count": len(covered),
        "profile": {
            "attempts": profile.get("attempts"),
            "avg_score_ratio": profile.get("avg_score_ratio"),
            "weak_prompts": list(profile.get("weak_prompts") or [])[:4],
        },
        "provider": result.get("provider"),
        "model": result.get("model"),
        "student_seed": seed_s,
        "mode": "personalized_ai",
        "covers_all_topics": covers_all,
        "covers_all_pages": covers_all,
        "jev_coverage": jev_coverage,
        "jev_route": result.get("jev_route"),
        "study_plan_validation": study_plan,
        "study_plan_valid": bool(study_plan.get("valid")),
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
                topic=str(item.get("topic") or ""),
            )
        )
    return tuple(out)


__all__ = [
    "DIFFICULTY_LEVELS",
    "COMPLEXITY_LEVELS",
    "MAX_COVERAGE_UNITS",
    "chapter_topics_for_course",
    "complexity_label",
    "expand_topics_to_coverage_units",
    "generate_personalized_quiz",
    "get_tenant_quiz_complexity",
    "get_tenant_quiz_difficulty",
    "get_tenant_quiz_settings",
    "infer_complexity",
    "infer_difficulty",
    "normalize_complexity",
    "normalize_difficulty",
    "questions_from_payload",
    "set_tenant_quiz_difficulty",
    "set_tenant_quiz_settings",
    "student_performance_profile",
]
