"""Ask Vidura and quiz hints (curriculum-grounded)."""

from app.modules.ai_assessment.llm import ai_status
from app.modules.ai_tutor.clarify import (
    build_clarify_reply,
    clarify_enabled,
    needs_clarify,
)
from app.modules.ai_tutor.cognitive import (
    COACH_STRATEGIES,
    build_coach_learner_context,
    pick_coach_strategy,
    strategy_label,
)
from app.modules.ai_tutor.flashcards import (
    flashcards_enabled,
    flashcards_from_chunks,
)
from app.modules.ai_tutor.integrity import (
    detect_integrity_violation,
    integrity_enabled,
)
from app.modules.ai_tutor.service import (
    curriculum_chunks_for_session,
    hint_for_missed_question,
    study_coach_answer,
)
from app.modules.ai_tutor.shortcuts import (
    DEFAULT_SHORTCUTS,
    list_shortcuts,
    replace_shortcuts,
    shortcuts_enabled,
    shortcuts_for_learner,
)
from app.modules.ai_tutor.turn import (
    apply_clarify_pending,
    coach_json_payload,
    flashcards_for_session,
    run_coach_turn,
    shortcuts_view,
    submit_coach_feedback,
)
from app.modules.ai_tutor.voice import (
    list_voice_languages,
    normalize_voice_lang,
    voice_capabilities,
)

__all__ = [
    "ai_status",
    "hint_for_missed_question",
    "study_coach_answer",
    "curriculum_chunks_for_session",
    "list_voice_languages",
    "normalize_voice_lang",
    "voice_capabilities",
    "COACH_STRATEGIES",
    "build_coach_learner_context",
    "pick_coach_strategy",
    "strategy_label",
    # Phase A
    "detect_integrity_violation",
    "integrity_enabled",
    "needs_clarify",
    "build_clarify_reply",
    "clarify_enabled",
    "DEFAULT_SHORTCUTS",
    "list_shortcuts",
    "replace_shortcuts",
    "shortcuts_enabled",
    "shortcuts_for_learner",
    "flashcards_enabled",
    "flashcards_from_chunks",
    # Portable turn facade
    "apply_clarify_pending",
    "coach_json_payload",
    "flashcards_for_session",
    "run_coach_turn",
    "shortcuts_view",
    "submit_coach_feedback",
]
