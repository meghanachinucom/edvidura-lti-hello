"""Epics 11–14: framework parse, local AI, webhook sign, TLA adapters."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

from app.modules.ai_assessment.llm import _resolve_remote, ai_status
from app.modules.events.outbox import deliver_webhook, sign_webhook_body as evt_sign
from app.modules.skills.framework import (
    normalize_spec,
    parse_framework_csv,
    parse_framework_json,
)
from app.modules.tla.service import catalogue_courses, experience_index, learner_profile


def test_parse_framework_json_nested():
    specs = parse_framework_json(
        {
            "skills": [
                {
                    "code": "Solve-Linear",
                    "title": "Solve linear",
                    "external_id": "IEEE-1",
                    "to_code": "TO-01",
                    "question_keys": "q1|q2",
                }
            ]
        }
    )
    assert specs[0]["skill_code"] == "solve_linear"
    assert specs[0]["external_id"] == "IEEE-1"
    assert specs[0]["to_code"] == "to_01"
    assert specs[0]["question_keys"] == ("q1", "q2")


def test_parse_framework_csv():
    csv_text = "skill_code,label,to_code\ntenant_iso,Tenant isolation,TO-TI\n"
    specs = parse_framework_csv(csv_text)
    assert len(specs) == 1
    assert specs[0]["skill_code"] == "tenant_iso"
    assert specs[0]["to_code"] == "to_ti"


def test_normalize_spec_requires_code():
    try:
        normalize_spec({"label": "Only label"})
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_ai_force_local_prefers_local_endpoint(monkeypatch):
    from app.modules.ai_assessment import llm as llm_mod

    fake = MagicMock()
    fake.ai_enabled = True
    fake.ai_provider = "auto"
    fake.ai_force_local = True
    fake.openai_api_key = "sk-cloud"
    fake.openai_model = "gpt-4o-mini"
    fake.local_ai_base_url = "http://127.0.0.1:11434/v1"
    fake.local_ai_api_key = ""
    fake.local_ai_model = "llama"
    monkeypatch.setattr(llm_mod, "get_settings", lambda: fake)
    remote = _resolve_remote()
    assert remote is not None
    assert remote["provider"] == "local_http"
    st = ai_status()
    assert st["provider"] == "local_http"
    assert st["remote_ready"] is True


def test_webhook_hmac_stable():
    sig = evt_sign('{"a":1}', "secret")
    assert sig.startswith("sha256=")
    assert len(sig) == len("sha256=") + 64


def test_deliver_webhook_disabled_is_local_ok(monkeypatch):
    from app.modules.events import outbox as outbox_mod

    fake = MagicMock()
    fake.event_pipeline_enabled = False
    fake.event_webhook_url = "https://example.test/hook"
    fake.event_webhook_secret = "s"
    monkeypatch.setattr(outbox_mod, "get_settings", lambda: fake)
    ok, err = deliver_webhook({"event_id": "x", "tenant_id": "t"})
    assert ok is True
    assert err is None


def test_deliver_webhook_posts_when_enabled(monkeypatch):
    from app.modules.events import outbox as outbox_mod

    fake = MagicMock()
    fake.event_pipeline_enabled = True
    fake.event_webhook_url = "https://example.test/hook"
    fake.event_webhook_secret = "sekrit"
    monkeypatch.setattr(outbox_mod, "get_settings", lambda: fake)

    class Resp:
        def raise_for_status(self):
            return None

    with patch.object(outbox_mod.httpx, "post", return_value=Resp()) as post:
        ok, err = deliver_webhook(
            {
                "event_id": "e1",
                "event_type": "quiz.attempt.submitted",
                "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                "subject": "u1",
                "payload": {},
                "occurred_at": "2026-01-01T00:00:00Z",
            }
        )
        assert ok is True
        assert err is None
        assert post.called
        kwargs = post.call_args.kwargs
        headers = kwargs.get("headers") or {}
        assert "X-EdVidura-Signature" in headers


def test_tla_catalogue_adapter_shapes(monkeypatch):
    from app.modules.tla import service as tla_svc

    monkeypatch.setattr(
        tla_svc.content,
        "list_published_courses",
        lambda _t: [
            {
                "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
                "slug": "demo",
                "title": "Demo",
                "description": "d",
                "status": "published",
            }
        ],
    )
    rows = catalogue_courses("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    assert rows[0]["id"].startswith("cccccccc")
    assert rows[0]["title"] == "Demo"


def test_tla_experience_and_profile_shapes(monkeypatch):
    from app.modules.tla import service as tla_svc

    monkeypatch.setattr(
        tla_svc.xapi_mod,
        "list_statements",
        lambda *_a, **_k: [
            {
                "statement_id": "s1",
                "actor_sub": "learner-1",
                "verb_id": "http://adlnet.gov/expapi/verbs/completed",
                "object_id": "obj",
                "tier": "transactional",
                "created_at": None,
                "statement": {},
            }
        ],
    )
    monkeypatch.setattr(
        tla_svc.analytics_mod,
        "learner_dashboard",
        lambda *_a, **_k: {"attempt_count": 2, "subject": "learner-1"},
    )
    monkeypatch.setattr(
        tla_svc.skills_mod, "list_skills", lambda *_a, **_k: [{"skill_code": "a", "label": "A"}]
    )
    ex = experience_index("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", actor="learner-1")
    assert ex[0]["actor"] == "learner-1"
    prof = learner_profile("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "learner-1")
    assert prof["competency_count"] == 1
    assert prof["analytics"]["attempt_count"] == 2
