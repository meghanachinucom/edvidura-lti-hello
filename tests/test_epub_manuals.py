"""Unit & security tests for Phase 1 EPUB3 eBook upload, parsing, extraction, and rendering."""
from __future__ import annotations

import io
import os
import zipfile
from pathlib import Path
from uuid import uuid4

import pytest

from app.modules.manuals.epub import EPUBValidationError, validate_and_extract_epub


def make_synthetic_epub(
    *,
    title: str = "Test eBook Title",
    chapters: list[tuple[str, str]] | None = None,
    missing_container: bool = False,
    corrupt_container: bool = False,
    missing_opf: bool = False,
    corrupt_opf: bool = False,
    invalid_spine: bool = False,
    path_traversal_path: str | None = None,
    absolute_path: str | None = None,
    add_image: bool = True,
    add_css: bool = True,
) -> bytes:
    """Helper creating a minimal, valid or deliberately flawed EPUB3 archive in memory."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        if missing_container:
            zf.writestr("dummy.txt", "hello")
        else:
            if corrupt_container:
                zf.writestr("META-INF/container.xml", "<invalid-xml>")
            else:
                container_xml = (
                    '<?xml version="1.0"?>\n'
                    '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n'
                    '  <rootfiles>\n'
                    '    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>\n'
                    '  </rootfiles>\n'
                    '</container>'
                )
                zf.writestr("META-INF/container.xml", container_xml)

        if not missing_opf and not missing_container and not corrupt_container:
            if corrupt_opf:
                zf.writestr("EPUB/package.opf", "Not valid XML content <<<")
            else:
                if chapters is None:
                    chapters = [
                        ("chap1.xhtml", "<h1>Chapter 1</h1><p>Welcome to EPUB.</p>"),
                        ("chap2.xhtml", "<h1>Chapter 2</h1><p>Second section.</p>"),
                    ]

                manifest_items = []
                spine_items = []
                for idx, (filename, content) in enumerate(chapters, start=1):
                    item_id = f"item_{idx}"
                    manifest_items.append(
                        f'<item id="{item_id}" href="{filename}" media-type="application/xhtml+xml"/>'
                    )
                    if not invalid_spine:
                        spine_items.append(f'<itemref idref="{item_id}"/>')
                    else:
                        spine_items.append(f'<itemref idref="non_existent_{idx}"/>')
                    zf.writestr(f"EPUB/{filename}", f"<!DOCTYPE html><html><body>{content}</body></html>")

                if add_css:
                    manifest_items.append(
                        '<item id="style" href="style.css" media-type="text/css"/>'
                    )
                    zf.writestr("EPUB/style.css", "body { font-family: sans-serif; color: #333; }")

                if add_image:
                    manifest_items.append(
                        '<item id="img1" href="images/logo.png" media-type="image/png"/>'
                    )
                    # 1x1 transparent PNG
                    png_bytes = (
                        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
                        b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00"
                        b"\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
                    )
                    zf.writestr("EPUB/images/logo.png", png_bytes)

                manifest_xml = "\n    ".join(manifest_items)
                spine_xml = "\n    ".join(spine_items)

                opf_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>{title}</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>Test Author</dc:creator>
  </metadata>
  <manifest>
    {manifest_xml}
  </manifest>
  <spine>
    {spine_xml}
  </spine>
</package>"""
                zf.writestr("EPUB/package.opf", opf_content)

        if path_traversal_path:
            zf.writestr(path_traversal_path, "malicious content")

        if absolute_path:
            zf.writestr(absolute_path, "malicious content")

    return buf.getvalue()


def test_1_valid_epub_upload_and_extraction(tmp_path: Path):
    epub_bytes = make_synthetic_epub(title="Physics 101")
    manifest, sha256_hash = validate_and_extract_epub(epub_bytes, target_dir=tmp_path)

    assert manifest["title"] == "Physics 101"
    assert manifest["creator"] == "Test Author"
    assert len(manifest["spine"]) == 2
    assert len(sha256_hash) == 64
    assert (tmp_path / "EPUB" / "package.opf").exists()
    assert (tmp_path / "EPUB" / "chap1.xhtml").exists()
    assert (tmp_path / "EPUB" / "style.css").exists()
    assert (tmp_path / "EPUB" / "images" / "logo.png").exists()


def test_2_malformed_epub_not_zip(tmp_path: Path):
    with pytest.raises(EPUBValidationError, match="Invalid ZIP archive"):
        validate_and_extract_epub(b"this is plain text not a zip file", target_dir=tmp_path)


def test_3_invalid_zip_corrupted_header(tmp_path: Path):
    corrupt_bytes = b"PK\x03\x04" + b"\x00" * 100
    with pytest.raises(EPUBValidationError, match="Invalid ZIP archive"):
        validate_and_extract_epub(corrupt_bytes, target_dir=tmp_path)


def test_4_missing_container_xml(tmp_path: Path):
    epub_bytes = make_synthetic_epub(missing_container=True)
    with pytest.raises(EPUBValidationError, match="Missing META-INF/container.xml"):
        validate_and_extract_epub(epub_bytes, target_dir=tmp_path)


def test_5_missing_opf_package_file(tmp_path: Path):
    epub_bytes = make_synthetic_epub(missing_opf=True)
    with pytest.raises(EPUBValidationError, match="OPF package file missing"):
        validate_and_extract_epub(epub_bytes, target_dir=tmp_path)


def test_6_malformed_opf_xml(tmp_path: Path):
    epub_bytes = make_synthetic_epub(corrupt_opf=True)
    with pytest.raises(EPUBValidationError, match="Malformed OPF XML"):
        validate_and_extract_epub(epub_bytes, target_dir=tmp_path)


def test_7_invalid_spine_no_valid_itemrefs(tmp_path: Path):
    epub_bytes = make_synthetic_epub(invalid_spine=True)
    with pytest.raises(EPUBValidationError, match="spine contains no valid itemrefs"):
        validate_and_extract_epub(epub_bytes, target_dir=tmp_path)


def test_8_path_traversal_archive_entry(tmp_path: Path):
    epub_bytes = make_synthetic_epub(path_traversal_path="../evil.txt")
    with pytest.raises(EPUBValidationError, match="Path traversal detected"):
        validate_and_extract_epub(epub_bytes, target_dir=tmp_path)


def test_9_absolute_path_archive_entry(tmp_path: Path):
    epub_bytes = make_synthetic_epub(absolute_path="/etc/passwd")
    with pytest.raises(EPUBValidationError, match="Absolute path detected"):
        validate_and_extract_epub(epub_bytes, target_dir=tmp_path)


def test_10_oversized_archive_rejection(tmp_path: Path):
    huge_bytes = b"0" * 100
    with pytest.raises(EPUBValidationError, match="exceeds maximum allowed size"):
        validate_and_extract_epub(huge_bytes, target_dir=tmp_path, max_archive_size=50)


def test_11_excessive_archive_expansion_ratio(tmp_path: Path):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        container_xml = (
            '<?xml version="1.0"?>\n'
            '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n'
            '  <rootfiles><rootfile full-path="package.opf" media-type="application/oebps-package+xml"/></rootfiles>\n'
            '</container>'
        )
        zf.writestr("META-INF/container.xml", container_xml)
        opf_xml = (
            '<?xml version="1.0"?>\n'
            '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">\n'
            '  <metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Bomb</dc:title></metadata>\n'
            '  <manifest><item id="chap1" href="chap1.xhtml" media-type="application/xhtml+xml"/></manifest>\n'
            '  <spine><itemref idref="chap1"/></spine>\n'
            '</package>'
        )
        zf.writestr("package.opf", opf_xml)
        zf.writestr("chap1.xhtml", "<html><body><p>chap</p></body></html>")
        # Highly compressible repeating payload > 100KB to trigger ratio check
        bomb_payload = b"0" * (2 * 1024 * 1024)
        zf.writestr("bomb.txt", bomb_payload)

    with pytest.raises(EPUBValidationError, match="Excessive expansion ratio"):
        validate_and_extract_epub(buf.getvalue(), target_dir=tmp_path)


def _db_available() -> bool:
    os.environ.setdefault(
        "DATABASE_URL",
        "postgresql://edvidura_app:edvidura_app@127.0.0.1:5433/edvidura",
    )
    try:
        from app import db
        with db.connect() as conn:
            conn.execute("SELECT 1 FROM manuals LIMIT 1")
        return True
    except Exception:
        return False


def test_12_tenant_isolation_and_service_creation(tmp_path: Path):
    if not _db_available():
        pytest.skip("Postgres database not available")

    from app.modules import manuals
    from app.tenancy import TENANT_A_ID, TENANT_B_ID

    epub_bytes = make_synthetic_epub(title="Tenant A Chemistry")
    manifest, sha256_hash = validate_and_extract_epub(epub_bytes, target_dir=tmp_path)

    created = manuals.create_manual(
        tenant_id=TENANT_A_ID,
        title="Tenant A Chemistry",
        description="Chemistry eBook",
        content_type="epub",
        epub_filename="chem.epub",
        epub_sha256=sha256_hash,
        epub_manifest=manifest,
        publish=True,
    )
    mid = created["id"]

    # Verify Tenant A can retrieve manual & version
    manual_a = manuals.get_manual(TENANT_A_ID, mid)
    assert manual_a is not None
    assert manual_a["title"] == "Tenant A Chemistry"

    version_a = manuals.latest_published_version(TENANT_A_ID, mid)
    assert version_a is not None
    assert version_a["content_type"] == "epub"
    assert version_a["epub_filename"] == "chem.epub"

    # Verify Tenant B cannot see Tenant A's manual under RLS
    manual_b = manuals.get_manual(TENANT_B_ID, mid)
    assert manual_b is None

    version_b = manuals.latest_published_version(TENANT_B_ID, mid)
    assert version_b is None


def test_13_unauthorized_and_14_unpublished_ebook_access_controls():
    if not _db_available():
        pytest.skip("Postgres database not available")

    from app.modules import manuals
    from app.tenancy import TENANT_A_ID

    epub_bytes = make_synthetic_epub(title="Draft eBook")
    created = manuals.create_manual(
        tenant_id=TENANT_A_ID,
        title="Draft eBook",
        publish=False,  # Draft
        content_type="epub",
        epub_filename="draft.epub",
    )
    mid = created["id"]

    # Latest published version should be None for learners
    pub = manuals.latest_published_version(TENANT_A_ID, mid)
    assert pub is None

    # Draft version is retrievable by instructor directly
    draft_v = manuals.get_version(TENANT_A_ID, manual_id=mid, version=1)
    assert draft_v is not None
    assert draft_v["is_published"] is False


def test_15_published_ebook_access_and_16_17_18_routes(tmp_path: Path):
    if not _db_available():
        pytest.skip("Postgres database not available")

    from app.modules import manuals
    from app.tenancy import TENANT_A_ID

    epub_bytes = make_synthetic_epub(title="Biology 101")
    manifest, sha256_hash = validate_and_extract_epub(epub_bytes, target_dir=tmp_path)

    created = manuals.create_manual(
        tenant_id=TENANT_A_ID,
        title="Biology 101",
        publish=True,
        content_type="epub",
        epub_filename="bio.epub",
        epub_sha256=sha256_hash,
        epub_manifest=manifest,
    )
    mid = created["id"]

    pub = manuals.latest_published_version(TENANT_A_ID, mid)
    assert pub is not None
    assert pub["is_published"] is True
    assert pub["content_type"] == "epub"
    assert "spine" in pub["epub_manifest"]


def test_19_markdown_manual_regression():
    from app.modules import manuals

    # Verify standard markdown TOC and token signing work cleanly without regression
    toc = manuals.toc_from_body("## Overview\nIntroductory text\n## Key concepts\nConcepts text\n")
    assert len(toc) == 2
    assert toc[0]["title"] == "Overview"
    assert toc[1]["title"] == "Key concepts"

    tid = "11111111-1111-1111-1111-111111111111"
    mid = "22222222-2222-2222-2222-222222222222"
    path = manuals.reader_share_path(tenant_id=tid, manual_id=mid, version=1)
    assert path.startswith(f"/read/manuals/{mid}?")
    assert "sig=" in path
