"""Cross-tenant RLS isolation proofs (for tests / ops)."""

from app.modules.isolation.proofs import (
    assert_cross_tenant_insert_rejected,
    prove_course_content_isolation,
    prove_launch_events_isolation,
    prove_lesson_progress_isolation,
    prove_quiz_attempts_isolation,
    prove_teacher_content_write_isolation,
)

__all__ = [
    "prove_launch_events_isolation",
    "assert_cross_tenant_insert_rejected",
    "prove_quiz_attempts_isolation",
    "prove_course_content_isolation",
    "prove_lesson_progress_isolation",
    "prove_teacher_content_write_isolation",
]
