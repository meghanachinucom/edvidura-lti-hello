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

    stmt = {
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
    }
    if timestamp:
        stmt["timestamp"] = timestamp
    return stmt


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
    timestamp: str | None = None,
) -> dict[str, Any]:
    sid = str(statement_id or uuid4())
    stmt = {
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
    }
    if timestamp:
        stmt["timestamp"] = timestamp
    return stmt


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
    duration_seconds: int | None = None,
    page_label: str = "",
    chapter_slug: str = "",
    timestamp: str | None = None,
) -> dict[str, Any]:
    sid = str(statement_id or uuid4())
    kind = (resource_kind or "manual").strip() or "manual"
    page = (page_label or chapter_slug or "").strip()
    object_id = f"{activity_base.rstrip('/')}/xapi/activities/{kind}/{resource_id}"
    if page:
        object_id += f"/page/{_slug(page)}"
    extensions: dict[str, Any] = {
        "https://edvidura.local/xapi/extensions/tenant_id": str(tenant_id),
        "https://edvidura.local/xapi/extensions/resource_kind": kind,
    }
    if page:
        extensions["https://edvidura.local/xapi/extensions/page"] = page[:120]
    if chapter_slug:
        extensions["https://edvidura.local/xapi/extensions/chapter_slug"] = chapter_slug[:120]
    result: dict[str, Any] | None = None
    if duration_seconds is not None and int(duration_seconds) >= 0:
        secs = int(duration_seconds)
        result = {
            "duration": f"PT{secs}S",
            "extensions": {
                "https://edvidura.local/xapi/extensions/duration_seconds": secs,
            },
        }
    stmt: dict[str, Any] = {
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
            "id": object_id,
            "definition": {
                "name": {"en-US": resource_title or kind},
                "type": "http://adlnet.gov/expapi/activities/media",
            },
        },
        "context": {
            "platform": "EdVidura",
            "extensions": extensions,
        },
    }
    if result:
        stmt["result"] = result
    if timestamp:
        stmt["timestamp"] = timestamp
    return stmt


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
    timestamp: str | None = None,
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
    stmt = {
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
    }
    if timestamp:
        stmt["timestamp"] = timestamp
    return stmt


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
    strategy: str | None = None,
    check_question: str | None = None,
    jev_used: bool = False,
    jev_model: str | None = None,
    jev_strategy_source: str | None = None,
    jev_strategy_confidence: float | None = None,
    jev_on_topic_p: float | None = None,
    jev_skipped_remote: bool = False,
    homepage: str = "http://localhost:8085",
    activity_base: str = "http://localhost:8000",
    statement_id: UUID | str | None = None,
    timestamp: str | None = None,
) -> dict[str, Any]:
    """Ask Vidura turn → xAPI interacted.

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
    strat = (strategy or "").strip().lower().replace("-", "_").replace(" ", "_")
    if strat:
        extensions[
            "https://edvidura.local/xapi/extensions/coach_strategy"
        ] = strat[:40]
    cq = (check_question or "").strip()
    if cq:
        extensions[
            "https://edvidura.local/xapi/extensions/check_question_preview"
        ] = cq[:120] + ("…" if len(cq) > 120 else "")
    if jev_used:
        extensions["https://edvidura.local/xapi/extensions/jev_used"] = True
        if jev_model:
            extensions[
                "https://edvidura.local/xapi/extensions/jev_model"
            ] = str(jev_model)[:64]
        if jev_strategy_source:
            extensions[
                "https://edvidura.local/xapi/extensions/jev_strategy_source"
            ] = str(jev_strategy_source)[:32]
        if jev_strategy_confidence is not None:
            try:
                extensions[
                    "https://edvidura.local/xapi/extensions/jev_strategy_confidence"
                ] = round(float(jev_strategy_confidence), 4)
            except (TypeError, ValueError):
                pass
        if jev_on_topic_p is not None:
            try:
                extensions[
                    "https://edvidura.local/xapi/extensions/jev_on_topic_p"
                ] = round(float(jev_on_topic_p), 4)
            except (TypeError, ValueError):
                pass
        if jev_skipped_remote:
            extensions[
                "https://edvidura.local/xapi/extensions/jev_skipped_remote"
            ] = True

    result: dict[str, Any] = {
        "success": bool(grounded),
        "response": (q if include_full_text and q else (q_hash[:16] if q_hash else "")),
    }

    stmt = {
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
                "name": {"en-US": "Ask Vidura"},
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
    }
    if timestamp:
        stmt["timestamp"] = timestamp
    return stmt


def build_coach_feedback_statement(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str,
    rating: str,
    thread_id: str | None = None,
    question_preview: str = "",
    answer_preview: str = "",
    course_title: str = "",
    course_id: UUID | str | None = None,
    homepage: str = "http://localhost:8085",
    activity_base: str = "http://localhost:8000",
    statement_id: UUID | str | None = None,
) -> dict[str, Any]:
    """Thumbs up/down on an Ask Vidura answer → xAPI responded."""
    sid = str(statement_id or uuid4())
    rate = (rating or "").strip().lower()
    if rate not in {"up", "down", "helpful", "not_helpful"}:
        rate = "up" if rate in {"1", "true", "yes", "good"} else "down"
    if rate == "helpful":
        rate = "up"
    if rate == "not_helpful":
        rate = "down"
    tid = (thread_id or "").strip() or f"coach-{subject or 'anon'}"
    extensions: dict[str, Any] = {
        "https://edvidura.local/xapi/extensions/tenant_id": str(tenant_id),
        "https://edvidura.local/xapi/extensions/channel": "study_coach",
        "https://edvidura.local/xapi/extensions/thread_id": tid,
        "https://edvidura.local/xapi/extensions/coach_rating": rate,
        "https://edvidura.local/xapi/extensions/feedback_kind": "thumbs",
    }
    qp = (question_preview or "").strip()
    if qp:
        extensions[
            "https://edvidura.local/xapi/extensions/question_preview"
        ] = qp[:120]
    ap = (answer_preview or "").strip()
    if ap:
        extensions[
            "https://edvidura.local/xapi/extensions/answer_preview"
        ] = ap[:120]
    if course_id:
        extensions[
            "https://edvidura.local/xapi/extensions/course_id"
        ] = str(course_id)
    if course_title.strip():
        extensions[
            "https://edvidura.local/xapi/extensions/course_label"
        ] = course_title.strip()[:120]

    return {
        "id": sid,
        "actor": build_actor(
            subject=subject, learner_name=learner_name, homepage=homepage
        ),
        "verb": {
            "id": verbs.VERB_RESPONDED,
            "display": {"en-US": verbs.VERB_DISPLAY[verbs.VERB_RESPONDED]},
        },
        "object": {
            "objectType": "Activity",
            "id": (
                f"{activity_base.rstrip('/')}/xapi/activities/study-coach"
                f"/feedback/{_slug(tid)}"
            ),
            "definition": {
                "name": {"en-US": "Ask Vidura feedback"},
                "description": {
                    "en-US": "Learner thumbs rating on a coach answer",
                },
                "type": "http://adlnet.gov/expapi/activities/cmi.interaction",
                "interactionType": "likert",
            },
        },
        "result": {
            "success": rate == "up",
            "response": rate,
            "score": {"scaled": 1.0 if rate == "up" else 0.0},
        },
        "context": {
            "platform": "EdVidura",
            "extensions": extensions,
        },
        "timestamp": _iso_now(),
    }


def build_pebl_discussion_statement(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str,
    message_text: str,
    thread_id: str,
    manual_id: UUID | str | None = None,
    manual_title: str = "",
    chapter_slug: str = "",
    chapter_title: str = "",
    access_level: str = "class",
    include_full_text: bool = True,
    homepage: str = "http://localhost:8085",
    activity_base: str = "http://localhost:8000",
    statement_id: UUID | str | None = None,
) -> dict[str, Any]:
    """In-book PeBL discussion post → xAPI interacted (Discussion Extension)."""
    import hashlib

    sid = str(statement_id or uuid4())
    body = (message_text or "").strip()
    body_hash = hashlib.sha256(body.encode("utf-8")).hexdigest() if body else ""
    preview = body[:120] + ("…" if len(body) > 120 else "")
    tid = (thread_id or "").strip() or f"pebl-{subject or 'anon'}"
    level = (access_level or "class").strip() or "class"
    ch_slug = (chapter_slug or "").strip() or "general"
    extensions: dict[str, Any] = {
        "https://edvidura.local/xapi/extensions/tenant_id": str(tenant_id),
        "https://edvidura.local/xapi/extensions/channel": "pebl_ebook",
        "https://edvidura.local/xapi/extensions/thread_id": tid,
        "https://edvidura.local/xapi/extensions/access_level": level,
        "https://edvidura.local/xapi/extensions/pebl_discussion_aligned": True,
        "https://edvidura.local/xapi/extensions/chapter_slug": ch_slug[:120],
        "https://edvidura.local/xapi/extensions/message_sha256": body_hash,
        "https://edvidura.local/xapi/extensions/message_len": len(body),
        "https://edvidura.local/xapi/extensions/message_preview": preview,
    }
    if include_full_text and body:
        extensions[
            "https://edvidura.local/xapi/extensions/message_text"
        ] = body[:8000]
    if manual_id:
        extensions[
            "https://edvidura.local/xapi/extensions/manual_id"
        ] = str(manual_id)
    if (manual_title or "").strip():
        extensions[
            "https://edvidura.local/xapi/extensions/manual_title"
        ] = manual_title.strip()[:160]
    if (chapter_title or "").strip():
        extensions[
            "https://edvidura.local/xapi/extensions/chapter_title"
        ] = chapter_title.strip()[:160]

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
                f"{activity_base.rstrip('/')}/xapi/activities/pebl-ebook"
                f"/manual/{_slug(str(manual_id or 'book'))}"
                f"/chapter/{_slug(ch_slug)}"
                f"/thread/{_slug(tid)}"
            ),
            "definition": {
                "name": {
                    "en-US": (
                        f"PeBL · {(chapter_title or ch_slug or 'Discussion')[:80]}"
                    )
                },
                "description": {
                    "en-US": "In-book PeBL discussion post (Discussion Extension fields)",
                },
                "type": "http://adlnet.gov/expapi/activities/discussion",
            },
        },
        "result": {
            "success": True,
            "response": (body if include_full_text and body else (body_hash[:16] if body_hash else "")),
        },
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


def build_ebook_initialized_statement(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str = "",
    manual_id: UUID | str,
    manual_title: str,
    version: int = 1,
    homepage: str = "http://localhost:8085",
    activity_base: str = "http://localhost:8000",
    statement_id: UUID | str | None = None,
    timestamp: str | None = None,
) -> dict[str, Any]:
    sid = str(statement_id or uuid4())
    stmt = {
        "id": sid,
        "actor": build_actor(
            subject=subject, learner_name=learner_name, homepage=homepage
        ),
        "verb": {
            "id": verbs.VERB_INITIALIZED,
            "display": {"en-US": verbs.VERB_DISPLAY[verbs.VERB_INITIALIZED]},
        },
        "object": {
            "objectType": "Activity",
            "id": f"{activity_base.rstrip('/')}/xapi/activities/ebook/{manual_id}",
            "definition": {
                "name": {"en-US": manual_title or "eBook"},
                "type": "http://id.tincanapi.com/activitytype/resource",
            },
        },
        "context": {
            "platform": "EdVidura",
            "extensions": {
                "https://edvidura.local/xapi/extensions/tenant_id": str(tenant_id),
                "https://edvidura.local/xapi/extensions/manual_id": str(manual_id),
                "https://edvidura.local/xapi/extensions/version": int(version),
                "https://edvidura.local/xapi/extensions/resource_kind": "ebook",
            },
        },
    }
    if timestamp:
        stmt["timestamp"] = timestamp
    return stmt


def build_chapter_experienced_statement(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str = "",
    manual_id: UUID | str,
    manual_title: str,
    chapter_index: int,
    chapter_title: str = "",
    version: int = 1,
    homepage: str = "http://localhost:8085",
    activity_base: str = "http://localhost:8000",
    statement_id: UUID | str | None = None,
    timestamp: str | None = None,
) -> dict[str, Any]:
    sid = str(statement_id or uuid4())
    chap_num = int(chapter_index) + 1
    display_title = (chapter_title or f"Chapter {chap_num}").strip()
    full_name = f"{manual_title} - {display_title}" if manual_title else display_title
    stmt = {
        "id": sid,
        "actor": build_actor(
            subject=subject, learner_name=learner_name, homepage=homepage
        ),
        "verb": {
            "id": verbs.VERB_EXPERIENCED,
            "display": {"en-US": verbs.VERB_DISPLAY[verbs.VERB_EXPERIENCED]},
        },
        "object": {
            "objectType": "Activity",
            "id": f"{activity_base.rstrip('/')}/xapi/activities/ebook/{manual_id}/chapter/{chapter_index}",
            "definition": {
                "name": {"en-US": full_name},
                "type": "http://adlnet.gov/expapi/activities/module",
            },
        },
        "context": {
            "platform": "EdVidura",
            "extensions": {
                "https://edvidura.local/xapi/extensions/tenant_id": str(tenant_id),
                "https://edvidura.local/xapi/extensions/manual_id": str(manual_id),
                "https://edvidura.local/xapi/extensions/chapter_index": int(chapter_index),
                "https://edvidura.local/xapi/extensions/chapter_title": display_title,
                "https://edvidura.local/xapi/extensions/version": int(version),
            },
        },
    }
    if timestamp:
        stmt["timestamp"] = timestamp
    return stmt


def build_reading_progressed_statement(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str = "",
    manual_id: UUID | str,
    manual_title: str,
    chapter_index: int,
    progress_percent: int,
    cfi: str | None = None,
    version: int = 1,
    homepage: str = "http://localhost:8085",
    activity_base: str = "http://localhost:8000",
    statement_id: UUID | str | None = None,
    timestamp: str | None = None,
) -> dict[str, Any]:
    sid = str(statement_id or uuid4())
    pct = max(0, min(100, int(progress_percent)))
    scaled = round(pct / 100.0, 4)
    stmt = {
        "id": sid,
        "actor": build_actor(
            subject=subject, learner_name=learner_name, homepage=homepage
        ),
        "verb": {
            "id": verbs.VERB_PROGRESSED,
            "display": {"en-US": verbs.VERB_DISPLAY[verbs.VERB_PROGRESSED]},
        },
        "object": {
            "objectType": "Activity",
            "id": f"{activity_base.rstrip('/')}/xapi/activities/ebook/{manual_id}",
            "definition": {
                "name": {"en-US": manual_title or "eBook"},
                "type": "http://id.tincanapi.com/activitytype/resource",
            },
        },
        "result": {
            "score": {
                "raw": pct,
                "min": 0,
                "max": 100,
                "scaled": scaled,
            },
            "completion": pct >= 100,
            "extensions": {
                "https://w3id.org/xapi/cmi5/result/extensions/progress": pct,
            },
        },
        "context": {
            "platform": "EdVidura",
            "extensions": {
                "https://edvidura.local/xapi/extensions/tenant_id": str(tenant_id),
                "https://edvidura.local/xapi/extensions/manual_id": str(manual_id),
                "https://edvidura.local/xapi/extensions/chapter_index": int(chapter_index),
                "https://edvidura.local/xapi/extensions/progress_percent": pct,
                "https://edvidura.local/xapi/extensions/cfi": str(cfi or ""),
                "https://edvidura.local/xapi/extensions/version": int(version),
            },
        },
    }
    if timestamp:
        stmt["timestamp"] = timestamp
    return stmt


def build_bookmark_created_statement(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str = "",
    manual_id: UUID | str,
    manual_title: str,
    chapter_index: int,
    bookmark_title: str,
    cfi: str | None = None,
    version: int = 1,
    homepage: str = "http://localhost:8085",
    activity_base: str = "http://localhost:8000",
    statement_id: UUID | str | None = None,
    timestamp: str | None = None,
) -> dict[str, Any]:
    sid = str(statement_id or uuid4())
    bm_title = (bookmark_title or f"Bookmark on Chapter {chapter_index + 1}").strip()
    stmt = {
        "id": sid,
        "actor": build_actor(
            subject=subject, learner_name=learner_name, homepage=homepage
        ),
        "verb": {
            "id": verbs.VERB_BOOKMARKED,
            "display": {"en-US": verbs.VERB_DISPLAY[verbs.VERB_BOOKMARKED]},
        },
        "object": {
            "objectType": "Activity",
            "id": f"{activity_base.rstrip('/')}/xapi/activities/ebook/{manual_id}/bookmark/{chapter_index}",
            "definition": {
                "name": {"en-US": bm_title},
                "type": "http://id.tincanapi.com/activitytype/bookmark",
            },
        },
        "context": {
            "platform": "EdVidura",
            "extensions": {
                "https://edvidura.local/xapi/extensions/tenant_id": str(tenant_id),
                "https://edvidura.local/xapi/extensions/manual_id": str(manual_id),
                "https://edvidura.local/xapi/extensions/chapter_index": int(chapter_index),
                "https://edvidura.local/xapi/extensions/bookmark_title": bm_title,
                "https://edvidura.local/xapi/extensions/cfi": str(cfi or ""),
                "https://edvidura.local/xapi/extensions/version": int(version),
            },
        },
    }
    if timestamp:
        stmt["timestamp"] = timestamp
    return stmt


def build_annotation_added_statement(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str = "",
    manual_id: UUID | str,
    manual_title: str,
    chapter_index: int,
    annotation_text: str = "",
    highlight_text: str = "",
    color: str = "yellow",
    cfi_range: str | None = None,
    version: int = 1,
    homepage: str = "http://localhost:8085",
    activity_base: str = "http://localhost:8000",
    statement_id: UUID | str | None = None,
    timestamp: str | None = None,
) -> dict[str, Any]:
    sid = str(statement_id or uuid4())
    note = (annotation_text or "").strip()
    hl = (highlight_text or "").strip()
    stmt = {
        "id": sid,
        "actor": build_actor(
            subject=subject, learner_name=learner_name, homepage=homepage
        ),
        "verb": {
            "id": verbs.VERB_ANNOTATED,
            "display": {"en-US": verbs.VERB_DISPLAY[verbs.VERB_ANNOTATED]},
        },
        "object": {
            "objectType": "Activity",
            "id": f"{activity_base.rstrip('/')}/xapi/activities/ebook/{manual_id}/annotation/{chapter_index}",
            "definition": {
                "name": {"en-US": f"Annotation on {manual_title or 'eBook'}"},
                "type": "http://risc-inc.com/annotator/activities/annotation",
            },
        },
        "result": {
            "response": note or hl,
        },
        "context": {
            "platform": "EdVidura",
            "extensions": {
                "https://edvidura.local/xapi/extensions/tenant_id": str(tenant_id),
                "https://edvidura.local/xapi/extensions/manual_id": str(manual_id),
                "https://edvidura.local/xapi/extensions/chapter_index": int(chapter_index),
                "https://edvidura.local/xapi/extensions/annotation_text": note[:5000],
                "https://edvidura.local/xapi/extensions/highlight_text": hl[:5000],
                "https://edvidura.local/xapi/extensions/color": color,
                "https://edvidura.local/xapi/extensions/cfi_range": str(cfi_range or ""),
                "https://edvidura.local/xapi/extensions/version": int(version),
            },
        },
    }
    if timestamp:
        stmt["timestamp"] = timestamp
    return stmt


def build_reading_completed_statement(
    *,
    tenant_id: UUID | str,
    subject: str,
    learner_name: str = "",
    manual_id: UUID | str,
    manual_title: str,
    version: int = 1,
    homepage: str = "http://localhost:8085",
    activity_base: str = "http://localhost:8000",
    statement_id: UUID | str | None = None,
    timestamp: str | None = None,
) -> dict[str, Any]:
    sid = str(statement_id or uuid4())
    stmt = {
        "id": sid,
        "actor": build_actor(
            subject=subject, learner_name=learner_name, homepage=homepage
        ),
        "verb": {
            "id": verbs.VERB_COMPLETED,
            "display": {"en-US": verbs.VERB_DISPLAY[verbs.VERB_COMPLETED]},
        },
        "object": {
            "objectType": "Activity",
            "id": f"{activity_base.rstrip('/')}/xapi/activities/ebook/{manual_id}",
            "definition": {
                "name": {"en-US": manual_title or "eBook"},
                "type": "http://id.tincanapi.com/activitytype/resource",
            },
        },
        "result": {
            "completion": True,
            "success": True,
            "score": {"raw": 100, "min": 0, "max": 100, "scaled": 1.0},
        },
        "context": {
            "platform": "EdVidura",
            "extensions": {
                "https://edvidura.local/xapi/extensions/tenant_id": str(tenant_id),
                "https://edvidura.local/xapi/extensions/manual_id": str(manual_id),
                "https://edvidura.local/xapi/extensions/version": int(version),
                "https://edvidura.local/xapi/extensions/resource_kind": "ebook",
            },
        },
    }
    if timestamp:
        stmt["timestamp"] = timestamp
    return stmt
