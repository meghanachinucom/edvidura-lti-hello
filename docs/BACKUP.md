# Shared Postgres backup note (local / pilot)

EdVidura cloud path uses **one shared database** with RLS (DEC-006). Treat backups as whole-database, not per-tenant dumps, unless you later run dedicated instances.

## Local Docker (this repo)

Database service: `db/docker-compose.yml` → host port **5433**, DB `edvidura`.

### Logical dump (recommended for pilots)

```bash
docker exec db-db-1 pg_dump -U edvidura -d edvidura --format=custom -f /tmp/edvidura.dump
docker cp db-db-1:/tmp/edvidura.dump ./backups/edvidura-$(date +%Y%m%d).dump
```

Restore:

```bash
docker cp ./backups/edvidura-YYYYMMDD.dump db-db-1:/tmp/edvidura.dump
docker exec db-db-1 pg_restore -U edvidura -d edvidura --clean --if-exists /tmp/edvidura.dump
```

### What must be backed up together

- Postgres data (tenants, platforms, attempts, lessons, outbox, manuals)
- LTI private keys under `keys/` (not in git)
- `.env` secrets (`SESSION_SECRET`, `ADMIN_API_KEY`, DB URL) — store in a secret manager, not the dump alone

### RLS reminder

Restoring as a superuser bypasses RLS for admin recovery; application runtime must continue using `edvidura_app` (**NOBYPASSRLS**).

### Production direction (not implemented here)

- Automated nightly dumps or managed Postgres PITR  
- Encrypted offsite copies  
- Document RPO/RTO with the pilot school  
- Prefer shared Redis/session store over single-node memory cache (see progress report limitations)
