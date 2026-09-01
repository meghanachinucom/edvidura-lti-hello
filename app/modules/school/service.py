"""School roster: admins, teachers, classes, LTI context bindings, snapshot."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from app import db
from app.modules.content.service import (
    get_bound_course,
    get_primary_course,
    list_lessons,
    list_published_courses,
)


def list_school_admins(tenant_id: UUID | str) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT id, admin_code, name, email, status
            FROM school_admins
            ORDER BY name
            """
        ).fetchall()
        return [dict(r) for r in rows]


def find_school_admin(
    tenant_id: UUID | str,
    *,
    email: str | None = None,
    name: str | None = None,
) -> dict[str, Any] | None:
    """Match an LTI launch user to a seeded school_admins row."""
    email_n = (email or "").strip().lower()
    name_n = (name or "").strip().lower()
    if not email_n and not name_n:
        return None
    for row in list_school_admins(tenant_id):
        row_email = str(row.get("email") or "").strip().lower()
        row_name = str(row.get("name") or "").strip().lower()
        if email_n and row_email and email_n == row_email:
            return row
        if name_n and row_name and name_n == row_name:
            return row
        if name_n and "admin" in name_n and row_name and name_n in row_name:
            return row
    return None


def list_school_students(tenant_id: UUID | str) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT DISTINCT ON (s.student_code)
                   s.id, s.student_code, s.name, s.email, s.status
            FROM students s
            JOIN class_enrollments ce ON ce.student_id = s.id
            ORDER BY s.student_code, s.name
            """
        ).fetchall()
        return [dict(r) for r in rows]


def create_teacher(
    tenant_id: UUID | str,
    *,
    teacher_code: str,
    name: str,
    email: str,
) -> dict[str, Any]:
    code = teacher_code.strip()
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            INSERT INTO teachers (tenant_id, teacher_code, name, email, status)
            VALUES (%s, %s, %s, %s, 'active')
            ON CONFLICT (tenant_id, teacher_code) DO UPDATE
              SET name = EXCLUDED.name,
                  email = EXCLUDED.email,
                  status = 'active'
            RETURNING id, teacher_code, name, email, status
            """,
            (str(tenant_id), code, name.strip(), email.strip()),
        ).fetchone()
        return dict(row)


def create_class(
    tenant_id: UUID | str,
    *,
    class_code: str,
    class_name: str,
    subject: str = "",
    term: str = "",
    course_id: UUID | str | None = None,
) -> dict[str, Any]:
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            INSERT INTO classes (
                tenant_id, class_code, class_name, subject, term, status, course_id
            )
            VALUES (%s, %s, %s, %s, %s, 'active', %s)
            ON CONFLICT (tenant_id, class_code) DO UPDATE
              SET class_name = EXCLUDED.class_name,
                  subject = EXCLUDED.subject,
                  term = EXCLUDED.term,
                  status = 'active',
                  course_id = COALESCE(EXCLUDED.course_id, classes.course_id)
            RETURNING id, class_code, class_name, subject, term, status, course_id
            """,
            (
                str(tenant_id),
                class_code.strip(),
                class_name.strip(),
                subject.strip(),
                term.strip(),
                str(course_id) if course_id else None,
            ),
        ).fetchone()
        return dict(row)


def set_class_course(
    tenant_id: UUID | str,
    class_id: UUID | str,
    course_id: UUID | str | None,
) -> dict[str, Any] | None:
    """Attach (or clear) the curriculum course for a class."""
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            UPDATE classes
            SET course_id = %s
            WHERE id = %s
            RETURNING id, class_code, class_name, subject, term, status, course_id
            """,
            (str(course_id) if course_id else None, str(class_id)),
        ).fetchone()
        return dict(row) if row else None


def list_teachers(tenant_id: UUID | str) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT id, teacher_code, name, email, status
            FROM teachers
            ORDER BY name
            """
        ).fetchall()
        return [dict(r) for r in rows]


def list_classes_with_roster(tenant_id: UUID | str) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        classes = conn.execute(
            """
            SELECT c.id, c.class_code, c.class_name, c.subject, c.term, c.status,
                   c.course_id, co.title AS course_title
            FROM classes c
            LEFT JOIN courses co ON co.id = c.course_id
            ORDER BY c.class_code
            """
        ).fetchall()
        out: list[dict[str, Any]] = []
        for c in classes:
            teachers = conn.execute(
                """
                SELECT t.name, t.teacher_code, ct.role
                FROM class_teachers ct
                JOIN teachers t ON t.id = ct.teacher_id
                WHERE ct.class_id = %s
                ORDER BY ct.role, t.name
                """,
                (c["id"],),
            ).fetchall()
            students = conn.execute(
                """
                SELECT s.name, s.student_code, s.email
                FROM class_enrollments ce
                JOIN students s ON s.id = ce.student_id
                WHERE ce.class_id = %s
                ORDER BY s.name
                """,
                (c["id"],),
            ).fetchall()
            item = dict(c)
            item["id"] = str(item["id"])
            if item.get("course_id"):
                item["course_id"] = str(item["course_id"])
            item["teachers"] = [dict(t) for t in teachers]
            item["students"] = [dict(s) for s in students]
            out.append(item)
        return out


def class_roster_match_keys(
    tenant_id: UUID | str, class_id: UUID | str
) -> tuple[set[str], set[str]]:
    """Return (names_lower, subject_like_keys) for enrolled students.

    Legacy soft-match only. Prefer ``class_moodle_filter_labels`` — people
    profiles live in Moodle; EdVidura does not own enrollments as identity.
    """
    names: set[str] = set()
    codes: set[str] = set()
    for c in list_classes_with_roster(tenant_id):
        if str(c["id"]) != str(class_id):
            continue
        for s in c.get("students") or []:
            n = str(s.get("name") or "").strip().lower()
            code = str(s.get("student_code") or "").strip().lower()
            email = str(s.get("email") or "").strip().lower()
            if n:
                names.add(n)
            if code:
                codes.add(code)
            if email:
                codes.add(email)
                if "@" in email:
                    codes.add(email.split("@", 1)[0])
        break
    return names, codes


def class_moodle_filter_labels(
    tenant_id: UUID | str, class_id: UUID | str
) -> list[str]:
    """Moodle course labels/titles bound to this class (for attempt filtering).

    Learners are identified by LTI ``sub`` from Moodle; attempts store the
    Moodle context title/label as ``course_label``.
    """
    labels: list[str] = []
    seen: set[str] = set()

    def _add(val: str | None) -> None:
        s = (val or "").strip()
        key = s.lower()
        if not s or key in seen:
            return
        seen.add(key)
        labels.append(s)

    for b in list_lti_context_bindings(tenant_id):
        if str(b.get("class_id")) != str(class_id):
            continue
        _add(b.get("context_title"))
        _add(b.get("context_label"))
    for c in list_classes_with_roster(tenant_id):
        if str(c["id"]) != str(class_id):
            continue
        _add(c.get("class_name"))
        _add(c.get("subject"))
        _add(c.get("class_code"))
        _add(c.get("course_title"))
        break
    return labels


def list_lti_context_bindings(tenant_id: UUID | str) -> list[dict[str, Any]]:
    with db.tenant_connection(tenant_id) as conn:
        rows = conn.execute(
            """
            SELECT b.id, b.lti_context_id, b.class_id, b.course_id,
                   b.context_label, b.context_title, b.updated_at,
                   c.class_code, c.class_name, c.subject,
                   co.title AS course_title
            FROM lti_context_bindings b
            JOIN classes c ON c.id = b.class_id
            LEFT JOIN courses co ON co.id = COALESCE(b.course_id, c.course_id)
            ORDER BY b.updated_at DESC
            """
        ).fetchall()
        out = []
        for r in rows:
            item = dict(r)
            for k in ("id", "class_id", "course_id"):
                if item.get(k) is not None:
                    item[k] = str(item[k])
            out.append(item)
        return out


def get_lti_context_binding(
    tenant_id: UUID | str, lti_context_id: str
) -> dict[str, Any] | None:
    cid = (lti_context_id or "").strip()
    if not cid:
        return None
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            SELECT b.id, b.lti_context_id, b.class_id, b.course_id,
                   b.context_label, b.context_title,
                   c.class_code, c.class_name, c.subject,
                   COALESCE(b.course_id, c.course_id) AS resolved_course_id
            FROM lti_context_bindings b
            JOIN classes c ON c.id = b.class_id
            WHERE b.lti_context_id = %s
            """,
            (cid,),
        ).fetchone()
        if not row:
            return None
        item = dict(row)
        for k in ("id", "class_id", "course_id", "resolved_course_id"):
            if item.get(k) is not None:
                item[k] = str(item[k])
        return item


def upsert_lti_context_binding(
    tenant_id: UUID | str,
    *,
    lti_context_id: str,
    class_id: UUID | str,
    course_id: UUID | str | None = None,
    context_label: str = "",
    context_title: str = "",
) -> dict[str, Any]:
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            INSERT INTO lti_context_bindings (
                tenant_id, lti_context_id, class_id, course_id,
                context_label, context_title, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, now())
            ON CONFLICT (tenant_id, lti_context_id) DO UPDATE
              SET class_id = EXCLUDED.class_id,
                  course_id = COALESCE(EXCLUDED.course_id, lti_context_bindings.course_id),
                  context_label = EXCLUDED.context_label,
                  context_title = EXCLUDED.context_title,
                  updated_at = now()
            RETURNING id, lti_context_id, class_id, course_id,
                      context_label, context_title
            """,
            (
                str(tenant_id),
                lti_context_id.strip(),
                str(class_id),
                str(course_id) if course_id else None,
                (context_label or "").strip(),
                (context_title or "").strip(),
            ),
        ).fetchone()
        item = dict(row)
        for k in ("id", "class_id", "course_id"):
            if item.get(k) is not None:
                item[k] = str(item[k])
        return item


def _norm(s: str) -> str:
    return " ".join((s or "").strip().lower().split())


def _score_class_match(
    cls: dict[str, Any], *, label: str, title: str
) -> int:
    """Higher = better. 0 = no match."""
    code = _norm(str(cls.get("class_code") or ""))
    name = _norm(str(cls.get("class_name") or ""))
    subject = _norm(str(cls.get("subject") or ""))
    label_n = _norm(label)
    title_n = _norm(title)
    score = 0
    if label_n and code and label_n == code:
        score = max(score, 100)
    if title_n and name and title_n == name:
        score = max(score, 90)
    if label_n and name and label_n == name:
        score = max(score, 85)
    if title_n and subject and (subject in title_n or title_n in subject):
        score = max(score, 70)
    if label_n and subject and (subject in label_n or label_n in subject):
        score = max(score, 65)
    if title_n and name and (name in title_n or title_n in name):
        score = max(score, 55)
    if label_n and name and (name in label_n or label_n in name):
        score = max(score, 50)
    # Moodle shortname often resembles class code fragments
    if label_n and code and (label_n in code or code in label_n):
        score = max(score, 40)
    return score


def match_class_for_context(
    tenant_id: UUID | str,
    *,
    context_label: str = "",
    context_title: str = "",
) -> dict[str, Any] | None:
    """Pick the best class for a Moodle context label/title (no DB write)."""
    classes = list_classes_with_roster(tenant_id)
    if not classes:
        return None
    best: dict[str, Any] | None = None
    best_score = 0
    for cls in classes:
        sc = _score_class_match(
            cls, label=context_label, title=context_title
        )
        if sc > best_score:
            best_score = sc
            best = cls
    if best_score < 40:
        return None
    return best


def suggest_course_for_class(
    tenant_id: UUID | str, cls: dict[str, Any]
) -> str | None:
    """Match class subject/name to a published EdVidura course title."""
    if cls.get("course_id"):
        return str(cls["course_id"])
    subject = _norm(str(cls.get("subject") or ""))
    name = _norm(str(cls.get("class_name") or ""))
    courses = list_published_courses(tenant_id)
    best_id: str | None = None
    best_score = 0
    for co in courses:
        title = _norm(str(co.get("title") or ""))
        if not title:
            continue
        score = 0
        if subject and (subject in title or title in subject):
            score = 80
        elif name and (title in name or name in title):
            score = 60
        elif subject and any(w in title for w in subject.split() if len(w) > 3):
            score = 40
        if score > best_score:
            best_score = score
            best_id = str(co["id"])
    return best_id if best_score >= 40 else None


def resolve_lti_context_binding(
    tenant_id: UUID | str,
    *,
    lti_context_id: str,
    context_label: str = "",
    context_title: str = "",
    auto_bind: bool = True,
) -> dict[str, Any] | None:
    """Resolve Moodle context → class + course; optionally persist binding.

    Returns dict with class_id, course_id, class_code, class_name, subject,
    lti_context_id — or None if unbound and no auto-match.
    """
    ctx_id = (lti_context_id or "").strip()
    label = (context_label or "").strip()
    title = (context_title or "").strip()

    existing = get_lti_context_binding(tenant_id, ctx_id) if ctx_id else None
    if existing:
        course_id = existing.get("resolved_course_id") or existing.get(
            "course_id"
        )
        if auto_bind and ctx_id:
            # Keep label/title fresh
            upsert_lti_context_binding(
                tenant_id,
                lti_context_id=ctx_id,
                class_id=existing["class_id"],
                course_id=course_id,
                context_label=label or existing.get("context_label") or "",
                context_title=title or existing.get("context_title") or "",
            )
        return {
            "lti_context_id": ctx_id,
            "class_id": existing["class_id"],
            "course_id": course_id,
            "class_code": existing.get("class_code"),
            "class_name": existing.get("class_name"),
            "subject": existing.get("subject"),
            "bound": True,
            "auto_matched": False,
        }

    if not auto_bind or not ctx_id:
        return None

    matched = match_class_for_context(
        tenant_id, context_label=label, context_title=title
    )
    if not matched:
        return None

    course_id = suggest_course_for_class(tenant_id, matched)
    if course_id and not matched.get("course_id"):
        set_class_course(tenant_id, matched["id"], course_id)

    upsert_lti_context_binding(
        tenant_id,
        lti_context_id=ctx_id,
        class_id=matched["id"],
        course_id=course_id,
        context_label=label,
        context_title=title,
    )
    return {
        "lti_context_id": ctx_id,
        "class_id": str(matched["id"]),
        "course_id": course_id,
        "class_code": matched.get("class_code"),
        "class_name": matched.get("class_name"),
        "subject": matched.get("subject"),
        "bound": True,
        "auto_matched": True,
    }


def school_snapshot(tenant_id: UUID | str) -> dict[str, Any]:
    course = get_primary_course(tenant_id)
    lessons = list_lessons(tenant_id, course["id"]) if course else []
    admins = list_school_admins(tenant_id)
    teachers = list_teachers(tenant_id)
    classes = list_classes_with_roster(tenant_id)
    bindings = list_lti_context_bindings(tenant_id)
    return {
        "course": course,
        "chapters": lessons,
        "admins": admins,
        "teachers": teachers,
        "classes": classes,
        "lti_bindings": bindings,
        "admin_count": len(admins),
        "teacher_count": len(teachers),
        "class_count": len(classes),
        "chapter_count": len(lessons),
        "binding_count": len(bindings),
        "student_count": len(
            {s["student_code"] for c in classes for s in c.get("students") or []}
        ),
    }


# Re-export for callers that want bound curriculum without importing content
resolve_bound_course = get_bound_course
