"""C13 SME source registry + coach grounding helpers."""
from __future__ import annotations

from app.modules.ai_tutor import study_coach_answer
from app.modules.sme.service import split_manual_sections


def test_split_manual_sections():
    body = """Intro line.

## Solve for x

Isolate the variable.

## Variables

A letter stands for an unknown.
"""
    secs = split_manual_sections(body)
    slugs = {s["slug"] for s in secs}
    assert "solve-for-x" in slugs
    assert "variables" in slugs
    assert any("Isolate" in s["body"] for s in secs)


def test_study_coach_prefers_manual_chunk():
    chunks = [
        {
            "title": "Welcome lesson",
            "body": "Variables appear in algebra expressions.",
            "kind": "lesson",
            "href": "/lessons/1",
        },
        {
            "title": "Handbook · Variables (v1)",
            "body": "A variable stands for an unknown value. Use letters like x.",
            "kind": "manual",
            "href": "/manuals/m?v=1&focus=variables",
        },
    ]
    result = study_coach_answer(
        question="What is a variable?",
        curriculum_chunks=chunks,
        course_title="Algebra I",
    )
    assert result["grounded"] is True
    assert result["citations"]
    assert result["citation_links"]
    assert any("variable" in result["answer"].lower() for _ in [0])


def test_study_coach_empty_sources():
    result = study_coach_answer(
        question="What is a variable?",
        curriculum_chunks=[],
        course_title="Algebra I",
    )
    assert result["grounded"] is False
    assert result.get("refusal_reason") == "no_sources"
    assert result.get("retention") == "stateless"
    assert "SME" in result["answer"] or "teacher" in result["answer"].lower()


def test_study_coach_citation_excerpt():
    chunks = [
        {
            "title": "Handbook · Variables (v1)",
            "body": "A variable stands for an unknown value. Use letters like x or y.",
            "kind": "manual",
            "version": 1,
            "focus": "variables",
            "href": "/manuals/m?v=1&focus=variables",
        }
    ]
    result = study_coach_answer(
        question="What is a variable?",
        curriculum_chunks=chunks,
        course_title="Algebra I",
    )
    assert result["grounded"] is True
    cite = result["citation_links"][0]
    assert cite.get("excerpt")
    assert cite.get("kind") == "manual"
    assert cite.get("version") == 1
    assert result.get("practice_hint") is True


def test_author_assist_local_lesson():
    from app.modules.ai_authoring import author_assist

    out = author_assist(
        prompt="Draft a short lesson about variables",
        source_chunks=[
            {
                "title": "Handbook · Variables (v1)",
                "body": "A variable stands for an unknown value.",
                "kind": "manual",
                "href": "/manuals/m?v=1&focus=variables",
            }
        ],
        mode="lesson",
        course_title="Algebra",
    )
    assert out["grounded"] is True
    assert out["draft_md"]
    assert out["mode"] == "lesson"
    assert out["citation_links"]
