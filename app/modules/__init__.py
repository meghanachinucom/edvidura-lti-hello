"""Reusable EdVidura domain modules (importable outside route handlers).

Package layout
--------------
tenancy   Tenant resolution, request context, LTI tool conf
content   Courses, lessons, progress, teacher authoring
quiz      Question bank, grading, tenant quiz load
school    Admins, teachers, classes, roster snapshot
isolation Cross-tenant RLS proofs (tests / ops)

Example
-------
    from app.modules.tenancy import resolve_platform, TENANT_A_ID
    from app.modules.content import list_lessons, create_lesson
    from app.modules.quiz import questions_for_tenant, grade_answers
    from app.modules.school import school_snapshot

These modules depend on ``app.db`` (Postgres + RLS) and ``app.settings``.
HTTP/FastAPI code stays in ``app.*_routes`` and ``app.api``.
"""

from app.modules import content, isolation, quiz, school, tenancy

__all__ = [
    "content",
    "isolation",
    "quiz",
    "school",
    "tenancy",
]
