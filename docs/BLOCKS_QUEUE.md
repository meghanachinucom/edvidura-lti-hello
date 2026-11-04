# Build queue (in-house park → thin → live)

Source of truth: `app/modules/tenancy/blocks.py` (`_QUEUE` + `_TRACK`).
Sales desk: `/sales` · API: `GET /api/admin/blocks`.

## In-house queue

**Empty.** Waves A–C are Thin. Remaining catalog items are partner / content / research.

## Done Thin

### Wave A

| Id | Surface |
|----|---------|
| `audit_pro` | Diagnostics → AuditPro · `/api/v1/app/audit-pro` |
| `iq_review_pattern` | Diagnostics → IQ review · `/api/v1/app/iq-review` |
| `skills_passport` | My plan → Skills Passport · `/api/v1/app/skills-passport` |
| `document_search` | Manuals search · `/api/v1/app/document-search` |
| `private_air_gapped_ai` | `/api/v1/app/airgap-pack` |

Preset: `wave_a_pack`.

### Wave B

| Id | Surface |
|----|---------|
| `xr_store` | Nav **XR Labs** · `/api/v1/app/xr/store` |
| `asset_repo_3d` | `/api/v1/app/xr/assets` |
| `asset_configurator_3d` | `/api/v1/app/xr/configurator` |
| `immersive_labs` | `/api/v1/app/xr/labs` |
| `ar_assistance` | `/api/v1/app/xr/ar` |
| `vr_maintainer_training` | `/api/v1/app/xr/vr-maintainer` |

Preset: `wave_b_xr`. Module: `app.modules.xr`.

### Wave C

| Id | Surface |
|----|---------|
| `apprenticeship_manager` | My plan → **Apprentice** · `/api/v1/app/workforce/apprenticeship` |
| `qualification_continuity_tracker` | My plan → **Continuity** · `/api/v1/app/workforce/continuity` |
| `sim_to_real_analytics` | Diagnostics → **Sim→Real** · `/api/v1/app/workforce/sim-to-real` |

Preset: `wave_c_workforce`. Module: `app.modules.workforce`.

## Still not Thin (other tracks)

| Track | Examples |
|-------|----------|
| partner | `lms_core`, `virtual_classroom`, `grants_pro` |
| content | `bits_math`, `train_the_trainer` |
| research | `atoms`, `coda`, `a_pro`, `pwe` |

## March 2027 path

Harden Thin → Live per deal; package partner/research when funded. All 38 sellable ≠ all Live — Thin + clear labels count.
