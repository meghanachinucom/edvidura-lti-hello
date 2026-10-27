# Air-gap install pack (complete)

EdVidura supports **cloud**, **hybrid**, and **fully air-gapped** topologies.
This pack is the air-gap ship kit; hybrid/cloud are documented in
[DEPLOYMENT_TOPOLOGIES.md](DEPLOYMENT_TOPOLOGIES.md).

For clients that forbid outbound internet on the training LAN.

## What you ship

| Artifact | Path |
|----------|------|
| Compose | `deploy/airgap/docker-compose.yml` |
| Env template | `deploy/airgap/env.airgap.example` |
| Migrations | `db/migration_*.sql` + `scripts/apply_migrations.py` |
| Topology story | [DEPLOYMENT_TOPOLOGIES.md](DEPLOYMENT_TOPOLOGIES.md) |

## Connected machine (build once)

```powershell
docker build -t edvidura-app:airgap .
docker pull postgres:16-alpine
# optional: docker pull ollama/ollama:latest
docker save edvidura-app:airgap postgres:16-alpine -o edvidura-airgap-images.tar
```

Copy the tarball + this repo’s `deploy/airgap`, `db`, `scripts` onto USB / customer registry.

## Air-gapped LAN

```powershell
docker load -i edvidura-airgap-images.tar
cd deploy/airgap
copy env.airgap.example env.airgap
# edit SESSION_SECRET, ADMIN_API_KEY, APP_BASE_URL, LTI PEM
docker compose --env-file env.airgap up -d
```

Smoke:

1. `GET http://<host>:8000/health` → `ok` / `db_ok`
2. Register Moodle LTI against that base URL (Accept grades = Yes)
3. Student quiz → result Moodle status → **Synced** (or clear error)
4. With `AIRGAP=1`, boot **fails** if OpenAI/Anthropic/Jev cloud keys are set

## Roles

| Role | Notes |
|------|-------|
| First boot | Compose may use Postgres owner; then run `db/ensure_app_role.sql` and switch `DATABASE_URL` to `edvidura_app` |
| AI | `AI_PROVIDER=local_http` + Ollama on LAN, or heuristics with AI off |
| Jev | Off (`JEV_ENABLED=0`) |
| Yet / Metabase | Optional **local** containers only |

## Gaps still customer-owned

- TLS certs / reverse proxy on the LAN
- Offline LLM weights approval
- USB update channel / private registry mirror
- Moodle itself (usually already on the LAN)

## Related

- [DEPLOYMENT_TOPOLOGIES.md](DEPLOYMENT_TOPOLOGIES.md) · [AGS_CHECKLIST.md](AGS_CHECKLIST.md) · [AI.md](AI.md)
