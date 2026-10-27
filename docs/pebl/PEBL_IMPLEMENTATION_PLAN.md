# PeBL / EPUB Implementation Plan

This document establishes the architecture and multi-phase implementation roadmap for extending the existing **EdVidura** application with PeBL (Personalized eBook for Learning) and EPUB3 capabilities.

---

## 1. Existing Architecture

EdVidura is built as a server-rendered Web application utilizing:
* **Backend:** FastAPI (Python 3.11) with Jinja2 template rendering.
* **Database:** PostgreSQL with Row Level Security (RLS) enforcement per tenant (`tenant_id`).
* **Frontend:** Server-rendered HTML5, Vanilla CSS (`shell.css` - Citrus Mint Kinetic Design System), and vanilla JavaScript.
* **Authentication & Identity:** LTI 1.3 Advantage launch with HMAC-signed session cookies and HMAC standalone reader tokens.

---

## 2. Existing Manual / eBook Capabilities

* **Domain Module:** `app/modules/manuals/service.py`
* **Markdown Manuals:** Manual creation, slug generation, and version tracking (`manuals`, `manual_versions`).
* **Heading TOC Extraction:** `toc_from_body()` parses `##` headings into `{slug, title}` pairs for internal navigation.
* **Standalone Reader:** HMAC-signed link generation (`seal_reader_token`, `verify_reader_token`, `reader_share_path`) allowing time-limited access without active LTI sessions.
* **Text / PDF Extraction:** basic text/PDF text extraction endpoint (`/teacher/manuals/from-pdf`).

---

## 3. Existing xAPI Capabilities

* **Domain Module:** `app/modules/xapi/` (service, builder, LRS client).
* **Verbs Implemented:**
  * `experienced`: Logged on manual view (`record_resource_experienced`).
  * `completed`: Logged on lesson completion.
  * `passed` / `failed`: Logged on quiz completion.
  * `mastered` / `attempted`: Logged per skill profile on quiz completion.
  * `interacted`: Logged on Study Coach chat turns (aligned with PeBL Discussion tracking with `COACH_XAPI_FULL_TEXT=1`).
* **Storage Tiers:** Local PostgreSQL `xapi_statements` with RLS (`noisy`, `transactional`, `authoritative`) and retry forward to external LRS.

---

## 4. Existing LTI / Deep Linking / NRPS Capabilities

* **LTI 1.3:** Complete OIDC launch, state verification, JWKS keyset endpoint.
* **Deep Linking:** `/lti/deep-link` picker allowing instructors to select manuals, lessons, or quizzes to embed back into Moodle as `LtiDeepLinkingResponse`.
* **NRPS (Names & Roles Provisioning Service):** `/teacher/roster/sync` fetches and caches Moodle course membership rosters under tenant RLS.

---

## 5. Existing UI System

* **Base Shell:** `templates/base_shell.html` containing unified top navigation, role indicator chip (Student/Teacher/Admin), tenant name context strip, and footer.
* **Design Tokens (`static/css/shell.css`):**
  * Color Palette: Citrus Mint (`--surface`, `--primary: #006c4b`, `--secondary: #00668a`, `--tertiary: #476800`).
  * Typography: `Syne` (Display/Headlines) and `Outfit` (Body/Labels).
  * Structure & Cards: `.page-wrap`, `.hero-band`, `.panel`, `.lesson-card`, `.ebook-layout`, `.ebook-toc`, `.ebook-main`, `.lesson-prose`.
  * Buttons & Chips: `.btn`, `.btn-primary`, `.btn-glass`, `.btn-surface`, `.chip`, `.chip-mint`.

---

## 6. What Will Be Reused

* All current routes, LTI endpoints, tenant resolution middleware, DB models, and templates.
* `templates/base_shell.html` layout structure and header/navigation system.
* `static/css/shell.css` tokens, classes, and styles.
* `app/modules/manuals/service.py` functions for listing, versioning, and HMAC token signing.
* `app/modules/xapi/service.py` for logging statement events.

---

## 7. What Will Be Extended

* `app/modules/manuals/`: Add EPUB parsing, manifest handling, spine extraction, CFI navigation, bookmarks, and annotations.
* Database Schema: Add structural metadata columns to `manuals` / `manual_versions` (e.g. `content_type`, `epub_manifest`, `epub_file_path`) and create `ebook_bookmarks` and `ebook_annotations` tables.
* Reader Templates: Extend `templates/manual_read.html` and `templates/ebook_standalone.html` to support client-side EPUB section rendering, CFI navigation, bookmarking controls, and highlight layers.
* xAPI Builders: Add PeBL specific verbs (`bookmarked`, `highlighted`, `annotated`, `progressed`).

---

## 8. What Must Remain Untouched

* LTI 1.3 launch security (`app/lti_fastapi.py`, `app/launch_cache.py`).
* Tenant isolation model (`app/db.py`, `db/migration_rls_capability_tables.sql`, PostgreSQL RLS policies).
* AGS grade passback logic (`app/ags_passback.py`).
* Existing Markdown manual functionality and versioning endpoints.
* Quiz engine, AI authoring, and micro-learning pipelines.

---

## 9. Missing PeBL / EPUB Capabilities

1. **EPUB3 Package Parsing:** Unpacking `.epub` zip archives, reading `META-INF/container.xml` and OPF package manifests.
2. **Canonical Fragment Identifiers (CFI):** Generating and resolving EPUB CFIs for exact position tracking.
3. **Reading Progress Tracking:** Percent completed & current CFI bookmark persistence.
4. **Highlights & Annotations:** Text selection capture, persistent user notes, and highlight overlay rendering.
5. **PeBL Extension Widgets:** Interactive inline components embedded in content chapters.
6. **Offline Synchronization & Service Worker:** Service worker caching of EPUB assets and IndexedDB offline telemetry queuing.
7. **Document Conversion & OCR:** Pipeline to convert PDF/Word documents to EPUB3 structured packages.
8. **Supersession & Revision Management:** Automatic version comparison and migration of bookmarks/annotations across manual versions.

---

## 10. Database Changes

Minimum additive schema required inside `db/migration_manuals.sql` or dedicated migration:

```sql
-- Extend manual_versions for EPUB content
ALTER TABLE manual_versions ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'markdown';
ALTER TABLE manual_versions ADD COLUMN IF NOT EXISTS archive_path TEXT DEFAULT NULL;
ALTER TABLE manual_versions ADD COLUMN IF NOT EXISTS epub_manifest JSONB DEFAULT NULL;

-- Bookmarks table
CREATE TABLE IF NOT EXISTS ebook_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
    version INT NOT NULL,
    subject TEXT NOT NULL,
    cfi TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Annotations / Highlights table
CREATE TABLE IF NOT EXISTS ebook_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
    version INT NOT NULL,
    subject TEXT NOT NULL,
    cfi_range TEXT NOT NULL,
    highlight_text TEXT NOT NULL DEFAULT '',
    annotation_text TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT 'yellow',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Isolation Policies
ALTER TABLE ebook_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebook_bookmarks FORCE ROW LEVEL SECURITY;
CREATE POLICY ebook_bookmarks_tenant_isolation ON ebook_bookmarks
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE ebook_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebook_annotations FORCE ROW LEVEL SECURITY;
CREATE POLICY ebook_annotations_tenant_isolation ON ebook_annotations
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON ebook_bookmarks, ebook_annotations TO edvidura_app;
```

---

## 11. Backend Changes

* `app/modules/manuals/epub.py`: EPUB3 parser utility using Python standard library `zipfile` and `xml.etree.ElementTree`.
* `app/modules/manuals/service.py`: Add methods `create_epub_manual()`, `save_bookmark()`, `list_bookmarks()`, `save_annotation()`, `list_annotations()`.
* `app/shell_routes.py`: Add REST / HTML endpoints for bookmarking, annotating, EPUB asset serving (`/manuals/{id}/files/{path:path}`), and progress saving.

---

## 12. Template Changes

* `templates/manual_read.html`: Add EPUB iframe or container area, chapter sidebar with EPUB spine TOC, bookmark list, annotation toolbar, and sync status indicator.
* `templates/ebook_standalone.html`: Update reader view for standalone EPUB access.
* `templates/teacher_manuals.html`: Add EPUB `.epub` file upload tab/form alongside Markdown and PDF.

---

## 13. CSS / JS Changes

* `app/static/css/shell.css`: Add styles for `.epub-viewer`, `.highlight-yellow`, `.highlight-green`, `.bookmark-item`, `.annotation-popover`, `.sync-badge`.
* `app/static/js/epub_reader.js`: Lightweight client-side reader manager handling navigation, section loading, CFI calculation, text selection capture, and background API persistence.

---

## 14. Dependencies

* Standard Python Library (`zipfile`, `xml.etree.ElementTree`, `hashlib`, `json`).
* Optional parsing helper: `ebooklib` or pure native Python parser.
* No frontend node/npm build step or heavy frameworks required; standard ES6 Vanilla JavaScript.

---

## 15. Testing Strategy

* Unit tests in `tests/test_epub_parser.py` for EPUB archive extraction and manifest parsing.
* RLS tenant isolation tests for bookmarks and annotations in `tests/test_ebook_annotations.py`.
* xAPI statement verification tests in `tests/test_pebl_xapi.py`.

---

## 16. Security & Tenant Isolation

* Server-enforced session verification via `require_session()` on all endpoints.
* Database connections scoped using `db.tenant_connection(tenant_id)`.
* Zero client-side trust for `tenant_id` or user authorization parameters.
* Signed HMAC time-limited tokens for standalone reader links.

---

## 17. Implementation Sequence

### Phase 1: Real EPUB Support Using Existing Manual Domain & UI
* Implement backend EPUB parser (`app/modules/manuals/epub.py`).
* Extend `manuals` / `manual_versions` to store EPUB packages and extracted manifests.
* Serve raw EPUB section assets with correct MIME types under tenant security.
* Update `manual_read.html` to render EPUB chapters cleanly inside `.ebook-main`.

### Phase 2: Reading Progress
* Implement reading progress tracking (percent complete and current chapter/CFI).
* Save and restore reading position upon re-opening manual.

### Phase 3: Bookmarks and Annotations / Highlights
* Implement DB migration for `ebook_bookmarks` and `ebook_annotations`.
* Add selection toolbar to `manual_read.html` for creating highlights and notes.
* API endpoints to save, list, and delete bookmarks and annotations per user/tenant.

### Phase 4: PeBL / xAPI eBook Telemetry
* Add xAPI builders for PeBL reading events (`experienced`, `progressed`, `bookmarked`, `annotated`).
* Emit xAPI statements to local store and forward to configured LRS.

### Phase 5: Offline Reading and Synchronization
* Add Service Worker for caching EPUB assets and reader shell.
* Add IndexedDB local store for offline reading position and pending annotations.
* Auto-sync pending offline actions to backend upon network reconnect.

### Phase 6: Existing LTI / Deep Linking Integration
* Update `/lti/deep-link` picker to support deep-linking specific EPUB chapters/CFIs.
* Preserve LTI launch context when reading EPUB eBooks.

### Phase 7: Existing NRPS Reuse Where Actually Required
* Enrich reader notes and teacher annotation dashboards with student names from cached NRPS rosters.

### Phase 8: PDF / Manual to EPUB Conversion
* Implement converter engine transforming plain Markdown manuals and extracted PDF text into compliant EPUB3 packages.

### Phase 9: Document Extraction / OCR
* Add fallback OCR parsing for image-only PDF manual uploads.

### Phase 10: Versioning / Supersession / Revision Handling
* Automatically migrate bookmarks and annotations across manual versions when new revisions are published.
