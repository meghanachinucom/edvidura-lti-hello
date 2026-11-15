# Build queue (in-house park → thin → live)

Source of truth: `app/modules/tenancy/blocks.py` (`_QUEUE` + `_TRACK`).
Sales desk: `/sales` · API: `GET /api/admin/blocks`.

## In-house queue

**Empty.** All in-house shippable blocks are **Live**. Remaining catalog = partner / content / research (Park).

## Done Live

### Wave A

| Id | Surface |
|----|---------|
| `audit_pro` | Diagnostics → AuditPro · trail + verify |
| `iq_review_pattern` | Diagnostics → IQ review |
| `skills_passport` | My plan → Skills Passport |
| `document_search` | Manuals search |
| `private_air_gapped_ai` | `/api/v1/app/airgap-pack` |

Preset: `wave_a_pack`.

### Wave B

| Id | Surface |
|----|---------|
| `xr_store` | Nav **XR Labs** · curated catalog (runtimes per deal) |
| `asset_repo_3d` | `/api/v1/app/xr/assets` |
| `asset_configurator_3d` | `/api/v1/app/xr/configurator` |
| `immersive_labs` | `/api/v1/app/xr/labs` |
| `ar_assistance` | `/api/v1/app/xr/ar` |
| `vr_maintainer_training` | `/api/v1/app/xr/vr-maintainer` |

Preset: `wave_b_xr`. Module: `app.modules.xr`.

### Wave C

| Id | Surface |
|----|---------|
| `apprenticeship_manager` | My plan → **Apprentice** (empty board; `examples=1` staff seed) |
| `qualification_continuity_tracker` | My plan → **Continuity** |
| `sim_to_real_analytics` | Diagnostics → **Sim→Real** |

Preset: `wave_c_workforce`. Module: `app.modules.workforce`.

## Still not Live (other tracks)

| Track | Examples |
|-------|----------|
| partner | `virtual_classroom` (LMS Core is Live via Moodle attach) |
| content | `bits_math`, `train_the_trainer` |
| research / park | `atoms`, `coda`, `a_pro`, `pwe`, `grants_pro` |

## March 2027 path

Package partner/content/research when funded. All 38 sellable ≠ every Park built in-house — Thin is cleared on the in-house ship set.
