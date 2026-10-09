"""Per-learner signal fusion: chatbot + Moodle/LMS + VR → adaptive plan.

EdVidura keeps plans in ``learner_plans``. This module does not replace that
table — it aggregates evidence from three channels and feeds
``adaptive.build_gap_path`` / ``upsert_open_plan`` so each individual's plan
adapts as new inputs arrive.
"""
from __future__ import annotations

import re
from typing import Any
from uuid import UUID

from app.modules import adaptive as adaptive_mod
from app.modules import content
from app.modules import skills as skills_mod
from app.modules.quiz.personalized import student_performance_profile

# xAPI context extension used by coach + VR ingest
_EXT = "https://edvidura.local/xapi/extensions/"
VR_CHANNELS = frozenset({"vr", "sim", "simulation", "hla", "federate"})
COACH_CHANNELS = frozenset({"study_coach", "coach", "ask_vidura"})


def _statement_blob(row: dict[str, Any]) -> dict[str, Any]:
    stmt = row.get("statement") if isinstance(row.get("statement"), dict) else {}
    return stmt if isinstance(stmt, dict) else {}


def _extensions(stmt: dict[str, Any]) -> dict[str, Any]:
    ctx = stmt.get("context") if isinstance(stmt.get("context"), dict) else {}
    ext = ctx.get("extensions") if isinstance(ctx.get("extensions"), dict) else {}
    return ext if isinstance(ext, dict) else {}


def _channel_of(row: dict[str, Any]) -> str:
    stmt = _statement_blob(row)
    ext = _extensions(stmt)
    ch = str(ext.get(f"{_EXT}channel") or "").strip().lower()
    if ch:
        return ch
    obj = stmt.get("object") if isinstance(stmt.get("object"), dict) else {}
    defn = obj.get("definition") if isinstance(obj.get("definition"), dict) else {}
    type_s = str(defn.get("type") or "").lower()
    if "virtual" in type_s or "/vr" in type_s or "simulation" in type_s:
        return "vr"
    return ""


def _coach_text(row: dict[str, Any]) -> str:
    stmt = _statement_blob(row)
    ext = _extensions(stmt)
    bits = [
        str(ext.get(f"{_EXT}message_text") or ""),
        str(ext.get(f"{_EXT}question") or ""),
        str(ext.get(f"{_EXT}coach_strategy") or ""),
    ]
    obj = stmt.get("object") if isinstance(stmt.get("object"), dict) else {}
    defn = obj.get("definition") if isinstance(obj.get("definition"), dict) else {}
    name = defn.get("name") if isinstance(defn.get("name"), dict) else {}
    if isinstance(name, dict):
        bits.append(str(name.get("en-US") or next(iter(name.values()), "") or ""))
    return " ".join(b for b in bits if b).strip()


def _vr_skill_hints(row: dict[str, Any]) -> list[str]:
    stmt = _statement_blob(row)
    ext = _extensions(stmt)
    hints: list[str] = []
    for key in (
        f"{_EXT}skill_code",
        f"{_EXT}skill",
        f"{_EXT}competency",
        f"{_EXT}objective",
    ):
        val = str(ext.get(key) or "").strip()
        if val:
            hints.append(val)
    result = stmt.get("result") if isinstance(stmt.get("result"), dict) else {}
    success = result.get("success")
    score = result.get("score") if isinstance(result.get("score"), dict) else {}
    scaled = score.get("scaled")
    # Failed or low-score VR tasks count as gaps.
    weak = success is False or (
        scaled is not None and float(scaled) < 0.6
    )
    obj = stmt.get("object") if isinstance(stmt.get("object"), dict) else {}
    defn = obj.get("definition") if isinstance(obj.get("definition"), dict) else {}
    name = defn.get("name") if isinstance(defn.get("name"), dict) else {}
    title = ""
    if isinstance(name, dict):
        title = str(name.get("en-US") or next(iter(name.values()), "") or "")
    if weak and title:
        hints.append(title)
    return hints


def _match_skills_from_text(
    text: str,
    catalog: list[dict[str, Any]],
    *,
    status: str = "developing",
    source: str,
) -> list[dict[str, Any]]:
    blob = (text or "").lower()
    if not blob:
        return []
    hits: list[dict[str, Any]] = []
    for sk in catalog:
        code = str(sk.get("skill_code") or "").strip()
        label = str(sk.get("label") or "").strip()
        if not code and not label:
            continue
        matched = False
        if code and code.lower() in blob:
            matched = True
        elif label and label.lower() in blob:
            matched = True
        else:
            tokens = [
                t
                for t in re.split(r"[^a-z0-9]+", label.lower())
                if len(t) > 3
            ]
            if tokens and sum(1 for t in tokens if t in blob) >= max(
                1, (len(tokens) + 1) // 2
            ):
                matched = True
        if matched:
            hits.append(
                {
                    "id": code or label,
                    "label": label or code,
                    "status": status,
                    "percent": 40 if status == "weak" else 55,
                    "source": source,
                    "lesson_id": sk.get("lesson_id"),
                    "manual_id": sk.get("manual_id"),
                    "prefer_path": sk.get("prefer_path") or "lessons",
                    "manual_focus": sk.get("manual_focus") or "",
                }
            )
    return hits


def _summarize_coach(rows: list[dict[str, Any]]) -> dict[str, Any]:
    strategies: dict[str, int] = {}
    grounded = 0
    texts: list[str] = []
    for r in rows:
        stmt = _statement_blob(r)
        ext = _extensions(stmt)
        strat = str(ext.get(f"{_EXT}coach_strategy") or "").strip().lower()
        if strat:
            strategies[strat] = strategies.get(strat, 0) + 1
        if ext.get(f"{_EXT}grounded") is True or str(
            ext.get(f"{_EXT}grounded") or ""
        ).lower() in {"1", "true"}:
            grounded += 1
        t = _coach_text(r)
        if t:
            texts.append(t[:240])
    return {
        "count": len(rows),
        "grounded_count": grounded,
        "strategies": strategies,
        "recent_texts": texts[:8],
    }


def _summarize_vr(rows: list[dict[str, Any]]) -> dict[str, Any]:
    failed = 0
    success = 0
    hints: list[str] = []
    for r in rows:
        stmt = _statement_blob(r)
        result = stmt.get("result") if isinstance(stmt.get("result"), dict) else {}
        if result.get("success") is False:
            failed += 1
        elif result.get("success") is True:
            success += 1
        hints.extend(_vr_skill_hints(r))
    return {
        "count": len(rows),
        "failed": failed,
        "success": success,
        "skill_hints": hints[:12],
    }


def build_learner_signal_profile(
    tenant_id: UUID | str,
    subject: str,
    *,
    course_id: UUID | str | None = None,
    course_label: str = "",
    xapi_limit: int = 80,
) -> dict[str, Any]:
    """Aggregate chatbot, Moodle/LMS, and VR evidence for one LTI subject."""
    sub = (subject or "").strip()
    if not sub:
        return {
            "subject": "",
            "channels": {"chatbot": {}, "moodle": {}, "vr": {}},
            "quiz": {},
            "sources": [],
        }

    quiz_prof = student_performance_profile(
        tenant_id, sub, course_label=course_label
    )
    attempt = adaptive_mod.latest_graded_attempt_for_subject(tenant_id, sub)
    open_plan = adaptive_mod.get_open_plan(tenant_id, sub)

    progress: dict[str, Any] = {}
    if course_id:
        try:
            progress = content.course_progress(
                tenant_id, course_id=course_id, subject=sub
            )
        except Exception:  # noqa: BLE001
            progress = {}

    xapi_rows: list[dict[str, Any]] = []
    try:
        from app.modules import xapi as xapi_mod

        xapi_rows = xapi_mod.list_statements(
            tenant_id, subject=sub, limit=xapi_limit
        )
    except Exception:  # noqa: BLE001
        xapi_rows = []

    coach_rows = [r for r in xapi_rows if _channel_of(r) in COACH_CHANNELS]
    vr_rows = [r for r in xapi_rows if _channel_of(r) in VR_CHANNELS]

    coach = _summarize_coach(coach_rows)
    vr = _summarize_vr(vr_rows)

    moodle = {
        "quiz_attempts": int(quiz_prof.get("attempts") or 0),
        "avg_score_ratio": quiz_prof.get("avg_score_ratio"),
        "difficulty": quiz_prof.get("difficulty"),
        "complexity": quiz_prof.get("complexity"),
        "progress_percent": progress.get("percent"),
        "lessons_completed": progress.get("completed_count"),
        "lessons_total": progress.get("total_count"),
        "completed_ids": list(progress.get("completed_ids") or []),
        "has_open_plan": bool(open_plan and open_plan.get("active")),
        "latest_attempt_id": str((attempt or {}).get("id") or "") or None,
    }

    sources: list[str] = []
    if moodle["quiz_attempts"] or progress.get("total_count"):
        sources.append("moodle")
    if coach.get("count"):
        sources.append("chatbot")
    if vr.get("count"):
        sources.append("vr")

    return {
        "subject": sub,
        "tenant_id": str(tenant_id),
        "course_id": str(course_id) if course_id else None,
        "sources": sources,
        "channels": {
            "chatbot": coach,
            "moodle": moodle,
            "vr": vr,
        },
        "quiz": quiz_prof,
        "open_plan_id": str((open_plan or {}).get("plan_id") or "") or None,
        "attempt": attempt,
    }


def suggest_skill_gaps_from_signals(
    tenant_id: UUID | str,
    profile: dict[str, Any],
    *,
    max_skills: int = 5,
) -> list[dict[str, Any]]:
    """Merge quiz / chatbot / Moodle progress / VR into gap skill rows."""
    catalog = skills_mod.ensure_default_skills(tenant_id)
    by_id: dict[str, dict[str, Any]] = {}

    def _add(row: dict[str, Any], *, weight: int = 1) -> None:
        code = str(row.get("id") or row.get("skill_code") or "").strip()
        if not code:
            return
        prev = by_id.get(code)
        if not prev:
            by_id[code] = {**row, "id": code, "_weight": weight}
            return
        prev["_weight"] = int(prev.get("_weight") or 0) + weight
        # Prefer weaker status.
        order = {"weak": 0, "developing": 1, "strong": 2, "unknown": 3}
        if order.get(str(row.get("status")), 9) < order.get(
            str(prev.get("status")), 9
        ):
            prev["status"] = row.get("status")
            prev["percent"] = row.get("percent")
        src = str(prev.get("source") or "")
        extra = str(row.get("source") or "")
        if extra and extra not in src:
            prev["source"] = f"{src}+{extra}" if src else extra

    # 1) Moodle quiz gaps (primary) — includes personalized-quiz topic matches
    attempt = profile.get("attempt") if isinstance(profile.get("attempt"), dict) else None
    if attempt:
        for w in adaptive_mod.weak_skills_from_attempt(
            attempt.get("answers"), tenant_id=tenant_id
        ):
            _add({**w, "source": w.get("source") or "moodle_quiz"}, weight=3)

    # Also match weak_prompts from performance profile (personalized stems)
    quiz = profile.get("quiz") if isinstance(profile.get("quiz"), dict) else {}
    for prompt in quiz.get("weak_prompts") or []:
        for hit in _match_skills_from_text(
            str(prompt), catalog, status="weak", source="moodle_quiz"
        ):
            _add(hit, weight=2)

    # 2) Chatbot discussion topics → skills
    coach = (profile.get("channels") or {}).get("chatbot") or {}
    for text in coach.get("recent_texts") or []:
        for hit in _match_skills_from_text(
            text, catalog, status="developing", source="chatbot"
        ):
            _add(hit, weight=2)
    # Many hint/socratic turns on Easy learners → reinforce top quiz gaps already added

    # 3) Moodle lesson progress — skills linked to incomplete lessons
    moodle = (profile.get("channels") or {}).get("moodle") or {}
    completed_ids = set()
    # Prefer completed_ids from nested progress if callers attach it
    raw_done = moodle.get("completed_ids") or profile.get("completed_lesson_ids") or []
    if isinstance(raw_done, (list, set, tuple)):
        completed_ids = {str(x) for x in raw_done}
    for sk in catalog:
        lid = str(sk.get("lesson_id") or "").strip()
        if not lid:
            continue
        if completed_ids and lid in completed_ids:
            continue
        if completed_ids or (
            int(moodle.get("lessons_total") or 0)
            and int(moodle.get("lessons_completed") or 0)
            < int(moodle.get("lessons_total") or 0)
        ):
            # Only nudge from progress when we know something is unfinished
            if not completed_ids and not by_id:
                # No quiz/coach gaps yet — seed from unfinished curriculum skills
                _add(
                    {
                        "id": sk["skill_code"],
                        "label": sk.get("label") or sk["skill_code"],
                        "status": "developing",
                        "percent": 50,
                        "source": "moodle_progress",
                        "lesson_id": sk.get("lesson_id"),
                        "manual_id": sk.get("manual_id"),
                        "prefer_path": sk.get("prefer_path") or "lessons",
                    },
                    weight=1,
                )
            elif completed_ids and lid not in completed_ids:
                _add(
                    {
                        "id": sk["skill_code"],
                        "label": sk.get("label") or sk["skill_code"],
                        "status": "developing",
                        "percent": 50,
                        "source": "moodle_progress",
                        "lesson_id": sk.get("lesson_id"),
                        "manual_id": sk.get("manual_id"),
                        "prefer_path": sk.get("prefer_path") or "lessons",
                    },
                    weight=1,
                )

    # 4) VR / sim failures
    vr = (profile.get("channels") or {}).get("vr") or {}
    for hint in vr.get("skill_hints") or []:
        for hit in _match_skills_from_text(
            hint, catalog, status="weak", source="vr"
        ):
            _add(hit, weight=3)
        # Also accept raw skill_code hints
        code = str(hint).strip()
        if any(str(s.get("skill_code")) == code for s in catalog):
            sk = next(s for s in catalog if str(s.get("skill_code")) == code)
            _add(
                {
                    "id": code,
                    "label": sk.get("label") or code,
                    "status": "weak",
                    "percent": 35,
                    "source": "vr",
                    "lesson_id": sk.get("lesson_id"),
                    "manual_id": sk.get("manual_id"),
                },
                weight=3,
            )

    ranked = sorted(
        by_id.values(),
        key=lambda r: (
            0 if r.get("status") == "weak" else 1,
            -int(r.get("_weight") or 0),
            r.get("percent") if r.get("percent") is not None else 999,
            str(r.get("label") or ""),
        ),
    )
    out: list[dict[str, Any]] = []
    for r in ranked[: max(1, max_skills)]:
        row = dict(r)
        row.pop("_weight", None)
        out.append(row)
    return out


def _skill_codes(rows: list[dict[str, Any]] | None) -> set[str]:
    codes: set[str] = set()
    for r in rows or []:
        if isinstance(r, dict):
            c = str(r.get("id") or r.get("skill_code") or r.get("label") or "").strip()
            if c:
                codes.add(c.lower())
        else:
            c = str(r or "").strip()
            if c:
                codes.add(c.lower())
    return codes


def refresh_open_plan_from_signals(
    tenant_id: UUID | str,
    *,
    subject: str,
    quiz_token: str = "",
    course_id: UUID | str | None = None,
    course_label: str = "",
    first_lesson_id: str | None = None,
    first_manual_id: str | None = None,
    manual_version: int | None = None,
    max_skills: int = 5,
    force: bool = False,
) -> dict[str, Any]:
    """Rebuild/adapt the individual's open plan from fused signals.

    Returns ``{adapted, profile, plan, skill_gaps, reason}``.
    """
    sub = (subject or "").strip()
    empty = {
        "adapted": False,
        "profile": {},
        "plan": None,
        "skill_gaps": [],
        "reason": "no_subject",
    }
    if not sub:
        return empty

    profile = build_learner_signal_profile(
        tenant_id,
        sub,
        course_id=course_id,
        course_label=course_label,
    )
    gaps = suggest_skill_gaps_from_signals(
        tenant_id, profile, max_skills=max_skills
    )
    if not gaps:
        return {
            "adapted": False,
            "profile": profile,
            "plan": adaptive_mod.get_open_plan(tenant_id, sub, quiz_token=quiz_token),
            "skill_gaps": [],
            "reason": "no_gaps",
            "sources": list(profile.get("sources") or []),
        }

    existing = adaptive_mod.get_open_plan(tenant_id, sub, quiz_token=quiz_token)
    existing_codes = _skill_codes(
        (existing or {}).get("skills") if existing else []
    )
    new_codes = _skill_codes(gaps)
    if (
        existing
        and existing.get("active")
        and not force
        and new_codes
        and new_codes.issubset(existing_codes)
        and len(existing_codes) <= len(new_codes) + 1
    ):
        return {
            "adapted": False,
            "profile": profile,
            "plan": existing,
            "skill_gaps": gaps,
            "reason": "unchanged",
            "sources": list(profile.get("sources") or []),
        }

    attempt = profile.get("attempt") if isinstance(profile.get("attempt"), dict) else None
    if not attempt or not attempt.get("id"):
        # Signal-only adaptation: review steps without graded retry binding.
        attempt = {
            "id": f"signals-{sub[:40]}",
            "answers": {},
            "subject": sub,
        }

    gap_path = adaptive_mod.build_gap_path(
        tenant_id,
        attempt=attempt,
        quiz_token=quiz_token or "0",
        first_lesson_id=first_lesson_id,
        first_manual_id=first_manual_id,
        manual_version=manual_version,
        max_skills=max_skills,
        skill_gaps=gaps,
        path_mode="gap",
    )
    gap_path["signal_sources"] = list(profile.get("sources") or [])
    gap_path["signal_adapted"] = True

    if not gap_path.get("active"):
        return {
            "adapted": False,
            "profile": profile,
            "plan": existing,
            "skill_gaps": gaps,
            "reason": "path_inactive",
        }

    saved = adaptive_mod.upsert_open_plan(
        tenant_id, subject=sub, gap_path=gap_path
    )
    return {
        "adapted": True,
        "profile": profile,
        "plan": saved or adaptive_mod.get_open_plan(
            tenant_id, sub, quiz_token=quiz_token
        ),
        "skill_gaps": gaps,
        "reason": "updated",
        "sources": list(profile.get("sources") or []),
    }


def class_learner_gap_board(
    tenant_id: UUID | str,
    *,
    learners: list[dict[str, Any]],
    course_id: UUID | str | None = None,
    course_label: str = "",
    limit: int = 20,
) -> list[dict[str, Any]]:
    """Teacher view: who lacks what, with fused signal reasons (per subject).

    Inspired by campus AI insight boards — rebuilt on EdVidura signals + plans.
    """
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for row in learners or []:
        sub = str(row.get("subject") or "").strip()
        if not sub or sub.lower() in seen:
            continue
        seen.add(sub.lower())
        if len(out) >= max(1, min(int(limit), 40)):
            break
        name = str(row.get("learner_name") or row.get("name") or sub)
        try:
            profile = build_learner_signal_profile(
                tenant_id,
                sub,
                course_id=course_id,
                course_label=course_label,
                xapi_limit=40,
            )
            gaps = suggest_skill_gaps_from_signals(
                tenant_id, profile, max_skills=4
            )
        except Exception:  # noqa: BLE001
            profile = {"sources": []}
            gaps = []
        plan = None
        try:
            plan = adaptive_mod.get_open_plan(tenant_id, sub)
        except Exception:  # noqa: BLE001
            plan = None
        why: list[str] = []
        sources = list(profile.get("sources") or [])
        moodle = (profile.get("channels") or {}).get("moodle") or {}
        coach = (profile.get("channels") or {}).get("chatbot") or {}
        vr = (profile.get("channels") or {}).get("vr") or {}
        if moodle.get("quiz_attempts"):
            avg = moodle.get("avg_score_ratio")
            if avg is not None:
                why.append(f"Quiz avg {int(round(100 * float(avg)))}%")
            else:
                why.append(f"{moodle.get('quiz_attempts')} quiz attempt(s)")
        if coach.get("count"):
            why.append(f"{coach.get('count')} Ask Vidura turn(s)")
        if vr.get("failed"):
            why.append(f"{vr.get('failed')} VR miss(es)")
        elif "vr" in sources:
            why.append("VR practice logged")
        if plan and plan.get("active"):
            why.append(
                f"Open plan · {plan.get('done_count') or 0}/"
                f"{plan.get('step_count') or len(plan.get('steps') or [])} steps"
            )
        if not gaps and not why:
            continue
        out.append(
            {
                "subject": sub,
                "learner_name": name,
                "sources": sources,
                "why": why[:4],
                "gaps": [
                    {
                        "code": str(g.get("id") or ""),
                        "label": str(g.get("label") or g.get("id") or "skill"),
                        "status": str(g.get("status") or "developing"),
                        "source": str(g.get("source") or ""),
                    }
                    for g in gaps
                ],
                "has_plan": bool(plan and plan.get("active")),
                "avg_percent": (
                    int(round(100 * float(moodle["avg_score_ratio"])))
                    if moodle.get("avg_score_ratio") is not None
                    else None
                ),
            }
        )
    # Learners with gaps / open plans first
    out.sort(
        key=lambda r: (
            0 if r.get("gaps") else 1,
            0 if r.get("has_plan") else 1,
            str(r.get("learner_name") or ""),
        )
    )
    return out


def note_learner_activity(
    tenant_id: UUID | str,
    *,
    subject: str,
    channel: str,
    quiz_token: str = "",
    course_id: UUID | str | None = None,
    course_label: str = "",
    first_lesson_id: str | None = None,
) -> dict[str, Any]:
    """Hook after chatbot / Moodle / VR events — adapt plan when evidence shifts."""
    ch = (channel or "").strip().lower()
    force = ch in {"chatbot", "coach", "study_coach", "vr", "sim", "quiz"}
    return refresh_open_plan_from_signals(
        tenant_id,
        subject=subject,
        quiz_token=quiz_token,
        course_id=course_id,
        course_label=course_label,
        first_lesson_id=first_lesson_id,
        force=force and ch in {"vr", "sim", "quiz"},
    )
