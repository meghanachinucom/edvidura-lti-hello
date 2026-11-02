# EdVidura — Batch 0 (shell and shared pieces)

UI prototype with mock data only. No backend, no network calls, no browser storage.

## What gets built
- **Design tokens** exactly as specified (page-bg, surface, ink, accent, border-control, focus-ring and the rest). 4px corners on surfaces, 6px on buttons. One warm accent, used only for focus, the active menu item and the main action.
- **Fonts** Outfit and Syne downloaded once and stored inside the app, with system and Noto fallbacks. No Google Fonts link.
- **Top bar** with the "EdVidura" wordmark, the menu groups Learn / Teach / Institute shown by role (a Training Officer never sees Learn or Teach), and an Account menu showing the name, role label, "Back to Moodle" (does nothing) and, at the end, a "Prototype only" section with the Prototype role switcher.
- **Mobile menu** below 980px: one "Menu" button opens a full-height panel that keeps keyboard focus inside and closes on Escape.
- **Footer** "EdVidura · Prototype".
- **Accessibility basics**: skip link, a single main heading per page, focus moves to that heading on page change, page title "<heading> · EdVidura", 44px touch targets, visible focus ring.
- **Every route in the table** gets a placeholder page with its heading only, so navigation works. Operator pages (/ops/login, /ops/dashboard) use a minimal layout without the shell. /__prototype/access is included.
- **Shared helpers**: a `t("key")` text helper reading `src/i18n/en.json`, IST date formatting ("Today, 10:42 IST"), and a typed mock world (institute, classes, people) in `src/data/`.

## Technical details
- Routing deviation: this platform uses TanStack Router, not react-router-dom. Every path stays exactly as listed; `:id` segments become `$lessonId` style files with identical URLs.
- Role lives in React context in memory only (resets on reload, since storage is forbidden). Switching navigates to the role home: Learner /lessons, Instructor /teacher/attempts, Training Officer /school-admin.
- Tokens in `src/styles/tokens.css`, imported by `src/styles.css` and mapped to Tailwind utilities.
- Small tests for role-to-menu visibility and IST formatting.
- Stop after Batch 0.
