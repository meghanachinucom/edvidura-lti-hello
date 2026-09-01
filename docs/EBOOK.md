# PeBL-ish eBook (D12)

Versioned technical manuals with chapter TOC, focus deep-links, LMS + standalone read paths.

## Student / LMS path

| Route | Behavior |
|-------|----------|
| `/manuals` | Published manuals for the school |
| `/manuals/{id}?v=&focus=` | Reader with **chapter TOC**, skip link, focus highlight |

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

## Related

- [SME.md](SME.md) — coach citations into manual `v` + `focus`
- Teacher manuals + PDF import (D10)
