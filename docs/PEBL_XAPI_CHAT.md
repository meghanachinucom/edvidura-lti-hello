# PeBL Technical Specification ↔ EdVidura xAPI (chat / discussion)

Source: `PeBL Technical Specification.docx` (Communication tracking + Discussion Extension).

## Spec requirements

| PeBL rule | Requirement |
|-----------|-------------|
| Communication tracking | All IM/chat sent/delivered **shall** be captured as xAPI |
| Discussion data | User ID, Timestamp, **Thread ID**, **Access level**, **Text of the message** |
| Ask an Expert | Message content **may** be collected |
| LRS path | Server may use xAPI as a chat/protocol workflow |
| Offline | Local buffer then sync (ebook Tier 2) |

## EdVidura Study Coach mapping

Implemented in `app.modules.xapi.builder.build_coach_interacted_statement`.

| PeBL field | Implementation |
|------------|----------------|
| User ID | LTI actor `account.name` = LMS subject |
| Timestamp | Statement `timestamp` |
| Thread ID | Session `coach_thread_id` → extension + activity IRI |
| Access level | `COACH_XAPI_ACCESS_LEVEL` (default `class`) |
| Message text | Always: preview ≤120 + hash. Full text when `COACH_XAPI_FULL_TEXT=1` |

```env
COACH_XAPI_FULL_TEXT=1          # PeBL Discussion parity
COACH_XAPI_ACCESS_LEVEL=class   # or team / all
```

Default remains privacy-light (Ask-an-Expert “may” style). Enable full text for PeBL compliance demos.

## Still out of scope vs full PeBL ebook

- In-book Discussion HTML extension / EPUB packaging  
- Offline local LRS buffer for coach  
- Highlights/bookmarks CFIs as xAPI  
- True multi-user threaded forum UI  

See also: [XAPI.md](XAPI.md), [EBOOK.md](EBOOK.md).
