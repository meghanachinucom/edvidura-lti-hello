<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- EdVidura is a UI prototype: all data from typed modules in src/data, all copy in src/i18n/en.json via t(); no network, no browser storage — per the brief.
- Signed-in pages live under the pathless `_shell` layout (top bar + footer); operator pages under `ops` with a minimal layout — keeps the shell off internal screens.
- Role is in-memory React context (RoleContext); the role switcher exists only in the Account menu's "Prototype only" section and must never ship.
- Colours only via src/styles/tokens.css variables mapped in src/styles.css; fonts self-hosted in public/fonts.
- Shared UI parts live in src/components/shared and are reused, never recreated; the review gallery at /__prototype/components shows each one in every state.
- Screen states (loading, empty, error, slow, session expired) are switched by editing src/data/mockState.ts — no browser storage allowed.
- Breakpoints: mobile up to 639px, tablet: 640–1279px, desktop: 1280px+ (Tailwind `tablet:` / `desktop:` variants).
- Learning pre-work and role-transition rules live in typed mock data; checklists keep state locally and reset later steps when an earlier step is unchecked, so readiness cannot survive an incomplete sequence.
- Shared chart and percentage indicators use semantic SVG/CSS gradients and a first-view hook, so animations run once and respect live reduced-motion settings.
- Circuit formulas and fault settings and reader explanation matching live in typed data modules; components own transient state so no learning interaction requires persistence or a service.
- Reader speech is invoked only in browser effects/events and cancelled on chapter changes and unmount; stale utterance callbacks cannot change a later listening session.
- Starter chips share one component backed by coachShortcuts and translated labels, so the page and side panel cannot diverge.
