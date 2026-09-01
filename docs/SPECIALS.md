# Product specials (out-of-box)

Implemented in `app.modules.specials` and wired into the Shiko shell.

| # | Feature | Where |
|---|---------|--------|
| 1 | Grade with receipts | Sealed HMAC evidence card + download/verify |
| 2 | Wrong-answer teleport | Missed items link to lessons/manuals |
| 3 | Quiet class radar | Class results — item fail rates (no leaderboard) |
| 4 | Launch fingerprint | Strip under navbar |
| 5 | Two-window contract | Home banner: Moodle gradebook vs EdVidura story |
| 6 | Retry with memory | `/quiz?retry={attempt_id}` — missed items only |
| 7 | School time capsule | `/teacher/time-capsule.json` (+ Teach menu) |
| 8 | Ghost coach | Gates quiz if lessons incomplete (`force=1` bypass) |
| 9 | Practice lane | `/quiz?practice=1` — no Moodle AGS |
| 10 | Tenant theme | Accent derived from tenant+course |
| 11 | Incident button | Account menu → `POST /incident` |
| 12 | Skill stickers | Sparse badges on result (path / pass / sync) |

## Uniqueness bets (next wave)

| Feature | Where |
|---------|--------|
| Competency map | Result page (per attempt) + Class results (aggregated) |
| Manual ⟷ quiz loop | Miss → version-pinned `/manuals/{id}?v=&focus=` → practice → graded retry |
| At-risk coach (rules) | Class results: repeat fails, latest &lt;40%, incomplete path |

Manual focus slugs match `##` headings rendered as `<h2 id="…">` (e.g. `## Gradebook sync` → `gradebook-sync`).

Migration: `db/migration_specials.sql` (`support_incidents`).
