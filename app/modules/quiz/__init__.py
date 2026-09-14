"""Quiz bank, tenant load, grading, and personalized AI quizzes."""

from app.modules.quiz.personalized import (
    generate_personalized_quiz,
    infer_difficulty,
    questions_from_payload,
    student_performance_profile,
)
from app.modules.quiz.service import (
    FALLBACK_QUESTIONS,
    MAX_SCORE,
    QUESTIONS,
    Question,
    get_primary_quiz,
    get_quiz_for_course,
    grade_answers,
    list_quiz_question_rows,
    list_quiz_questions,
    questions_for_tenant,
)

__all__ = [
    "Question",
    "FALLBACK_QUESTIONS",
    "QUESTIONS",
    "MAX_SCORE",
    "get_primary_quiz",
    "get_quiz_for_course",
    "list_quiz_questions",
    "list_quiz_question_rows",
    "questions_for_tenant",
    "grade_answers",
    "generate_personalized_quiz",
    "infer_difficulty",
    "questions_from_payload",
    "student_performance_profile",
]
