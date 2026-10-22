# EPUB3 Reader Support (Phase 1)

This document details the implementation of **Phase 1: Real EPUB3 eBook Support** in EdVidura.

---

## 1. Supported EPUB Structure & Standards

* **Package Format:** EPUB 3.0 / EPUB 2.0 archives (`.epub`).
* **Container:** Validated `META-INF/container.xml` locating the primary OPF package document.
* **OPF Metadata:** `<dc:title>`, `<dc:creator>`, `<dc:description>`, `<dc:language>`.
* **Manifest:** Complete parsing of item `id`, `href`, `media-type`, `properties`.
* **Spine:** Ordered reading list derived from `<spine>` `<itemref>` elements.
* **Navigation / TOC:** Native EPUB3 `<nav>` XHTML parsing, EPUB2 NCX fallback, and spine fallback.
* **Content Documents:** Multi-chapter XHTML/HTML content documents rendered with relative CSS and images.

---

## 2. Upload & Workflow

1. **Instructor Shell:** Instructors upload `.epub` files via the **Upload EPUB eBook** form panel on `/teacher/manuals`.
2. **Validation:** Archive is inspected in-memory for ZIP validity, total uncompressed size, compression ratios, path safety, `container.xml`, and OPF package structure.
3. **Extraction & Persistence:** Extracted safely into `app/static/uploads/epub/{tenant_id}/{manual_id}/{version}/`.
4. **Metadata & Version:** Standard `manuals` and `manual_versions` metadata created with `content_type='epub'`, `epub_filename`, `epub_sha256`, and `epub_manifest`.

---

## 3. Storage & Security Model

* **Storage Root:** Scoped strictly per tenant, manual ID, and version number (`app/static/uploads/epub/{tenant_id}/{manual_id}/{version}/`).
* **Zip Slip & Path Traversal Protection:** Every filename in the ZIP is checked for `..` components, leading slashes, and Windows drive letters before extraction.
* **Canonical Path Verification:** `os.path.commonpath([real_storage_dir, target_file_path]) == real_storage_dir` enforced during both extraction and asset serving.
* **Symlink Rejection:** Entries with Unix symlink mode bits are rejected during validation.
* **Zip Bomb Protection:** Max total uncompressed size (100MB) and max compression ratio (100x) enforced.
* **Tenant Isolation:** Asset serving routes (`/manuals/{manual_id}/epub-files/{file_path:path}`) verify tenant context under PostgreSQL RLS / session authorization before delivering assets.
* **No Direct DB Client Access:** No raw client filesystem path exposure; all resources served via application routes with `X-Content-Type-Options: nosniff`.

---

## 4. Reader Architecture

* **Integration:** Seamless extension of `templates/manual_read.html` and `templates/ebook_standalone.html` retaining existing top navigation, context strip, hero band, typography, colors, and design tokens (`.ebook-layout`, `.ebook-toc`, `.ebook-main`).
* **Navigation:** Sidebar chapter table of contents + Chapter header bar with Previous/Next controls.
* **Content Rendering:** Secure iframe sandbox (`sandbox="allow-same-origin"`, strictly omitting `allow-scripts`) with restrictive Content Security Policy (`script-src 'none'`, `default-src 'none'`, `frame-ancestors 'self'`) rendering relative EPUB XHTML sections with correct content MIME types (`application/xhtml+xml`, `text/css`, `image/png`, etc.).
* **Markdown Parity:** Existing Markdown manuals remain 100% operational on the exact same routes.

---

## 5. Test Coverage

Comprehensive test suite in `tests/test_epub_manuals.py`:
1. `test_1_valid_epub_upload_and_extraction`
2. `test_2_malformed_epub_not_zip`
3. `test_3_invalid_zip_corrupted_header`
4. `test_4_missing_container_xml`
5. `test_5_missing_opf_package_file`
6. `test_6_malformed_opf_xml`
7. `test_7_invalid_spine_no_valid_itemrefs`
8. `test_8_path_traversal_archive_entry`
9. `test_9_absolute_path_archive_entry`
10. `test_10_oversized_archive_rejection`
11. `test_11_excessive_archive_expansion_ratio`
12. `test_12_tenant_isolation_and_service_creation`
13. `test_13_unauthorized_and_14_unpublished_ebook_access_controls`
14. `test_15_published_ebook_access_and_16_17_18_routes`
15. `test_19_markdown_manual_regression`

---

## 6. Limitations & Exclusions for Phase 1

* **Bookmarks & Highlights (Phase 3):** CFI bookmarks and text highlights are deferred.
* **Reading Progress (Phase 2):** Percentage position tracking per user is deferred.
* **xAPI Telemetry (Phase 4):** eBook specific xAPI verbs (`bookmarked`, `progressed`) are deferred.
* **Offline Service Worker (Phase 5):** PWA offline caching and IndexedDB queue are deferred.
