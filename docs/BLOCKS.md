# Sellable Lego blocks

Sales sheet Components ↔ runtime gates. Plan: [LEGO_BLOCKS_PLAN.md](LEGO_BLOCKS_PLAN.md).  
Park ranking (Step 3): [BLOCKS_QUEUE.md](BLOCKS_QUEUE.md).

**Code:** `app/modules/tenancy/blocks.py`  
**Gates:** `tenants.capabilities` via `CAP_KEYS`  
**Selection:** `tenants.enabled_blocks` (JSON id list)

## Rules

- Catalog lists **all** sheet names (`live` | `thin` | `partner` | `park`).
- Only **live/thin** flip capability flags (and thus SPA/API).
- **partner/park** may be stored on a deal (`enabled_blocks`) but appear in `unavailable` / warnings — no fake UI.
- Each block has a **track** (`shipped` | `in_house` | `partner` | `content` | `research`) and optional **queue** (in-house build order).
- Merge: `merge_blocks(segment, block_ids | preset=…)` → capabilities + enabled_blocks.
- Admin: `GET /admin/blocks` (includes `build_queue`), `PATCH /admin/tenants/{id}/blocks`.

## Presets

| Preset id | Intent |
|-----------|--------|
| `classroom_starter_4` | Assessment + Ask Vidura + e-Book (+ spine) |
| `school_standard_5` | + PLE |
| `school_pro_6` | + Analytics / EvalPro |
| `adaptive_pro_8` | + Skills / TLA / Micro-Learning / ingestion / Wave A Audit+IQ+search |
| `wave_a_pack` | Skills Passport + AuditPro + IQ review + Document Search + air-gap |
| `wave_b_xr` | XR Store + 3D assets + Immersive Labs + AR + VR Maintainer |
| `wave_c_workforce` | Skills Passport + Apprenticeship + Continuity + Sim-to-Real (+ XR/Eval) |

Any custom `blocks: [...]` list is also valid.

## Sales desk (UI)

Human UI for reps: **[/sales](/sales)** — unlock with `ADMIN_API_KEY`, pick/create client, rename, select blocks or preset, **Sell this pack**.

Printable sheet: **[/sales/one-pager](/sales/one-pager)** ([SALES_ONE_PAGER.html](SALES_ONE_PAGER.html)) — Available now (Live/Thin) vs Roadmap (Park/Partner) + SKU presets.

## Admin examples

```http
GET /admin/blocks
X-Admin-Key: …

PATCH /admin/tenants/{uuid}/name
X-Admin-Key: …
{"name": "Riverside High"}

PATCH /admin/tenants/{uuid}/blocks
X-Admin-Key: …
{"preset": "school_pro_6"}

PATCH /admin/tenants/{uuid}/blocks
{"blocks": ["assessment_tool", "smp_chatbot", "ebook_creator", "xr_store"]}
```

`xr_store` is Wave B **thin** — enables the `xr_store` capability when included. Parked blocks (e.g. Wave C apprenticeship) still appear under `unavailable`.

## Migration

`db/migration_tenant_enabled_blocks.sql` (via `scripts/apply_migrations.py`).
