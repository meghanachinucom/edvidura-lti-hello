"""Curriculum: courses, lessons, progress, teacher authoring."""

from app.modules.content.service import (
    TENANT_A_COURSE_ID,
    TENANT_B_COURSE_ID,
    add_quiz_question,
    body_md_to_html,
    completed_lesson_ids,
    course_progress,
    create_lesson,
    delete_lesson,
    delete_quiz_question,
    ensure_primary_course,
    ensure_primary_quiz,
    get_course,
    get_lesson,
    get_primary_course,
    lesson_completion_roster,
    list_lessons,
    list_published_courses,
    mark_lesson_complete,
    neighbor_lessons,
    reorder_lesson,
    set_lesson_status,
    unmark_lesson_complete,
    update_lesson,
)

__all__ = [
    "TENANT_A_COURSE_ID",
    "TENANT_B_COURSE_ID",
    "body_md_to_html",
    "list_published_courses",
    "get_primary_course",
    "get_course",
    "list_lessons",
    "get_lesson",
    "completed_lesson_ids",
    "mark_lesson_complete",
    "unmark_lesson_complete",
    "course_progress",
    "neighbor_lessons",
    "ensure_primary_course",
    "create_lesson",
    "ensure_primary_quiz",
    "add_quiz_question",
    "lesson_completion_roster",
    "update_lesson",
    "set_lesson_status",
    "reorder_lesson",
    "delete_lesson",
    "delete_quiz_question",
]
