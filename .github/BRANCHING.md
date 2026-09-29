# GitHub branching architecture

Goal: every capability lives on its own branch so a bad change can be isolated, reverted, or continued without undoing unrelated work.

## Long-lived branches

| Branch | Purpose |
|--------|---------|
| `main` | Always deployable. Production baseline. Protect with PR reviews. |
| Feature / fix branches | Short-lived. One job each. Deleted after merge. |

Do **not** develop directly on `main`.

## Branch naming

```
feat/<area>-<short-slug>     new capability
fix/<area>-<short-slug>      bug fix
chore/<area>-<short-slug>    docs, tooling, palette, bootstrap
hotfix/<short-slug>          urgent production fix from main
docs/<short-slug>            documentation only
```

**Area** should match a folder or module when possible:

| Area | Typical paths |
|------|----------------|
| `ops` | `app/ops_routes.py`, `templates/ops_*.html` |
| `quiz` | `app/modules/quiz/`, quiz templates |
| `tutor` / `ask-vidura` | `app/modules/ai_tutor/`, drawer templates/JS |
| `analytics` / `metabase` | `app/modules/analytics/`, Metabase scripts |
| `jev` | `app/modules/jev/` |
| `xapi` | `app/modules/xapi/` |
| `shell` / `ui` | `templates/`, `app/static/css/` |

Examples:

- `feat/ops-owner-console`
- `feat/metabase-owner-overview`
- `feat/ask-vidura-drawer`
- `fix/quiz-sample-size`
- `chore/coolors-palette`

## Workflow (happy path)

```bash
git checkout main
git pull origin main
git checkout -b feat/ops-owner-console

# …commit only files for this feature…

git push -u origin HEAD
gh pr create --base main --title "feat: ops owner console" --body "…"
```

Merge via GitHub PR → delete remote branch → locally:

```bash
git checkout main
git pull
git branch -d feat/ops-owner-console
```

## When something breaks

| Situation | Action |
|-----------|--------|
| Bad PR already merged to `main` | Revert that PR on GitHub (creates a clean undo commit) |
| Bad commits only on a feature branch | Fix forward on the branch, or abandon the branch and restart from `main` |
| Need yesterday’s good deploy | Redeploy last known-good `main` commit; do not force-push `main` |
| Mixed local WIP (many features) | Split into separate branches with `git stash` / careful checkouts — don’t dump everything into one PR |

## One PR = one job

A PR should not mix unrelated areas (e.g. Metabase + quiz + palette). Smaller PRs keep rollback and review safe.

## File architecture pointer

Repo folder layout and module rules: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).
