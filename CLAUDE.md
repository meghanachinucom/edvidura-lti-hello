# CLAUDE.md — EdVidura Engineering & Coding Agent Instructions

## Andrej Karpathy Coding Agent Skills (from `multica-ai/andrej-karpathy-skills`)

1. **Think Before Coding**
   - State assumptions explicitly before writing code.
   - Surface tradeoffs and edge cases upfront; never guess silently.
   - Clarify ambiguity instead of making speculative implementation leaps.

2. **Simplicity First**
   - Implement the minimum code that solves the problem cleanly.
   - Avoid speculative abstractions, premature generalizations, and dead features.
   - Keep data flows transparent, direct, and verifiable.

3. **Surgical Changes**
   - Touch only the files and functions required for the specific task.
   - Preserve existing working code, contracts, and UI format patterns.
   - Clean up only your own temporary artifacts or orphans—never wipe working features.

4. **Goal-Driven Execution**
   - Define clear, verifiable acceptance criteria for every task.
   - Run synchronous verification and tests (`vitest`, `pytest`, `tsc`) before declaring completion.
   - Ensure `Exit Code: 0` on every build and test suite.

---

## EdVidura Frontend Lock Rule (STRICT SINGLE-FRONTEND)

- **ALL UI screens must be built inside `frontend-react/src/` using `AppShell`, `TopNav`, `PageHeading`, and existing component patterns.**
- **Never create parallel frontend folders, alternate themes, or raw HTML/Jinja templates for application screens.**
- All backend endpoints and features must directly bind into the existing `frontend-react/` TanStack Router pages and components.
- Canonical cloud review entry point: `https://edvidura-deployment.vercel.app/review`.
