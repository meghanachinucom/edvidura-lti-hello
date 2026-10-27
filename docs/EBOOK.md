# PeBL-ish eBook (D12)

Versioned technical manuals with chapter TOC, focus deep-links, LMS + standalone read paths.

## Student / LMS path

| Route | Behavior |
|-------|----------|
| `/manuals` | Published manuals **assigned to the LTI class** |
| `/manuals/{id}?v=&focus=&lang=&state=` | Reader with **chapter TOC**, skip link, focus highlight; optional **state/language** |

Class scope: `class_manuals` links (Teach → Manuals → Visible to classes). Students cannot open manuals not linked to their class.

### Per-state languages + auto-translate

Canonical body lives on `manual_versions` (e.g. Sanskrit `sa-IN`). Reader **State / Language** dropdown:

1. Uses a cached `manual_locales` row if present (teacher-authored or prior auto)
2. Else **LLM auto-translates** source → target via `manuals.translate` (`run_ai` / Anthropic|OpenAI|local HTTP), then caches with `is_auto=true`
3. Needs `AI_ENABLED=1` + API key (same stack as Ask Vidura / simplify)

Also: session preference, tenant `preferred_language` / `preferred_state`, Teach → Manuals → **State languages** for manual overrides.

**PDF import:** Teach → Manuals → **Import from PDF** — pick **Source language** (default Sanskrit for school discourse packs). Extracted text becomes the canonical body; reader dropdown auto-translates the same way. Re-importing a PDF clears cached auto-locales so translations refresh. Text-based PDFs only (scanned pages need OCR first).

**Clients:** Chaganti Sanskrit→Telugu is a **Telugu school** pack (not Riverside Class 8). Corporate uses welding/video — same reader tech, different tenant + content.

Heading ids come from `##` markdown via `content.body_md_to_html` / `manuals.toc_from_body`.

## Standalone path

Teachers see a signed share path on the LMS reader. Open without LTI:

`GET /read/manuals/{id}?tid=&v=&sig=&focus=`

HMAC (`seal_reader_token` / `verify_reader_token`) — expires (default 72h). Uses `RECEIPT_SIGNING_KEY` or `SESSION_SECRET`.

## Domain

`app.modules.manuals`

- `toc_from_body`
- `reader_share_path` / `seal_reader_token` / `verify_reader_token`

## A11y

- Skip link → `#manual-body`
- TOC `nav` with `aria-label`
- Sticky chapter list; focus section scroll

## PeBL discussion (complete)

In-book **class micro-forum** per chapter (Discuss rail) + Ask Vidura AI drawer.  
Offline post buffer + PeBL Discussion xAPI. **No separate chat product** — see [PEBL_LITE.md](PEBL_LITE.md).

## Related

- [SME.md](SME.md) — coach citations into manual `v` + `focus`
- Teacher manuals + PDF import (D10)
