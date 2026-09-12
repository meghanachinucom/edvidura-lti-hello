"""Build xAPI 1.0.3 statements from EdVidura domain facts (pure)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from app.modules.xapi import verbs


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def build_actor(
    *,
    subject: str,
    learner_name: str = "",
    homepage: str = "http://localhost:8085",
) -> dict[str, Any]:
    """LTI users → Agent with account (sub), not email (PII-light)."""
    actor: dict[str, Any] = {
        "objectType": "Agent",
        "account": {
            "homePage": homepage.rstrip("/") or "http://localhost:8085",
            "name": subject or "unknown",
        },
    }
    if learner_name.strip():
        actor["name"] = learner_name.strip()
    return actor


def build_quiz_attempt_statement(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str,
    attempt_id: UUID | str,
    score: int,
    max_score: int,
    course_label: str = "",
    homepage: str = "http://localhost:8085",
    activity_base: str = "http://localhost:8000",
    statement_id: UUID | str | None = None,
    timestamp: str | None = None,
) -> dict[str, Any]:
    """Map a scored quiz attempt to an xAPI statement (passed/failed + score)."""
    max_s = max(int(max_score), 1)
    raw = int(score)
    scaled = round(raw / max_s, 4)
    success = scaled >= 0.6
    verb_id = verbs.VERB_PASSED if success else verbs.VERB_FAILED
    sid = str(statement_id or uuid4())
    object_id = f"{activity_base.rstrip('/')}/xapi/activities/quiz"
    if course_label.strip():
        object_id = f"{object_id}/{_slug(course_label)}"

    return {
        "id": sid,
        "actor": build_actor(
            subject=subject, learner_name=learner_name, homepage=homepage
        ),
        "verb": {
            "id": verb_id,
            "display": {"en-US": verbs.VERB_DISPLAY[verb_id]},
        },
        "object": {
            "objectType": "Activity",
            "id": object_id,
            "definition": {
                "name": {"en-US": course_label.strip() or "EdVidura quiz"},
                "type": "http://adlnet.gov/expapi/activities/assessment",
            },
        },
        "result": {
            "score": {
                "raw": raw,
                "min": 0,
                "max": max_s,
                "scaled": scaled,
            },
            "success": success,
            "completion": True,
        },
        "context": {
            "platform": "EdVidura",
            "extensions": {
                "https://edvidura.local/xapi/extensions/tenant_id": str(tenant_id),
                "https://edvidura.local/xapi/extensions/attempt_id": str(attempt_id),
            },
        },
        "timestamp": timestamp or _iso_now(),
    }


def build_lesson_completed_statement(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str,
    lesson_id: UUID | str,
    lesson_title: str,
    homepage: str = "http://localhost:8085",
    activity_base: str = "http://localhost:8000",
    statement_id: UUID | str | None = None,
) -> dict[str, Any]:
    sid = str(statement_id or uuid4())
    return {
        "id": sid,
        "actor": build_actor(
            subject=subject, learner_name=learner_name, homepage=homepage
        ),
        "verb": {
            "id": verbs.VERB_COMPLETED,
            "display": {"en-US": "completed"},
        },
        "object": {
            "objectType": "Activity",
            "id": f"{activity_base.rstrip('/')}/xapi/activities/lesson/{lesson_id}",
            "definition": {
                "name": {"en-US": lesson_title or "Lesson"},
                "type": "http://adlnet.gov/expapi/activities/lesson",
            },
        },
        "result": {"completion": True},
        "context": {
            "platform": "EdVidura",
            "extensions": {
                "https://edvidura.local/xapi/extensions/tenant_id": str(tenant_id),
            },
        },
        "timestamp": _iso_now(),
    }


def build_resource_experienced_statement(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str,
    resource_id: UUID | str,
    resource_title: str,
    resource_kind: str = "manual",
    homepage: str = "http://localhost:8085",
    activity_base: str = "http://localhost:8000",
    statement_id: UUID | str | None = None,
) -> dict[str, Any]:
    sid = str(statement_id or uuid4())
    kind = (resource_kind or "manual").strip() or "manual"
    return {
        "id": sid,
        "actor": build_actor(
            subject=subject, learner_name=learner_name, homepage=homepage
        ),
        "verb": {
            "id": verbs.VERB_EXPERIENCED,
            "display": {"en-US": "experienced"},
        },
        "object": {
            "objectType": "Activity",
            "id": (
                f"{activity_base.rstrip('/')}/xapi/activities/{kind}/{resource_id}"
            ),
            "definition": {
                "name": {"en-US": resource_title or kind},
                "type": "http://adlnet.gov/expapi/activities/media",
            },
        },
        "context": {
            "platform": "EdVidura",
            "extensions": {
                "https://edvidura.local/xapi/extensions/tenant_id": str(tenant_id),
                "https://edvidura.local/xapi/extensions/resource_kind": kind,
            },
        },
        "timestamp": _iso_now(),
    }


def build_skill_assessed_statement(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str,
    skill_code: str,
    skill_label: str,
    status: str,
    percent: int | None = None,
    attempt_id: UUID | str | None = None,
    homepage: str = "http://localhost:8085",
    activity_base: str = "http://localhost:8000",
    statement_id: UUID | str | None = None,
) -> dict[str, Any]:
    """D15: one competency assessment statement per skill on a quiz attempt."""
    sid = str(statement_id or uuid4())
    code = (skill_code or "").strip() or "skill"
    st = (status or "unknown").strip().lower()
    success = st in {"strong", "mastered"}
    if success:
        verb_id = verbs.VERB_MASTERED
        display = "mastered"
    elif st in {"weak", "developing", "untested", "unknown"}:
        verb_id = verbs.VERB_FAILED if st == "weak" else verbs.VERB_ATTEMPTED
        display = verbs.VERB_DISPLAY.get(verb_id, "attempted")
    else:
        verb_id = verbs.VERB_ATTEMPTED
        display = "attempted"
    result: dict[str, Any] = {
        "success": success,
        "completion": st not in {"untested", "unknown"},
    }
    if percent is not None:
        result["score"] = {
            "scaled": round(max(0, min(100, int(percent))) / 100.0, 4),
            "raw": int(percent),
            "min": 0,
            "max": 100,
        }
    extensions: dict[str, Any] = {
        "https://edvidura.local/xapi/extensions/tenant_id": str(tenant_id),
        "https://edvidura.local/xapi/extensions/skill_code": code,
        "https://edvidura.local/xapi/extensions/skill_status": st,
    }
    if attempt_id:
        extensions["https://edvidura.local/xapi/extensions/attempt_id"] = str(
            attempt_id
        )
    return {
        "id": sid,
        "actor": build_actor(
            subject=subject, learner_name=learner_name, homepage=homepage
        ),
        "verb": {
            "id": verb_id,
            "display": {"en-US": display},
        },
        "object": {
            "objectType": "Activity",
            "id": f"{activity_base.rstrip('/')}/xapi/activities/skill/{_slug(code)}",
            "definition": {
                "name": {"en-US": skill_label or code},
                "type": "http://adlnet.gov/expapi/activities/cmi.interaction",
            },
        },
        "result": result,
        "context": {
            "platform": "EdVidura",
            "extensions": extensions,
        },
        "timestamp": _iso_now(),
    }


def build_coach_interacted_statement(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str,
    question: str,
    grounded: bool = False,
    refusal_reason: str | None = None,
    citation_count: int = 0,
    course_title: str = "",
    course_id: UUID | str | None = None,
    thread_id: str | None = None,
    access_level: str = "class",
    include_full_text: bool = False,
    answer_text: str | None = None,
    homepage: str = "http://localhost:8085",
    activity_base: str = "http://localhost:8000",
    statement_id: UUID | str | None = None,
) -> dict[str, Any]:
    """Study coach turn → xAPI interacted.

    Default SaaS: preview + hash (privacy-light).
    PeBL Discussion-aligned (``include_full_text=True``): full message text,
    thread id, and access level per PeBL Technical Specification.
    """
    import hashlib

    sid = str(statement_id or uuid4())
    q = (question or "").strip()
    q_hash = hashlib.sha256(q.encode("utf-8")).hexdigest() if q else ""
    preview = q[:120] + ("…" if len(q) > 120 else "")
    tid = (thread_id or "").strip() or f"coach-{subject or 'anon'}"
    level = (access_level or "class").strip() or "class"
    extensions: dict[str, Any] = {
        "https://edvidura.local/xapi/extensions/tenant_id": str(tenant_id),
        "https://edvidura.local/xapi/extensions/question_sha256": q_hash,
        "https://edvidura.local/xapi/extensions/question_len": len(q),
        "https://edvidura.local/xapi/extensions/question_preview": preview,
        "https://edvidura.local/xapi/extensions/citation_count": int(
            citation_count or 0
        ),
        "https://edvidura.local/xapi/extensions/grounded": bool(grounded),
        "https://edvidura.local/xapi/extensions/channel": "study_coach",
        "https://edvidura.local/xapi/extensions/thread_id": tid,
        "https://edvidura.local/xapi/extensions/access_level": level,
        "https://edvidura.local/xapi/extensions/pebl_discussion_aligned": bool(
            include_full_text
        ),
    }
    if include_full_text and q:
        # PeBL Discussion: "Text of the message" shall be collected.
        extensions[
            "https://edvidura.local/xapi/extensions/message_text"
        ] = q[:8000]
    ans = (answer_text or "").strip()
    if include_full_text and ans:
        extensions[
            "https://edvidura.local/xapi/extensions/answer_text"
        ] = ans[:8000]
    elif ans:
        extensions[
            "https://edvidura.local/xapi/extensions/answer_preview"
        ] = ans[:120] + ("…" if len(ans) > 120 else "")
    if refusal_reason:
        extensions[
            "https://edvidura.local/xapi/extensions/refusal_reason"
        ] = str(refusal_reason)[:80]
    if course_id:
        extensions[
            "https://edvidura.local/xapi/extensions/course_id"
        ] = str(course_id)
    if course_title.strip():
        extensions[
            "https://edvidura.local/xapi/extensions/course_label"
        ] = course_title.strip()[:120]

    result: dict[str, Any] = {
        "success": bool(grounded),
        "response": (q if include_full_text and q else (q_hash[:16] if q_hash else "")),
    }

    return {
        "id": sid,
        "actor": build_actor(
            subject=subject, learner_name=learner_name, homepage=homepage
        ),
        "verb": {
            "id": verbs.VERB_INTERACTED,
            "display": {"en-US": verbs.VERB_DISPLAY[verbs.VERB_INTERACTED]},
        },
        "object": {
            "objectType": "Activity",
            "id": (
                f"{activity_base.rstrip('/')}/xapi/activities/study-coach"
                f"/thread/{_slug(tid)}"
            ),
            "definition": {
                "name": {"en-US": "EdVidura study coach"},
                "description": {
                    "en-US": "SME-grounded tutoring chat turn (PeBL Discussion-aligned fields)",
                },
                "type": "http://adlnet.gov/expapi/activities/cmi.interaction",
                "interactionType": "long-fill-in",
            },
        },
        "result": result,
        "context": {
            "platform": "EdVidura",
            "extensions": extensions,
        },
        "timestamp": _iso_now(),
    }


def _slug(text: str) -> str:
    import re

    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return (s or "activity")[:80]
