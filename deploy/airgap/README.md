# Air-gap compose

1. On a connected machine: build + save images (see [AIRGAP_PACK.md](../../docs/AIRGAP_PACK.md)).
2. Copy `env.airgap.example` → `env.airgap` and set `SESSION_SECRET`, `ADMIN_API_KEY`, `APP_BASE_URL`, LTI PEM.
3. `docker compose --env-file env.airgap up -d`
4. Smoke: `GET http://<host>:8000/health` → `ok` / `db_ok`

`AIRGAP=1` refuses cloud OpenAI / Anthropic / Jev / public LRS URLs at boot.

Topologies (cloud / hybrid / air-gap): [DEPLOYMENT_TOPOLOGIES.md](../../docs/DEPLOYMENT_TOPOLOGIES.md).
