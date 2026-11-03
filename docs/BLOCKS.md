# Sellable Lego blocks

Sales sheet Components ↔ runtime gates. Plan: [LEGO_BLOCKS_PLAN.md](LEGO_BLOCKS_PLAN.md).

**Code:** `app/modules/tenancy/blocks.py`  
**Gates:** `tenants.capabilities` via `CAP_KEYS`  
**Selection:** `tenants.enabled_blocks` (JSON id list)

## Rules

- Catalog lists **all** sheet names (`live` | `thin` | `partner` | `park`).
- Only **live/thin** flip capability flags (and thus SPA/API).
- **partner/park** may be stored on a deal (`enabled_blocks`) but appear in `unavailable` / warnings — no fake UI.
- Merge: `merge_blocks(segment, block_ids | preset=…)` → capabilities + enabled_blocks.
- Admin: `GET /admin/blocks`, `PATCH /admin/tenants/{id}/blocks`.

## Presets

| Preset id | Intent |
|-----------|--------|
| `classroom_starter_4` | Assessment + Ask Vidura + e-Book (+ spine) |
| `school_standard_5` | + PLE |
| `school_pro_6` | + Analytics / EvalPro |
| `adaptive_pro_8` | + Skills / TLA / Micro-Learning / ingestion |

Any custom `blocks: [...]` list is also valid.

## Admin examples

```http
GET /admin/blocks
X-Admin-Key: …

PATCH /admin/tenants/{uuid}/blocks
X-Admin-Key: …
{"preset": "school_pro_6"}

PATCH /admin/tenants/{uuid}/blocks
{"blocks": ["assessment_tool", "smp_chatbot", "ebook_creator", "xr_store"]}
```

Second call records `xr_store` as unavailable (park) while enabling assessment + coach + manuals.

## Migration

`db/migration_tenant_enabled_blocks.sql` (via `scripts/apply_migrations.py`).
