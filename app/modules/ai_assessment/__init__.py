"""AI assessment — generate draft MCQs from lesson text."""

from app.modules.ai_assessment.service import ai_status, generate_mcqs_from_text

__all__ = ["ai_status", "generate_mcqs_from_text"]
