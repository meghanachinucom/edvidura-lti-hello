"""Study-coach multi-language voice catalog + reply-language wiring."""
from __future__ import annotations

from app.modules.ai_tutor import (
    list_voice_languages,
    normalize_voice_lang,
    study_coach_answer,
    voice_capabilities,
)
from app.modules.ai_tutor.voice import reply_language_instruction


def test_voice_catalog_covers_indian_languages_beyond_hi_te():
    codes = {row["code"] for row in list_voice_languages()}
    assert "en-IN" in codes
    assert "hi-IN" in codes
    assert "te-IN" in codes
    # Beyond English / Hindi / Telugu
    for expected in (
        "ta-IN",
        "kn-IN",
        "ml-IN",
        "mr-IN",
        "gu-IN",
        "bn-IN",
        "pa-IN",
        "or-IN",
        "ur-IN",
        "as-IN",
    ):
        assert expected in codes, expected


def test_normalize_voice_lang():
    assert normalize_voice_lang("hi") == "hi-IN"
    assert normalize_voice_lang("ta-IN") == "ta-IN"
    assert normalize_voice_lang("bogus") == "en-IN"
    assert normalize_voice_lang("") == "en-IN"


def test_reply_language_instruction_indic():
    text = reply_language_instruction("ta-IN")
    assert "Tamil" in text
    assert "script" in text.lower() or "தமிழ்" in text


def test_study_coach_records_reply_language():
    chunks = [
        {
            "title": "Handbook · Variables (v1)",
            "body": "A variable stands for an unknown value.",
            "kind": "manual",
            "href": "/manuals/m",
        }
    ]
    result = study_coach_answer(
        question="What is a variable?",
        curriculum_chunks=chunks,
        course_title="Algebra I",
        reply_language="kn-IN",
    )
    assert result["reply_language"] == "kn-IN"
    assert "Kannada" in result["reply_language_name"]
    assert result["grounded"] is True


def test_voice_capabilities_schema():
    caps = voice_capabilities()
    assert caps["schema"] == "edvidura.coach.voice.v1"
    assert caps["stt"] == "browser_web_speech"
    assert len(caps["languages"]) >= 12
