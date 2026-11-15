# EdVidura — Internal status & timeframe

**Audience:** Internal team (sales, product, leadership)  
**Updated:** 16 Nov 2026  
**Hard deadline:** **March 2027**  
**Target:** **All 38 product blocks built and sellable by March**  
**HTML share copy:** [INTERNAL_STATUS_TIMEFRAME.html](INTERNAL_STATUS_TIMEFRAME.html)

Same app for every client. We turn feature **blocks** on per deal (Lego model). Moodle (or peer LMS) stays the gradebook of record.

---

## Maturity levels

### TRL — Technology Readiness Level (1 → 9)

| Scope | Level | Notes |
|-------|------:|-------|
| **Overall product (today)** | **TRL 6** | Prototype in operational environment — live LTI + SPA + Railway production |
| Core classroom (LTI, quiz, AGS, Ask Vidura, manuals) | **TRL 6–7** | Battle-tested path; harden toward 7 |
| Waves A–C Thin (Audit, XR, workforce, …) | **TRL 5–6** | Demoable Thin; not full Live ops yet |
| Park / research / content packs | **TRL 2–4** | Concept → lab prototype |
| **Target by March 2027** | **TRL 7** overall on sell set | Every block at least demo-ready **Thin or Live** |

### TLA — Total Learning Architecture (CMM 1 → 4)

| Metric | Today | March target |
|--------|-------|----------------|
| **Achieved CMM** | **CMM-2** | Hold + deepen |
| **Operating CMM** | **CMM-3** | Hold **CMM-3**; competency / evidence deeper with 38-block finish |
| CMM-4 (federation) | Optional | Not blocking March |

Live check: `GET /api/v1/tla/maturity` (admin key). Module: `app.modules.tla`. Docs: [TLA.md](TLA.md).

---

## Block completion (catalog = 38)

| State | Count | Meaning |
|-------|------:|---------|
| **Live** | **6** | Production-strong |
| **Thin** | **24** | Sellable / demoable |
| **Shippable (Live+Thin)** | **30** | Ready to sell on `/sales` |
| **Partner** | **1** | `virtual_classroom` (attach, not in-house build) |
| **Park** | **7** | Not yet Thin (research / content / GrantsPro) |
| In-house build queue | **0** | Waves A–C done |

### Live (6)
`lms_core`, `lti_integration`, `assessment_tool`, `ple`, `analytics_dashboard`, `smp_chatbot`

### Thin highlights (24) — includes Waves A–C
- **Earlier thin:** TLA, micro-learning, data ingestion, competency, AI content, lesson builder, e-book, EvalPro, ChatPro, Knowledge Pro, …
- **Wave A:** AuditPro, IQ review, Skills Passport, Document Search, air-gap pack  
- **Wave B:** XR Store, 3D assets, configurator, Immersive Labs, AR, VR maintainer  
- **Wave C:** Apprenticeship, Qualification continuity, Sim-to-Real  

### Still Park (7)
`train_the_trainer`, `bits_math`, `grants_pro`, `atoms`, `coda`, `a_pro`, `pwe`  
(+ partner attach: `virtual_classroom`)

---

## What’s completed (platform)

- Classroom product live: lessons, quiz, Ask Vidura, handbooks, progress, teacher EvalPro / diagnostics  
- Lego packaging (Steps 1–3): 38-block catalog, presets (`wave_a_pack`, `wave_b_xr`, `wave_c_workforce`, …), sales desk  
- Waves A–C Thin + SPA surfaces; motion page `/product/motion`  
- Adaptive interactive labs MVP (school-owned textbook → lab pack → textbook \| playground)  
- **BE harden (Nov):** lab pack allowlist + draft-only save; airgap/env leak cut; AuditPro seal strip; document-search excerpts; Wave A–C / labs / XR rate limits; security headers  
- Production: https://edvidura-app-production.up.railway.app  

---

## What’s next (to March — remaining 8)

| When | Focus |
|------|--------|
| **Nov–Dec** | Harden Thin → Live per deal; research briefs (ATOMS/CODA/A-Pro/PWE); content pack templates |
| **Jan–Feb** | Partner packaging (Virtual Classroom attach); GrantsPro MVP; BITS MATH / Train-the-Trainer packs |
| **March** | **Freeze · harden · all 38 sellable** — no Park left on the customer sheet |

---

## One-line for leadership

EdVidura is **TRL 6** (target **TRL 7** by March), TLA **CMM-2 achieved / CMM-3 operating**. **30 of 38** blocks are Live or Thin and sellable now; in-house Waves A–C are done. Remaining **8** are partner/content/research — due sellable by **March 2027**.

---

**Related:** [LEGO_BLOCKS_PLAN.md](LEGO_BLOCKS_PLAN.md) · [BLOCKS_QUEUE.md](BLOCKS_QUEUE.md) · [SALES_ONE_PAGER.html](SALES_ONE_PAGER.html) · [TLA.md](TLA.md)
