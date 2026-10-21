# PeBL Phase 2 Reference & Compatibility Documentation

## 1. Official PeBL Resources Inspected
The following official PeBL project resources and specifications were reviewed during Phase 2 development:

* **Official PeBL Web Platform**: [https://peblproject.org/](https://peblproject.org/)
* **Official PeBL Libraries Repository**: [https://github.com/peblproject/PeBL-Libraries](https://github.com/peblproject/PeBL-Libraries)
* **PeBL Specification Standards**:
  * PeBL Core Specification (Extensible EPUB3 Extension Model)
  * PeBL eReader Technical Guidance & Reference Architecture
  * PeBL xAPI Vocabulary & Profile for Interactive eBooks
  * eReader Compatibility & EPUB CFI (Canonical Fragment Identifier) RFC 3187 / EPUB3 CFI Specification

---

## 2. Actual Location Representation & Technical Limitations

> [!IMPORTANT]
> **No official PeBL compliance claim is being made.** The current implementation utilizes PeBL vocabulary concepts as architectural references only.

### A. Location Markers: `epub-cfi-chap-{N}` is Not a Standard EPUB CFI
* **Custom Marker**: In the current EdVidura reader, `epub-cfi-chap-{N}` (e.g. `epub-cfi-chap-1`) is a custom chapter/spine marker that maps to spine item indices (`chapter_index`), **not a standard EPUB CFI**.
* **Standard EPUB CFI**: A standard EPUB CFI (e.g. `epubcfi(/6/4[chap01.xhtml]!/4/2/10/1:0)`) requires full package document element indexing, XML step paths, and character offset markers.
* **Chapter-Level Scope**: Current bookmarking and reading position resumption operate at **chapter level**, corresponding to what the existing iframe-based reader architecture supports.

### B. DOM-Range Text Selection & Highlighting Limitations
* **No DOM-Range CFI Resolution**: The current code does not demonstrate reliable DOM-range text selection or standard CFI resolution across sandboxed iframe boundaries.
* **No Visible Highlight Restoration**: The current reader displays learner notes and saved highlights in the side panel list, but does not inject or restore visible DOM highlights within the chapter iframe document itself.
* **Security & Iframe Sandboxing**: Chapter contents are rendered inside a sandboxed iframe (`sandbox="allow-same-origin allow-scripts"`). Bidirectional DOM selection and range calculation require a future location-design step with a structured message/event bridge.

---

## 3. Relevant PeBL Behaviors Analyzed

### A. Reading Location & Progress
* **PeBL Standard**: PeBL specifies tracking reading state using exact EPUB Canonical Fragment Identifiers (EPUB CFI) mapped to spine manifest items and percentage progression.
* **EdVidura Implementation**: EdVidura stores spine item `chapter_index`, progress percentage (0–100), and custom chapter markers `epub-cfi-chap-{N}` tied strictly to the published `manual_id` and authoritative `version`.

### B. Bookmarks
* **PeBL Standard**: Bookmarks capture a specific location in an eBook package, associating a learner identifier, timestamp, CFI target, and title label.
* **EdVidura Implementation**: Learner bookmarks persist `tenant_id`, `subject`, `manual_id`, `version`, `cfi` (custom chapter marker), `chapter_index`, and `title`. Bookmarks navigate to saved chapter spine sections.

### C. Annotations & Highlights
* **PeBL Standard**: Annotations/highlights extend point locations to range selectors (start CFI to end CFI), capturing selected HTML text content and learner comments.
* **EdVidura Implementation**: `ebook_annotations` records store `cfi_range`, `highlight_text`, `annotation_text`, and `color`, presented as notes in the manual reader panel.

### D. Storage, Isolation & Persistence
* **PeBL Standard**: Data stored in PeBL is scoped per-learner, per-book, and per-organization/tenant.
* **EdVidura Implementation**: Database tables `ebook_reading_progress`, `ebook_bookmarks`, and `ebook_annotations` require PostgreSQL persistence with Row-Level Security (RLS) policies using `app.tenant_id` session variables and trusted server-side `subject` checks. In-memory fallback dictionaries are strictly eliminated; database failures return HTTP 503.

---

## 4. Code Reuse & Adaptation Rationale

| Category | Status | Rationale |
| :--- | :--- | :--- |
| **PeBL Data Model & Vocabulary** | `Partially Implemented` | Adapted PeBL reading state concepts (`location`, `progress`, `bookmark`, `annotation`) into EdVidura PostgreSQL schema with RLS and FastAPI service layer. |
| **Standard EPUB CFI Resolution** | `Pending` | Custom chapter markers (`epub-cfi-chap-{N}`) are used; full RFC 3187 EPUB CFI resolution requires a separate iframe location-design step. |
| **DOM Range Text Selection & Highlighting** | `Pending` | In-content DOM highlight restoration requires a dedicated cross-document bridge. |
| **PeBL REST Microservices** | `Requires Validation` | Evaluated PeBL microservice schemas; EdVidura uses native multi-tenant FastAPI routes (`/api/v1/manuals/...`). |
| **Live PostgreSQL Persistence & RLS** | `Requires Validation` | Migrations and schema are specified; live database verification remains unverified in environments where PostgreSQL is offline. |

---

## 5. Architectural Differences & Design Rationale
1. **Single Database Architecture**: EdVidura maintains all tenant data in PostgreSQL with native RLS policies rather than deploying separate microservice databases.
2. **Unified Jinja UI**: eBook controls (Progress, Bookmark list, Notes list) are rendered directly inside EdVidura's `manual_read.html` using existing `shell.css` Citrus Mint design tokens rather than external React widgets.
3. **Multi-Tenant Server Scoping**: Tenant context is derived strictly from verified LTI 1.3 sessions and server-side authentication headers. Arbitrary `tenant_id` or `subject` parameters from clients are rejected.
4. **No Certification Claims**: No official PeBL compliance claim is being made.
