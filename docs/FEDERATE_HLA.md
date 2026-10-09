# Federate xAPI / HLA (next — simulation track)

**Status:** planned after core school LTI product. Not required for Moodle quiz / Ask Vidura / micro-reels.

## What it is

[Federate xAPI](https://www.yetanalytics.com/federatexapi) (Yet Analytics, open source) is an **HLA federate** that turns High Level Architecture simulation activity into **xAPI statements** and can forward them to an LRS (including Yet **SQL LRS**).

EdVidura already **produces** xAPI from the learning app. Federate **produces** xAPI from **simulations**. Same LRS / TLA story, different source.

## When we add it

After a client (or pilot) needs **sim/HLA** training alongside Moodle:

```
HLA federation (RTI + FOMs)
        │
        ▼
 Federate xAPI  ──xAPI──►  Yet SQL LRS  ◄──forward──  EdVidura app
                                │
                                ▼
                     Owner Metabase / ops analytics
                     (optional: EdVidura Activity ingest)
```

## Design rules (when implementing)

1. **Keep SoR clear** — EdVidura Postgres remains SoR for *in-app* learning; sim statements may live primarily in Yet/LRS, with optional import into `xapi_statements` if we need in-app Activity.
2. **No HLA inside FastAPI** — Federate runs as its own process next to the RTI; EdVidura only consumes xAPI (or links out to sim launch).
3. **Tenant mapping** — map HLA federation / exercise id → `tenant_id` (and optionally class) before any EdVidura UI shows sim events.
4. **Filter early** — use Federate’s event filters so only instructional outcomes enter the LRS (not raw tick spam).
5. **Air-gap** — Federate + SQL LRS + EdVidura all on LAN; same topology as [DEPLOYMENT_TOPOLOGIES.md](DEPLOYMENT_TOPOLOGIES.md).

## Suggested build slices

| Slice | Deliverable |
|-------|-------------|
| **S0** | Spike: Federate → Yet SQL LRS with a sample FOM; document env |
| **S1** | Ops: show “sim statements” count / last exercise on `/ops` |
| **S2** | Optional: pull filtered sim verbs into EdVidura Activity (tenant RLS) |
| **S3** | Teacher: “Sim exercise” link from class (external HLA client / launcher) |

## Out of scope until then

- Bundling Federate into `edvidura-app` image  
- Changing school Analytics to depend on HLA  
- Replacing Moodle LTI with sim launch  

## Related

- [YET_LRS_METABASE.md](YET_LRS_METABASE.md) — SQL LRS we already use  
- [XAPI.md](XAPI.md) — EdVidura statement pipeline  
- [TLA.md](TLA.md) — TLA alignment  
- Upstream: https://www.yetanalytics.com/federatexapi  
