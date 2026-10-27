# PeBL Technical Specification ↔ EdVidura xAPI (chat / discussion)

Source: `PeBL Technical Specification.docx` (Communication tracking + Discussion Extension).

**Product status: complete for Ask Vidura Discussion tracking.**

## Spec requirements

| PeBL rule | Requirement | EdVidura |
|-----------|-------------|----------|
| Communication tracking | All IM/chat sent/delivered **shall** be captured as xAPI | Each Ask Vidura turn → `interacted` |
| Discussion data | User ID, Timestamp, **Thread ID**, **Access level**, **Text of the message** | All captured (full text default) |
| Ask an Expert | Message content **may** be collected | Default on; opt out with `COACH_XAPI_FULL_TEXT=0` |
| LRS path | Server may use xAPI as a chat/protocol workflow | Local store + optional Yet forward |
| Offline | Local buffer then sync (ebook Tier 2) | Out of scope for ebook; coach is online LTI |

## Implementation

`app.modules.xapi.builder.build_coach_interacted_statement` + `record_coach_interaction`.

| PeBL field | Implementation |
|------------|----------------|
| User ID | LTI actor `account.name` = LMS subject |
| Timestamp | Statement `timestamp` |
| Thread ID | Session `coach_thread_id` → extension + activity IRI |
| Access level | `COACH_XAPI_ACCESS_LEVEL` (default `class`) |
| Message text | Full text by default (`COACH_XAPI_FULL_TEXT` defaults **on**) |

```env
COACH_XAPI_FULL_TEXT=0          # opt out of full message text (preview + hash only)
COACH_XAPI_ACCESS_LEVEL=class   # or team / all
```

## Where to see it

- Ask Vidura → **Recent Ask Vidura xAPI** + **View Ask Vidura activity**
- Activity → filter **Coach chat** (`?channel=coach`)
- Integrations page shows PeBL full-text mode

## In-book PeBL discussion (shipped)

Chapter micro-forums on `/manuals/{id}` post via `record_pebl_discussion` → channel `pebl_ebook`.  
Offline: browser outbox (`pebl_discussion.js`) syncs when online. Activity filter: `?channel=pebl`.

## Decision: separate ebook chat?

**Not required.** In-book **Discuss** (class) + **Ask Vidura** (AI) satisfy PeBL communication tracking for ebooks. See [PEBL_LITE.md](PEBL_LITE.md).

## Explicitly out of scope vs full PeBL ebook

- EPUB packaging / PeBL Services websocket stack  
- Highlights/bookmarks CFIs as xAPI  
- Full offline LRS Tier-2 (beyond discussion outbox)
- A third standalone chat product inside the reader

See also: [XAPI.md](XAPI.md), [EBOOK.md](EBOOK.md), [PEBL_LITE.md](PEBL_LITE.md), [MICRO_LEARNING.md](MICRO_LEARNING.md).
