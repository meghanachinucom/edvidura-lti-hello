# PeBL / EPUB Implementation Status

This status document provides an accurate, evidence-backed audit of capabilities in the **EdVidura** codebase on branch `feature/pebl-ebooks`.

Every status is categorized strictly using only the permitted status labels:
* `Implemented`
* `Partially Implemented`
* `Pending`
* `Requires Validation`

> [!IMPORTANT]
> **No official PeBL compliance claim is being made.** The current implementation provides standard EPUB CFI generation and parsing (`epubcfi(/6/...!/4/...)`), parent-side in-content text highlighting inside a secure same-origin sandboxed iframe (`sandbox="allow-same-origin"` without `allow-scripts`, strict CSP `script-src 'none'`), and full xAPI 1.0.3 telemetry. However, formal PeBL interoperability certification with third-party PeBL reading systems remains subject to future validation.

---

## Capabilities Status Matrix

### Phase 1: EPUB3 Core Reader Support
| Capability | Status | Evidence / Verification Notes |
| :--- | :--- | :--- |
| **EPUB3 Archive Validation & Extraction** | `Implemented` | `app/modules/manuals/epub.py` with zip/OPF validation, traversal protection, expansion ratio checks, and size limits. |
| **EPUB Versioning & Storage** | `Implemented` | `db/migration_epub_versions.sql` storing EPUB manifests and SHA256 hashes in `manual_versions`. |
| **EPUB Reader Routes & Navigation** | `Implemented` | `app/shell_routes.py` serving extracted EPUB spine items inside `templates/manual_read.html`. |
| **Phase 1 Test Suite** | `Implemented` | `tests/test_epub_manuals.py` covering archive validation, traversal defenses, and Markdown regression. |

### Phase 2: Reading Position, Progress, Bookmarks & Annotations
| Capability | Status | Evidence / Verification Notes |
| :--- | :--- | :--- |
| **Server-Side Manual & Version Validation** | `Implemented` | `_validate_manual_and_version()` in `app/shell_routes.py` enforcing tenant isolation, manual existence, published status, and chapter bounds. |
| **Annotation Update HTTP API** | `Implemented` | `POST /api/v1/manuals/{manual_id}/annotations/{annotation_id}` in `app/shell_routes.py` and `update_annotation()` in `app/modules/manuals/pebl_phase2.py`. |
| **Durable Persistence Enforcement (No In-Memory Fallbacks)** | `Implemented` | In-memory fallback dictionaries removed; `DatabaseUnavailableError` raised on DB failure; API returns HTTP 503. |
| **Learner Reading Progress Tracking** | `Implemented` | Chapter progress and percent tracking with standard EPUB point CFIs (`epubcfi(/6/...!/4/2:0)`) persisted in PostgreSQL. |
| **Learner Bookmarks & Chapter Navigation** | `Implemented` | Bookmarks created with standard EPUB point CFIs, listed, and deleted under learner and tenant isolation. |
| **Learner Text Highlights & Annotations** | `Implemented` | Annotations created with standard EPUB range CFIs (`epubcfi(/6/2[ch1]!/4/2,/1:0,/1:45)`), color tags, and note text. |
| **Standard EPUB CFI Resolution & Fallback** | `Implemented` | `generate_epub_cfi()` and `parse_epub_cfi()` in `app/modules/manuals/pebl_phase2.py` support standard point/range CFIs with fallback for legacy `epub-cfi-chap-{N}` markers. Verified in `tests/test_epub_cfi.py`. |
| **In-Content Text Highlighting & DOM Restoration** | `Implemented` | Parent-side highlighter safely renders `<mark class="epub-highlight">` in `iframe.contentDocument` without enabling `allow-scripts` or weakening CSP. Automatically restores highlights on chapter load and unwraps on deletion. Verified via Chrome CDP. |
| **PostgreSQL RLS & Live Persistence** | `Implemented` | `db/migration_epub_versions.sql` and `db/migration_pebl_phase2.sql` applied. Verified live with PostgreSQL container on port 5433 with tenant RLS isolation strictly enforced. |
| **Phase 2 HTTP Route Test Suite** | `Implemented` | `tests/test_epub_phase2_routes.py` with 12 tests covering auth, 404s, 400s, 503s, and isolation. |
| **Phase 2 Service Unit Test Suite** | `Implemented` | `tests/test_epub_progress.py`, `tests/test_epub_bookmarks.py`, `tests/test_epub_annotations.py`, `tests/test_epub_cfi.py` (22 passed). |
| **PeBL eBook xAPI Activity Tracking** | `Implemented` | Captures 6 distinct events: Reader initialized, Chapter experienced, Reading progressed, Bookmark created, Annotation added, and Reading completed. Statements persisted under tenant RLS in `xapi_statements`. |
| **Real Chrome Browser Acceptance** | `Implemented` | Headless Chrome CDP suite verified catalogue rendering, sandboxed iframe reader, chapter navigation, highlight injection/restoration, standalone reader, and 0 console errors. |

### PeBL Compatibility & Platform Integration
| Capability | Status | Evidence / Verification Notes |
| :--- | :--- | :--- |
| **PeBL Standard Reference Audit** | `Implemented` | `docs/pebl/PEBL_PHASE2_REFERENCE.md` documenting PeBL reference review and architectural differences. |
| **PeBL Extension Events (Coach/Chat xAPI)** | `Implemented` | `record_coach_interaction()` in `app/modules/xapi/service.py` with `COACH_XAPI_FULL_TEXT=1`. |
| **Idempotent Demo Data Seed** | `Implemented` | `scripts/seed_pebl_demo.py` uses deterministic RFC 4122 UUIDv5 statement IDs with PostgreSQL `ON CONFLICT (statement_id) DO UPDATE`. Repeat runs produce zero duplicate statements. Verified in `tests/test_pebl_seed_idempotency.py`. |
| **Real Moodle LTI 1.3 Browser Launch** | `Implemented` | Headless Chrome CDP verified real login to Moodle (`http://localhost:8085`), navigation to Course 2, external-tool launch (`cmid=5`), OIDC exchange to EdVidura (`http://localhost:8000`), creation of `launch_events` record in PostgreSQL, and opening the demo eBook. Tested and verified for both administrator and actual learner (`student1`). |
| **Official PeBL Compliance Validation** | `Requires Validation` | No official PeBL compliance claim is made; requires formal validation against third-party PeBL reading systems. |
| **Offline Telemetry Queue & Sync (Phase 3+)**| `Pending` | IndexedDB local state caching and offline xAPI outbox buffer planned for Phase 3/4. |

---

## Test Execution Record

* **PeBL & xAPI Automated Test Suite:** 104 passed out of 104 tests across 14 test suites (`test_xapi_statement_identity.py`, `test_pebl_seed_idempotency.py`, `test_epub_cfi.py`, `test_epub_manuals.py`, `test_epub_bookmarks.py`, `test_epub_progress.py`, `test_epub_annotations.py`, `test_epub_security_hardening.py`, `test_epub_phase2_routes.py`, `test_epub_xapi.py`, `test_xapi.py`, `test_manuals.py`, `test_tenant_isolation.py`, `test_lti_context_bindings.py`).
* **Live HTTP & xAPI Verification:** 14 out of 14 checks passed (`scratch/live_http_pebl_verifier.py`).
* **In-Iframe Highlighting, CFI Resolution & Restoration (Chrome CDP):** 100% passed (`scratch/verify_cfi_resolution_cdp.py`); verified standard point CFI at known location, non-zero character offset, different paragraph targeting, multi-node wrapping across inline elements (`<strong>`), restoration across page refresh and chapter navigation, and backward compatibility for legacy markers (`epub-cfi-chap-N`).
* **Real Moodle Learner LTI 1.3 Launch (Chrome CDP):** 100% passed (`scratch/verify_learner_moodle_workflow.py`); authenticated as learner `student1` with assigned role `Learner` from Course 2 (`Welding Demo`), opened demo eBook, created bookmark and annotation, updated progress, persisted statements in PostgreSQL under learner subject `4` under tenant RLS.
* **EPUB Asset Rendering in Browser:** 100% passed (`scratch/verify_assets_in_chrome.py`); verified local `style.css` and `atom.png` (16x16 natural dimensions) render inside sandboxed iframe.
* **Demo-Seed & Statement Idempotency:** Verified repeat execution of `scripts/seed_pebl_demo.py` creates zero duplicate statements (RFC 4122 UUIDv5 deterministic keys), while separate live learner interactions generate distinct statement IDs.
* **Security & Container Cleanup:** Confirmed removal of temporary debug file `/tmp/check_pwd.php` from container `moodle-moodle-1`. Confirmed session token expiry (3600s TTL) and sanitized output.
* **PostgreSQL / Live RLS:** Verified live on PostgreSQL 5433 with tenant isolation strictly enforced.
