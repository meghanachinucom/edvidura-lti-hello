"""AI assessment — teacher drafting, simplify, grade assist, suggestions."""

from app.modules.ai_assessment.llm import ai_status
from app.modules.ai_assessment.export import assessment_markdown, assessment_pdf
from app.modules.ai_assessment.service import (
    DIFFICULTY_LEVELS,
    difficulty_label,
    extract_text_from_bytes,
    generate_mcqs_from_document,
    generate_test_bank,
    questions_for_page_count,
    generate_mcqs_from_text,
    generate_remediation_micro_lesson,
    grade_essay_against_instructor,
    grade_open_response,
    normalize_difficulty,
    segment_text_for_coverage,
    simplify_lesson_text,
    suggest_deeplink_activities,
    suggest_teacher_next_steps,
)

__all__ = [
    "DIFFICULTY_LEVELS",
    "ai_status",
    "difficulty_label",
    "extract_text_from_bytes",
    "generate_mcqs_from_document",
    "generate_test_bank",
    "questions_for_page_count",
    "generate_mcqs_from_text",
    "generate_remediation_micro_lesson",
    "grade_essay_against_instructor",
    "grade_open_response",
    "assessment_markdown",
    "assessment_pdf",
    "normalize_difficulty",
    "segment_text_for_coverage",
    "simplify_lesson_text",
    "suggest_deeplink_activities",
    "suggest_teacher_next_steps",
]
