"""Idempotent PeBL Demo Data Seed Script.

Prepares a complete, self-contained PeBL eBook demo on Riverside High (Tenant A):
1. Creates or verifies a rich 3-chapter demo EPUB with TOC, local CSS, and local diagram.
2. Registers/updates the demo eBook in PostgreSQL (manuals and manual_versions) with tenant RLS.
3. Extracts assets to canonical storage (static/uploads/epub/{tenant_id}/{manual_id}/1).
4. Creates reusable learner and instructor launch sessions in quiz_context.
5. Populates baseline progress, bookmarks, notes, and verifiable xAPI statements.

Usage:
    python scripts/seed_pebl_demo.py
"""
from __future__ import annotations

import io
import os
import sys
import zipfile
from pathlib import Path
from uuid import UUID, uuid5, NAMESPACE_URL

# Ensure repository root in python path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app import db
from app.tenancy import TENANT_A_ID
from app.modules import manuals as manuals_mod
from app.modules import xapi as xapi_mod
from app.quiz_routes import store_quiz_context


DEMO_SLUG = "pebl-demo-ebook"
DEMO_TITLE = "PeBL Demonstration eBook: Principles of Science & Technology"
DEMO_DESC = "Official PeBL demonstration eBook featuring interactive chapters, navigation, local CSS, diagrams, and full xAPI telemetry."

DEMO_LEARNER_SUB = "learner-pebl-demo"
DEMO_LEARNER_NAME = "Meghana Learner"

DEMO_TEACHER_SUB = "teacher-pebl-demo"
DEMO_TEACHER_NAME = "Carol Instructor"

# 1x1 transparent/colored PNG bytes for valid local image asset
PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x10\x00\x00\x00\x10\x08\x06\x00\x00\x00"
    b"\x1f\xf3\xffa\x00\x00\x00\x19IDATx\x9cc\xfc\xcf\x80\x01\x18\x18\x18\x80\x81\x81\x01\x00"
    b"\x00\x04\x10\x00\x01\xa8y\xcd\xad\x00\x00\x00\x00IEND\xaeB`\x82"
)


def build_demo_epub_bytes() -> bytes:
    """Build a standard, valid EPUB3 package in memory."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        # mimetype must be uncompressed (ZIP_STORED)
        zf.writestr(
            "mimetype",
            b"application/epub+zip",
            compress_type=zipfile.ZIP_STORED,
        )

        # container.xml
        container_xml = """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>"""
        zf.writestr("META-INF/container.xml", container_xml.encode("utf-8"))

        # local stylesheet
        style_css = """body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.6;
  color: #1e293b;
  margin: 1.5rem 2rem;
}
h1 { color: #0f766e; border-bottom: 2px solid #ccfbf1; padding-bottom: 0.5rem; }
h2 { color: #0d9488; margin-top: 1.5rem; }
p { margin-bottom: 1rem; }
.callout {
  background: #f0fdfa;
  border-left: 4px solid #0d9488;
  padding: 1rem 1.25rem;
  border-radius: 4px;
  margin: 1.5rem 0;
}
.diagram-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin: 1.5rem 0;
}
.diagram-container img {
  width: 48px;
  height: 48px;
  object-fit: contain;
}
"""
        zf.writestr("OEBPS/style.css", style_css.encode("utf-8"))
        zf.writestr("OEBPS/images/atom.png", PNG_BYTES)

        # Chapter 1
        ch1_html = """<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="utf-8"/>
  <title>Chapter 1: The Scientific Method</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>Chapter 1: The Scientific Method</h1>
  <p>The scientific method is an empirical method for acquiring knowledge that has characterized the development of science since at least the 17th century.</p>
  <div class="callout">
    <strong>Key Principle:</strong> Hypotheses must be empirically testable and falsifiable through controlled experimentation.
  </div>
  <div class="diagram-container">
    <img src="images/atom.png" alt="Atomic symbol icon"/>
    <div>
      <strong>Observation &amp; Measurement:</strong>
      Every scientific breakthrough begins with careful and repeatable observation.
    </div>
  </div>
  <p>Next, we examine how systematic observation leads to hypotheses and reproducible laws.</p>
</body>
</html>"""
        zf.writestr("OEBPS/ch1.xhtml", ch1_html.encode("utf-8"))

        # Chapter 2
        ch2_html = """<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="utf-8"/>
  <title>Chapter 2: Energy &amp; Thermodynamics</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>Chapter 2: Energy &amp; Thermodynamics</h1>
  <p>Thermodynamics is the branch of physics that deals with heat, work, and temperature, and their relation to energy, entropy, and physical properties of matter.</p>
  <div class="callout">
    <strong>First Law:</strong> Energy can neither be created nor destroyed; it can only change forms.
  </div>
  <p>In closed systems, the total energy remains constant regardless of the physical transformations taking place.</p>
</body>
</html>"""
        zf.writestr("OEBPS/ch2.xhtml", ch2_html.encode("utf-8"))

        # Chapter 3
        ch3_html = """<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="utf-8"/>
  <title>Chapter 3: Computational Thinking</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>Chapter 3: Computational Thinking</h1>
  <p>Computational thinking involves problem-solving methods that express solutions in computer-executable forms.</p>
  <div class="callout">
    <strong>Core Concepts:</strong> Decomposition, Pattern Recognition, Abstraction, and Algorithm Design.
  </div>
  <p>Congratulations! You have completed all foundational modules in this PeBL demonstration eBook.</p>
</body>
</html>"""
        zf.writestr("OEBPS/ch3.xhtml", ch3_html.encode("utf-8"))

        # Navigation document (EPUB3)
        nav_html = """<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="utf-8"/>
  <title>Table of Contents</title>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
      <li><a href="ch1.xhtml">Chapter 1: The Scientific Method</a></li>
      <li><a href="ch2.xhtml">Chapter 2: Energy &amp; Thermodynamics</a></li>
      <li><a href="ch3.xhtml">Chapter 3: Computational Thinking</a></li>
    </ol>
  </nav>
</body>
</html>"""
        zf.writestr("OEBPS/toc.xhtml", nav_html.encode("utf-8"))

        # NCX (EPUB2 fallback)
        ncx_xml = """<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:pebl-demo-ebook-001"/>
    <meta name="dtb:depth" content="1"/>
  </head>
  <docTitle><text>PeBL Demo eBook</text></docTitle>
  <navMap>
    <navPoint id="np-1" playOrder="1">
      <navLabel><text>Chapter 1: The Scientific Method</text></navLabel>
      <content src="ch1.xhtml"/>
    </navPoint>
    <navPoint id="np-2" playOrder="2">
      <navLabel><text>Chapter 2: Energy &amp; Thermodynamics</text></navLabel>
      <content src="ch2.xhtml"/>
    </navPoint>
    <navPoint id="np-3" playOrder="3">
      <navLabel><text>Chapter 3: Computational Thinking</text></navLabel>
      <content src="ch3.xhtml"/>
    </navPoint>
  </navMap>
</ncx>"""
        zf.writestr("OEBPS/toc.ncx", ncx_xml.encode("utf-8"))

        # content.opf
        opf_xml = """<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">urn:uuid:pebl-demo-ebook-001</dc:identifier>
    <dc:title>PeBL Demonstration eBook: Principles of Science &amp; Technology</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>EdVidura Curriculum Team</dc:creator>
  </metadata>
  <manifest>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="atom-img" href="images/atom.png" media-type="image/png"/>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch3" href="ch3.xhtml" media-type="application/xhtml+xml"/>
    <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
    <itemref idref="ch3"/>
  </spine>
</package>"""
        zf.writestr("OEBPS/content.opf", opf_xml.encode("utf-8"))

    return buf.getvalue()


def seed_pebl_demo():
    print("==================================================")
    print("    PeBL eBook Demo Data Seed (Idempotent)       ")
    print("==================================================")

    tenant_id = TENANT_A_ID
    print(f"[1/6] Target tenant: {tenant_id} (Riverside High)")

    # 1. Build and validate EPUB
    epub_bytes = build_demo_epub_bytes()
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        manifest, sha256_hash = manuals_mod.validate_and_extract_epub(
            epub_bytes, target_dir=tmpdir
        )
        print(f"[2/6] Validated EPUB: {len(manifest.get('spine', []))} spine items, {len(manifest.get('manifest_items', []))} manifest assets")

        # 2. Check or create manual record in PostgreSQL
        with db.tenant_connection(tenant_id) as conn:
            existing = conn.execute(
                "SELECT id, slug, title, status FROM manuals WHERE slug = %s",
                (DEMO_SLUG,),
            ).fetchone()

        if existing:
            manual_id = str(existing["id"])
            print(f"[3/6] Existing demo manual found: {manual_id}")
            # Ensure version 1 exists
            ver = manuals_mod.get_version(tenant_id, manual_id=manual_id, version=1)
            if not ver:
                manuals_mod.add_version(
                    tenant_id=tenant_id,
                    manual_id=manual_id,
                    body_md="",
                    changelog="Initial EPUB v1",
                    subject=DEMO_TEACHER_SUB,
                    publish=True,
                    content_type="epub",
                    epub_filename="pebl_demo.epub",
                    epub_sha256=sha256_hash,
                    epub_manifest=manifest,
                )
        else:
            created = manuals_mod.create_manual(
                tenant_id=tenant_id,
                title=DEMO_TITLE,
                description=DEMO_DESC,
                body_md="",
                subject=DEMO_TEACHER_SUB,
                publish=True,
                content_type="epub",
                epub_filename="pebl_demo.epub",
                epub_sha256=sha256_hash,
                epub_manifest=manifest,
            )
            manual_id = str(created["id"])
            # Update slug to constant DEMO_SLUG
            with db.tenant_connection(tenant_id) as conn:
                conn.execute(
                    "UPDATE manuals SET slug = %s WHERE id = %s",
                    (DEMO_SLUG, manual_id),
                )
            print(f"[3/6] Created demo manual: {manual_id}")

        # 3. Extract assets to canonical storage
        storage_dir = manuals_mod.get_epub_storage_dir(tenant_id, manual_id, 1)
        import shutil
        shutil.copytree(tmpdir, storage_dir, dirs_exist_ok=True)
        print(f"[4/6] Extracted assets to: {storage_dir}")

    # 4. Create active launch session tokens for demo learner and teacher
    learner_token = store_quiz_context(
        {
            "tenant_id": tenant_id,
            "subject": DEMO_LEARNER_SUB,
            "learner_name": DEMO_LEARNER_NAME,
            "email": "learner.pebl@riverside.test",
            "is_instructor": False,
            "is_school_admin": False,
        },
        ttl_sec=86400 * 7,
    )

    instructor_token = store_quiz_context(
        {
            "tenant_id": tenant_id,
            "subject": DEMO_TEACHER_SUB,
            "learner_name": DEMO_TEACHER_NAME,
            "email": "teacher.pebl@riverside.test",
            "is_instructor": True,
            "is_school_admin": False,
        },
        ttl_sec=86400 * 7,
    )
    print("[5/6] Created launch tokens for demo learner and teacher")

    # 5. Populate initial reading progress, bookmark, annotation, and xAPI statements
    demo_chap_cfi = "epubcfi(/6/2[ch1]!/4/2:0)"
    demo_ann_cfi = "epubcfi(/6/2[ch1]!/4/4,/1:0,/1:41)"

    progress = manuals_mod.save_reading_progress(
        tenant_id=tenant_id,
        manual_id=manual_id,
        version=1,
        subject=DEMO_LEARNER_SUB,
        chapter_index=0,
        cfi=demo_chap_cfi,
        progress_percent=33,
    )

    # Bookmark
    bookmarks = manuals_mod.list_bookmarks(
        tenant_id=tenant_id, manual_id=manual_id, version=1, subject=DEMO_LEARNER_SUB
    )
    if not bookmarks:
        manuals_mod.create_bookmark(
            tenant_id=tenant_id,
            manual_id=manual_id,
            version=1,
            subject=DEMO_LEARNER_SUB,
            chapter_index=0,
            cfi=demo_chap_cfi,
            title="Scientific Method Bookmark",
        )

    # Annotation
    notes = manuals_mod.list_annotations(
        tenant_id=tenant_id, manual_id=manual_id, version=1, subject=DEMO_LEARNER_SUB
    )
    if not notes:
        manuals_mod.create_annotation(
            tenant_id=tenant_id,
            manual_id=manual_id,
            version=1,
            subject=DEMO_LEARNER_SUB,
            chapter_index=0,
            cfi_range=demo_ann_cfi,
            highlight_text="Hypotheses must be empirically testable",
            annotation_text="Crucial definition for quiz review.",
            color="yellow",
        )

    # Deterministic statement identifiers for demo seed (RFC 4122 UUIDv5)
    # Ensures repeat executions update seeded records in place without creating duplicates
    seed_init_sid = uuid5(NAMESPACE_URL, f"https://edvidura.local/xapi/demo-seed/{tenant_id}/{manual_id}/1/{DEMO_LEARNER_SUB}/initialized")
    seed_chap_sid = uuid5(NAMESPACE_URL, f"https://edvidura.local/xapi/demo-seed/{tenant_id}/{manual_id}/1/{DEMO_LEARNER_SUB}/experienced/0")
    seed_prog_sid = uuid5(NAMESPACE_URL, f"https://edvidura.local/xapi/demo-seed/{tenant_id}/{manual_id}/1/{DEMO_LEARNER_SUB}/progressed/0")
    seed_bm_sid = uuid5(NAMESPACE_URL, f"https://edvidura.local/xapi/demo-seed/{tenant_id}/{manual_id}/1/{DEMO_LEARNER_SUB}/bookmarked/0")
    seed_ann_sid = uuid5(NAMESPACE_URL, f"https://edvidura.local/xapi/demo-seed/{tenant_id}/{manual_id}/1/{DEMO_LEARNER_SUB}/annotated/0")
    seed_comp_sid = uuid5(NAMESPACE_URL, f"https://edvidura.local/xapi/demo-seed/{tenant_id}/{manual_id}/1/{DEMO_LEARNER_SUB}/completed")

    demo_chap_cfi = "epubcfi(/6/2[ch1]!/4/2:0)"
    demo_ann_cfi = "epubcfi(/6/2[ch1]!/4/4,/1:0,/1:41)"

    # Emit all 6 xAPI events to verify end-to-end statement storage under RLS
    init_res = xapi_mod.record_ebook_initialized(
        tenant_id=tenant_id,
        subject=DEMO_LEARNER_SUB,
        learner_name=DEMO_LEARNER_NAME,
        manual_id=manual_id,
        manual_title=DEMO_TITLE,
        version=1,
        statement_id=seed_init_sid,
        send_lrs=False,
    )
    chap_res = xapi_mod.record_chapter_experienced(
        tenant_id=tenant_id,
        subject=DEMO_LEARNER_SUB,
        learner_name=DEMO_LEARNER_NAME,
        manual_id=manual_id,
        manual_title=DEMO_TITLE,
        chapter_index=0,
        chapter_title="Chapter 1: The Scientific Method",
        version=1,
        statement_id=seed_chap_sid,
        send_lrs=False,
    )
    prog_res = xapi_mod.record_reading_progressed(
        tenant_id=tenant_id,
        subject=DEMO_LEARNER_SUB,
        learner_name=DEMO_LEARNER_NAME,
        manual_id=manual_id,
        manual_title=DEMO_TITLE,
        chapter_index=0,
        progress_percent=33,
        cfi=demo_chap_cfi,
        version=1,
        statement_id=seed_prog_sid,
        send_lrs=False,
    )
    bm_res = xapi_mod.record_bookmark_created(
        tenant_id=tenant_id,
        subject=DEMO_LEARNER_SUB,
        learner_name=DEMO_LEARNER_NAME,
        manual_id=manual_id,
        manual_title=DEMO_TITLE,
        chapter_index=0,
        bookmark_title="Scientific Method Bookmark",
        cfi=demo_chap_cfi,
        version=1,
        statement_id=seed_bm_sid,
        send_lrs=False,
    )
    ann_res = xapi_mod.record_annotation_added(
        tenant_id=tenant_id,
        subject=DEMO_LEARNER_SUB,
        learner_name=DEMO_LEARNER_NAME,
        manual_id=manual_id,
        manual_title=DEMO_TITLE,
        chapter_index=0,
        annotation_text="Crucial definition for quiz review.",
        highlight_text="Hypotheses must be empirically testable",
        color="yellow",
        cfi_range=demo_ann_cfi,
        version=1,
        statement_id=seed_ann_sid,
        send_lrs=False,
    )
    comp_res = xapi_mod.record_reading_completed(
        tenant_id=tenant_id,
        subject=DEMO_LEARNER_SUB,
        learner_name=DEMO_LEARNER_NAME,
        manual_id=manual_id,
        manual_title=DEMO_TITLE,
        version=1,
        statement_id=seed_comp_sid,
        send_lrs=False,
    )

    # 6. Verify statement count in database
    with db.tenant_connection(tenant_id) as conn:
        stmt_count = conn.execute(
            "SELECT COUNT(*)::int AS n FROM xapi_statements WHERE actor_sub = %s",
            (DEMO_LEARNER_SUB,),
        ).fetchone()["n"]

    print(f"[6/6] Verified {stmt_count} persisted xAPI statements for learner '{DEMO_LEARNER_SUB}' in PostgreSQL")

    print("\n--- DEMO READY ---")
    print(f"Manual ID:     {manual_id}")
    print(f"Catalogue URL: /manuals?token={learner_token}")
    print(f"Reader URL:    /manuals/{manual_id}?token={learner_token}")
    print(f"Teacher URL:   /teacher/manuals?token={instructor_token}")
    print("------------------\n")
    return {
        "tenant_id": tenant_id,
        "manual_id": manual_id,
        "learner_token": learner_token,
        "instructor_token": instructor_token,
        "statement_count": stmt_count,
    }


if __name__ == "__main__":
    seed_pebl_demo()
