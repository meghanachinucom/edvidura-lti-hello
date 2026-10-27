"""PeBL in-book discussion xAPI + service helpers (no DB)."""
from __future__ import annotations

from app.modules.xapi.builder import build_pebl_discussion_statement


def test_pebl_discussion_statement_fields():
    stmt = build_pebl_discussion_statement(
        tenant_id="11111111-1111-1111-1111-111111111111",
        subject="student-1",
        learner_name="Ada",
        message_text="What PPE is required before striking an arc?",
        thread_id="thread-abc",
        manual_id="22222222-2222-2222-2222-222222222222",
        manual_title="Welding fundamentals",
        chapter_slug="personal-protective-equipment",
        chapter_title="Personal protective equipment",
        access_level="class",
        include_full_text=True,
        activity_base="https://example.test",
    )
    assert stmt["verb"]["id"].endswith("interacted")
    ext = stmt["context"]["extensions"]
    assert ext["https://edvidura.local/xapi/extensions/channel"] == "pebl_ebook"
    assert ext["https://edvidura.local/xapi/extensions/pebl_discussion_aligned"] is True
    assert ext["https://edvidura.local/xapi/extensions/thread_id"] == "thread-abc"
    assert ext["https://edvidura.local/xapi/extensions/access_level"] == "class"
    assert (
        ext["https://edvidura.local/xapi/extensions/message_text"]
        == "What PPE is required before striking an arc?"
    )
    assert "pebl-ebook" in stmt["object"]["id"]
    assert "personal-protective-equipment" in stmt["object"]["id"]
    assert stmt["object"]["definition"]["type"].endswith("/discussion")


def test_pebl_discussion_privacy_preview_only():
    stmt = build_pebl_discussion_statement(
        tenant_id="t1",
        subject="s1",
        learner_name="",
        message_text="Secret tip about voltage",
        thread_id="th1",
        include_full_text=False,
    )
    ext = stmt["context"]["extensions"]
    assert "https://edvidura.local/xapi/extensions/message_text" not in ext
    assert ext["https://edvidura.local/xapi/extensions/message_preview"].startswith(
        "Secret tip"
    )


def test_clean_body_validation():
    from app.modules.pebl import service as pebl_svc
    import pytest

    with pytest.raises(ValueError):
        pebl_svc._clean_body("   ")
    assert pebl_svc._clean_body("  hello  ") == "hello"
