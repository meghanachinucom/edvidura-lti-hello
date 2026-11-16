# EdVidura Master Frontend Design System & Change Propagation Architecture

**Authoritative Design Reference:** `origin/feature/frontend` (`2fb135f8d342b0ec516435906706f42a03c56c99`)  
**Workspace:** `frontend-react/`  
**Standard Status:** Canonical, Permanent Architectural Reference  
**Audience:** Frontend Engineers, Full-Stack Contributors, QA Engineers

---

## 1. Architectural Intent & Scope

This specification is the single canonical source of truth for the EdVidura user interface. It defines design tokens, typography rules, layout geometry, shared UI primitives, application shell structures, change propagation workflows, and styling boundaries between React SPA and FastAPI/Jinja templates.

The purpose of this architecture is to ensure that any design change—whether a brand palette update, a button redesign, a new typography scale, or a revised responsive navigation—can be implemented centrally and propagated reliably across all existing, newly integrated, and future application screens without manual, page-by-page styling adjustments.

---

## 2. Authoritative Source Locations

The design system is structured across the repository without competing configurations:

| Layer | Repository-Relative Path | Responsibility |
|---|---|---|
| **Design Tokens** | `frontend-react/src/styles/tokens.css` | Raw CSS Custom Properties (`:root`) defining colors, shadows, and breakpoints. |
| **Typography & Fonts** | `frontend-react/src/styles/fonts.css` | Self-hosted web fonts for Maven Pro and Indian multi-script Noto fallbacks. |
| **Tailwind v4 Theme Engine** | `frontend-react/src/styles.css` | `@theme inline` mapping tokens to utility classes, base layer rules, and component utilities. |
| **Type-Safe Design Registry** | `frontend-react/src/lib/designSystem.ts` | Centralized TypeScript constants (`DESIGN_TOKENS`, `DESIGN_PRESETS`) for autocomplete and presets. |
| **UI Primitives** | `frontend-react/src/components/ui/` | Headless, accessible primitives (Buttons, Cards, Dialogs, Tables, Form Controls). |
| **Domain-Shared Components** | `frontend-react/src/components/shared/` | Higher-level educational components (`PageHeading`, `DataTable`, `StatusBanner`, `EmptyState`, `HeroBand`). |
| **Application Shell Layout** | `frontend-react/src/components/shell/AppShell.tsx` | Master shell layout containing `TopNav`, skip-link, role navigation, and footer. |
| **Role & Session Context** | `frontend-react/src/components/shell/RoleContext.tsx` | Reactive auth state provider managing session tokens, roles, and Moodle LMS return paths. |

---

## 3. Typography and Font Fallback Rules

EdVidura is built for vocational trainees across Indian National Skills Qualification Framework (NSQF) courses. The typography system guarantees legibility for both English and Indian regional languages:

1. **Primary Sans-Serif Font Family:**
   `"Maven Pro", "Noto Sans Devanagari", "Noto Sans Telugu", "Noto Sans Tamil", "Noto Sans Kannada", "Noto Sans", Arial, sans-serif`
2. **Heading Font Family:**
   `"Maven Pro", "Noto Sans Devanagari", "Noto Sans Telugu", "Noto Sans Tamil", "Noto Sans Kannada", "Noto Sans", Arial, sans-serif`
3. **Monospace Font Family:**
   `ui-monospace, monospace`
4. **Font Loading Architecture (`frontend-react/src/styles/fonts.css`):**
   - `@fontsource/maven-pro` (Weights: 400, 500, 600, 700, 800) self-hosted in `public/fonts/`.
   - Dedicated unicode range subsets for Devanagari (`U+0900-097F`), Telugu (`U+0C00-0C7F`), Tamil (`U+0B82-0BFA`), and Kannada (`U+0C80-0CF2`).
5. **Section Numbering Convention:**
   - Headings inside `main section h2` automatically receive numbered prefixes (`01`, `02`, `03`) generated via CSS counter increments styled with `var(--accent)` (`#C2410C`) and tabular figures (`font-variant-numeric: tabular-nums`).

---

## 4. Colour Palette & Semantic Token Definitions

All color values are defined as CSS variables in `frontend-react/src/styles/tokens.css` and bound to Tailwind utilities in `frontend-react/src/styles.css`:

### 4.1 Primary Brand & Surface Tokens
- `--secondary: #0F6E6E;` (Deep Forest Teal – Brand Identity, Primary Action outlines, Sidebar Active state)
- `--primary: #0F6E6E;` (Primary Brand Teal Alias)
- `--button-main: #E8B04B;` (Warm Gold / Ochre – Primary CTA interactive fill)
- `--page-bg: #FBF8F3;` (Warm Paper Tone – Minimizes eye fatigue on low-cost displays)
- `--surface: #FFFFFF;` (Card, Sheet, and Modal background)
- `--surface-raised: #FFFFFF;` (Elevated Popover / Dialog background)
- `--topbar: #17313A;` (Deep Slate Navy – Topbar, Bottom Drawer, Tooltip background)
- `--selected: #D5ECEA;` (Soft Teal Tint – Active selection, Filter chip pressed state)

### 4.2 Inks & Contrast Tokens
- `--ink: #1B2A30;` (Dark Charcoal Slate – Body text, High contrast headers)
- `--ink-muted: #5E6E75;` (Muted Slate – Metadata, subtitles, helper text)
- `--accent-ink: #17313A;` (Dark Slate Navy – Text on primary gold buttons)

### 4.3 Borders & Form Controls
- `--border: #E2DCD2;` (Subtle boundary for cards and dividers)
- `--border-control: #7A8A90;` (Meets WCAG 2.1 AA 3:1 contrast ratio for unselected form inputs)

### 4.4 Semantic Accents & Status
- `--accent: #C2410C;` (Warm Terracotta / Coral – Counter prefixes, badges, accent icons)
- `--metric: #C2410C;` (KPI figure value highlight)
- `--highlight: #F6E7B8;` (Soft ochre highlight)
- `--success: #2E7D4F;` (Forest Green – Success banners, verified receipts, passing scores)
- `--warning: #B42318;` (Crimson Warning – Low score alerts, breaker trip states)
- `--error: #B42318;` (Validation errors, API failure notifications)
- `--focus-ring: #0F6E6E;` (3px accessible focus ring with 2px offset)

---

## 5. Spacing, Radii, Shadows and Responsive Breakpoints

### 5.1 Geometry & Dimensions
- `max-w-content`: `960px` (Enforces maximum page width for optimal visual scanning)
- `max-w-reading`: `68ch` (Restricts paragraph length to prevent line-tracking fatigue)
- `rounded-surface`: `12px` (`--radius-surface` – Applied to cards, dialogs, and hero containers)
- `rounded-control`: `8px` (`--radius-control` – Applied to buttons, inputs, selects, and chips)
- Minimum Tap Target: `min-height: 44px` (`min-h-11`) enforced universally across `button`, `input`, `select`, `textarea`, and `a`.

### 5.2 Elevation & Shadows
- **Cards & Surfaces:**
  `box-shadow: 0 1px 2px rgba(27, 42, 48, 0.06), 0 6px 16px rgba(27, 42, 48, 0.08);`
  Hover state elevates to:
  `box-shadow: 0 2px 4px rgba(27, 42, 48, 0.08), 0 12px 28px rgba(27, 42, 48, 0.12);`
- **Primary CTA Buttons:**
  `box-shadow: 0 2px 6px rgba(23, 49, 58, 0.12);`

### 5.3 Responsive Breakpoints
- **Mobile:** `0px` to `639px` (Single column, collapsible navigation drawer, data tables render as mobile cards).
- **Tablet (`tablet:`):** `640px` to `1279px` (Sidebar collapses to 72px icon rail, content grid expands to 8 columns, data tables render full HTML tables).
- **Desktop (`desktop:`):** `1280px+` (Full 240px expanded navigation sidebar with user profile, content grid expands to 12 columns).

---

## 6. Shared UI Components and Responsibilities

All screens must reuse the established component library:

### 6.1 Primitives (`frontend-react/src/components/ui/`)
1. **`Button` (`button.tsx`)**:
   - `variant="edviduraPrimary"`: Gold interactive CTA (`.btn-primary`).
   - `variant="edviduraSecondary"`: Teal outline action (`.btn-secondary`).
   - `variant="destructive"`: Deletion / reset actions.
   - `size="edvidura"`: Guarantees accessible 44px touch targets.
2. **`Card` (`card.tsx`)**:
   - Default styling: `rounded-surface border border-border bg-surface text-ink shadow-sm`.
   - Composable with `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
3. **`Input` & `Textarea` (`input.tsx`, `textarea.tsx`)**:
   - Centralized `border-input`, `text-foreground`, `focus-visible:ring-ring`.
4. **`Dialog` & `AlertDialog` (`dialog.tsx`, `alert-dialog.tsx`)**:
   - Accessible modal wrappers with focus traps and backdrop blur.

### 6.2 Domain Shared Components (`frontend-react/src/components/shared/`)
1. **`PageHeading` (`PageHeading.tsx`)**:
   - Primary page `<h1>`. Displays page title, optional subtitle context, blueprint grid container, and title rule. Automatically updates `document.title` and handles route-change focus.
2. **`DataTable` (`DataTable.tsx`)**:
   - Generic typed data table. Renders full HTML table on tablets and desktops, while automatically transforming rows into labeled cards on mobile displays (`<640px`).
3. **`StatusBanner` (`StatusBanner.tsx`)**:
   - Standard inline feedback banner supporting `success`, `warning`, `error`, and `info` variants.
4. **`EmptyState` (`EmptyState.tsx`)**:
   - Reusable placeholder container with illustration, prompt, and call-to-action button slot.
5. **`ErrorAlert` (`ErrorAlert.tsx`)**:
   - Accessible error container with built-in retry action.
6. **`LoadingSkeleton` (`LoadingSkeleton.tsx`)**:
   - Multi-row animated shimmer loader. Automatically turns off animation when `prefers-reduced-motion` is detected.
7. **`PillTabs` (`PillTabs.tsx`)**:
   - Horizontal tab switcher with accessible arrow-key navigation.
8. **`HeroBand` (`HeroBand.tsx`)**:
   - Gradient header banner with blueprint pattern and KPI statistics.
9. **`ConfirmDialog` (`ConfirmDialog.tsx`)**:
   - Standard confirmation modal for destructive or permanent user operations.
10. **`AITrustNote` (`AITrustNote.tsx`)**:
    - Transparency badge explaining AI generation provenance and source lesson excerpts to teachers and learners.

---

## 7. Application Shell, Navigation and Role Layouts

### 7.1 Shell Container (`frontend-react/src/components/shell/AppShell.tsx`)
The `AppShell` component wraps all protected routes under the TanStack Router layout (`/_shell`):
- **Routing Engine:** TanStack Router (`@tanstack/react-router`, `@tanstack/router-plugin/vite`) with 55 file-based route modules in `src/routes/`.
- **Skip Link:** Injects accessible `#main` skip link for screen readers and keyboard navigation.
- **TopNav / Sidebar:** Mounts fixed sidebar with responsive layout offsets:
  - Mobile: Fullscreen sliding drawer.
  - Tablet: Left-padded by `72px` (`tablet:pl-[72px]`).
  - Desktop: Left-padded by `240px` (`desktop:pl-60`).
- **Synchronous Role Access Control:** Evaluates `RoleContext` and `allowedFor(role, pathname)` synchronously during rendering. If an unauthorized role attempts to access a protected route (e.g., learner accessing `/teacher/*` or `/school-admin/*`), `AppShell` synchronously renders `<AccessUnavailable />` rather than `<Outlet />`, preventing component mounting, unauthorized data fetching, or UI flash, and cleanly navigates the user.
- **Session Expiry:** Detects expired sessions and renders `<SessionExpired />`.
- **AskVidura Floating Assistant:** Automatically available only for learner accounts on authorized pages.
- **Footer:** Standard institutional footer.

### 7.2 Navigation Architecture (`frontend-react/src/components/shared/TopNav.tsx`)
- Navigation items are partitioned strictly by role in `frontend-react/src/data/nav.ts`:
  - **Learner:** Lessons, Quizzes, Study Coach, Flashcards, Micro-Learning, Gap Plan, Manuals, Activity, Analytics.
  - **Instructor:** Teacher Attempts, Content Authoring, AI Hub, Coach Insights, Skills, SME Review, DCT.
  - **Training Officer / Admin:** School Admin Hub, Teachers, Classes, Students, Institute Analytics, Institutions Directory.
- Provides persistent **"Back to Moodle"** and **"Sign Out"** actions resolving to `session.lmsReturnUrl`.

### 7.3 Platform Operator Layout Boundary (`frontend-react/src/routes/ops.tsx`)
EdVidura defines four distinct user roles. While the three institutional roles (Learner, Instructor, Training Officer / Admin) operate within the LTI tenant context under `AppShell`, the **Platform Operator** role operates within an isolated administrative boundary:
- **Dedicated Route Tree:** Rooted at `/ops` (`ops.tsx`), housing `/ops/login` and `/ops/dashboard` (`ops.dashboard.tsx`).
- **Minimal Administrative Shell:** Rendered without consumer LMS shell chrome, student floating tools (AskVidura), or mobile bottom tab bars. Features a focused top header bar, skip link, and full-width administrative viewport.
- **Authentication & Authorization:** Authenticated via operator session / credentials (`admin_auth.py`), distinct from LTI 1.3 launch tokens.
- **Operator Responsibilities:** Multi-tenant registry management, tenant provisioning, institution linking, platform LTI key configuration, service health telemetry, outbox event monitoring, and database migration verification.

---

## 8. Global Change Propagation Architecture

Global styling changes must propagate through the central hierarchy without requiring page-by-page edits:

| Target Design Change | Change Location | Mechanism of Propagation |
|---|---|---|
| **Palette / Theme Colors** | `src/styles/tokens.css` | Modifying CSS custom properties (`--secondary`, `--button-main`, `--page-bg`) updates `@theme inline` and reflects across all 55 React screens immediately. *(Note: Jinja templates maintain independent styling and must be updated in server templates if matching is required).* |
| **Primary CTA Button Style** | `src/styles.css` (`@utility btn-primary`) | Updating `.btn-primary` updates all primary buttons rendered across the product. |
| **Secondary Button Style** | `src/styles.css` (`@utility btn-secondary`) | Updating `.btn-secondary` updates all secondary buttons and action triggers. |
| **Card Drop Shadows & Borders** | `src/styles.css` (`.bg-surface.border`) & `src/components/ui/card.tsx` | Updating the rule or component propagates to all cards, sections, and dialog surfaces. |
| **Typography Family or Scale** | `src/styles/fonts.css` & `src/styles.css` | Updating `@import` or `--font-sans` changes body, heading, and table typography simultaneously. |
| **Form Inputs & Focus Rings** | `src/styles.css` (`@layer base`) & `src/components/ui/input.tsx` | Modifying base input rules adjusts focus ring offsets and borders across all forms. |
| **Navigation Layout** | `src/components/shared/TopNav.tsx` & `src/routes/ops.tsx` | Changes to sidebar behavior or menu items apply to all four user roles (Learner, Instructor, and Training Officer through `AppShell`/`TopNav`, and Platform Operator through `OpsLayout`). |
| **Responsive Grid Columns** | `src/styles.css` (`.studio-grid`) | Adjusting grid column spans modifies layouts across all multi-column authoring tools. |

---

## 9. Rules for Authoring New Screens and Features

Every new screen added to EdVidura must follow these implementation standards:

1. **Use Token Classes Only:** Never write inline hex colors (e.g., `style={{ color: '#0F6E6E' }}`). Use `text-secondary`, `bg-surface`, `text-ink`, `border-border`, or `bg-page-bg`.
2. **Standard Buttons:** Use `<Button variant="edviduraPrimary">`, `<Button variant="edviduraSecondary">`, or classes `btn-primary`, `btn-secondary`.
3. **Card Containers:** Use `<Card>` or `className={DESIGN_PRESETS.card}`.
4. **Page Headers:** Always mount `<PageHeading text="..." />` as the top-level H1.
5. **Touch Target Accessibility:** All form controls, select dropdowns, and button targets must have at least `min-h-11` (`44px`).
6. **Multi-Column Alignment:** Use `className="studio-grid"` for split layout workflows.
7. **Isolate Feature Logic:** Page files should focus on data fetching, state management, and user interaction, delegating all presentation to shared components and design presets.

---

## 10. React SPA and FastAPI/Jinja Styling Boundaries

### 10.1 The Architecture Boundary
EdVidura contains two distinct rendering environments:
1. **The Modern React SPA (`frontend-react/`):** Bundled by Vite using Tailwind v4. Renders all 55 client-side interactive routes.
2. **Server-Rendered Jinja Templates (`app/shell_routes.py` -> `templates/*.html`):** Rendered directly by FastAPI on the server (e.g., `/learn/coach`, `/teacher/ai`, `/learner-analytics`).

### 10.2 Independent Token Scopes
CSS custom properties declared in `frontend-react/src/styles/tokens.css` are bundled into the Vite SPA artifact and do **not** automatically inject into server-rendered Jinja templates. Jinja templates utilize their own inline styles and server-side stylesheets.

### 10.3 Visual Consistency Strategy
1. **Cross-Navigation Links:** Every React screen providing a corresponding server workflow includes a standardized link (e.g., `"Open Server AI Hub (Jinja)"`), allowing seamless navigation between SPA and server views.
2. **Shared Palette Synchronization:** Colors used in Jinja templates (such as `#0F6E6E` for teal headers, `#17313A` for dark banners, and `#E8B04B` for gold highlights) are aligned with `tokens.css`.
3. **Future Unified Asset Strategy:** When the enterprise migration is scheduled, a shared CSS bundle (`edvidura-tokens.css`) can be served from FastAPI static files and imported by both Jinja layout headers and the Vite entry point. For the current phase, backend files remain completely untouched to preserve system stability.
