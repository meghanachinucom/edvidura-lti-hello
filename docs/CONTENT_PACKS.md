# Content packs

Optional curriculum bundles loaded per **client tenant** on the same EdVidura app.

## Same app, three demo clients

| Client | Tenant | Segment | Content |
|--------|--------|---------|---------|
| **Riverside** | existing Class 8 school (`TENANT_A`) | `school` | Class path, lessons, quiz — **not** Chaganti |
| **AP Chaganti pravachanalu** | `ap-chaganti` | `government` | Public video library, Telugu-first, **no Moodle**, no exams |
| **Welding L&D** | `welding-corp` | `corporate` | Video library + welding handbook; no exams |

Schools are not one blob: Riverside ≠ Telugu Chaganti. Each client gets its own `segment`, capabilities, pack, and language prefs.

## School vs corporate defaults

| Segment | Default product shape |
|---------|------------------------|
| `school` | Lessons, manuals, graded quiz / AGS, ghost coach gate |
| `corporate` | Video library + Ask Vidura; lessons / exams off (manuals optional per client) |

Onboard and `POST /admin/tenants` accept `segment`. Override with `PATCH /admin/tenants/{id}/segment`.

## Welding fundamentals

Original demo teaching text (not AWS copyrighted pubs). Used on **corporate** `welding-corp`; can also be seeded onto a school via `seed_content_pack_welding.py` (Riverside) if you want weld on Class 8.

```powershell
python scripts/seed_content_pack_welding.py
```

## Chaganti pravachanalu (AP government — not a school)

Public Telugu-first video library on tenant `ap-chaganti` (`segment=government`). No Moodle, no Class 8, no quiz. Demo clips until the department licences official streams.

```powershell
python scripts/apply_migrations.py
python scripts/seed_ap_chaganti.py
```

Local launch (no Moodle):

```
http://127.0.0.1:8000/dev/client-launch?slug=ap-chaganti&role=student&key=YOUR_ADMIN_API_KEY
```

## Seed for testing

```powershell
python scripts/apply_migrations.py
python scripts/seed_segment_and_manual_locales.py
```

- Riverside → school, en-IN, no Chaganti attached by this script  
- `telugu-chaganti` → school, AP/te-IN, Chaganti pack  
- `welding-corp` → corporate, welding handbook + reel  

### Test without Moodle (local)

Admin-gated session mint (disabled on staging/production):

```
http://127.0.0.1:8000/dev/client-launch?slug=telugu-chaganti&role=student&key=YOUR_ADMIN_API_KEY
http://127.0.0.1:8000/dev/client-launch?slug=welding-corp&role=student&key=YOUR_ADMIN_API_KEY
```

Opens `/launch-hub` with that tenant’s segment + manuals. Use `&role=teacher` for instructor chrome.

## Next packs

| Pack | Client | Blocker |
|------|--------|---------|
| AWS Handbooks / Standards KG | TBD | License + graph |
| Chaganti Gaari full media | Telugu schools | Media + SME |
| EV curriculum | client-specific | Source from client |

## Related

- [EBOOK.md](EBOOK.md) / [PEBL_LITE.md](PEBL_LITE.md)
- [SME.md](SME.md)
