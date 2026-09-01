"""Out-of-box product specials — receipts, teleport, radar, coach, stickers, etc."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from app import db

# Competency catalog (question → skill). Used for map + remediation.
COMPETENCIES: dict[str, dict[str, Any]] = {
    "lti_launch": {
        "id": "lti_launch",
        "label": "LTI launch",
        "questions": ("q1",),
    },
    "tenant_isolation": {
        "id": "tenant_isolation",
        "label": "Tenant isolation",
        "questions": ("q2",),
    },
    "gradebook_sync": {
        "id": "gradebook_sync",
        "label": "Gradebook sync",
        "questions": ("q3",),
    },
}

# question_id → remediation + manual focus anchor (## heading slug)
REMEDIATION: dict[str, dict[str, str]] = {
    "q1": {
        "label": "Review: how LTI launch works",
        "lesson_hint": "Open the launch lesson, then practice this item",
        "path": "lessons",
        "competency": "lti_launch",
        "manual_focus": "lti-launch",
    },
    "q2": {
        "label": "Review: tenant isolation",
        "lesson_hint": "Re-read isolation, then retry this skill",
        "path": "lessons",
        "competency": "tenant_isolation",
        "manual_focus": "tenant-isolation",
    },
    "q3": {
        "label": "Review: Moodle gradebook vs EdVidura",
        "lesson_hint": "Open the pinned manual section on grade sync",
        "path": "manuals",
        "competency": "gradebook_sync",
        "manual_focus": "gradebook-sync",
    },
}



def enrichment_for_review(
    review: list[dict[str, Any]],
    *,
    quiz_token: str,
    first_lesson_id: str | None = None,
    first_manual_id: str | None = None,
    manual_version: int | None = None,
    tenant_id: UUID | str | None = None,
    attempt_id: str | None = None,
) -> list[dict[str, Any]]:
    """Attach wrong-answer teleport + manual focus + remediation loop links."""
    skill_rem_by_q: dict[str, dict[str, Any]] = {}
    if tenant_id:
        try:
            from app.modules import skills as skills_mod

            skills_mod.ensure_default_skills(tenant_id)
            for item in review:
                qid = str(item.get("question_id") or "")
                rem = skills_mod.remediation_for_question(tenant_id, qid)
                if rem:
                    skill_rem_by_q[qid] = rem
        except Exception:  # noqa: BLE001
            skill_rem_by_q = {}

    out: list[dict[str, Any]] = []
    for item in review:
        row = dict(item)
        qid = str(item.get("question_id") or "")
        rem = skill_rem_by_q.get(qid) or REMEDIATION.get(qid)
        if not item.get("correct") and rem:
            focus = rem.get("manual_focus") or ""
            path = rem.get("path") or "lessons"
            lesson_id = rem.get("lesson_id") or first_lesson_id
            manual_id = rem.get("manual_id") or first_manual_id
            href = f"/lessons?token={quiz_token}"
            if path == "manuals":
                if manual_id:
                    href = f"/manuals/{manual_id}?token={quiz_token}"
                    if manual_version is not None:
                        href += f"&v={manual_version}"
                    if focus:
                        href += f"&focus={focus}"
                    if attempt_id:
                        href += f"&loop=1&from_attempt={attempt_id}"
                else:
                    href = f"/manuals?token={quiz_token}"
            elif lesson_id:
                href = f"/lessons/{lesson_id}?token={quiz_token}"
                if attempt_id:
                    href += f"&loop=1&from_attempt={attempt_id}"
                if focus and manual_id:
                    row["manual_href"] = (
                        f"/manuals/{manual_id}?token={quiz_token}"
                        + (f"&v={manual_version}" if manual_version else "")
                        + f"&focus={focus}"
                        + (f"&loop=1&from_attempt={attempt_id}" if attempt_id else "")
                    )
                    row["manual_label"] = (
                        f"Manual: {str(rem.get('label') or '').replace('Review: ', '')}"
                    )
            row["teleport_label"] = rem.get("label") or "Review"
            row["teleport_hint"] = rem.get("lesson_hint") or ""
            row["teleport_href"] = href
            row["competency_id"] = rem.get("competency") or ""
            row["manual_focus"] = focus
            if path == "manuals" and manual_id and focus:
                row["manual_href"] = href
                row["manual_label"] = "Open pinned manual section"
            # Closed loop CTAs
            if attempt_id:
                row["practice_loop_href"] = (
                    f"/quiz?token={quiz_token}&practice=1&retry={attempt_id}&loop=1"
                )
                row["graded_loop_href"] = (
                    f"/quiz?token={quiz_token}&retry={attempt_id}&loop=1"
                )
        out.append(row)
    return out


def competency_profile(
    answers: Any, *, tenant_id: UUID | str | None = None
) -> list[dict[str, Any]]:
    """Per-attempt competency strengths from answer detail."""
    detail: dict[str, Any] = {}
    if isinstance(answers, dict) and isinstance(answers.get("detail"), dict):
        detail = answers["detail"]
    catalog = COMPETENCIES
    if tenant_id:
        try:
            from app.modules import skills as skills_mod

            catalog = skills_mod.competency_catalog(tenant_id) or COMPETENCIES
        except Exception:  # noqa: BLE001
            catalog = COMPETENCIES
    profiles: list[dict[str, Any]] = []
    for cid, meta in catalog.items():
        correct = 0
        total = 0
        for qid in meta["questions"]:
            info = detail.get(qid)
            if not isinstance(info, dict):
                continue
            total += 1
            if info.get("correct"):
                correct += 1
        if total == 0:
            status = "unknown"
            pct = None
        else:
            pct = round(100 * correct / total)
            status = "strong" if pct >= 100 else ("developing" if pct >= 50 else "weak")
        profiles.append(
            {
                "id": cid,
                "label": meta["label"],
                "correct": correct,
                "total": total,
                "percent": pct,
                "status": status,
            }
        )
    return profiles


def class_competency_map(
    attempts: list[dict[str, Any]], *, tenant_id: UUID | str | None = None
) -> list[dict[str, Any]]:
    """Aggregate competency weakness across attempts (teacher view)."""
    catalog = COMPETENCIES
    if tenant_id:
        try:
            from app.modules import skills as skills_mod

            catalog = skills_mod.competency_catalog(tenant_id) or COMPETENCIES
        except Exception:  # noqa: BLE001
            catalog = COMPETENCIES
    tallies: dict[str, dict[str, int]] = {
        cid: {"correct": 0, "total": 0} for cid in catalog
    }
    for a in attempts:
        for row in competency_profile(a.get("answers"), tenant_id=tenant_id):
            if row["total"] == 0:
                continue
            if row["id"] not in tallies:
                tallies[row["id"]] = {"correct": 0, "total": 0}
            t = tallies[row["id"]]
            t["correct"] += int(row["correct"])
            t["total"] += int(row["total"])
    out: list[dict[str, Any]] = []
    for cid, meta in catalog.items():
        t = tallies.get(cid) or {"correct": 0, "total": 0}
        total = t["total"]
        pct = round(100 * t["correct"] / total) if total else None
        status = (
            "unknown"
            if pct is None
            else ("strong" if pct >= 80 else ("developing" if pct >= 50 else "weak"))
        )
        out.append(
            {
                "id": cid,
                "label": meta["label"],
                "percent": pct,
                "status": status,
                "samples": total,
            }
        )
    out.sort(key=lambda x: (x["percent"] is None, x["percent"] if x["percent"] is not None else 999))
    return out


def at_risk_learners(
    *,
    attempts: list[dict[str, Any]],
    progress_roster: list[dict[str, Any]] | None = None,
    display_names: dict[str, str] | None = None,
) -> list[dict[str, Any]]:
    """Rule-based at-risk signals (no AI)."""
    names = display_names or {}
    by_subject: dict[str, list[dict[str, Any]]] = {}
    for a in attempts:
        sub = str(a.get("subject") or "")
        if not sub:
            continue
        by_subject.setdefault(sub, []).append(a)

    progress_by: dict[str, dict[str, Any]] = {}
    for p in progress_roster or []:
        progress_by[str(p.get("subject") or "")] = p

    risks: list[dict[str, Any]] = []
    for subject, rows in by_subject.items():
        reasons: list[str] = []
        # Same question failed 2+ times across attempts
        fail_counts: dict[str, int] = {}
        for a in rows:
            answers = a.get("answers")
            if not isinstance(answers, dict):
                continue
            detail = answers.get("detail")
            if not isinstance(detail, dict):
                continue
            for qid, info in detail.items():
                if isinstance(info, dict) and not info.get("correct"):
                    fail_counts[qid] = fail_counts.get(qid, 0) + 1
        repeat_fails = [qid for qid, n in fail_counts.items() if n >= 2]
        if repeat_fails:
            labels = [
                COMPETENCIES.get(REMEDIATION.get(q, {}).get("competency", ""), {}).get(
                    "label", q
                )
                for q in repeat_fails
            ]
            reasons.append(
                "Failed same item 2+ times (" + ", ".join(labels[:3]) + ")"
            )

        # Latest attempt very low
        latest = rows[0]
        try:
            # prefer created_at ordering if present
            latest = max(
                rows,
                key=lambda r: str(r.get("created_at") or ""),
            )
        except Exception:  # noqa: BLE001
            latest = rows[0]
        max_s = max(int(latest.get("max_score") or 1), 1)
        pct = round(100 * int(latest.get("score") or 0) / max_s)
        if pct < 40:
            reasons.append(f"Latest score {pct}%")

        # Path incomplete but already taking quizzes
        prog = progress_by.get(subject)
        if prog:
            total = int(prog.get("total_count") or 0)
            done = int(prog.get("completed_count") or 0)
            if total > 0 and done < total:
                reasons.append(f"Path incomplete ({done}/{total} lessons)")

        if not reasons:
            continue
        risks.append(
            {
                "subject": subject,
                "learner_name": names.get(subject)
                or latest.get("learner_name")
                or subject,
                "reasons": reasons,
                "latest_percent": pct,
                "attempt_count": len(rows),
            }
        )
    risks.sort(key=lambda r: (-len(r["reasons"]), int(r["latest_percent"])))
    return risks


def grade_receipt(
    *,
    attempt: dict[str, Any],
    xapi_statement_id: str | None,
    ags_available: bool,
) -> dict[str, Any]:
    """Evidence card for an attempt (#1)."""
    score = int(attempt.get("score") or 0)
    max_s = max(int(attempt.get("max_score") or 1), 1)
    practice = False
    answers = attempt.get("answers")
    if isinstance(answers, dict):
        practice = str(answers.get("mode") or "") == "practice"
    return {
        "attempt_id": str(attempt.get("id") or ""),
        "score": score,
        "max_score": max_s,
        "percent": round(100 * score / max_s),
        "grade_sent": bool(attempt.get("grade_sent")),
        "grade_error": attempt.get("grade_error") or "",
        "xapi_statement_id": xapi_statement_id or "",
        "ags_available": ags_available,
        "practice": practice,
        "issued_at": (
            attempt["created_at"].isoformat()
            if hasattr(attempt.get("created_at"), "isoformat")
            else str(attempt.get("created_at") or "")
        ),
    }


def lookup_xapi_for_attempt(
    tenant_id: UUID | str, attempt_id: UUID | str
) -> str | None:
    """Prefer the quiz assessment statement; fall back to any attempt-linked row."""
    try:
        with db.tenant_connection(tenant_id) as conn:
            row = conn.execute(
                """
                SELECT statement_id FROM xapi_statements
                WHERE attempt_id = %s
                  AND COALESCE(statement->'object'->>'id', '') LIKE %s
                ORDER BY created_at DESC LIMIT 1
                """,
                (str(attempt_id), "%/xapi/activities/quiz%"),
            ).fetchone()
            if row:
                return str(row["statement_id"])
            row = conn.execute(
                """
                SELECT statement_id FROM xapi_statements
                WHERE attempt_id = %s
                ORDER BY created_at DESC LIMIT 1
                """,
                (str(attempt_id),),
            ).fetchone()
            return str(row["statement_id"]) if row else None
    except Exception:  # noqa: BLE001
        return None


def count_skill_xapi_for_attempt(
    tenant_id: UUID | str, attempt_id: UUID | str
) -> int:
    """D15: how many competency statements were stored for this attempt."""
    try:
        with db.tenant_connection(tenant_id) as conn:
            row = conn.execute(
                """
                SELECT COUNT(*)::int AS n FROM xapi_statements
                WHERE attempt_id = %s
                  AND COALESCE(statement->'object'->>'id', '') LIKE %s
                """,
                (str(attempt_id), "%/xapi/activities/skill/%"),
            ).fetchone()
            return int((row or {}).get("n") or 0)
    except Exception:  # noqa: BLE001
        return 0


def quiet_class_radar(attempts: list[dict[str, Any]]) -> dict[str, Any]:
    """Item fail rates + stall signal — no leaderboard (#3)."""
    fails: dict[str, int] = {}
    totals: dict[str, int] = {}
    prompts: dict[str, str] = {}
    for a in attempts:
        answers = a.get("answers")
        if not isinstance(answers, dict):
            continue
        detail = answers.get("detail")
        if not isinstance(detail, dict):
            continue
        for qid, info in detail.items():
            if not isinstance(info, dict):
                continue
            totals[qid] = totals.get(qid, 0) + 1
            prompts[qid] = str(info.get("prompt") or qid)
            if not info.get("correct"):
                fails[qid] = fails.get(qid, 0) + 1
    items = []
    for qid, n in totals.items():
        f = fails.get(qid, 0)
        items.append(
            {
                "question_id": qid,
                "prompt": prompts.get(qid, qid),
                "attempts": n,
                "fail_count": f,
                "fail_rate": round(100 * f / n) if n else 0,
            }
        )
    items.sort(key=lambda x: (-x["fail_rate"], -x["fail_count"]))
    hottest = items[0] if items else None
    return {"items": items[:8], "hottest": hottest, "attempt_n": len(attempts)}


def launch_fingerprint(session: dict[str, Any]) -> dict[str, Any]:
    """Compact launch strip (#4)."""
    return {
        "tenant": session.get("tenant_slug") or session.get("tenant_name") or "—",
        "role": (
            "admin"
            if session.get("is_school_admin")
            else ("teacher" if session.get("is_instructor") else "student")
        ),
        "ags": "on" if session.get("ags_available") else "off",
        "client_id": str(session.get("client_id") or "")[:12] or "—",
        "launch_id": str(session.get("launch_id") or "")[:8] or "—",
        "course": session.get("course") or "—",
    }


def failed_question_ids(answers: Any) -> list[str]:
    """Question ids missed on an attempt (#6)."""
    if not isinstance(answers, dict):
        return []
    detail = answers.get("detail")
    if not isinstance(detail, dict):
        return []
    return [
        str(qid)
        for qid, info in detail.items()
        if isinstance(info, dict) and not info.get("correct")
    ]


def ghost_coach_gate(
    progress: dict[str, Any] | None, *, bypass: bool = False
) -> dict[str, Any]:
    """Warn/gate quiz if lessons incomplete (#8)."""
    if bypass or not progress:
        return {"gate": False, "warn": False, "message": ""}
    total = int(progress.get("total_count") or 0)
    done = int(progress.get("completed_count") or 0)
    if total <= 0:
        return {"gate": False, "warn": False, "message": ""}
    if done >= total:
        return {"gate": False, "warn": False, "message": ""}
    remaining = total - done
    return {
        "gate": True,
        "warn": True,
        "message": (
            f"Ghost coach: {remaining} lesson(s) still open. "
            "Finish the path first, or continue anyway."
        ),
        "completed": done,
        "total": total,
    }


def skill_stickers(
    *,
    score: int | None,
    max_score: int | None,
    progress: dict[str, Any] | None,
    grade_sent: bool = False,
) -> list[dict[str, str]]:
    """Sparse stickers when evidence agrees (#12)."""
    stickers: list[dict[str, str]] = []
    if progress and progress.get("all_lessons_done"):
        stickers.append(
            {"id": "path", "label": "Path complete", "tone": "teal"}
        )
    if score is not None and max_score and max_score > 0:
        pct = 100 * score / max_score
        if pct >= 100:
            stickers.append(
                {"id": "ace", "label": "Full marks", "tone": "indigo"}
            )
        elif pct >= 60:
            stickers.append(
                {"id": "pass", "label": "Quiz pass", "tone": "amber"}
            )
    if grade_sent:
        stickers.append(
            {"id": "sync", "label": "Moodle synced", "tone": "ok"}
        )
    return stickers


def tenant_theme(seed: str) -> dict[str, str]:
    """Deterministic accent from course/tenant name (#10)."""
    digest = hashlib.sha256((seed or "edvidura").encode()).hexdigest()
    # Keep readable indigo-adjacent hues
    hues = [230, 250, 200, 170, 280, 210]
    h = hues[int(digest[:2], 16) % len(hues)]
    return {
        "accent": f"hsl({h} 65% 55%)",
        "accent_deep": f"hsl({h} 60% 42%)",
        "accent_soft": f"hsl({h} 70% 94%)",
    }


def build_time_capsule(
    tenant_id: UUID | str,
    *,
    tenant_name: str,
    attempts: list[dict[str, Any]],
    progress_roster: list[dict[str, Any]] | None = None,
    manuals_meta: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Accreditation-style export payload (#7)."""
    anon = []
    for i, a in enumerate(attempts, start=1):
        max_s = max(int(a.get("max_score") or 1), 1)
        anon.append(
            {
                "learner_code": f"L{i:03d}",
                "score": int(a.get("score") or 0),
                "max_score": max_s,
                "percent": round(100 * int(a.get("score") or 0) / max_s),
                "grade_sent": bool(a.get("grade_sent")),
                "course_label": a.get("course_label") or "",
                "created_at": (
                    a["created_at"].isoformat()
                    if hasattr(a.get("created_at"), "isoformat")
                    else str(a.get("created_at") or "")
                ),
            }
        )
    return {
        "capsule_version": 1,
        "exported_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "tenant_name": tenant_name,
        "tenant_id": str(tenant_id),
        "attempt_count": len(anon),
        "attempts_anonymized": anon,
        "lesson_progress_summary": progress_roster or [],
        "manuals": manuals_meta or [],
        "radar": quiet_class_radar(attempts),
    }


def record_incident(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str,
    payload: dict[str, Any],
    note: str = "",
) -> dict[str, Any]:
    """Support incident capture (#11)."""
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            INSERT INTO support_incidents (
                tenant_id, subject, learner_name, note, context
            )
            VALUES (%s, %s, %s, %s, %s::jsonb)
            RETURNING id, created_at
            """,
            (
                str(tenant_id),
                subject or "",
                learner_name or "",
                (note or "")[:500],
                json.dumps(payload),
            ),
        ).fetchone()
        return dict(row)
