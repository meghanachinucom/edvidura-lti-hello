"""Cross-tenant isolation proofs for RLS-backed tables (DEC-006)."""
from __future__ import annotations

from typing import Any
from uuid import uuid4

from app import db
from app.modules.tenancy import TENANT_A_ID, TENANT_B_ID


def prove_launch_events_isolation(
    *,
    tenant_a_id: str = TENANT_A_ID,
    tenant_b_id: str = TENANT_B_ID,
) -> dict[str, Any]:
    """Insert one marker row per tenant, then prove neither side can see the other.

    Must run as a non-superuser / NOBYPASSRLS role (edvidura_app).
    """
    marker = uuid4().hex[:12]
    subject_a = f"iso-a-{marker}"
    subject_b = f"iso-b-{marker}"

    db.insert_launch_event(
        tenant_id=tenant_a_id,
        subject=subject_a,
        roles="system",
        course_label="isolation-ci",
        raw_claims={"marker": "A", "run": marker},
    )
    db.insert_launch_event(
        tenant_id=tenant_b_id,
        subject=subject_b,
        roles="system",
        course_label="isolation-ci",
        raw_claims={"marker": "B", "run": marker},
    )

    visible_as_a = db.list_launch_events_for_tenant(tenant_a_id)
    visible_as_b = db.list_launch_events_for_tenant(tenant_b_id)

    leaked_b_to_a = [r for r in visible_as_a if str(r["tenant_id"]) == str(tenant_b_id)]
    leaked_a_to_b = [r for r in visible_as_b if str(r["tenant_id"]) == str(tenant_a_id)]

    own_a = [r for r in visible_as_a if r["subject"] == subject_a]
    own_b = [r for r in visible_as_b if r["subject"] == subject_b]
    foreign_b_as_a = [r for r in visible_as_a if r["subject"] == subject_b]
    foreign_a_as_b = [r for r in visible_as_b if r["subject"] == subject_a]

    ok = (
        len(leaked_b_to_a) == 0
        and len(leaked_a_to_b) == 0
        and len(own_a) == 1
        and len(own_b) == 1
        and len(foreign_b_as_a) == 0
        and len(foreign_a_as_b) == 0
    )

    return {
        "ok": ok,
        "run": marker,
        "count_visible_as_tenant_a": db.count_launch_events_visible(tenant_a_id),
        "count_visible_as_tenant_b": db.count_launch_events_visible(tenant_b_id),
        "leaked_b_rows_to_a": len(leaked_b_to_a),
        "leaked_a_rows_to_b": len(leaked_a_to_b),
        "own_marker_visible_as_a": len(own_a),
        "own_marker_visible_as_b": len(own_b),
        "foreign_marker_visible_as_a": len(foreign_b_as_a),
        "foreign_marker_visible_as_b": len(foreign_a_as_b),
        "detail": "RLS pass" if ok else "CROSS-TENANT LEAK",
    }


def assert_cross_tenant_insert_rejected(
    *,
    acting_as_tenant_id: str,
    forged_tenant_id: str,
) -> None:
    """WITH CHECK must reject inserting another tenant's tenant_id."""
    import json

    from psycopg import Error as PsycopgError

    marker = uuid4().hex[:12]
    try:
        with db.tenant_connection(acting_as_tenant_id) as conn:
            conn.execute(
                """
                INSERT INTO launch_events (tenant_id, subject, roles, course_label, raw_claims)
                VALUES (%s, %s, %s, %s, %s::jsonb)
                """,
                (
                    str(forged_tenant_id),
                    f"forged-{marker}",
                    "system",
                    "isolation-ci",
                    json.dumps({"forged": True}),
                ),
            )
    except PsycopgError as exc:
        msg = str(exc).lower()
        if (
            "row-level security" in msg
            or "violates row-level security policy" in msg
            or "policy" in msg
        ):
            return
        raise AssertionError(
            f"Expected RLS WITH CHECK rejection, got unexpected error: {exc}"
        ) from exc

    raise AssertionError(
        "Cross-tenant INSERT succeeded — RLS WITH CHECK is not enforcing isolation"
    )


def prove_quiz_attempts_isolation(
    *,
    tenant_a_id: str = TENANT_A_ID,
    tenant_b_id: str = TENANT_B_ID,
) -> dict[str, Any]:
    """Insert one quiz attempt per tenant; prove neither side can see the other."""
    marker = uuid4().hex[:12]
    subject_a = f"quiz-iso-a-{marker}"
    subject_b = f"quiz-iso-b-{marker}"

    db.insert_quiz_attempt(
        tenant_id=tenant_a_id,
        subject=subject_a,
        learner_name="Iso A",
        course_label="isolation-ci",
        score=1,
        max_score=3,
        answers={"marker": "A", "run": marker},
    )
    db.insert_quiz_attempt(
        tenant_id=tenant_b_id,
        subject=subject_b,
        learner_name="Iso B",
        course_label="isolation-ci",
        score=2,
        max_score=3,
        answers={"marker": "B", "run": marker},
    )

    visible_as_a = db.list_quiz_attempts_for_tenant(tenant_a_id, limit=200)
    visible_as_b = db.list_quiz_attempts_for_tenant(tenant_b_id, limit=200)

    own_a = [r for r in visible_as_a if r["subject"] == subject_a]
    own_b = [r for r in visible_as_b if r["subject"] == subject_b]
    foreign_b_as_a = [r for r in visible_as_a if r["subject"] == subject_b]
    foreign_a_as_b = [r for r in visible_as_b if r["subject"] == subject_a]

    ok = (
        len(own_a) == 1
        and len(own_b) == 1
        and len(foreign_b_as_a) == 0
        and len(foreign_a_as_b) == 0
    )
    return {
        "ok": ok,
        "run": marker,
        "own_marker_visible_as_a": len(own_a),
        "own_marker_visible_as_b": len(own_b),
        "foreign_marker_visible_as_a": len(foreign_b_as_a),
        "foreign_marker_visible_as_b": len(foreign_a_as_b),
        "detail": "RLS pass" if ok else "CROSS-TENANT LEAK",
    }


def prove_course_content_isolation(
    *,
    tenant_a_id: str = TENANT_A_ID,
    tenant_b_id: str = TENANT_B_ID,
) -> dict[str, Any]:
    """Seeded Tenant B course must be invisible under Tenant A RLS."""
    from app.modules import content

    courses_a = content.list_published_courses(tenant_a_id)
    courses_b = content.list_published_courses(tenant_b_id)
    titles_a = {str(c["title"]) for c in courses_a}
    leaked_b_title = "Lakeside Civics" in titles_a or "Tenant B private course" in titles_a
    leaked_a_secret = False
    for c in courses_a:
        lessons = content.list_lessons(tenant_a_id, c["id"])
        for L in lessons:
            title = str(L.get("title") or "")
            body = str(L.get("body_md") or "")
            if "Lakeside" in title and "Riverside" not in title:
                leaked_a_secret = True
            if "Tenant B secret" in title:
                leaked_a_secret = True
            if "If Tenant A can see this text" in body:
                leaked_a_secret = True

    own_a = any(
        "riverside" in str(c.get("slug") or "") or "readiness" in str(c.get("slug") or "")
        for c in courses_a
    )
    own_b = any(
        "lakeside" in str(c.get("slug") or "") or "tenant-b" in str(c.get("slug") or "")
        for c in courses_b
    )
    ok = bool(own_a and own_b and not leaked_b_title and not leaked_a_secret)
    return {
        "ok": ok,
        "courses_visible_as_a": len(courses_a),
        "courses_visible_as_b": len(courses_b),
        "leaked_b_course_to_a": leaked_b_title,
        "leaked_b_lesson_body_to_a": leaked_a_secret,
        "detail": "RLS pass" if ok else "CROSS-TENANT LEAK",
    }


def prove_lesson_progress_isolation(
    *,
    tenant_a_id: str = TENANT_A_ID,
    tenant_b_id: str = TENANT_B_ID,
) -> dict[str, Any]:
    """Mark progress under A and B; prove sticky read + no cross-tenant leak."""
    from app.modules import content

    marker = uuid4().hex[:12]
    subject_a = f"prog-a-{marker}"
    subject_b = f"prog-b-{marker}"

    course_a = content.get_primary_course(tenant_a_id)
    course_b = content.get_primary_course(tenant_b_id)
    if not course_a or not course_b:
        return {"ok": False, "detail": "Missing primary course for A or B"}

    lessons_a = [
        L for L in content.list_lessons(tenant_a_id, course_a["id"]) if L["lesson_type"] != "quiz"
    ]
    lessons_b = [
        L for L in content.list_lessons(tenant_b_id, course_b["id"]) if L["lesson_type"] != "quiz"
    ]
    if not lessons_a or not lessons_b:
        return {"ok": False, "detail": "Missing learnable lessons for A or B"}

    lesson_a = lessons_a[0]
    lesson_b = lessons_b[0]

    content.mark_lesson_complete(
        tenant_id=tenant_a_id,
        course_id=course_a["id"],
        lesson_id=lesson_a["id"],
        subject=subject_a,
    )
    content.mark_lesson_complete(
        tenant_id=tenant_b_id,
        course_id=course_b["id"],
        lesson_id=lesson_b["id"],
        subject=subject_b,
    )

    # Sticky: same subject still sees completion
    done_a = content.completed_lesson_ids(
        tenant_a_id, course_id=course_a["id"], subject=subject_a
    )
    done_b = content.completed_lesson_ids(
        tenant_b_id, course_id=course_b["id"], subject=subject_b
    )
    sticky_a = str(lesson_a["id"]) in done_a
    sticky_b = str(lesson_b["id"]) in done_b

    # Cross-tenant: B's lesson id must not appear in A's completed set for subject_b
    foreign_in_a = content.completed_lesson_ids(
        tenant_a_id, course_id=course_a["id"], subject=subject_b
    )
    foreign_in_b = content.completed_lesson_ids(
        tenant_b_id, course_id=course_b["id"], subject=subject_a
    )

    # Direct table peek under tenant A RLS must not see B's progress row
    with db.tenant_connection(tenant_a_id) as conn:
        leaked = conn.execute(
            """
            SELECT count(*) AS n FROM lesson_progress
            WHERE subject = %s
            """,
            (subject_b,),
        ).fetchone()
    leaked_b_to_a = int(leaked["n"]) if leaked else 0

    ok = (
        sticky_a
        and sticky_b
        and str(lesson_b["id"]) not in foreign_in_a
        and str(lesson_a["id"]) not in foreign_in_b
        and leaked_b_to_a == 0
    )
    return {
        "ok": ok,
        "run": marker,
        "sticky_a": sticky_a,
        "sticky_b": sticky_b,
        "leaked_b_progress_to_a": leaked_b_to_a,
        "detail": "RLS pass" if ok else "CROSS-TENANT LEAK",
    }


def prove_teacher_content_write_isolation(
    *,
    tenant_a_id: str = TENANT_A_ID,
    tenant_b_id: str = TENANT_B_ID,
) -> dict[str, Any]:
    """Lesson created under A must be invisible to B."""
    from app.modules import content

    marker = uuid4().hex[:10]
    title = f"Iso lesson {marker}"
    created = content.create_lesson(
        tenant_id=tenant_a_id,
        title=title,
        body_md=f"Private body {marker}",
        lesson_type="article",
    )
    course_b = content.get_primary_course(tenant_b_id)
    titles_b: set[str] = set()
    if course_b:
        titles_b = {
            str(L.get("title") or "")
            for L in content.list_lessons(tenant_b_id, course_b["id"])
        }
    leaked = title in titles_b
    # B cannot fetch by id either
    fetched_as_b = content.get_lesson(tenant_b_id, created["id"])
    ok = (not leaked) and fetched_as_b is None
    return {
        "ok": ok,
        "run": marker,
        "created_id": str(created["id"]),
        "leaked_title_to_b": leaked,
        "fetched_as_b": fetched_as_b is not None,
        "detail": "RLS pass" if ok else "CROSS-TENANT LEAK",
    }


def prove_capability_tables_isolation(
    *,
    tenant_a_id: str = TENANT_A_ID,
    tenant_b_id: str = TENANT_B_ID,
) -> dict[str, Any]:
    """Snapshots / quiz tokens / invites: tenant scans isolated; PK lookup works."""
    marker = uuid4().hex[:12]
    launch_a = f"launch-a-{marker}"
    launch_b = f"launch-b-{marker}"
    token_a = f"tok-a-{marker}"
    token_b = f"tok-b-{marker}"

    db.save_launch_snapshot(
        launch_id=launch_a,
        tenant_id=tenant_a_id,
        launch_data={"sub": "a", "run": marker},
    )
    db.save_launch_snapshot(
        launch_id=launch_b,
        tenant_id=tenant_b_id,
        launch_data={"sub": "b", "run": marker},
    )
    db.save_quiz_context(
        token_a,
        {"tenant_id": tenant_a_id, "subject": "a", "run": marker},
        ttl_sec=600,
    )
    db.save_quiz_context(
        token_b,
        {"tenant_id": tenant_b_id, "subject": "b", "run": marker},
        ttl_sec=600,
    )

    # Cross-tenant list must not leak (no capability_lookup).
    with db.tenant_connection(tenant_a_id) as conn:
        snap_as_a = conn.execute(
            "SELECT launch_id FROM lti_launch_snapshots WHERE launch_id LIKE %s",
            (f"launch-%-{marker}",),
        ).fetchall()
        tok_as_a = conn.execute(
            "SELECT token FROM quiz_session_tokens WHERE token LIKE %s",
            (f"tok-%-{marker}",),
        ).fetchall()

    leaked_snap = any(r["launch_id"] == launch_b for r in snap_as_a)
    leaked_tok = any(r["token"] == token_b for r in tok_as_a)

    # Capability PK lookup still works.
    got_a = db.get_launch_snapshot(launch_a)
    got_b_tok = db.get_quiz_context(token_b)

    # Invite: create under A, invisible to B list, visible via capability token.
    from app.modules import lti_dynreg

    invite = lti_dynreg.create_invite(tenant_id=tenant_a_id, label=f"iso-{marker}")
    with db.tenant_connection(tenant_b_id) as conn:
        inv_as_b = conn.execute(
            "SELECT token FROM lti_registration_invites WHERE label = %s",
            (f"iso-{marker}",),
        ).fetchall()
    invite_leaked = len(inv_as_b) > 0
    invite_got = lti_dynreg.get_invite(invite["token"])

    ok = (
        (not leaked_snap)
        and (not leaked_tok)
        and got_a is not None
        and got_b_tok is not None
        and (not invite_leaked)
        and invite_got is not None
        and str(invite_got["tenant_id"]) == str(tenant_a_id)
    )
    return {
        "ok": ok,
        "run": marker,
        "leaked_snap_b_to_a": leaked_snap,
        "leaked_tok_b_to_a": leaked_tok,
        "pk_lookup_snap_ok": got_a is not None,
        "pk_lookup_tok_ok": got_b_tok is not None,
        "invite_leaked_to_b": invite_leaked,
        "invite_capability_ok": invite_got is not None,
        "detail": "RLS pass" if ok else "CROSS-TENANT LEAK",
    }
