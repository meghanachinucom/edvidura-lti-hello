"""Security regression test suite for EPUB content hardening (Phase 2B Priority 1).

Verifies:
1. Restrictive Content-Security-Policy (CSP) headers applied to active EPUB documents (.xhtml, .html, .svg).
2. Script execution explicitly blocked by 'script-src none' without 'unsafe-inline'.
3. Form submissions and plugins blocked by 'form-action none' and 'object-src none'.
4. Framing constrained to EdVidura self origin via 'frame-ancestors self' and X-Frame-Options SAMEORIGIN.
5. Non-document resources (CSS, PNG) served with correct MIME types and nosniff protection.
6. Direct and embedded access receive identical active-document protections on normal and standalone routes.
7. Reader templates (manual_read.html and ebook_standalone.html) restrict iframe sandbox to allow-same-origin without allow-scripts.
8. Path traversal and unauthorized access are blocked.
9. Markdown manual rendering remains fully functional without regression.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.quiz_routes import store_quiz_context
from app.modules import manuals as manuals_mod


TENANT_ID = "00000000-0000-0000-0000-000000000001"
OTHER_TENANT_ID = "00000000-0000-0000-0000-000000000002"
MANUAL_ID = "11111111-1111-1111-1111-111111111111"
LEARNER_SUB = "learner-alice"
INSTRUCTOR_SUB = "instructor-carol"


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def token_learner():
    return store_quiz_context({
        "tenant_id": TENANT_ID,
        "subject": LEARNER_SUB,
        "is_instructor": False,
    })


@pytest.fixture
def token_other_tenant():
    return store_quiz_context({
        "tenant_id": OTHER_TENANT_ID,
        "subject": "learner-other",
        "is_instructor": False,
    })


@pytest.fixture
def epub_test_assets(tmp_path: Path, monkeypatch):
    """Set up real static EPUB asset files in tmp_path and mock storage directory."""
    epub_dir = tmp_path / "EPUB"
    epub_dir.mkdir(parents=True, exist_ok=True)
    images_dir = epub_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    # 1. Active XHTML chapter
    chapter_file = epub_dir / "chapter1.xhtml"
    chapter_file.write_text(
        '<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml">'
        '<head><title>Chapter 1</title><link rel="stylesheet" href="style.css"/></head>'
        '<body><h1>Chapter 1</h1><p>Static content</p>'
        '<script>window.parent.__hostile_xss = true;</script>'
        '</body></html>',
        encoding="utf-8",
    )

    # 2. Active SVG document
    svg_file = images_dir / "diagram.svg"
    svg_file.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">'
        '<circle cx="50" cy="50" r="40" stroke="green" fill="yellow" />'
        '<script>alert("svg xss")</script>'
        '</svg>',
        encoding="utf-8",
    )

    # 3. Non-document CSS stylesheet
    css_file = epub_dir / "style.css"
    css_file.write_text("body { font-family: sans-serif; color: #333; }", encoding="utf-8")

    # 4. Non-document PNG image (1x1 valid PNG)
    png_file = images_dir / "logo.png"
    png_file.write_bytes(
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00"
        b"\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )

    def mock_get_manual(tenant_id: Any, manual_id: Any) -> dict[str, Any] | None:
        if str(tenant_id) == TENANT_ID and str(manual_id) == MANUAL_ID:
            return {
                "id": uuid.UUID(MANUAL_ID),
                "tenant_id": uuid.UUID(TENANT_ID),
                "slug": "bio-101",
                "title": "Biology 101",
                "status": "published",
            }
        return None

    def mock_get_version(tenant_id: Any, *, manual_id: Any, version: int) -> dict[str, Any] | None:
        if str(tenant_id) == TENANT_ID and str(manual_id) == MANUAL_ID and int(version) == 1:
            return {
                "id": "v1-uuid",
                "manual_id": uuid.UUID(MANUAL_ID),
                "version": 1,
                "is_published": True,
                "content_type": "epub",
                "epub_manifest": {
                    "spine": [{"id": "c1", "href": "chapter1.xhtml", "full_href": "EPUB/chapter1.xhtml"}],
                    "spine_items": [{"id": "c1", "href": "chapter1.xhtml", "full_href": "EPUB/chapter1.xhtml"}],
                },
            }
        return None

    def mock_latest_version(tenant_id: Any, manual_id: Any) -> dict[str, Any] | None:
        return mock_get_version(tenant_id, manual_id=manual_id, version=1)

    def mock_list_versions(tenant_id: Any, manual_id: Any) -> list[dict[str, Any]]:
        v = mock_get_version(tenant_id, manual_id=manual_id, version=1)
        return [v] if v else []

    monkeypatch.setattr(manuals_mod, "get_manual", mock_get_manual)
    monkeypatch.setattr(manuals_mod, "get_version", mock_get_version)
    monkeypatch.setattr(manuals_mod, "list_versions", mock_list_versions)
    monkeypatch.setattr(manuals_mod, "latest_published_version", mock_latest_version)
    monkeypatch.setattr(manuals_mod, "get_reading_progress", lambda **kw: None)
    monkeypatch.setattr(manuals_mod, "list_bookmarks", lambda **kw: [])
    monkeypatch.setattr(manuals_mod, "list_annotations", lambda **kw: [])
    monkeypatch.setattr(manuals_mod, "save_reading_progress", lambda **kw: {})
    monkeypatch.setattr(manuals_mod, "get_epub_storage_dir", lambda *args: tmp_path)
    monkeypatch.setattr(manuals_mod, "verify_reader_token", lambda **kw: kw.get("token") == "valid-sig-123")
    from app.modules import xapi as xapi_mod
    monkeypatch.setattr(xapi_mod, "record_resource_experienced", lambda **kw: {})
    monkeypatch.setattr("app.shell_routes._bound_course", lambda session: None)

    return tmp_path


# —— 1. ACTIVE EPUB DOCUMENT CSP PROTECTION ——

def test_active_xhtml_document_security_headers(client: TestClient, token_learner: str, epub_test_assets: Path):
    res = client.get(f"/manuals/{MANUAL_ID}/epub-files/EPUB/chapter1.xhtml?v=1&token={token_learner}")
    assert res.status_code == 200
    assert "application/xhtml+xml" in res.headers.get("content-type", "")

    # Nosniff enabled
    assert res.headers.get("x-content-type-options") == "nosniff"

    # Framing protection
    assert res.headers.get("x-frame-options") == "SAMEORIGIN"

    # CSP presence and strict directives
    csp = res.headers.get("content-security-policy", "")
    assert csp, "Content-Security-Policy header must be present on active EPUB documents"
    assert "script-src 'none'" in csp, "Scripts must be completely blocked"
    assert "script-src 'unsafe-inline'" not in csp, "unsafe-inline for scripts is strictly prohibited"
    assert "object-src 'none'" in csp, "Objects and plugins must be blocked"
    assert "form-action 'none'" in csp, "Form submissions must be blocked"
    assert "connect-src 'none'" in csp, "Fetch and XHR calls must be blocked"
    assert "frame-ancestors 'self'" in csp, "Framing must be restricted to EdVidura self origin"
    assert "style-src 'self' 'unsafe-inline'" in csp, "Local EPUB styles must be permitted"
    assert "img-src 'self' data:" in csp, "Local and data images must be permitted"


def test_active_svg_document_security_headers(client: TestClient, token_learner: str, epub_test_assets: Path):
    res = client.get(f"/manuals/{MANUAL_ID}/epub-files/EPUB/images/diagram.svg?v=1&token={token_learner}")
    assert res.status_code == 200
    assert "image/svg+xml" in res.headers.get("content-type", "")

    # SVG can carry scripts; verify CSP is attached
    csp = res.headers.get("content-security-policy", "")
    assert "script-src 'none'" in csp
    assert "object-src 'none'" in csp
    assert res.headers.get("x-content-type-options") == "nosniff"


def test_standalone_reader_route_receives_identical_csp(client: TestClient, epub_test_assets: Path):
    res = client.get(
        f"/read/manuals/{MANUAL_ID}/epub-files/EPUB/chapter1.xhtml?tid={TENANT_ID}&sig=valid-sig-123&v=1"
    )
    assert res.status_code == 200
    csp = res.headers.get("content-security-policy", "")
    assert "script-src 'none'" in csp
    assert "object-src 'none'" in csp
    assert res.headers.get("x-frame-options") == "SAMEORIGIN"
    assert res.headers.get("x-content-type-options") == "nosniff"


# —— 2. NON-DOCUMENT RESOURCES SERVING & FUNCTIONALITY ——

def test_non_document_css_and_images_served_correctly(client: TestClient, token_learner: str, epub_test_assets: Path):
    # CSS
    res_css = client.get(f"/manuals/{MANUAL_ID}/epub-files/EPUB/style.css?v=1&token={token_learner}")
    assert res_css.status_code == 200
    assert "text/css" in res_css.headers.get("content-type", "")
    assert res_css.headers.get("x-content-type-options") == "nosniff"
    # Document CSP is not applied to static stylesheets
    assert "content-security-policy" not in res_css.headers

    # PNG image
    res_png = client.get(f"/manuals/{MANUAL_ID}/epub-files/EPUB/images/logo.png?v=1&token={token_learner}")
    assert res_png.status_code == 200
    assert res_png.headers.get("content-type") == "image/png"
    assert res_png.headers.get("x-content-type-options") == "nosniff"


# —— 3. IFRAME SANDBOX RESTRICTIONS IN TEMPLATES ——

def test_reader_template_iframe_sandbox_omits_allow_scripts():
    manual_read_path = Path(__file__).resolve().parents[1] / "templates" / "manual_read.html"
    content = manual_read_path.read_text(encoding="utf-8")

    assert 'sandbox="allow-same-origin"' in content, "Iframe must be sandboxed with allow-same-origin"
    assert "allow-scripts" not in content, "Iframe must NOT permit allow-scripts"


def test_standalone_template_iframe_sandbox_omits_allow_scripts():
    standalone_path = Path(__file__).resolve().parents[1] / "templates" / "ebook_standalone.html"
    content = standalone_path.read_text(encoding="utf-8")

    assert 'sandbox="allow-same-origin"' in content, "Standalone iframe must be sandboxed with allow-same-origin"
    assert "allow-scripts" not in content, "Standalone iframe must NOT permit allow-scripts"


# —— 4. ACCESS CONTROL AND DIRECT NAVIGATION DEFENSES ——

def test_unauthenticated_file_request_rejected(client: TestClient):
    res = client.get(f"/manuals/{MANUAL_ID}/epub-files/EPUB/chapter1.xhtml?v=1")
    assert res.status_code in (401, 302, 307)


def test_cross_tenant_file_request_rejected(client: TestClient, token_other_tenant: str, epub_test_assets: Path):
    res = client.get(f"/manuals/{MANUAL_ID}/epub-files/EPUB/chapter1.xhtml?v=1&token={token_other_tenant}")
    assert res.status_code == 404


def test_invalid_standalone_signature_rejected(client: TestClient, epub_test_assets: Path):
    res = client.get(
        f"/read/manuals/{MANUAL_ID}/epub-files/EPUB/chapter1.xhtml?tid={TENANT_ID}&sig=tampered-sig&v=1"
    )
    assert res.status_code == 403


def test_path_traversal_request_rejected(client: TestClient, token_learner: str, epub_test_assets: Path):
    res = client.get(f"/manuals/{MANUAL_ID}/epub-files/../../../../etc/passwd?v=1&token={token_learner}")
    assert res.status_code == 404


# —— 5. REGRESSION: MARKDOWN MANUAL REMAINS FULLY FUNCTIONAL ——

def test_markdown_manual_reader_regression():
    body = "## Chapter 1\nIntroduction to Markdown\n## Chapter 2\nAdvanced syntax"
    toc = manuals_mod.toc_from_body(body)
    assert len(toc) == 2
    assert toc[0]["title"] == "Chapter 1"
    assert toc[1]["title"] == "Chapter 2"

    rendered_html = manuals_mod.render_body(body)
    assert "<h2>Chapter 1</h2>" in rendered_html or "Chapter 1" in rendered_html


# —— 6. REGRESSION: READER WRAPPER RENDERING (PHASE 2C.7C) ——

def test_standard_reader_wrapper_renders_with_uuid_manual_id(client: TestClient, token_learner: str, epub_test_assets: Path):
    res = client.get(f"/manuals/{MANUAL_ID}?token={token_learner}&v=1")
    assert res.status_code == 200
    assert 'sandbox="allow-same-origin"' in res.text
    assert "allow-scripts" not in res.text
    assert f'"manualId": "{MANUAL_ID}"' in res.text


def test_standalone_reader_wrapper_renders_without_starlette_type_error(client: TestClient, epub_test_assets: Path):
    res = client.get(
        f"/read/manuals/{MANUAL_ID}?tid={TENANT_ID}&sig=valid-sig-123&v=1"
    )
    assert res.status_code == 200
    assert 'sandbox="allow-same-origin"' in res.text
    assert "allow-scripts" not in res.text
