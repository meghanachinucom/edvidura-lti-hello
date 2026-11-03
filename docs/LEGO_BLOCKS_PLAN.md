# EdVidura Lego blocks — plan (do not lose)

**Purpose:** Complete every Component as a sellable block; each client gets only what they buy. Same app binary; pull / merge / enable per tenant.

**Related:** [BLOCKS.md](BLOCKS.md) (catalog ops), [MODULES.md](MODULES.md), `app/modules/tenancy/blocks.py`, `app/modules/tenancy/capabilities.py`, [CONTENT_PACKS.md](CONTENT_PACKS.md).

**Last updated:** 2026-11-03

---

## Commercial model

| Layer | Role |
|-------|------|
| **Spine** (always on) | LTI launch, tenancy/RLS, Moodle = gradebook of record |
| **Sellable blocks** | Named Components from the product sheet (~38) |
| **Content packs** | Curriculum fill (Class 8, welding, Chaganti…) — *not* feature blocks |

- Keep **all** block names in a catalog.
- **Ready in catalog ≠ ready to demo.**
- States: `live` | `thin` | `partner` | `park`.
- Only `live` / `thin` unlock UI/API. `partner` / `park` can be quoted or recorded on a deal but must not fake-ship.
- Deals = pick N blocks (4 / 5 / 6 / 8 or custom) → merge → tenant capabilities → nav/API gates.

```text
Catalog → merge_blocks(ids) → tenant.capabilities + enabled_blocks → SPA / App API
```

---

## Goal

1. Every sheet Component is a selectable block with an honest state.
2. Any client mix can be enabled without forking the codebase.
3. Park/Partner items are systematically un-parked (or left as partner) until the full sellable shelf is real.

---

## Step-by-step (what to do)

### Step 1 — Freeze the catalog (this week)

1. Put all ~38 sheet names in code (`app/modules/tenancy/blocks.py`) with:
   - stable `id`, display `name`, `state`, `cap_keys`, `depends_on`
2. Map each to existing modules / capability keys / “not built”.
3. Implement `merge_blocks(segment, block_ids)` + named presets:
   - `classroom_starter_4`
   - `school_standard_5`
   - `school_pro_6`
   - `adaptive_pro_8`
4. Persist `enabled_blocks` on the tenant; derive/write `capabilities` for backward compatibility.
5. Admin: list catalog + enable blocks (or preset) per tenant.
6. SPA/API: hide anything not enabled; default-deny missing caps.

**Outcome:** Sales can compose any Live/Thin mix; Park is listed honestly.

### Step 2 — Sell what’s already real (this month)

7. Sell **Classroom Starter / Standard / Pro** from Live + Thin only.
8. Harden Thin surfaces:
   - PLE / Progress
   - Skills Passport (thin → clearer learner view)
   - Teacher Analytics / EvalPro surface
   - Manuals / e-Book (reader + class link)
   - Micro-Learning / DCT path
9. One sales one-pager: **Available now (Live/Thin)** vs **Roadmap (Park/Partner)**.

**Outcome:** Revenue and proof of the Lego model while Park stays on the shelf as roadmap.

### Step 3 — Rank the Park list (same week as Step 1)

10. Split every Park/Partner name into:
    - **Must build in-house**
    - **Partner forever** (example: Virtual Classroom → Moodle / BBB)
    - **Content only** (example: BITS MATH curricula)
11. Order **Must build** by: paid demand → demo value → technical dependency (e.g. 3D repo before XR labs).

**Outcome:** A build queue, not an undifferentiated 18-month fog.

### Step 4 — Un-park in waves (quarters)

12. **Wave A:** Skills Passport deep, Eval/Audit thin→live, Document Search, Air-gap pack.
13. **Wave B:** XR Store → Immersive Labs → 3D assets (only if deals need XR).
14. **Wave C:** Apprenticeship, Qualification & Continuity Tracker, Sim-to-Real, GrantsPro — only with funded scope.
15. After each wave: flip `park → thin → live`, update sales “available now.”

**Out of band / partner:** Virtual Classroom, heavy XR hardware pipelines, Grants/Audit as full enterprise suites unless a deal funds them.

### Step 5 — Operating rhythm (ongoing)

16. New deal → pick block IDs → merge on tenant → demo **that** set only.
17. Client asks for Park → quote timeline or partner; do not demo as done.
18. Do not start a Park build with no buyer unless it blocks Wave A.

---

## What’s Live / Thin vs Park (starting point)

### Ready to pull now (Live + Thin)

Spine (LTI + tenancy), LMS Core via Moodle, LTI Integration, Assessment Tool, Micro-Learning (thin), TLA (thin), Data Ingestion (thin), Competency Generation (thin), PLE, Analytics Dashboard, AI Content Generator (thin), Lesson Builder (thin), e-Book / Manuals (thin), Ask Vidura / SMP Chatbot, Document Search (thin), Air-gapped topology (thin), Knowledge Pro AI (thin), Skills Passport (thin), EvalPro (thin), ChatPro (thin).

**Safe merges:** Assessment + Ask Vidura + Handbooks + Lessons + PLE/Progress + Teacher analytics + Skills/TLA/Micro-Learning.

### Do not treat as shippable until un-parked

Virtual Classroom, Train the Trainer, PWE, ATOMS, A-Pro, 3D Asset Repository, 3D Asset Configurator, CODA, AR Assistance, VR Maintainer Training, XR Store, Immersive Labs, BITS MATH (content), AuditPro, GrantsPro, IQ review pattern, Sim-to-Real Transfer Analytics, Apprenticeship Manager, Qualification & Continuity Tracker.

---

## Effort reality check (all Park → Live)

| Bucket | Effort (order of magnitude) |
|--------|-------------------------------|
| Harden Live/Thin | 2–4 weeks |
| Medium (XR thin, search, air-gap pack, passport deep) | 3–5 months |
| Heavy / unclear in-house products | 6–12+ months |
| Full sheet to true Live in-house | ~9–18 months — or never if large items stay Partner |

Cutting “must be in-house” vs “partner forever” can compress “all sellable” to ~4–6 months of *our* build.

---

## Next build (engineering) — do now

1. **`app/modules/tenancy/blocks.py`** — full catalog + states + deps + presets + `merge_blocks` + tests.
2. **Tenant `enabled_blocks`** — migration + db create/update.
3. **Admin API** — `GET /admin/blocks`, `PATCH /admin/tenants/{id}/blocks` (list or preset).
4. **SPA gates** — [`frontend/src/nav.ts`](../frontend/src/nav.ts): default-deny; hide park screens.
5. **`docs/BLOCKS.md`** — sales↔engineering matrix (ids, states, cap keys).
6. Update [MODULES.md](MODULES.md) / `app/modules/README.md`.

**Explicitly not this build:** XR Store product, 3D/AR/VR, Virtual Classroom, GrantsPro, Apprenticeship, ATOMS/CODA/A-Pro implementations.

### Done when (Step 1)

- Catalog lists all sheet Components with honest states.
- Admin can apply any block list or preset → tenant updated.
- Learner/teacher SPA matches enabled Live/Thin set.
- Presets 4/5/6/8 work without per-client code changes.
- Park picks are recorded + warned, not silently shown as finished.

---

## Suggested presets (not limits)

| Preset | Blocks (concept) |
|--------|------------------|
| Classroom Starter (4) | Spine + Assessment + Ask Vidura + Handbooks |
| School Standard (5) | Starter + PLE / Progress |
| School Pro (6) | Standard + Teacher Analytics |
| Adaptive Pro (8) | Pro + Skills/Competency + TLA + Micro-Learning |

Any other combination is a custom merge of catalog IDs.

---

## Do now vs do not now

| Do now | Do not now |
|--------|------------|
| Step 1 catalog + merge + gates | Build all 38 to Live in parallel |
| Step 3 Park ranking (in-house / partner / content) | Demo Park as finished |
| Step 2 sell Live/Thin SKUs | XR / Grants / Apprenticeship / Virtual Classroom builds without a buyer |

**Step 1 status (2026-11-03):** implemented — `blocks.py`, `merge_blocks`, `enabled_blocks` migration, `GET/PATCH /admin/.../blocks`, SPA nav gates, [BLOCKS.md](BLOCKS.md). Next: Step 3 Park ranking + Step 2 sell Live/Thin.
