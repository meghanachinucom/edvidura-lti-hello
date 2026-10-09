# Deployment topologies — cloud, hybrid, air‑gapped

EdVidura is designed so **Moodle owns people/grades** and EdVidura owns learning paths.
The same app binary can run in three topologies by **turning optional outbound services on or off**.

This is the product stance for client RFPs. Implementation status is marked per component.

## Topology comparison

| | **Cloud** | **Hybrid** | **Air‑gapped** |
|--|-----------|------------|----------------|
| **Where the app runs** | Managed host (e.g. Railway) | Customer VPC / on‑prem + optional cloud AI/BI | Customer LAN only; no internet |
| **Moodle** | Cloud or customer | Usually on‑prem / VPC | On‑prem |
| **Postgres** | Managed or sidecar | Customer DB | Local Postgres |
| **Learner AI** | OpenAI / Anthropic | Cloud AI *or* local HTTP | Local LLM (Ollama/vLLM) or heuristics |
| **Jev decisions** | Optional TypeSafe cloud | Optional | **Off** (heuristics) unless vendor ships offline binary |
| **xAPI SoR** | EdVidura Postgres | Same | Same (always local to app DB) |
| **Yet LRS** | Optional cloud | Optional cloud or on‑prem Yet | On‑prem Yet **or omit** |
| **Metabase** | Optional cloud (owners) | Optional cloud or on‑prem | On‑prem Metabase **or omit** |
| **Keycloak ops** | Optional | Optional | On‑prem Keycloak **or** `ADMIN_API_KEY` only |
| **Updates / images** | Pull from registry | Customer-controlled registry | Offline image + migration bundle |

## 1. Completely cloud-based (supported today)

**Reference:** current Railway stack (`edvidura-app`, Postgres, optional Moodle, Yet, Metabase).

```
Browser / Moodle ──HTTPS──► EdVidura (cloud)
                              │
                              ├── Postgres (managed)
                              ├── OpenAI / Anthropic (optional)
                              ├── Yet LRS (optional)
                              └── Metabase (optional, owners @ /ops)
```

**Env pattern:** `ENVIRONMENT=production`, `APP_BASE_URL=https://…`, cloud AI keys, optional `XAPI_LRS_*` / `METABASE_*`.

**Fit:** SaaS pilots, multi-school, fast onboard.

## 2. Hybrid — server + cloud (supported with config)

Customer keeps **data plane** (app + DB + Moodle) on their network; selected **control/AI/BI** services may call the public internet.

### Common hybrid patterns

| Pattern | On‑prem / VPC | Cloud |
|---------|---------------|-------|
| **A — Data on‑prem, AI in cloud** | EdVidura + Postgres + Moodle | OpenAI / Anthropic only |
| **B — Data on‑prem, BI in cloud** | App + DB + Moodle | Metabase and/or Yet (egress for xAPI forward) |
| **C — Split LMS** | Moodle on‑prem | EdVidura cloud (LTI over internet; tight firewall rules) |

**Requirements for hybrid**

- Explicit allow‑list egress (AI API, optional LRS, optional Metabase).
- No dependency on cloud for **core** quiz / progress / AGS if AI and LRS are down (heuristics + local xAPI store already fall back).
- Secrets stay in customer vault; never bake keys into images.

**Fit:** Banks / gov that allow controlled egress for AI but keep learner PII in‑country.

## 3. Completely air‑gapped (architecturally ready; packaging to harden)

**Definition:** no outbound internet from the EdVidura host (or entire training LAN) at runtime.

### What already works offline

| Capability | How |
|------------|-----|
| LTI 1.3 + AGS + NRPS | Talks only to customer Moodle |
| Quiz, lessons, progress, tenant RLS | Local Postgres |
| xAPI store | Local `xapi_statements` (SoR) |
| Ask Vidura / AI tools | `AI_PROVIDER=local_http` → Ollama/vLLM **or** built‑in heuristics when AI off |
| Owner analytics | In‑app Analytics / Activity; optional **local** Metabase |
| Ops login | `ADMIN_API_KEY` (no Keycloak) or local Keycloak |

### What must be disabled or replaced in air‑gap

| Service | Air‑gap action |
|---------|----------------|
| OpenAI / Anthropic | Unset keys; use `local_http` or heuristics |
| Jev (`TYPESAFE_API_KEY`) | `JEV_ENABLED=0` |
| Cloud Yet / Metabase | Omit **or** run images on LAN (`db` compose profiles `lrs` / `bi`) |
| Railway / public DNS | Private DNS + internal `APP_BASE_URL` |
| Browser TTS/STT (coach voice) | May need offline speech stack or disable voice |
| Dynreg “fetch Moodle from internet” | N/A — Moodle is local |
| Image pulls / `pip install` | Pre‑load container + wheelhouse / vendor deps |

### Target air‑gap stack (Docker Compose style)

```
[Air-gapped LAN]
  Moodle ◄──LTI──► EdVidura ◄──► Postgres
                      │
                      ├── Local AI (Ollama)      optional
                      ├── Yet SQL LRS            optional
                      └── Metabase               optional (owners)
```

Ship as: signed images + `db/migration_*.sql` bundle + `config.example.env` air‑gap profile + offline model weights (if local AI).

### Gaps to close for a hardened air‑gap SKU

1. **Documented compose profile** `airgap` (app + db + moodle + optional ollama/metabase/yet) with no external URLs.
2. **Egress kill‑switch** — boot assert: refuse start if `AIRGAP=1` and any cloud endpoint/key is set.
3. **Offline install kit** — image tarballs, dependency freeze, migration runner, smoke checklist.
4. **Update channel** — USB/sneakernet or customer registry mirror (not live `railway up`).
5. **Jev** — keep optional; do not require for core product in air‑gap.
6. **License / model** — customer supplies approved LLM weights; EdVidura only talks OpenAI‑compatible HTTP on LAN.

## Decision guide for clients

| Client need | Recommend |
|-------------|-----------|
| Fast multi‑tenant SaaS | **Cloud** |
| PII in‑country, AI allowed via egress | **Hybrid A** |
| No internet on training floor | **Air‑gapped** (+ local AI if they need strong coach quality) |
| Cloud EdVidura, campus Moodle | **Hybrid C** (LTI over controlled links) |

## Config cheat‑sheet

```env
# --- Air-gap core ---
ENVIRONMENT=production
APP_BASE_URL=https://edvidura.internal
AI_ENABLED=1
AI_PROVIDER=local_http
LOCAL_AI_BASE_URL=http://ollama.internal:11434/v1
LOCAL_AI_MODEL=llama3.2
JEV_ENABLED=0
# leave OPENAI_*, ANTHROPIC_*, TYPESAFE_* unset
# XAPI_LRS_* only if Yet is on the same LAN
# METABASE_* only if Metabase is on the same LAN

# --- Hybrid (data local, AI cloud) ---
AI_PROVIDER=anthropic   # or openai
# XAPI_LRS / METABASE still optional local or cloud

# --- Full cloud ---
# current Railway vars; AI + optional Yet + Metabase
```

## Related docs

- [AI.md](AI.md) — providers including `local_http`
- [YET_LRS_METABASE.md](YET_LRS_METABASE.md) — optional BI / LRS
- [RAILWAY.md](RAILWAY.md) — cloud reference deploy
- [ARCHITECTURE.md](ARCHITECTURE.md) — module layout
- [JEV.md](JEV.md) — optional decision layer (cloud today)
