# PeBL Technical Specification ↔ EdVidura xAPI (chat / discussion)

Source: `PeBL Technical Specification.docx` (Communication tracking + Discussion Extension).

**Product status: complete for Study Coach Discussion tracking.**

## Spec requirements

| PeBL rule | Requirement | EdVidura |
|-----------|-------------|----------|
| Communication tracking | All IM/chat sent/delivered **shall** be captured as xAPI | Each Study Coach turn → `interacted` |
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

- Study coach → **Recent coach xAPI** + **View coach activity**
- Activity → filter **Coach chat** (`?channel=coach`)
- Integrations page shows PeBL full-text mode

## Still out of scope vs full PeBL ebook

- In-book Discussion HTML extension / EPUB packaging  
- Offline local LRS buffer for ebook Tier 2  
- Highlights/bookmarks CFIs as xAPI  
- True multi-user threaded forum UI  

See also: [XAPI.md](XAPI.md), [EBOOK.md](EBOOK.md), [MICRO_LEARNING.md](MICRO_LEARNING.md).
