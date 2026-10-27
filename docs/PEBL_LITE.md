# PeBL ebook + discussion (complete)

**Product path:** manuals reader with **in-book class discussion** plus Ask Vidura (AI) in the side drawer.

## Decision: is a separate ebook chat product needed?

**No.** PeBL communication for ebooks is covered by two surfaces already in the reader:

| Need | Surface | Why it is enough |
|------|---------|------------------|
| Class / peer discussion | **Discuss** rail (chapter micro-forum) | Multi-user, class-scoped threads; PeBL Discussion xAPI; offline post buffer |
| Expert / tutor Q&A | **Ask Vidura** drawer | AI coach with SME citations; PeBL chat xAPI (`channel=coach`) |

A third standalone IM/chat app inside EPUB packaging is **out of scope** for EdVidura SaaS. Full PeBL Services / EPUB toolchain remains optional enterprise depth, not a sheet blocker.

## What ships

| Surface | Behavior |
|---------|----------|
| Manuals reader `/manuals/{id}` | TOC + focus deep-links + signed standalone read |
| Class assignment | `/manuals` lists manuals linked to the LTI class (`class_manuals`) |
| **Discuss** rail | Per-chapter multi-user micro-forum (class-scoped via LTI `context_id`) |
| Offline buffer | Posts queued in `localStorage` when offline; flush on reconnect (`client_id` dedupe) |
| Ask Vidura drawer | Same right-side coach; ebook title/section prepended to questions |
| xAPI | In-book posts → `interacted` with PeBL Discussion fields (`channel=pebl_ebook`) |

## Domain

`app.modules.pebl` — `list_messages`, `post_message`, `chapter_counts`, `get_or_create_thread`

Tables (RLS): `pebl_threads`, `pebl_messages` — see `db/migration_pebl_discussions.sql`.  
Class links: `db/migration_class_manuals.sql`.

## API

| Method | Path | Notes |
|--------|------|-------|
| GET | `/manuals/{id}/discussions?chapter=&token=` | Thread messages |
| POST | `/manuals/{id}/discussions` | JSON: `chapter_slug`, `body`, optional `parent_id`, `client_id` |

## How to demo

1. Seed welding pack: `python scripts/seed_content_pack_welding.py`
2. Apply migrations (includes PeBL + class_manuals)
3. Student launch → **Manual** → open Welding fundamentals
4. Use the **Discuss** rail — post on a chapter; open as another student in the same class to reply
5. Go offline (DevTools) → post → come online → post syncs
6. Open **Ask Vidura** for AI answers grounded on approved sources

## Explicitly out of scope (not WIP)

- Full PeBL Services auth + websocket stack inside an EPUB package
- EPUB packaging / CFI highlights as first-class xAPI
- True offline LRS Tier-2 store-and-forward beyond the discussion outbox
- A separate chat product competing with Discuss + Ask Vidura

Chat xAPI alignment: [PEBL_XAPI_CHAT.md](PEBL_XAPI_CHAT.md).

## Related

- [EBOOK.md](EBOOK.md) · [CONTENT_PACKS.md](CONTENT_PACKS.md) · [XAPI.md](XAPI.md)
