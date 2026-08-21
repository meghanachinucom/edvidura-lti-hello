"""Tests for analytics helpers and AI local generator."""
from __future__ import annotations

from app.modules.ai_assessment import ai_status, generate_mcqs_from_text


def test_ai_status_defaults_local():
    st = ai_status()
    assert "provider" in st
    assert st["provider"] in {"local", "openai"}


def test_local_mcq_generation():
    body = (
        "LTI launch opens the tool in a new window from Moodle. "
        "Tenant isolation keeps each school's data separate with RLS. "
        "Gradebook sync sends scores to Moodle via AGS when available. "
        "Practice attempts skip the Moodle gradebook on purpose."
    )
    result = generate_mcqs_from_text(body, count=3, title="Demo lesson")
    assert result["provider"] == "local"
    assert len(result["questions"]) == 3
    q = result["questions"][0]
    assert len(q["choices"]) == 4
    assert 0 <= q["correct_index"] < 4
    assert q["choices"][q["correct_index"]]


def test_short_text_raises():
    try:
        generate_mcqs_from_text("too short")
        assert False, "expected ValueError"
    except ValueError:
        pass
