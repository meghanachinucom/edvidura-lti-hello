# Deep Linking (LTI Advantage)

Teachers can add a **specific** EdVidura item into a Moodle course without a generic “open tool” button.

## Flow

1. In Moodle External tool, enable **Deep linking** (Content selection).
2. From a course, **Add activity → External tool → Select content**.
3. Moodle launches EdVidura with `LtiDeepLinkingRequest`.
4. EdVidura shows `/lti/deep-link` picker (home, quiz, lesson, manual).
5. Choosing an item returns an `LtiDeepLinkingResponse` JWT form to Moodle.

## App routes

| Route | Purpose |
|-------|---------|
| `GET /lti/deep-link` | Picker UI (after DL launch) |
| `POST /lti/deep-link/submit` | Build Deep Link response |

Resource links open with `target=window` (new window), matching the existing LTI launch model.

## Moodle notes

- Tool URL / redirect still point at `/lti/launch` (same as resource launches).
- Deep Linking is detected on launch (`message_launch.is_deep_link_launch()`).
- Ensure the tool supports Content-Item / Deep Linking in the Moodle tool configuration.
