# AI Rules

## Tech stack
- The app is EdVidura, a UI prototype built with React 19 and TypeScript.
- TanStack Start runs the app; TanStack Router provides file-based routing, with route files in `src/routes/` and the generated route tree in `src/routeTree.gen.ts`.
- Vite is the development and build tool; Tailwind CSS 4 is integrated through Vite.
- shadcn/ui-style components are in `src/components/ui/`, built on Radix primitives.
- TanStack Query is available for server-state patterns, but this prototype currently uses local typed data instead.
- React Hook Form and Zod are available for form state and schema validation.
- Recharts is available for charts; Lucide React is the icon library.
- Vitest, Testing Library, and jsdom are used for tests; ESLint and Prettier are used for code quality and formatting.
- App styling uses design tokens and self-hosted Noto fonts; responsive breakpoints are mobile <640px, tablet 640–1279px, desktop ≥1280px.

## Library and implementation rules
- **Routing:** Use TanStack Router. Add routes as files in `src/routes/`; do not introduce React Router or edit `src/routeTree.gen.ts` by hand. Keep signed-in screens under `_shell`; operator screens use the `ops` layout.
- **UI primitives:** Prefer existing components from `src/components/ui/` (shadcn/ui + Radix) for accessible controls, dialogs, menus, tabs, and overlays. Do not modify generated/prebuilt UI files to change their behavior; compose or add app-specific components instead.
- **Shared app UI:** Reuse components from `src/components/shared/`; do not duplicate their patterns. Add reusable app components under `src/components/` and page/route-specific UI alongside the relevant route when appropriate.
- **Styling:** Use Tailwind utilities for layout and responsive styling. Use color and theme variables defined in `src/styles/tokens.css` through the existing styles setup; do not hardcode new palette values or load external fonts.
- **Icons:** Use `lucide-react`; avoid adding another icon library.
- **Charts:** Use Recharts when a chart needs a charting library. For small/simple indicators, prefer existing shared chart or percentage components.
- **Forms and validation:** Use React Hook Form for involved forms and Zod for input schemas; simple inputs can use local React state without adding form abstractions.
- **Data and persistence:** This is a UI prototype: define sample data in typed modules under `src/data/`, keep all user-facing copy in `src/i18n/en.json` and render it through the existing `t()` helpers. Do not add network calls, browser storage, or persistence services unless the product requirements explicitly change.
- **State:** Keep transient interaction state in React components/context. Screen-state demos are driven by `src/data/mockState.ts`; do not use browser storage.
- **Tests:** Use Vitest and Testing Library for behavior and routing tests. Keep tests in `src/test/` and follow existing setup and conventions.
- **Dependencies:** Prefer existing packages and components. Do not add a dependency when the installed stack already supports the feature.
