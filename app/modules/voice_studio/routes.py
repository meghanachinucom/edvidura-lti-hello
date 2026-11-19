"""FastAPI Router for Context-Aware Multilingual Voice Studio (Phase 4 Engine).

100% native EdVidura branding.
Provides speech cleanup, spoken math normalization, voice-based text editing, and language preferences.
"""
from __future__ import annotations

from typing import Any, Optional
from fastapi import APIRouter
from pydantic import BaseModel

from app.modules.voice_studio import service

router = APIRouter(prefix="/api/v1/app/voice", tags=["Voice Studio"])


class VoiceCleanupRequest(BaseModel):
    transcript: str = ""
    language: str = "en-IN"
    course_id: Optional[str] = "RHS-C08"
    screen_context: Optional[str] = None
    mode: str = "smart"


class VoiceEditSelectionRequest(BaseModel):
    selected_text: str
    spoken_command: str
    language: str = "en-IN"


class VoicePreferencesRequest(BaseModel):
    preferred_language: str = "en-IN"
    cleanup_mode: str = "smart"
    tts_speed: float = 1.0
    subject: Optional[str] = "6"


@router.get("/languages")
def list_languages() -> Any:
    """Return all 12 supported Indian locales with native script labels."""
    return {
        "ok": True,
        "count": len(service.SUPPORTED_VOICE_LANGUAGES),
        "languages": service.SUPPORTED_VOICE_LANGUAGES,
    }


@router.post("/cleanup")
def cleanup_voice(req: VoiceCleanupRequest) -> Any:
    """Strip fillers, format equations (e.g. '2x + 5 = 15'), and apply course glossary."""
    res = service.clean_voice_transcript(
        transcript=req.transcript,
        language=req.language,
        course_id=req.course_id,
        screen_context=req.screen_context,
        mode=req.mode,
    )
    return {
        "ok": True,
        "data": res,
        "cleaned": res.get("cleaned", ""),
    }


@router.post("/edit-selection")
def edit_selection(req: VoiceEditSelectionRequest) -> Any:
    """Transform highlighted text via spoken voice instructions (simplify, translate, bullets)."""
    return service.edit_selection_by_voice(
        selected_text=req.selected_text,
        spoken_command=req.spoken_command,
        language=req.language,
    )


@router.get("/preferences")
def get_preferences(subject: str = "6") -> Any:
    """Return learner voice and speech preferences."""
    return service.get_user_preferences(subject=subject)


@router.put("/preferences")
def update_preferences(req: VoicePreferencesRequest) -> Any:
    """Save learner voice and speech preferences."""
    return service.save_user_preferences(
        subject=req.subject or "6",
        preferred_language=req.preferred_language,
        cleanup_mode=req.cleanup_mode,
        tts_speed=req.tts_speed,
    )
