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
| **Overall product (today)** | **TRL 6–7** | In-house ship set Live; production LTI + SPA |
| Core classroom + Waves A–C | **TRL 6–7** | Catalog Live; XR runtimes / roster DB still deepen per deal |
| Park / research / content packs | **TRL 2–4** | Concept → lab prototype |
| **Target by March 2027** | **TRL 7** overall on sell set | No Park left on the customer sheet |

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
| **Live** | **30** | In-house shippable set (Thin cleared) |
| **Thin** | **0** | — |
| **Shippable (Live)** | **30** | Ready to sell on `/sales` |
| **Partner** | **1** | `virtual_classroom` (attach, not in-house build) |
| **Park** | **7** | Content / research / GrantsPro |
| In-house build queue | **0** | Waves A–C + earlier Thin → Live |

### Live (30)
Spine + classroom + Wave A/B/C + earlier Thin (TLA, micro-learning, lessons, manuals, EvalPro, ChatPro, Knowledge Pro, XR catalog, workforce boards, …).

### Still Park (7)
`train_the_trainer`, `bits_math`, `grants_pro`, `atoms`, `coda`, `a_pro`, `pwe`  
(+ partner attach: `virtual_classroom`)

---

## What’s completed (platform)

- Classroom product live: lessons, quiz, Ask Vidura, handbooks, progress, teacher EvalPro / diagnostics  
- Lego packaging (Steps 1–3): 38-block catalog, presets, sales desk  
- Waves A–C + SPA; motion page `/product/motion`  
- Adaptive interactive labs MVP  
- **BE harden (Nov):** lab packs, airgap, AuditPro, search, rate limits, security headers  
- **Thin → Live (Nov):** Wave A verify + empty states; Wave B curated XR catalog (input sanitize, fail-closed SPA); Wave C empty boards (`examples=1` staff seed only); earlier Thin promoted  
- Production: https://edvidura-app-production.up.railway.app  

---

## What’s next (to March — remaining 8)

| When | Focus |
|------|--------|
| **Nov–Dec** | Research briefs (ATOMS/CODA/A-Pro/PWE); content pack templates; deepen XR runtime / workforce DB per deal |
| **Jan–Feb** | Partner packaging (Virtual Classroom attach); GrantsPro MVP; BITS MATH / Train-the-Trainer packs |
| **March** | **Freeze · all 38 sellable** — no Park left on the customer sheet |

---

## One-line for leadership

EdVidura is **TRL 6–7** (target **TRL 7** by March), TLA **CMM-2 achieved / CMM-3 operating**. **30 of 38** blocks are **Live** and sellable; Thin cleared on the in-house set. Remaining **8** are partner/content/research — due sellable by **March 2027**.

---

**Related:** [LEGO_BLOCKS_PLAN.md](LEGO_BLOCKS_PLAN.md) · [BLOCKS_QUEUE.md](BLOCKS_QUEUE.md) · [SALES_ONE_PAGER.html](SALES_ONE_PAGER.html) · [TLA.md](TLA.md)
