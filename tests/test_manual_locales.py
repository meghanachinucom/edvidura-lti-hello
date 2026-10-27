"""Manual per-state Indian language locales."""
from __future__ import annotations


def test_state_maps_to_language():
    from app.modules.manuals.locales import language_for_state, normalize_state

    assert normalize_state("ap") == "AP"
    assert normalize_state("Telangana") == "TG"
    assert language_for_state("AP") == "te-IN"
    assert language_for_state("TN") == "ta-IN"
    assert language_for_state("KA") == "kn-IN"
    assert language_for_state("UP") == "hi-IN"


def test_resolve_preferred_language_order():
    from app.modules.manuals.locales import resolve_preferred_language

    assert (
        resolve_preferred_language(
            query_lang="ta-IN",
            session_lang="te-IN",
            tenant_state="AP",
            source_language="sa-IN",
        )
        == "ta-IN"
    )
    assert (
        resolve_preferred_language(
            session_lang="te-IN",
            tenant_state="TN",
            source_language="sa-IN",
        )
        == "te-IN"
    )
    assert (
        resolve_preferred_language(
            tenant_state="TN",
            source_language="sa-IN",
        )
        == "ta-IN"
    )
    assert (
        resolve_preferred_language(source_language="sa-IN") == "sa-IN"
    )


def test_resolve_reader_content_uses_locale(monkeypatch):
    from app.modules.manuals import service as manuals_svc

    manual = {
        "id": "m1",
        "title": "Chaganti discourse (Sanskrit)",
        "source_language": "sa-IN",
    }
    version = {"body_md": "## मूलम्\n\nसंस्कृत पाठः।", "version": 1}

    monkeypatch.setattr(
        manuals_svc,
        "get_locale",
        lambda *_a, **_k: {
            "language_code": "te-IN",
            "title": "చాగంటి ప్రవచనం",
            "body_md": "## అధ్యాయం\n\nతెలుగు పాఠం.",
            "is_published": True,
        },
    )
    out = manuals_svc.resolve_reader_content(
        "t1",
        manual=manual,
        version=version,
        language_code="te-IN",
    )
    assert out["is_locale"] is True
    assert out["language_code"] == "te-IN"
    assert "తెలుగు" in out["body_md"]
    assert out["title"] == "చాగంటి ప్రవచనం"


def test_resolve_reader_content_falls_back_to_sanskrit(monkeypatch):
    from app.modules.manuals import service as manuals_svc

    manual = {
        "id": "m1",
        "title": "Source",
        "source_language": "sa-IN",
    }
    version = {"body_md": "## मूलम्\n\nसंस्कृतम्", "version": 1}
    monkeypatch.setattr(manuals_svc, "get_locale", lambda *_a, **_k: None)
    out = manuals_svc.resolve_reader_content(
        "t1",
        manual=manual,
        version=version,
        language_code="te-IN",
    )
    assert out["is_locale"] is False
    assert out["fallback_to_source"] is True
    assert out["language_code"] == "sa-IN"
    assert "संस्कृतम्" in out["body_md"]


def test_list_states_includes_andhra():
    from app.modules.manuals.locales import list_states

    codes = {s["code"] for s in list_states()}
    assert "AP" in codes
    assert "TN" in codes


def test_auto_translate_on_resolve(monkeypatch):
    from app.modules.manuals import service as manuals_svc

    manual = {
        "id": "m1",
        "title": "मूल ग्रन्थः",
        "source_language": "sa-IN",
    }
    version = {"body_md": "## अध्यायः\n\nसंस्कृत पाठः।", "version": 1}

    monkeypatch.setattr(manuals_svc, "get_locale", lambda *_a, **_k: None)

    def fake_ensure(*_a, **_k):
        return {
            "ok": True,
            "skipped": False,
            "auto": True,
            "language_code": "te-IN",
            "locale": {
                "language_code": "te-IN",
                "title": "తెలుగు శీర్షిక",
                "body_md": "## అధ్యాయం\n\nతెలుగు.",
                "is_auto": True,
                "is_published": True,
            },
        }

    monkeypatch.setattr(manuals_svc, "ensure_auto_translated_locale", fake_ensure)
    out = manuals_svc.resolve_reader_content(
        "t1",
        manual=manual,
        version=version,
        language_code="te-IN",
        auto_translate=True,
    )
    assert out["is_locale"] is True
    assert out["is_auto"] is True
    assert out["just_translated"] is True
    assert out["language_code"] == "te-IN"
    assert "తెలుగు" in out["body_md"]


def test_translate_manual_markdown_identity():
    from app.modules.manuals.translate import translate_manual_markdown

    out = translate_manual_markdown(
        body_md="## Hello",
        title="T",
        source_language="te-IN",
        target_language="te-IN",
    )
    assert out["auto"] is False
    assert out["body_md"] == "## Hello"
