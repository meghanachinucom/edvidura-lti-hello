"""School roster: admins, teachers, classes, snapshot."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from app import db
from app.modules.content.service import get_primary_course, list_lessons


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
) -> dict[str, Any]:
    with db.tenant_connection(tenant_id) as conn:
        row = conn.execute(
            """
            INSERT INTO classes (
                tenant_id, class_code, class_name, subject, term, status
            )
            VALUES (%s, %s, %s, %s, %s, 'active')
            ON CONFLICT (tenant_id, class_code) DO UPDATE
              SET class_name = EXCLUDED.class_name,
                  subject = EXCLUDED.subject,
                  term = EXCLUDED.term,
                  status = 'active'
            RETURNING id, class_code, class_name, subject, term, status
            """,
            (
                str(tenant_id),
                class_code.strip(),
                class_name.strip(),
                subject.strip(),
                term.strip(),
            ),
        ).fetchone()
        return dict(row)


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
            SELECT id, class_code, class_name, subject, term, status
            FROM classes
            ORDER BY class_code
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
            item["teachers"] = [dict(t) for t in teachers]
            item["students"] = [dict(s) for s in students]
            out.append(item)
        return out


def class_roster_match_keys(
    tenant_id: UUID | str, class_id: UUID | str
) -> tuple[set[str], set[str]]:
    """Return (names_lower, subject_like_keys) for enrolled students."""
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


def school_snapshot(tenant_id: UUID | str) -> dict[str, Any]:
    course = get_primary_course(tenant_id)
    lessons = list_lessons(tenant_id, course["id"]) if course else []
    admins = list_school_admins(tenant_id)
    teachers = list_teachers(tenant_id)
    classes = list_classes_with_roster(tenant_id)
    return {
        "course": course,
        "chapters": lessons,
        "admins": admins,
        "teachers": teachers,
        "classes": classes,
        "admin_count": len(admins),
        "teacher_count": len(teachers),
        "class_count": len(classes),
        "chapter_count": len(lessons),
        "student_count": len(
            {s["student_code"] for c in classes for s in c.get("students") or []}
        ),
    }
