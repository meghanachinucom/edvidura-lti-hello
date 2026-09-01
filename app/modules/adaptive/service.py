"""C9 adaptive recommendations + C10 gap training + persisted PLE plans.

Derives ordered review → practice → graded steps from C8 skills + latest attempt.
Personal learning plans store that path per LTI subject until cleared or superseded.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from uuid import UUID

from app import db
from app.modules.specials import competency_profile
from app.modules import skills as skills_mod


def weak_skills_from_attempt(
    answers: Any,
    *,
    tenant_id: UUID | str | None = None,
    include_developing: bool = True,
) -> list[dict[str, Any]]:
    """Skills that are weak (and optionally developing) on this attempt."""
    statuses = {"weak", "developing"} if include_developing else {"weak"}
    rows = competency_profile(answers, tenant_id=tenant_id)
    weak = [r for r in rows if r.get("status") in statuses and int(r.get("total") or 0) > 0]
    # Prefer weaker first, then lower percent
    weak.sort(
        key=lambda r: (
            0 if r.get("status") == "weak" else 1,
            r.get("percent") if r.get("percent") is not None else 999,
            str(r.get("label") or ""),
        )
    )
    return weak


def _review_href_for_skill(
    skill: dict[str, Any],
    *,
    quiz_token: str,
    attempt_id: str,
    first_lesson_id: str | None = None,
    first_manual_id: str | None = None,
    manual_version: int | None = None,
) -> tuple[str, str]:
    """Return (href, label) for a skill review step."""
    rem = {
        "path": skill.get("prefer_path") or "manuals",
        "label": skill.get("teleport_label") or f"Review: {skill.get('label') or 'skill'}",
        "lesson_id": skill.get("lesson_id") or first_lesson_id,
        "manual_id": skill.get("manual_id") or first_manual_id,
        "manual_focus": skill.get("manual_focus") or "",
    }
    path = rem["path"]
    lesson_id = rem["lesson_id"]
    manual_id = rem["manual_id"]
    focus = rem["manual_focus"]
    label = rem["label"]
    if path == "manuals" and manual_id:
        href = f"/manuals/{manual_id}?token={quiz_token}"
        if manual_version is not None:
            href += f"&v={manual_version}"
        if focus:
            href += f"&focus={focus}"
        href += f"&loop=1&from_attempt={attempt_id}"
        return href, label
    if lesson_id:
        href = f"/lessons/{lesson_id}?token={quiz_token}&loop=1&from_attempt={attempt_id}"
        return href, label
    if manual_id:
        href = f"/manuals/{manual_id}?token={quiz_token}&loop=1&from_attempt={attempt_id}"
        if focus:
            href += f"&focus={focus}"
        return href, label
    return f"/lessons?token={quiz_token}", label


def build_gap_path(
    tenant_id: UUID | str,
    *,
    attempt: dict[str, Any],
    quiz_token: str,
    first_lesson_id: str | None = None,
    first_manual_id: str | None = None,
    manual_version: int | None = None,
    max_skills: int = 3,
    skill_gaps: list[dict[str, Any]] | None = None,
    path_mode: str = "gap",
) -> dict[str, Any]:
    """
    C10 gap / D23 difference training path.

    skill_gaps: optional precomputed gaps (role difference). Else derive from attempt.
    """
    attempt_id = str(attempt.get("id") or "")
    if skill_gaps is not None:
        weak = list(skill_gaps)[: max(1, max_skills)] if skill_gaps else []
    else:
        weak = weak_skills_from_attempt(
            attempt.get("answers"), tenant_id=tenant_id
        )[: max(1, max_skills)]
    if not weak or not attempt_id:
        return {
            "active": False,
            "mode": path_mode,
            "skills": [],
            "steps": [],
            "first_href": "",
            "practice_href": "",
            "graded_href": "",
        }

    skill_rows = {s["skill_code"]: s for s in skills_mod.ensure_default_skills(tenant_id)}
    steps: list[dict[str, Any]] = []
    seen_review: set[str] = set()
    for i, w in enumerate(weak, start=1):
        code = str(w.get("id") or "")
        skill = skill_rows.get(code) or {
            "skill_code": code,
            "label": w.get("label") or code,
            "prefer_path": w.get("prefer_path") or "lessons",
            "teleport_label": f"Review: {w.get('label') or code}",
            "lesson_id": w.get("lesson_id") or first_lesson_id,
            "manual_id": w.get("manual_id") or first_manual_id,
            "manual_focus": w.get("manual_focus") or "",
        }
        href, label = _review_href_for_skill(
            skill,
            quiz_token=quiz_token,
            attempt_id=attempt_id,
            first_lesson_id=first_lesson_id,
            first_manual_id=first_manual_id,
            manual_version=manual_version,
        )
        if href in seen_review:
            continue
        seen_review.add(href)
        meta = (
            f"Role gap · {w.get('status')}"
            if path_mode == "difference"
            else f"Gap skill · {w.get('status')}"
        )
        steps.append(
            {
                "kind": "review",
                "n": len(steps) + 1,
                "skill_code": code,
                "skill_label": w.get("label") or code,
                "status": w.get("status"),
                "percent": w.get("percent"),
                "label": label,
                "href": href,
                "meta": meta,
            }
        )

    practice_href = (
        f"/quiz?token={quiz_token}&practice=1&retry={attempt_id}&loop=1"
    )
    graded_href = f"/quiz?token={quiz_token}&retry={attempt_id}&loop=1"
    steps.append(
        {
            "kind": "practice",
            "n": len(steps) + 1,
            "label": "Practice missed items",
            "href": practice_href,
            "meta": "Sandbox — no Moodle sync",
        }
    )
    steps.append(
        {
            "kind": "graded",
            "n": len(steps) + 1,
            "label": "Graded retry",
            "href": graded_href,
            "meta": "Can sync to Moodle gradebook",
        }
    )
    first = steps[0]["href"] if steps else ""
    return {
        "active": True,
        "mode": path_mode,
        "skills": [
            {
                "id": w.get("id"),
                "label": w.get("label"),
                "status": w.get("status"),
                "percent": w.get("percent"),
            }
            for w in weak
        ],
        "steps": steps,
        "first_href": first,
        "practice_href": practice_href,
        "graded_href": graded_href,
        "attempt_id": attempt_id,
    }


def build_difference_path(
    tenant_id: UUID | str,
    *,
    role_code: str,
    attempt: dict[str, Any],
    quiz_token: str,
    first_lesson_id: str | None = None,
    first_manual_id: str | None = None,
    manual_version: int | None = None,
    max_skills: int = 5,
) -> dict[str, Any]:
    """D23: required skills for target role minus demonstrated mastery."""
    gaps = skills_mod.skill_gaps_for_role(
        tenant_id,
        role_code=role_code,
        answers=(attempt or {}).get("answers"),
    )
    path = build_gap_path(
        tenant_id,
        attempt=attempt,
        quiz_token=quiz_token,
        first_lesson_id=first_lesson_id,
        first_manual_id=first_manual_id,
        manual_version=manual_version,
        max_skills=max_skills,
        skill_gaps=gaps,
        path_mode="difference",
    )
    path["role_code"] = (role_code or "").strip().lower()
    return path


def recommend_next_lesson(
    tenant_id: UUID | str,
    *,
    course_id: UUID | str | None,
    attempt: dict[str, Any] | None,
    linear_next: dict[str, Any] | None,
) -> dict[str, Any]:
    """
    C9 adaptive nudge: prefer a remediation lesson for a weak skill when linked.
    Falls back to linear next lesson from course_progress.
    """
    if attempt and course_id:
        weak = weak_skills_from_attempt(attempt.get("answers"), tenant_id=tenant_id)
        skill_rows = {
            s["skill_code"]: s for s in skills_mod.ensure_default_skills(tenant_id)
        }
        for w in weak:
            skill = skill_rows.get(str(w.get("id") or ""))
            if not skill:
                continue
            lid = skill.get("lesson_id")
            if lid and (skill.get("prefer_path") or "manuals") == "lessons":
                return {
                    "mode": "adaptive",
                    "lesson_id": str(lid),
                    "title": skill.get("label") or w.get("label") or "Gap lesson",
                    "reason": f"Recommended for gap: {w.get('label') or w.get('id')}",
                    "skill_code": skill.get("skill_code"),
                }
            # Even if prefer manuals, lesson_id still useful as adaptive target
            if lid:
                return {
                    "mode": "adaptive",
                    "lesson_id": str(lid),
                    "title": skill.get("label") or w.get("label") or "Gap lesson",
                    "reason": f"Recommended for gap: {w.get('label') or w.get('id')}",
                    "skill_code": skill.get("skill_code"),
                }
    if linear_next:
        return {
            "mode": "linear",
            "lesson_id": str(linear_next.get("id") or ""),
            "title": str(linear_next.get("title") or "Next lesson"),
            "reason": "Continue where you left off",
            "skill_code": "",
            "lesson_type": linear_next.get("lesson_type"),
        }
    return {
        "mode": "none",
        "lesson_id": "",
        "title": "",
        "reason": "",
        "skill_code": "",
    }


def latest_graded_attempt_for_subject(
    tenant_id: UUID | str, subject: str
) -> dict[str, Any] | None:
    """Newest non-practice attempt for a learner (loads full answers)."""
    rows = db.list_quiz_attempts_for_tenant(tenant_id, limit=40)
    for a in rows:
        if str(a.get("subject") or "") != str(subject or ""):
            continue
        full = db.get_quiz_attempt(tenant_id, a["id"])
        if not full:
            continue
        answers = full.get("answers") if isinstance(full.get("answers"), dict) else {}
        if answers.get("mode") == "practice":
            continue
        return full
    return None


def gap_path_from_latest_attempt(
    tenant_id: UUID | str,
    *,
    subject: str,
    quiz_token: str,
    first_lesson_id: str | None = None,
    first_manual_id: str | None = None,
    manual_version: int | None = None,
) -> dict[str, Any]:
    """Build a gap path from the learner's latest graded attempt with misses."""
    attempt = latest_graded_attempt_for_subject(tenant_id, subject)
    if not attempt:
        return {
            "active": False,
            "skills": [],
            "steps": [],
            "first_href": "",
            "practice_href": "",
            "graded_href": "",
        }
    return build_gap_path(
        tenant_id,
        attempt=attempt,
        quiz_token=quiz_token,
        first_lesson_id=first_lesson_id,
        first_manual_id=first_manual_id,
        manual_version=manual_version,
    )


# --- Persisted personal learning plan (PLE) ---------------------------------


def href_without_token(href: str) -> str:
    """Store paths without session token (token is injected on read)."""
    if not href:
        return ""
    parts = urlsplit(href)
    q = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k != "token"]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(q), parts.fragment))


def href_with_token(href: str, quiz_token: str) -> str:
    if not href:
        return ""
    bare = href_without_token(href)
    parts = urlsplit(bare)
    q = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k != "token"]
    if quiz_token:
        q.append(("token", quiz_token))
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(q), parts.fragment))


def _step_key(step: dict[str, Any]) -> str:
    kind = str(step.get("kind") or "step")
    code = str(step.get("skill_code") or "")
    if kind == "review" and code:
        return f"review:{code}"
    return kind


def serialize_steps_for_storage(gap_path: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for step in gap_path.get("steps") or []:
        out.append(
            {
                "key": _step_key(step),
                "kind": step.get("kind"),
                "n": step.get("n"),
                "skill_code": step.get("skill_code") or "",
                "skill_label": step.get("skill_label") or "",
                "label": step.get("label") or "",
                "href": href_without_token(str(step.get("href") or "")),
                "meta": step.get("meta") or "",
                "status": step.get("status"),
                "percent": step.get("percent"),
                "done": False,
                "done_at": None,
            }
        )
    return out


def hydrate_plan(
    row: dict[str, Any],
    *,
    quiz_token: str,
) -> dict[str, Any]:
    """Turn a DB plan row into a gap_path-shaped dict with progress."""
    steps_raw = row.get("steps") or []
    if isinstance(steps_raw, str):
        steps_raw = json.loads(steps_raw)
    skills = row.get("skills") or []
    if isinstance(skills, str):
        skills = json.loads(skills)

    steps: list[dict[str, Any]] = []
    first_href = ""
    practice_href = ""
    graded_href = ""
    for i, s in enumerate(steps_raw):
        href = href_with_token(str(s.get("href") or ""), quiz_token)
        done = bool(s.get("done"))
        item = {
            **s,
            "n": s.get("n") or (i + 1),
            "href": href,
            "done": done,
        }
        steps.append(item)
        kind = str(s.get("kind") or "")
        if kind == "practice":
            practice_href = href
        elif kind == "graded":
            graded_href = href
        if not done and not first_href:
            first_href = href

    done_count = sum(1 for s in steps if s.get("done"))
    total = len(steps)
    status = str(row.get("status") or "open")
    active = status == "open" and total > 0 and done_count < total
    mode = "gap"
    role_code = ""
    skill_items: list[Any] = []
    if isinstance(skills, dict):
        mode = str(skills.get("mode") or "gap")
        role_code = str(skills.get("role_code") or "")
        raw_items = skills.get("items") or []
        skill_items = list(raw_items) if isinstance(raw_items, list) else []
    elif isinstance(skills, list):
        skill_items = list(skills)
    return {
        "active": active,
        "persisted": True,
        "plan_id": str(row.get("id") or ""),
        "plan_status": status,
        "mode": mode,
        "role_code": role_code,
        "skills": skill_items,
        "steps": steps,
        "first_href": first_href
        or (steps[0]["href"] if steps else ""),
        "practice_href": practice_href,
        "graded_href": graded_href,
        "attempt_id": str(row.get("source_attempt_id") or ""),
        "done_count": done_count,
        "step_count": total,
        "progress_pct": int(round(100 * done_count / total)) if total else 0,
        "updated_at": (
            row["updated_at"].isoformat()
            if hasattr(row.get("updated_at"), "isoformat")
            else str(row.get("updated_at") or "")
        ),
    }


def get_open_plan(
    tenant_id: UUID | str,
    subject: str,
    *,
    quiz_token: str = "",
) -> dict[str, Any] | None:
    sub = (subject or "").strip()
    if not sub:
        return None
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            SELECT id, subject, source_attempt_id, status, skills, steps,
                   current_step, created_at, updated_at
            FROM learner_plans
            WHERE subject = %s AND status = 'open'
            LIMIT 1
            """,
            (sub,),
        ).fetchone()
        if not row:
            return None
        return hydrate_plan(dict(row), quiz_token=quiz_token)


def upsert_open_plan(
    tenant_id: UUID | str,
    *,
    subject: str,
    gap_path: dict[str, Any],
) -> dict[str, Any] | None:
    """Replace the open plan with a fresh path from a graded attempt with gaps."""
    sub = (subject or "").strip()
    if not sub or not gap_path.get("active"):
        return None
    skills = gap_path.get("skills") or []
    steps = serialize_steps_for_storage(gap_path)
    if not steps:
        return None
    attempt_id = str(gap_path.get("attempt_id") or "") or None
    skills_payload = {
        "items": skills,
        "mode": gap_path.get("mode") or "gap",
        "role_code": gap_path.get("role_code") or "",
    }
    tid = str(tenant_id)
    with db.tenant_connection(tid) as conn:
        conn.execute(
            """
            UPDATE learner_plans
            SET status = 'superseded', updated_at = now()
            WHERE subject = %s AND status = 'open'
            """,
            (sub,),
        )
        row = conn.execute(
            """
            INSERT INTO learner_plans (
                tenant_id, subject, source_attempt_id, status,
                skills, steps, current_step, updated_at
            )
            VALUES (%s, %s, %s, 'open', %s::jsonb, %s::jsonb, 0, now())
            RETURNING id, subject, source_attempt_id, status, skills, steps,
                      current_step, created_at, updated_at
            """,
            (
                tid,
                sub,
                attempt_id,
                json.dumps(skills_payload),
                json.dumps(steps),
            ),
        ).fetchone()
        return hydrate_plan(dict(row), quiz_token="")


def complete_open_plan(tenant_id: UUID | str, subject: str) -> bool:
    """Mark open plan completed (gaps cleared on graded retry)."""
    sub = (subject or "").strip()
    if not sub:
        return False
    with db.tenant_connection(tenant_id) as conn:
        cur = conn.execute(
            """
            UPDATE learner_plans
            SET status = 'completed', updated_at = now()
            WHERE subject = %s AND status = 'open'
            """,
            (sub,),
        )
        return (cur.rowcount or 0) > 0


def mark_plan_step_done(
    tenant_id: UUID | str,
    subject: str,
    *,
    step_key: str | None = None,
    kind: str | None = None,
    skill_code: str | None = None,
    path_contains: str | None = None,
) -> dict[str, Any] | None:
    """Mark matching open-plan step(s) done; advances current_step."""
    sub = (subject or "").strip()
    if not sub:
        return None
    now = datetime.now(timezone.utc).isoformat()
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            SELECT id, subject, source_attempt_id, status, skills, steps,
                   current_step, created_at, updated_at
            FROM learner_plans
            WHERE subject = %s AND status = 'open'
            FOR UPDATE
            """,
            (sub,),
        ).fetchone()
        if not row:
            return None
        item = dict(row)
        steps = item.get("steps") or []
        if isinstance(steps, str):
            steps = json.loads(steps)
        changed = False
        for s in steps:
            if s.get("done"):
                continue
            match = False
            if step_key and str(s.get("key") or "") == step_key:
                match = True
            elif kind and str(s.get("kind") or "") == kind:
                if skill_code:
                    match = str(s.get("skill_code") or "") == skill_code
                elif path_contains:
                    match = path_contains in str(s.get("href") or "")
                else:
                    match = kind in {"practice", "graded"}
            elif path_contains and path_contains in str(s.get("href") or ""):
                match = True
            if match:
                s["done"] = True
                s["done_at"] = now
                changed = True
                break  # one step at a time
        if not changed:
            return hydrate_plan(item, quiz_token="")

        current = 0
        for i, s in enumerate(steps):
            if not s.get("done"):
                current = i
                break
            current = i + 1

        all_done = all(bool(s.get("done")) for s in steps)
        new_status = "completed" if all_done else "open"
        row2 = conn.execute(
            """
            UPDATE learner_plans
            SET steps = %s::jsonb,
                current_step = %s,
                status = %s,
                updated_at = now()
            WHERE id = %s
            RETURNING id, subject, source_attempt_id, status, skills, steps,
                      current_step, created_at, updated_at
            """,
            (json.dumps(steps), current, new_status, str(item["id"])),
        ).fetchone()
        return hydrate_plan(dict(row2), quiz_token="")


def sync_plan_after_attempt(
    tenant_id: UUID | str,
    *,
    subject: str,
    attempt: dict[str, Any],
    gap_path: dict[str, Any] | None,
    is_practice: bool,
) -> dict[str, Any] | None:
    """
    Persist PLE after quiz submit.

    - Practice: mark practice step done on open plan.
    - Graded with gaps: upsert new open plan.
    - Graded with no gaps: complete open plan.
    """
    sub = (subject or "").strip() or str(attempt.get("subject") or "")
    if is_practice:
        return mark_plan_step_done(tenant_id, sub, kind="practice")
    if gap_path and gap_path.get("active"):
        return upsert_open_plan(tenant_id, subject=sub, gap_path=gap_path)
    complete_open_plan(tenant_id, sub)
    return None


def resolve_learner_plan(
    tenant_id: UUID | str,
    *,
    subject: str,
    quiz_token: str,
    first_lesson_id: str | None = None,
    first_manual_id: str | None = None,
    manual_version: int | None = None,
    persist_if_missing: bool = False,
    role_code: str | None = None,
) -> dict[str, Any]:
    """
    Prefer open persisted plan; else derive from latest graded attempt.
    Optionally persist a newly derived active path (Home / gap page).

    role_code: when set, build D23 difference path (role required − mastery).
    """
    wanted_role = (role_code or "").strip().lower() or None
    existing = get_open_plan(tenant_id, subject, quiz_token=quiz_token)
    if existing and existing.get("plan_status") == "open":
        stored_role = str(existing.get("role_code") or "").strip().lower() or None
        if wanted_role is None or stored_role == wanted_role:
            return existing

    attempt = latest_graded_attempt_for_subject(tenant_id, subject)
    if wanted_role and attempt:
        derived = build_difference_path(
            tenant_id,
            role_code=wanted_role,
            attempt=attempt,
            quiz_token=quiz_token,
            first_lesson_id=first_lesson_id,
            first_manual_id=first_manual_id,
            manual_version=manual_version,
        )
    else:
        derived = gap_path_from_latest_attempt(
            tenant_id,
            subject=subject,
            quiz_token=quiz_token,
            first_lesson_id=first_lesson_id,
            first_manual_id=first_manual_id,
            manual_version=manual_version,
        )
    if derived.get("active") and persist_if_missing:
        upsert_open_plan(tenant_id, subject=subject, gap_path=derived)
        opened = get_open_plan(tenant_id, subject, quiz_token=quiz_token)
        if opened:
            return opened
    derived["persisted"] = False
    derived["done_count"] = 0
    derived["step_count"] = len(derived.get("steps") or [])
    derived["progress_pct"] = 0
    return derived


def dct_planner_pack(tenant_id: UUID | str) -> dict[str, Any]:
    """D11: skills missing a linked remediation lesson vs already covered."""
    skills = skills_mod.ensure_default_skills(tenant_id)
    missing = [s for s in skills if not str(s.get("lesson_id") or "").strip()]
    covered = [s for s in skills if str(s.get("lesson_id") or "").strip()]
    return {
        "skills": skills,
        "missing": missing,
        "covered": covered,
        "missing_count": len(missing),
        "covered_count": len(covered),
    }


# --- Dynamic lesson order (DCT display reorder) -----------------------------


def weak_skill_codes_for_subject(
    tenant_id: UUID | str, subject: str
) -> list[str]:
    """Ordered weak/developing skill codes from open plan or latest graded attempt."""
    sub = (subject or "").strip()
    if not sub:
        return []
    plan = get_open_plan(tenant_id, sub, quiz_token="")
    if plan and plan.get("skills"):
        codes: list[str] = []
        for s in plan["skills"]:
            code = str(s.get("id") or s.get("skill_code") or "").strip()
            if code and code not in codes:
                codes.append(code)
        if codes:
            return codes
    attempt = latest_graded_attempt_for_subject(tenant_id, sub)
    if not attempt:
        return []
    return [
        str(w.get("id") or "")
        for w in weak_skills_from_attempt(
            attempt.get("answers"), tenant_id=tenant_id
        )
        if w.get("id")
    ]


def order_lessons_for_gaps(
    lessons: list[dict[str, Any]],
    *,
    weak_skill_codes: list[str],
    skill_rows: list[dict[str, Any]],
    completed_ids: set[str] | list[str] | None = None,
) -> dict[str, Any]:
    """
    Reorder lessons for display: incomplete gap-linked lessons first, then
    remaining incomplete, then completed, quiz activities last.

    Does not mutate DB author order — presentation only.
    """
    done = {str(x) for x in (completed_ids or [])}
    by_id = {str(L.get("id")): L for L in lessons}
    skill_by_code = {
        str(s.get("skill_code") or ""): s for s in skill_rows if s.get("skill_code")
    }

    priority: list[dict[str, Any]] = []
    reasons: dict[str, str] = {}
    seen: set[str] = set()
    for code in weak_skill_codes:
        skill = skill_by_code.get(str(code))
        if not skill:
            continue
        lid = str(skill.get("lesson_id") or "").strip()
        if not lid or lid in seen or lid not in by_id:
            continue
        lesson = by_id[lid]
        if lesson.get("lesson_type") == "quiz":
            continue
        priority.append(lesson)
        seen.add(lid)
        reasons[lid] = str(skill.get("label") or code)

    if not priority:
        return {
            "lessons": list(lessons),
            "order_mode": "linear",
            "priority_ids": [],
            "reasons": {},
            "next_lesson": None,
        }

    quizzes = [L for L in lessons if L.get("lesson_type") == "quiz"]
    others = [
        L
        for L in lessons
        if L.get("lesson_type") != "quiz" and str(L.get("id")) not in seen
    ]
    pri_open = [L for L in priority if str(L.get("id")) not in done]
    pri_done = [L for L in priority if str(L.get("id")) in done]
    oth_open = [L for L in others if str(L.get("id")) not in done]
    oth_done = [L for L in others if str(L.get("id")) in done]
    ordered = pri_open + oth_open + pri_done + oth_done + quizzes

    learnable = [L for L in ordered if L.get("lesson_type") != "quiz"]
    all_done = bool(learnable) and all(str(L.get("id")) in done for L in learnable)
    next_lesson = None
    for L in ordered:
        if L.get("lesson_type") == "quiz":
            if all_done:
                next_lesson = L
            break
        if str(L.get("id")) not in done:
            next_lesson = L
            break
    if next_lesson is None and ordered:
        next_lesson = ordered[-1]

    return {
        "lessons": ordered,
        "order_mode": "adaptive",
        "priority_ids": [str(L.get("id")) for L in priority],
        "reasons": reasons,
        "next_lesson": next_lesson,
    }


def apply_dynamic_lesson_order(
    tenant_id: UUID | str,
    *,
    subject: str,
    progress: dict[str, Any],
) -> dict[str, Any]:
    """
    Augment course_progress with DCT display order when the learner has gaps.
    Author `position` on each lesson is left unchanged.
    """
    lessons = list(progress.get("lessons") or [])
    codes = weak_skill_codes_for_subject(tenant_id, subject)
    if not codes or not lessons:
        out = dict(progress)
        out["order_mode"] = "linear"
        out["priority_ids"] = []
        out["order_reasons"] = {}
        return out

    try:
        skill_rows = skills_mod.ensure_default_skills(tenant_id)
    except Exception:  # noqa: BLE001
        skill_rows = []

    result = order_lessons_for_gaps(
        lessons,
        weak_skill_codes=codes,
        skill_rows=skill_rows,
        completed_ids=progress.get("completed_ids") or set(),
    )
    out = dict(progress)
    out["lessons"] = result["lessons"]
    out["order_mode"] = result["order_mode"]
    out["priority_ids"] = result["priority_ids"]
    out["order_reasons"] = result["reasons"]
    if result["order_mode"] == "adaptive" and result.get("next_lesson"):
        out["next_lesson"] = result["next_lesson"]
    return out

