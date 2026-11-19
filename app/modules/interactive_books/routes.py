"""FastAPI Router for Living Interactive Textbooks & Concept Reels (Phase 2 Engine).

100% native EdVidura branding.
Provides beat compilation, playback cues, inline grading, and SCORM/EPUB export.
"""
from __future__ import annotations

from typing import Any, Optional
from fastapi import APIRouter, Response
from pydantic import BaseModel

from app.modules.interactive_books import service

router = APIRouter(prefix="/api/v1/app/manuals", tags=["Interactive Textbooks"])


class CompileBeatsRequest(BaseModel):
    title: str = "Class 8 Textbook Chapter"
    raw_text: str = ""
    chapter_index: int = 0


class CheckBeatRequest(BaseModel):
    selected_option: int
    subject: Optional[str] = "6"


@router.get("/{manual_id}/beats")
def get_beats(manual_id: str, chapter_index: int = 0, lang: str = "en") -> Any:
    """Return synchronized beats, animated diagram specs, and language-matched narration."""
    beats = service.get_book_beats(manual_id=manual_id, chapter_index=chapter_index, lang=lang)
    return {
        "ok": True,
        "manual_id": manual_id,
        "chapter_index": chapter_index,
        "lang": lang,
        "total_beats": len(beats),
        "beats": beats,
    }


@router.post("/{manual_id}/compile-beats")
def compile_beats(manual_id: str, req: CompileBeatsRequest) -> Any:
    """Compile uploaded text or chapter into structured interactive beats."""
    return service.compile_beats_from_content(
        manual_id=manual_id,
        title=req.title,
        raw_text=req.raw_text,
        chapter_index=req.chapter_index,
    )


@router.post("/{manual_id}/beats/{beat_id}/check")
def grade_beat(manual_id: str, beat_id: str, req: CheckBeatRequest) -> Any:
    """Grade in-picture concept check, unlock next beat, log xAPI statement."""
    return service.grade_beat_check(
        manual_id=manual_id,
        beat_id=beat_id,
        selected_option=req.selected_option,
        subject=req.subject or "6",
    )


@router.get("/{manual_id}/export/scorm")
def export_scorm(manual_id: str, title: str = "EdVidura Interactive Course") -> Response:
    """Download SCORM 1.2 zip bundle."""
    data = service.export_scorm_package(manual_id=manual_id, title=title)
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="edvidura_{manual_id}_scorm.zip"'},
    )


@router.get("/{manual_id}/export/epub")
def export_epub(manual_id: str, title: str = "EdVidura Digital Textbook") -> Response:
    """Download standalone HTML5 / EPUB3 readable edition."""
    html = service.export_epub_html_package(manual_id=manual_id, title=title)
    return Response(
        content=html,
        media_type="text/html",
        headers={"Content-Disposition": f'attachment; filename="edvidura_{manual_id}.html"'},
    )
