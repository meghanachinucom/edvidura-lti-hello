"""AI assessment — teacher drafting, simplify, grade assist, suggestions."""

from app.modules.ai_assessment.llm import ai_status
from app.modules.ai_assessment.service import (
    extract_text_from_bytes,
    generate_mcqs_from_document,
    generate_mcqs_from_text,
    generate_remediation_micro_lesson,
    grade_open_response,
    simplify_lesson_text,
    suggest_deeplink_activities,
    suggest_teacher_next_steps,
)

__all__ = [
    "ai_status",
    "extract_text_from_bytes",
    "generate_mcqs_from_document",
    "generate_mcqs_from_text",
    "generate_remediation_micro_lesson",
    "simplify_lesson_text",
    "grade_open_response",
    "suggest_deeplink_activities",
    "suggest_teacher_next_steps",
]
