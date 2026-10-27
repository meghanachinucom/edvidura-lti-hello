"""EdVidura App API — same JSON contract for web and mobile clients."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Query, Request
from pydantic import BaseModel, Field

from app.api.app_client.auth import LearnerSession
from app.api.app_client.envelope import json_safe, ok, public_session
from app.api.app_client.errors import AppApiError

router = APIRouter(prefix="/api/v1/app", tags=["App (web + mobile)"])


def _ctx(session: dict[str, Any]) -> str:
    return str(session.get("lti_context_id") or "")


def _is_staff(session: dict[str, Any]) -> bool:
    return bool(session.get("is_instructor") or session.get("is_school_admin"))


def _caps(session: dict[str, Any]) -> dict[str, Any]:
    from app.modules.tenancy import attach_to_session, defaults_for_segment

    try:
        attach_to_session(session)
    except Exception:  # noqa: BLE001
        session.setdefault("segment", "school")
        session.setdefault(
            "capabilities",
            defaults_for_segment(session.get("segment") or "school"),
        )
    return session.get("capabilities") or defaults_for_segment(
        session.get("segment") or "school"
    )


def _require_cap(session: dict[str, Any], key: str, *, message: str) -> None:
    from app.modules.tenancy import can

    if not can(_caps(session), key):
        raise AppApiError(message, code="capability_denied", status_code=403)


def _enforce_ghost_coach(session: dict[str, Any], *, practice: bool) -> None:
    """Mirror shell graded-quiz gate for App API clients."""
    if practice or _is_staff(session):
        return
    from app.modules import content
    from app.modules.specials import ghost_coach_gate
    from app.modules.tenancy import can
    from app.settings import get_settings

    caps = _caps(session)
    if not can(caps, "ghost_coach_gate"):
        return
    if not get_settings().ghost_coach_hard_gate:
        return
    course_id = session.get("edvidura_course_id")
    if not course_id:
        return
    try:
        progress = content.course_progress(
            session["tenant_id"],
            course_id=course_id,
            subject=str(session.get("subject") or ""),
        )
    except Exception:  # noqa: BLE001
        return
    gate = ghost_coach_gate(progress, bypass=False)
    if gate.get("gate"):
        raise AppApiError(
            str(gate.get("message") or "Finish lessons before the graded quiz."),
            code="ghost_coach_gate",
            status_code=403,
            details={
                "completed": gate.get("completed"),
                "total": gate.get("total"),
                "practice_ok": True,
            },
        )


def _require_manual_for_learner(session: dict[str, Any], manual_id: UUID) -> None:
    """Block in-tenant IDOR: learners only see/discuss class-assigned manuals."""
    if _is_staff(session):
        return
    from app.modules import manuals as manuals_mod

    class_id = session.get("class_id")
    if not class_id or not manuals_mod.manual_visible_to_class(
        session["tenant_id"], manual_id=manual_id, class_id=class_id
    ):
        raise AppApiError(
            "Manual not available for this class",
            code="forbidden",
            status_code=403,
        )


def _pebl_msg(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row.get("id") or ""),
        "thread_id": str(row.get("thread_id") or ""),
        "parent_id": str(row.get("parent_id") or "") or None,
        "author_subject": str(row.get("author_subject") or ""),
        "author_name": str(row.get("author_name") or ""),
        "body": str(row.get("body") or ""),
        "client_id": str(row.get("client_id") or "") or None,
        "created_at": json_safe(row.get("created_at")),
    }


def _bound_course(session: dict[str, Any]) -> dict[str, Any] | None:
    from app.modules import content

    return content.get_bound_course(
        session["tenant_id"],
        session.get("edvidura_course_id") or None,
    )


def _lesson_card(
    row: dict[str, Any] | None,
    completed_ids: set[str] | None = None,
) -> dict[str, Any] | None:
    if not row:
        return None
    lid = str(row.get("id") or "")
    done = completed_ids or set()
    return {
        "id": lid,
        "slug": str(row.get("slug") or ""),
        "title": str(row.get("title") or ""),
        "position": int(row.get("position") or 0),
        "lesson_type": str(row.get("lesson_type") or "article"),
        "status": str(row.get("status") or "published"),
        "completed": lid in done,
        "video_url": str(row.get("video_url") or "") or None,
    }


def _progress_payload(progress: dict[str, Any]) -> dict[str, Any]:
    raw_done = progress.get("completed_ids") or set()
    done = {str(x) for x in raw_done}
    lessons = [
        card
        for L in (progress.get("lessons") or [])
        if (card := _lesson_card(L, done))
    ]
    nxt = progress.get("next_lesson")
    return {
        "percent": int(progress.get("percent") or progress.get("completion_pct") or 0),
        "completed_count": int(progress.get("completed_count") or 0),
        "total_count": int(progress.get("total_count") or 0),
        "all_lessons_done": bool(progress.get("all_lessons_done")),
        "completed_ids": sorted(done),
        "lessons": lessons,
        "next_lesson": _lesson_card(nxt, done) if nxt else None,
    }


def _empty_progress() -> dict[str, Any]:
    return {
        "percent": 0,
        "completed_count": 0,
        "total_count": 0,
        "all_lessons_done": False,
        "completed_ids": [],
        "lessons": [],
        "next_lesson": None,
        "course": None,
    }


def _load_progress(session: dict[str, Any]) -> dict[str, Any]:
    from app.modules import content

    course = _bound_course(session)
    if not course:
        return _empty_progress()
    subject = str(session.get("subject") or "")
    try:
        progress = content.course_progress(
            session["tenant_id"],
            course_id=course["id"],
            subject=subject,
        )
    except Exception:  # noqa: BLE001
        out = _empty_progress()
        out["course"] = {
            "id": str(course.get("id") or ""),
            "slug": str(course.get("slug") or ""),
            "title": str(course.get("title") or ""),
        }
        return out
    out = _progress_payload(progress)
    out["course"] = {
        "id": str(course.get("id") or ""),
        "slug": str(course.get("slug") or ""),
        "title": str(course.get("title") or ""),
    }
    return out


def _attempt_card(row: dict[str, Any]) -> dict[str, Any]:
    score = int(row.get("score") or 0)
    max_score = int(row.get("max_score") or 0)
    pct = int(round(100 * score / max_score)) if max_score else None
    sent = bool(row.get("grade_sent"))
    err = str(row.get("grade_error") or "")
    status = "synced" if sent else "queued"
    if err and not sent:
        low = err.lower()
        if "practice" in low:
            status = "synced"
        elif "fail" in low or "error" in low:
            status = "needs-review"
    name = str(row.get("learner_name") or "Learner").strip() or "Learner"
    parts = [p for p in name.split() if p]
    initials = (
        (parts[0][:1] + (parts[-1][:1] if len(parts) > 1 else "")).upper()
        if parts
        else "?"
    )
    return {
        "id": str(row.get("id") or ""),
        "subject": str(row.get("subject") or ""),
        "learner_name": name,
        "initials": initials,
        "course_label": str(row.get("course_label") or ""),
        "score": score,
        "max_score": max_score,
        "score_percent": pct,
        "grade_sent": sent,
        "grade_error": err or None,
        "status": status,
        "created_at": json_safe(row.get("created_at")),
    }


# —— Session ——


@router.get("/session")
def app_session(session: LearnerSession) -> Any:
    """Current learner after LTI launch (token + profile)."""
    return ok(public_session(session))


# —— Manuals / eBook ——


@router.get("/manuals")
def app_manuals(session: LearnerSession) -> Any:
    from app.modules import manuals as manuals_mod

    class_id = session.get("class_id")
    if _is_staff(session) and not class_id:
        rows = manuals_mod.list_manuals(session["tenant_id"])
    elif class_id:
        rows = manuals_mod.list_manuals_for_class(
            session["tenant_id"], class_id
        )
    else:
        # Learners without a class binding must not see the whole tenant.
        rows = []
    items = [
        {
            "id": str(r.get("id") or ""),
            "slug": str(r.get("slug") or ""),
            "title": str(r.get("title") or ""),
            "description": str(r.get("description") or ""),
            "status": str(r.get("status") or ""),
        }
        for r in rows
    ]
    return ok({"manuals": items}, meta={"count": len(items)})


@router.get("/manuals/{manual_id}")
def app_manual_read(
    manual_id: UUID,
    session: LearnerSession,
    v: int | None = Query(None),
    focus: str | None = Query(None),
) -> Any:
    from app.modules import manuals as manuals_mod
    from app.modules import pebl as pebl_mod

    tid = session["tenant_id"]
    _require_manual_for_learner(session, manual_id)

    manual = manuals_mod.get_manual(tid, manual_id)
    if not manual:
        raise AppApiError("Manual not found", code="not_found", status_code=404)

    if v is not None:
        version = manuals_mod.get_version(tid, manual_id, v)
    else:
        version = manuals_mod.latest_published_version(tid, manual_id)
    if not version:
        raise AppApiError("No published version", code="not_found", status_code=404)

    body_md = str(version.get("body_md") or "")
    toc = manuals_mod.toc_from_body(body_md)
    body_html = manuals_mod.render_body(body_md)
    counts = pebl_mod.chapter_counts(
        tenant_id=tid,
        manual_id=manual_id,
        context_id=_ctx(session),
    )
    return ok(
        {
            "manual": {
                "id": str(manual.get("id") or ""),
                "title": str(manual.get("title") or ""),
                "slug": str(manual.get("slug") or ""),
                "description": str(manual.get("description") or ""),
            },
            "version": {
                "version": int(version.get("version") or 0),
                "is_published": bool(version.get("is_published")),
                "changelog": str(version.get("changelog") or ""),
            },
            "toc": toc,
            "body_html": body_html,
            "focus": (focus or "").strip() or None,
            "pebl_counts": counts,
        }
    )


class ManualPageTime(BaseModel):
    chapter_slug: str = Field(default="", max_length=120)
    page_label: str = Field(default="", max_length=120)
    seconds: int = Field(default=0, ge=0, le=24 * 60 * 60)


@router.post("/manuals/{manual_id}/page-time")
def app_manual_page_time(
    manual_id: UUID,
    payload: ManualPageTime,
    session: LearnerSession,
) -> Any:
    from app.modules import manuals as manuals_mod
    from app.modules import xapi as xapi_mod

    _require_manual_for_learner(session, manual_id)
    manual = manuals_mod.get_manual(session["tenant_id"], manual_id)
    if not manual:
        raise AppApiError("Manual not found", code="not_found", status_code=404)
    title = str(manual.get("title") or "Manual")
    page = (payload.page_label or payload.chapter_slug or "page").strip()
    try:
        xapi_mod.record_resource_experienced(
            tenant_id=session["tenant_id"],
            subject=str(session.get("subject") or ""),
            learner_name=str(session.get("learner_name") or ""),
            resource_id=str(manual_id),
            resource_title=f"{title} · {page}"[:200],
            resource_kind="manual",
            duration_seconds=int(payload.seconds or 0),
            page_label=page,
            chapter_slug=(payload.chapter_slug or "").strip(),
        )
    except Exception as exc:  # noqa: BLE001
        raise AppApiError("Could not record page time", code="xapi_failed") from exc
    return ok({"recorded": True, "page": page, "seconds": int(payload.seconds or 0)})


# —— PeBL discuss ——


@router.get("/manuals/{manual_id}/discussions")
def app_discuss_list(
    manual_id: UUID,
    session: LearnerSession,
    chapter: str = Query(..., min_length=1),
) -> Any:
    from app.modules import pebl as pebl_mod

    _require_manual_for_learner(session, manual_id)
    pack = pebl_mod.list_messages(
        tenant_id=session["tenant_id"],
        manual_id=manual_id,
        chapter_slug=chapter,
        context_id=_ctx(session),
    )
    thread = pack.get("thread")
    return ok(
        {
            "chapter_slug": pack.get("chapter_slug") or chapter,
            "thread_id": str(thread["id"]) if thread else None,
            "access_level": (thread or {}).get("access_level") or "class",
            "messages": [_pebl_msg(m) for m in pack.get("messages") or []],
        }
    )


class DiscussPost(BaseModel):
    chapter_slug: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1, max_length=4000)
    chapter_title: str = ""
    parent_id: str | None = None
    client_id: str = ""


@router.post("/manuals/{manual_id}/discussions")
def app_discuss_post(
    manual_id: UUID,
    payload: DiscussPost,
    session: LearnerSession,
) -> Any:
    from app.modules import manuals as manuals_mod
    from app.modules import pebl as pebl_mod
    from app.modules import xapi as xapi_mod
    from app.settings import get_settings

    _require_manual_for_learner(session, manual_id)
    settings = get_settings()
    access = str(getattr(settings, "coach_xapi_access_level", None) or "class")
    try:
        result = pebl_mod.post_message(
            tenant_id=session["tenant_id"],
            manual_id=manual_id,
            chapter_slug=payload.chapter_slug,
            chapter_title=payload.chapter_title,
            body=payload.body,
            author_subject=str(session.get("subject") or ""),
            author_name=str(session.get("learner_name") or ""),
            context_id=_ctx(session),
            access_level=access,
            parent_id=payload.parent_id,
            client_id=payload.client_id,
        )
    except ValueError as exc:
        raise AppApiError(str(exc), code="validation") from exc

    msg = result["message"]
    thread = result["thread"]
    if not result.get("deduped"):
        try:
            manual = manuals_mod.get_manual(session["tenant_id"], manual_id)
            xapi_mod.record_pebl_discussion(
                tenant_id=session["tenant_id"],
                subject=str(session.get("subject") or ""),
                learner_name=str(session.get("learner_name") or ""),
                message_text=str(msg.get("body") or ""),
                thread_id=str(thread.get("id") or ""),
                manual_id=str(manual_id),
                manual_title=str((manual or {}).get("title") or ""),
                chapter_slug=payload.chapter_slug,
                chapter_title=payload.chapter_title,
                access_level=access,
            )
        except Exception:  # noqa: BLE001
            pass

    return ok(
        {
            "message": _pebl_msg(msg),
            "thread_id": str(thread.get("id") or ""),
            "deduped": bool(result.get("deduped")),
        },
        status_code=201,
    )


# —— Micro-learning ——


@router.get("/micro")
def app_micro(session: LearnerSession) -> Any:
    from app.modules import adaptive as adaptive_mod

    catalog = adaptive_mod.micro_learning_catalog(
        session["tenant_id"],
        subject=str(session.get("subject") or ""),
        quiz_token=str(session.get("quiz_token") or ""),
    )
    return ok(json_safe(catalog))


class MicroViewed(BaseModel):
    skill_id: str = Field(..., min_length=1)
    title: str = "Micro reel"


@router.post("/micro/viewed")
def app_micro_viewed(payload: MicroViewed, session: LearnerSession) -> Any:
    from app.modules import xapi as xapi_mod

    try:
        xapi_mod.record_resource_experienced(
            tenant_id=session["tenant_id"],
            subject=str(session.get("subject") or ""),
            learner_name=str(session.get("learner_name") or ""),
            resource_id=payload.skill_id,
            resource_title=payload.title[:200],
            resource_kind="micro_reel",
        )
    except Exception as exc:  # noqa: BLE001
        raise AppApiError("Could not record view", code="xapi_failed") from exc
    return ok({"recorded": True})


# —— Pravachana (government video library) ——


def _gov_or_video(session: dict[str, Any]) -> None:
    from app.modules.tenancy import can

    caps = _caps(session)
    if str(session.get("segment") or "") == "government" or can(caps, "video_library"):
        return
    raise AppApiError(
        "Video library is not enabled for this organization.",
        code="capability_denied",
        status_code=403,
    )


@router.get("/pravachanas")
def app_pravachanas(
    session: LearnerSession,
    q: str = Query(""),
    pack: str = Query(""),
) -> Any:
    from app.modules import pravachana

    _gov_or_video(session)
    data = pravachana.catalog(
        session["tenant_id"],
        subject=str(session.get("subject") or ""),
        query=q,
        pack=pack,
    )
    data["mine"] = pravachana.learner_progress(
        session["tenant_id"], str(session.get("subject") or "")
    )
    return ok(json_safe(data), meta={"count": data.get("count") or 0})


@router.get("/pravachanas/stats")
def app_pravachana_stats(session: LearnerSession) -> Any:
    from app.modules import pravachana

    _gov_or_video(session)
    if not _is_staff(session):
        raise AppApiError("Staff only", code="forbidden", status_code=403)
    return ok(json_safe(pravachana.dept_stats(session["tenant_id"])))


@router.get("/pravachanas/{episode_id}")
def app_pravachana_read(episode_id: UUID, session: LearnerSession) -> Any:
    from app.modules import pravachana

    _gov_or_video(session)
    row = pravachana.get_episode(
        session["tenant_id"],
        episode_id,
        subject=str(session.get("subject") or ""),
    )
    if not row:
        raise AppApiError("Episode not found", code="not_found", status_code=404)
    notes = pravachana.list_notes(session["tenant_id"], episode_id)
    return ok(json_safe({"episode": row, "notes": notes}))


class PravachanaProgressIn(BaseModel):
    position_sec: int = 0
    duration_sec: int = 0
    completed: bool = False


@router.post("/pravachanas/{episode_id}/progress")
def app_pravachana_progress(
    episode_id: UUID, payload: PravachanaProgressIn, session: LearnerSession
) -> Any:
    from app.modules import pravachana, xapi as xapi_mod

    _gov_or_video(session)
    try:
        row = pravachana.record_progress(
            session["tenant_id"],
            episode_id=episode_id,
            subject=str(session.get("subject") or ""),
            learner_name=str(session.get("learner_name") or ""),
            position_sec=payload.position_sec,
            duration_sec=payload.duration_sec,
            completed=payload.completed,
        )
    except ValueError as exc:
        raise AppApiError(str(exc), code="not_found", status_code=404) from exc
    if payload.completed or payload.position_sec <= 3:
        try:
            ep = pravachana.get_episode(session["tenant_id"], episode_id)
            xapi_mod.record_resource_experienced(
                tenant_id=session["tenant_id"],
                subject=str(session.get("subject") or ""),
                learner_name=str(session.get("learner_name") or ""),
                resource_id=episode_id,
                resource_title=str((ep or {}).get("title_en") or "Pravachanam"),
                resource_kind="pravachana",
            )
        except Exception:  # noqa: BLE001
            pass
    return ok(json_safe(row))


class PravachanaNoteIn(BaseModel):
    body: str = Field(..., min_length=1, max_length=4000)


@router.get("/pravachanas/{episode_id}/notes")
def app_pravachana_notes(episode_id: UUID, session: LearnerSession) -> Any:
    from app.modules import pravachana

    _gov_or_video(session)
    notes = pravachana.list_notes(session["tenant_id"], episode_id)
    return ok({"notes": json_safe(notes)}, meta={"count": len(notes)})


@router.post("/pravachanas/{episode_id}/notes")
def app_pravachana_note_add(
    episode_id: UUID, payload: PravachanaNoteIn, session: LearnerSession
) -> Any:
    from app.modules import pravachana

    _gov_or_video(session)
    try:
        row = pravachana.add_note(
            session["tenant_id"],
            episode_id=episode_id,
            author_subject=str(session.get("subject") or ""),
            author_name=str(session.get("learner_name") or "Citizen"),
            body=payload.body,
        )
    except ValueError as exc:
        raise AppApiError(str(exc), code="invalid", status_code=400) from exc
    return ok(json_safe(row), status_code=201)


# —— Study plan ——


@router.get("/plan")
def app_plan(session: LearnerSession) -> Any:
    from app.modules import adaptive as adaptive_mod

    _require_cap(
        session,
        "study_plan",
        message="Study plan is not enabled for this organization.",
    )
    summary = adaptive_mod.learner_plan_summary(
        session["tenant_id"],
        subject=str(session.get("subject") or ""),
        quiz_token=str(session.get("quiz_token") or ""),
        course_id=session.get("edvidura_course_id"),
        course_label=str(session.get("course") or ""),
    )
    return ok(json_safe(summary))


# —— Quiz ——


def _quiz_gates(session: dict[str, Any], *, practice: bool) -> dict[str, Any]:
    """Group assignment (LMS F-6) + attempt quota (xAPI F-6/F-7)."""
    from app.modules import lti_groups as groups_mod
    from app.modules import quiz as quiz_mod

    staff = _is_staff(session)
    try:
        access = groups_mod.activity_access(
            session["tenant_id"],
            str(session.get("subject") or ""),
            "quiz",
            "school-quiz",
            is_staff=staff,
        )
    except Exception:  # noqa: BLE001
        access = {"allowed": True, "restricted": False, "assignment": None, "reason": "open"}
    try:
        quota = quiz_mod.attempt_quota(
            session["tenant_id"],
            str(session.get("subject") or ""),
            practice=practice,
        )
    except Exception:  # noqa: BLE001
        quota = quiz_mod.remaining_attempts(0, quiz_mod.DEFAULT_MAX_ATTEMPTS, practice=practice)
    return {"access": access, "quota": quota, "staff": staff}


def _enforce_quiz_assignment(gates: dict[str, Any], *, practice: bool) -> None:
    access = gates.get("access") or {}
    if practice or gates.get("staff"):
        return
    if access.get("allowed"):
        return
    raise AppApiError(
        "This quiz is assigned to a class group you are not in.",
        code="not_assigned",
        status_code=403,
        details=access,
    )


def _enforce_quiz_quota(gates: dict[str, Any], *, practice: bool) -> None:
    quota = gates.get("quota") or {}
    if practice or gates.get("staff") or quota.get("allowed"):
        return
    raise AppApiError(
        f"Attempt limit reached ({quota.get('used')}/{quota.get('limit')}).",
        code="attempt_limit",
        status_code=403,
        details=quota,
    )


@router.get("/quiz")
def app_quiz(
    session: LearnerSession,
    practice: bool = Query(False),
) -> Any:
    from app.modules import quiz as quiz_mod

    if practice:
        _require_cap(
            session,
            "quiz_practice",
            message="Practice quiz is not enabled for this organization.",
        )
    else:
        _require_cap(
            session,
            "quiz_graded",
            message="Graded quiz is not enabled for this organization.",
        )
    _enforce_ghost_coach(session, practice=practice)
    gates = _quiz_gates(session, practice=practice)
    _enforce_quiz_assignment(gates, practice=practice)
    course_id = session.get("edvidura_course_id")
    bank = quiz_mod.questions_for_tenant(
        session["tenant_id"], course_id=course_id or None
    )
    sampled = quiz_mod.sample_questions_for_student(
        bank, subject=str(session.get("subject") or "")
    )
    questions = [quiz_mod.public_question_dict(q) for q in sampled]
    access = gates.get("access") or {}
    return ok(
        {
            "practice": practice,
            "questions": questions,
            "count": len(questions),
            "quota": gates.get("quota"),
            "group_assignment": access.get("assignment"),
            "assigned": bool(access.get("reason") == "assigned"),
            "can_submit": bool(
                practice or (gates.get("quota") or {}).get("allowed")
            ),
        }
    )


class QuizSubmit(BaseModel):
    answers: dict[str, str] = Field(default_factory=dict)
    practice: bool = False


@router.post("/quiz/submit")
def app_quiz_submit(
    payload: QuizSubmit,
    session: LearnerSession,
    background_tasks: BackgroundTasks,
) -> Any:
    from app import db
    from app.modules import quiz as quiz_mod
    from app.quiz_routes import _ags_background, _load_launch_data

    if payload.practice:
        _require_cap(
            session,
            "quiz_practice",
            message="Practice quiz is not enabled for this organization.",
        )
    else:
        _require_cap(
            session,
            "quiz_graded",
            message="Graded quiz is not enabled for this organization.",
        )
    _enforce_ghost_coach(session, practice=payload.practice)
    gates = _quiz_gates(session, practice=payload.practice)
    _enforce_quiz_assignment(gates, practice=payload.practice)
    _enforce_quiz_quota(gates, practice=payload.practice)
    answers = dict(payload.answers or {})

    def get_answer(qid: str) -> str:
        return str(answers.get(qid) or "")

    graded = quiz_mod.grade_submitted_form(
        tenant_id=session["tenant_id"],
        subject=str(session.get("subject") or ""),
        course_id=session.get("edvidura_course_id"),
        form_keys=set(answers.keys()),
        get_answer=get_answer,
        practice_mode=payload.practice,
    )
    attempt = quiz_mod.record_graded_attempt(
        tenant_id=session["tenant_id"],
        subject=str(session.get("subject") or ""),
        learner_name=str(session.get("learner_name") or ""),
        course_label=str(session.get("course") or ""),
        graded=graded,
    )

    grade_queued = False
    if not payload.practice:
        launch_id = str(session.get("launch_id") or "")
        if launch_id:
            try:
                db.touch_launch_snapshot(
                    launch_id, tenant_id=session.get("tenant_id")
                )
            except Exception:  # noqa: BLE001
                pass
        launch_data = _load_launch_data(launch_id) if launch_id else None
        background_tasks.add_task(
            _ags_background,
            launch_id=launch_id,
            subject=str(session.get("subject") or ""),
            score=int(graded.get("score") or 0),
            score_maximum=int(graded.get("max_score") or 0),
            tenant_id=str(session["tenant_id"]),
            attempt_id=str(attempt["id"]),
            ags_available=session.get("ags_available"),
            launch_data=launch_data,
        )
        grade_queued = True

    detail = graded.get("detail") or {}
    safe_detail = json_safe(quiz_mod.client_safe_grade_detail(detail))
    return ok(
        {
            "attempt_id": str(attempt.get("id") or ""),
            "score": int(graded.get("score") or 0),
            "max_score": int(graded.get("max_score") or 0),
            "pass_percent": int(graded.get("pass_percent") or 60),
            "passed": bool(graded.get("passed")),
            "practice": bool(payload.practice),
            "grade_sent": bool(attempt.get("grade_sent")),
            "grade_queued": grade_queued,
            "ags_available": session.get("ags_available"),
            "detail": safe_detail,
            "quota": gates.get("quota"),
            "group_assignment": (gates.get("access") or {}).get("assignment"),
        },
        status_code=201,
    )


class BankGenerateIn(BaseModel):
    count: int = 120
    lesson_id: str = ""
    title: str = ""
    difficulty: str = "core"
    complexity: str = "apply"


class BankReviewIn(BaseModel):
    batch_id: str = ""
    item_ids: list[str] = Field(default_factory=list)
    status: str = "approved"
    promote: bool = False


class EssayGradeIn(BaseModel):
    prompt: str
    student_answer: str
    instructor_answer: str = ""
    rubric: str = ""
    max_score: int = 5


class GroupCreateIn(BaseModel):
    name: str
    members: list[dict[str, str]] = Field(default_factory=list)


class GroupAssignIn(BaseModel):
    group_id: str
    activity_type: str = "quiz"
    activity_id: str = "school-quiz"
    title: str = ""


class QuizPolicyIn(BaseModel):
    max_attempts: int = 3


class InboundGradeIn(BaseModel):
    subject: str
    score: int
    max_score: int = 1
    learner_name: str = ""
    activity_id: str = "school-quiz"
    source: str = "external"


class FilePutIn(BaseModel):
    filename: str
    file_key: str = ""
    content_type: str = ""
    json_body: dict[str, Any] | list[Any] | None = None
    base64: str = ""


@router.post("/quiz/bank/generate")
def app_quiz_bank_generate(payload: BankGenerateIn, session: LearnerSession) -> Any:
    from app.modules import ai_assessment as ai_mod
    from app.modules import quiz as quiz_mod

    if not _is_staff(session):
        raise AppApiError("Teachers generate the test bank.", code="forbidden", status_code=403)
    text, title = quiz_mod.source_text_for_bank(
        session["tenant_id"],
        course_id=str(session.get("edvidura_course_id") or "") or None,
        lesson_id=payload.lesson_id or None,
    )
    result = ai_mod.generate_test_bank(
        text,
        count=payload.count,
        title=payload.title or title,
        difficulty=payload.difficulty,
        complexity=payload.complexity,
    )
    batch = None
    stored: list = []
    try:
        batch = quiz_mod.save_bank_batch(
            session["tenant_id"],
            title=payload.title or title,
            questions=list(result.get("questions") or []),
            source_kind="lesson",
            source_label=title,
        )
        if batch:
            stored = quiz_mod.list_bank_items(
                session["tenant_id"], batch_id=str(batch.get("id") or "")
            )
    except Exception:  # noqa: BLE001
        batch = None
    return ok(
        json_safe(
            {
                **result,
                "batch": batch,
                "items": stored,
            }
        )
    )


@router.get("/quiz/bank")
def app_quiz_bank(
    session: LearnerSession,
    batch_id: str = "",
    status: str = "",
) -> Any:
    from app.modules import quiz as quiz_mod

    if not _is_staff(session):
        raise AppApiError("The test bank is for teachers.", code="forbidden", status_code=403)
    items = quiz_mod.list_bank_items(
        session["tenant_id"],
        batch_id=batch_id or None,
        status=status or None,
    )
    live = [
        quiz_mod.public_question_dict(q)
        for q in quiz_mod.tenant_authored_questions(
            session["tenant_id"],
            course_id=session.get("edvidura_course_id"),
        )
    ]
    return ok({"items": json_safe(items), "live": live, "live_count": len(live)})


@router.post("/quiz/bank/review")
def app_quiz_bank_review(payload: BankReviewIn, session: LearnerSession) -> Any:
    from app.modules import quiz as quiz_mod

    if not _is_staff(session):
        raise AppApiError("Teachers review the test bank.", code="forbidden", status_code=403)
    updated = quiz_mod.set_item_status(
        session["tenant_id"],
        item_ids=payload.item_ids,
        status=payload.status,
    )
    promoted = None
    if payload.promote:
        promoted = quiz_mod.promote_approved(
            session["tenant_id"], batch_id=payload.batch_id or None
        )
    return ok({"updated": updated, "promoted": promoted})


@router.get("/quiz/export")
def app_quiz_export(
    session: LearnerSession,
    fmt: str = Query("md", alias="format"),
    answers: bool = Query(False),
) -> Any:
    import base64

    from app.modules import ai_assessment as ai_mod
    from app.modules import quiz as quiz_mod

    if not _is_staff(session):
        raise AppApiError("Teachers export assessments.", code="forbidden", status_code=403)
    rows = []
    for q in quiz_mod.tenant_authored_questions(
        session["tenant_id"], course_id=session.get("edvidura_course_id")
    ):
        rows.append(
            {
                "id": q.id,
                "prompt": q.prompt,
                "choices": list(q.choices),
                "correct_index": q.correct_index,
                "qtype": q.qtype,
                "correct_text": q.correct_text,
                "topic": q.topic,
            }
        )
    if not rows:
        rows = [
            {
                "id": q.id,
                "prompt": q.prompt,
                "choices": list(q.choices),
                "correct_index": q.correct_index,
                "qtype": q.qtype,
                "topic": q.topic,
            }
            for q in quiz_mod.QUESTIONS
        ]
    title = str(session.get("class_name") or session.get("course") or "Assessment")
    kind = (fmt or "md").strip().lower()
    if kind in {"pdf", "application/pdf"}:
        blob = ai_mod.assessment_pdf(
            rows, title=title, course=title, include_answers=answers
        )
        return ok(
            {
                "format": "pdf",
                "filename": "edvidura-assessment.pdf",
                "content_type": "application/pdf",
                "base64": base64.b64encode(blob).decode("ascii"),
            }
        )
    body = ai_mod.assessment_markdown(
        rows, title=title, course=title, include_answers=answers
    )
    return ok(
        {
            "format": "markdown",
            "filename": "edvidura-assessment.md",
            "body": body,
        }
    )


@router.post("/quiz/essay-grade")
def app_quiz_essay_grade(payload: EssayGradeIn, session: LearnerSession) -> Any:
    from app.modules import ai_assessment as ai_mod
    from app.modules import content as content_mod
    from app.modules.ai_tutor import curriculum_chunks_for_session

    if not _is_staff(session):
        raise AppApiError("Teachers grade essays.", code="forbidden", status_code=403)
    chunks: list = []
    try:
        _, chunks = curriculum_chunks_for_session(
            str(session["tenant_id"]),
            str(session.get("edvidura_course_id") or "") or None,
            list_lessons_fn=content_mod.list_lessons,
            get_bound_course_fn=content_mod.get_bound_course,
            class_name=str(session.get("class_name") or ""),
        )
    except Exception:  # noqa: BLE001
        chunks = []
    result = ai_mod.grade_open_response(
        prompt=payload.prompt,
        rubric=payload.rubric,
        student_answer=payload.student_answer,
        instructor_answer=payload.instructor_answer,
        rag_chunks=chunks,
        max_score=payload.max_score,
    )
    return ok(json_safe(result))


@router.get("/groups")
def app_groups(session: LearnerSession) -> Any:
    from app.modules import lti_groups as groups_mod

    if not _is_staff(session):
        mine = groups_mod.groups_for_member(
            session["tenant_id"], str(session.get("subject") or "")
        )
        assigned = groups_mod.list_assignments(session["tenant_id"])
        return ok(
            {
                "groups": json_safe(mine),
                "assignments": [
                    a
                    for a in assigned
                    if a.get("group_id") in {g.get("group_id") for g in mine}
                ],
                "gs_available": bool(session.get("gs_available")),
            }
        )
    return ok(
        {
            "groups": json_safe(
                groups_mod.list_groups(
                    session["tenant_id"],
                    lti_context_id=str(session.get("lti_context_id") or "") or None,
                )
            ),
            "assignments": json_safe(groups_mod.list_assignments(session["tenant_id"])),
            "gs_available": bool(session.get("gs_available")),
        }
    )


@router.post("/groups")
def app_groups_create(payload: GroupCreateIn, session: LearnerSession) -> Any:
    from app.modules import lti_groups as groups_mod

    if not _is_staff(session):
        raise AppApiError("Teachers manage groups.", code="forbidden", status_code=403)
    row = groups_mod.create_local_group(
        session["tenant_id"],
        lti_context_id=str(session.get("lti_context_id") or "local"),
        name=payload.name,
        members=list(payload.members or []),
        class_id=str(session.get("class_id") or "") or None,
    )
    return ok(json_safe(row), status_code=201)


@router.post("/groups/assign")
def app_groups_assign(payload: GroupAssignIn, session: LearnerSession) -> Any:
    from app.modules import lti_groups as groups_mod

    if not _is_staff(session):
        raise AppApiError("Teachers assign group work.", code="forbidden", status_code=403)
    row = groups_mod.assign_activity(
        session["tenant_id"],
        group_id=payload.group_id,
        activity_type=payload.activity_type,
        activity_id=payload.activity_id or "school-quiz",
        title=payload.title or "Class quiz",
    )
    return ok(json_safe(row), status_code=201)


@router.get("/assignments")
def app_assignments(
    session: LearnerSession,
    subject: str | None = None,
) -> Any:
    """F-3 assignment dashboard (own row for learners; class for staff)."""
    from app.modules import xapi as xapi_mod

    uid = str(session.get("subject") or "")
    if _is_staff(session):
        pack = xapi_mod.assignment_dashboard(
            session["tenant_id"], subject=(subject or "").strip() or None
        )
    else:
        pack = xapi_mod.assignment_dashboard(session["tenant_id"], subject=uid)
    return ok(json_safe(pack))


@router.post("/quiz/policy")
def app_quiz_policy(payload: QuizPolicyIn, session: LearnerSession) -> Any:
    from app.modules import quiz as quiz_mod

    if not _is_staff(session):
        raise AppApiError("Teachers set attempt limits.", code="forbidden", status_code=403)
    n = quiz_mod.set_max_attempts(session["tenant_id"], payload.max_attempts)
    return ok({"max_attempts": n})


@router.get("/files/{file_id}")
def app_fetch_json(file_id: str, session: LearnerSession) -> Any:
    from app.modules import xapi as xapi_mod

    try:
        pack = xapi_mod.fetch_json_file(
            session["tenant_id"],
            file_id,
            subject=str(session.get("subject") or ""),
        )
    except LookupError as exc:
        raise AppApiError(str(exc), code="not_found", status_code=404) from exc
    except ValueError as exc:
        raise AppApiError(str(exc), code="not_json", status_code=406) from exc
    return ok(json_safe(pack))


@router.get("/files/{file_id}/stream")
def app_stream_file(file_id: str, session: LearnerSession) -> Any:
    from fastapi.responses import Response

    from app.modules import xapi as xapi_mod

    try:
        data, content_type, filename = xapi_mod.stream_file(
            session["tenant_id"],
            file_id,
            subject=str(session.get("subject") or ""),
        )
    except LookupError as exc:
        raise AppApiError(str(exc), code="not_found", status_code=404) from exc
    return Response(
        content=data,
        media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.get("/files/{file_id}/meta")
def app_file_meta(file_id: str, session: LearnerSession) -> Any:
    from app.modules import xapi as xapi_mod

    try:
        pack = xapi_mod.file_meta(
            session["tenant_id"],
            file_id,
            subject=str(session.get("subject") or ""),
        )
    except LookupError as exc:
        raise AppApiError(str(exc), code="not_found", status_code=404) from exc
    return ok(json_safe(pack))


@router.post("/files")
def app_put_file(payload: FilePutIn, session: LearnerSession) -> Any:
    from app.modules import xapi as xapi_mod

    if not _is_staff(session):
        raise AppApiError("Teachers upload middleware files.", code="forbidden", status_code=403)
    body = b""
    if payload.base64.strip():
        try:
            body = xapi_mod.decode_base64_body(payload.base64)
        except Exception as exc:  # noqa: BLE001
            raise AppApiError("invalid base64", code="validation") from exc
    row = xapi_mod.put_file(
        session["tenant_id"],
        filename=payload.filename,
        payload=body or None,
        json_body=payload.json_body,
        content_type=payload.content_type,
        file_key=payload.file_key,
    )
    return ok(json_safe(row), status_code=201)


@router.post("/grades")
def app_inbound_grade(payload: InboundGradeIn, session: LearnerSession) -> Any:
    from app.modules import xapi as xapi_mod

    if not _is_staff(session):
        raise AppApiError(
            "Teachers ingest external grades.", code="forbidden", status_code=403
        )
    row = xapi_mod.ingest_external_grade(
        session["tenant_id"],
        subject=payload.subject,
        score=payload.score,
        max_score=payload.max_score,
        learner_name=payload.learner_name or payload.subject,
        activity_id=payload.activity_id,
        source=payload.source,
        course_label=str(session.get("course") or ""),
    )
    return ok(json_safe(row), status_code=201)


# —— Home / lessons / progress (SPA + mobile) ——


@router.get("/home")
def app_home(session: LearnerSession) -> Any:
    """One round-trip bootstrap for the web SPA after LTI / client-launch."""
    pack = _load_progress(session)
    return ok(
        {
            "session": public_session(session),
            "course": pack.get("course"),
            "progress": {k: v for k, v in pack.items() if k != "course"},
            "lessons": pack.get("lessons") or [],
        }
    )


@router.get("/lessons")
def app_lessons(session: LearnerSession) -> Any:
    _require_cap(
        session,
        "lessons",
        message="Lessons are not enabled for this organization.",
    )
    pack = _load_progress(session)
    lessons = pack.get("lessons") or []
    return ok(
        {"course": pack.get("course"), "lessons": lessons},
        meta={"count": len(lessons)},
    )


@router.get("/lessons/{lesson_id}")
def app_lesson_read(lesson_id: UUID, session: LearnerSession) -> Any:
    from app.modules import content

    _require_cap(
        session,
        "lessons",
        message="Lessons are not enabled for this organization.",
    )
    lesson = content.get_lesson(
        session["tenant_id"],
        lesson_id,
        allow_unpublished=_is_staff(session),
    )
    if not lesson:
        raise AppApiError("Lesson not found", code="not_found", status_code=404)
    course = _bound_course(session)
    if (
        course
        and not _is_staff(session)
        and str(lesson.get("course_id") or "") != str(course.get("id") or "")
    ):
        raise AppApiError("Lesson not found", code="not_found", status_code=404)
    done: set[str] = set()
    prev_l = next_l = None
    if course:
        done = content.completed_lesson_ids(
            session["tenant_id"],
            course_id=course["id"],
            subject=str(session.get("subject") or ""),
        )
        all_lessons = content.list_lessons(
            session["tenant_id"],
            course["id"],
            include_unpublished=_is_staff(session),
        )
        prev_l, next_l = content.neighbor_lessons(all_lessons, lesson_id)
    body_md = str(lesson.get("body_md") or "")
    card = _lesson_card(lesson, done) or {}
    card["body_md"] = body_md
    card["body_html"] = content.body_md_to_html(body_md)
    return ok(
        {
            "lesson": card,
            "prev": _lesson_card(prev_l, done),
            "next": _lesson_card(next_l, done),
        }
    )


@router.post("/lessons/{lesson_id}/complete")
def app_lesson_complete(lesson_id: UUID, session: LearnerSession) -> Any:
    from app.modules import content

    _require_cap(
        session,
        "lessons",
        message="Lessons are not enabled for this organization.",
    )
    subject = str(session.get("subject") or "").strip()
    if not subject:
        raise AppApiError(
            "No learner subject on session",
            code="auth_required",
            status_code=401,
        )
    course = _bound_course(session)
    if not course:
        raise AppApiError("No course bound", code="not_found", status_code=404)
    lesson = content.get_lesson(
        session["tenant_id"],
        lesson_id,
        allow_unpublished=_is_staff(session),
    )
    if not lesson:
        raise AppApiError("Lesson not found", code="not_found", status_code=404)
    try:
        content.mark_lesson_complete(
            tenant_id=session["tenant_id"],
            course_id=course["id"],
            lesson_id=lesson_id,
            subject=subject,
        )
    except ValueError as exc:
        raise AppApiError(str(exc), code="validation") from exc
    return ok({"completed": True, "progress": _load_progress(session)})


@router.get("/progress")
def app_progress(session: LearnerSession) -> Any:
    return ok(_load_progress(session))


@router.get("/analytics")
def app_analytics(session: LearnerSession) -> Any:
    from app.modules import analytics as analytics_mod

    if not _is_staff(session):
        raise AppApiError(
            "Analytics is for teachers and school admins.",
            code="forbidden",
            status_code=403,
        )
    return ok(json_safe(analytics_mod.tenant_dashboard(session["tenant_id"])))


@router.get("/attempts")
def app_attempts(
    session: LearnerSession,
    limit: int = Query(80, ge=1, le=200),
) -> Any:
    from app.modules import quiz as quiz_mod

    kwargs: dict[str, Any] = {"limit": limit}
    if not _is_staff(session):
        kwargs["subjects"] = {str(session.get("subject") or "")}
    rows = quiz_mod.list_attempts_for_tenant(session["tenant_id"], **kwargs)
    items = [_attempt_card(r) for r in rows]
    from app.modules import xapi as xapi_mod

    try:
        counters = xapi_mod.attempt_counters(
            session["tenant_id"],
            subject=None if _is_staff(session) else str(session.get("subject") or ""),
        )
    except Exception:  # noqa: BLE001
        counters = {"learners": []}
    try:
        quota = quiz_mod.attempt_quota(
            session["tenant_id"],
            str(session.get("subject") or ""),
            practice=False,
        )
    except Exception:  # noqa: BLE001
        quota = quiz_mod.remaining_attempts(0, quiz_mod.DEFAULT_MAX_ATTEMPTS)
    return ok(
        {"attempts": items, "quota": quota, "counters": counters},
        meta={"count": len(items), "staff": _is_staff(session)},
    )


# —— Ask Vidura (coach) ——


class CoachAsk(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    reply_language: str = "en-IN"


@router.post("/coach")
def app_coach(payload: CoachAsk, session: LearnerSession, request: Request) -> Any:
    from app.modules import ai_tutor, content
    from app.quiz_routes import SESSION_KEY, store_quiz_context

    turn = ai_tutor.run_coach_turn(
        session=session,
        question=payload.question,
        reply_language=payload.reply_language,
        list_lessons_fn=content.list_lessons,
        get_bound_course_fn=content.get_bound_course,
    )
    if turn.get("error"):
        raise AppApiError(str(turn["error"]), code="coach_failed", status_code=502)

    patch = turn.get("session_patch") or {}
    if patch:
        from app.modules.quiz.service import cookie_safe_session

        merged = {**session, **patch}
        tok = str(merged.get("quiz_token") or "")
        if tok:
            store_quiz_context(merged)
        request.session[SESSION_KEY] = cookie_safe_session(merged)

    payload_out = ai_tutor.coach_json_payload(
        question=payload.question, turn=turn
    )
    # Envelope already has ok — nest coach fields under data.
    payload_out.pop("ok", None)
    payload_out["course_title"] = str(turn.get("course_title") or "")
    payload_out["chunks_count"] = int(turn.get("chunks_count") or 0)
    payload_out["xapi_ok"] = bool(turn.get("xapi_ok"))
    return ok(json_safe(payload_out))


@router.get("/health")
def app_health() -> Any:
    """No auth — client can verify App API is mounted."""
    return ok(
        {
            "service": "edvidura-app-api",
            "contract": "edvidura.app.v1",
            "platforms": ["web", "mobile"],
        }
    )
